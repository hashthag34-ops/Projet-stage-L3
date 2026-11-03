import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  Search,
  Users,
  X
} from 'lucide-react';
import API from '../../services/api';

const inputClass = 'rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-500';
const cardClass = 'rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900';

const formatDate = (value) => {
  if (!value) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
};

const formatAverage = (value) => value == null ? '—' : `${Number(value).toFixed(2)} / 20`;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

function ProfileModal({ learner, onClose }) {
  if (!learner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs" onClick={onClose}>
      <section
        className={`${cardClass} max-h-[85vh] w-full max-w-xl overflow-y-auto p-6`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learner-profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Profil apprenant</p>
            <h2 id="learner-profile-title" className="mt-1 text-xl font-black text-zinc-900 dark:text-white sm:text-2xl">
              {learner.prenom} {learner.nom}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{learner.email}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Moyenne générale</p>
            <p className="mt-1 text-xl font-black text-zinc-900 dark:text-white">{formatAverage(learner.moyenne)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Présence</p>
            <p className="mt-1 text-xl font-black text-zinc-900 dark:text-white">
              {learner.taux_presence == null ? '—' : `${Number(learner.taux_presence).toFixed(1)} %`}
            </p>
          </div>
        </div>

        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Notes aux évaluations</h3>
        {learner.notes?.length ? (
          <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {learner.notes.map((note, index) => (
              <li key={`${note.titre}-${note.date}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{note.titre || 'Évaluation'}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{formatDate(note.date)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-700 dark:text-orange-300">
                  {Number(note.note).toFixed(2)} / 20
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            Aucune note enregistrée pour cette formation.
          </p>
        )}
      </section>
    </div>
  );
}

export default function Certification() {
  const [formations, setFormations] = useState([]);
  const [formation, setFormation] = useState(null);
  const [learners, setLearners] = useState([]);
  const [selectedLearnerIds, setSelectedLearnerIds] = useState([]);
  const [profileLearner, setProfileLearner] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    API.get('/responsable/certifications/formations')
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error('Réponse invalide lors du chargement des formations.');
        if (!cancelled) setFormations(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.response?.data?.message || requestError.message || 'Impossible de charger les formations terminées.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const openFormation = async (item) => {
    setFormation(item);
    setLearners([]);
    setSelectedLearnerIds([]);
    setIsSaved(false);
    setNotice('');
    setError('');
    setSearch('');
    setDetailLoading(true);
    try {
      const response = await API.get(`/responsable/certifications/formations/${item.id_formation}/apprenants`);
      const data = response.data;
      if (!data?.formation || !Array.isArray(data.learners)) {
        throw new Error('Réponse invalide lors du chargement des apprenants.');
      }
      setFormation(data.formation);
      setLearners(data.learners);
      setSelectedLearnerIds(data.learners
        .filter((learner) => learner.certification_statut === 'CERTIFIE')
        .map((learner) => learner.id_apprenant));
      setIsSaved(data.is_saved);
    } catch (requestError) {
      setFormation(null);
      setError(requestError.response?.data?.message || requestError.message || 'Impossible de charger les apprenants de cette formation.');
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredLearners = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    if (!query) return learners;
    return learners.filter((learner) =>
      `${learner.prenom} ${learner.nom} ${learner.email}`.toLocaleLowerCase('fr').includes(query)
    );
  }, [learners, search]);

  const certifiedCount = selectedLearnerIds.length;

  const toggleLearner = (learnerId) => {
    if (isSaved) return;
    setSelectedLearnerIds((current) => current.includes(learnerId)
      ? current.filter((id) => id !== learnerId)
      : [...current, learnerId]);
    setIsSaved(false);
    setNotice('');
  };

  const saveSelection = async () => {
    if (!formation) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await API.put(`/responsable/certifications/formations/${formation.id_formation}`, {
        certifiedLearnerIds: selectedLearnerIds
      });
      setIsSaved(true);
      setNotice('La liste des apprenants certifiés a été figée et la formation a été archivée.');
      setFormations((current) => current.map((item) => (
        item.id_formation === formation.id_formation
          ? { ...item, is_saved: true, decisions_count: learners.length, certifies_count: selectedLearnerIds.length }
          : item
      )));
      setFormation(null);
      setLearners([]);
      setFormations((current) => current.filter((item) => item.id_formation !== formation.id_formation));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible d’enregistrer la sélection.');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    if (!formation) return;
    const certifiedLearners = learners.filter((learner) => selectedLearnerIds.includes(learner.id_apprenant));
    const csvValue = (value) => {
      const text = String(value ?? '');
      const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const rows = [
      ['N°', 'Nom', 'Prénom', 'E-mail', 'Téléphone', 'Genre'],
      ...certifiedLearners.map((learner, index) => [
        index + 1,
        learner.nom,
        learner.prenom,
        learner.email,
        learner.telephone,
        learner.genre
      ])
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvValue).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `certifies-${formation.titre.trim().replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!formation) return;
    const certifiedLearners = learners.filter((learner) => selectedLearnerIds.includes(learner.id_apprenant));
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Autorisez les fenêtres pop-up pour générer le document PDF.');
      return;
    }
    const tableRows = certifiedLearners.map((learner) => `
      <tr>
        <td>${escapeHtml(`${learner.prenom} ${learner.nom}`)}</td>
        <td>${escapeHtml(learner.email)}</td>
        <td>${escapeHtml(learner.moyenne == null ? '—' : `${Number(learner.moyenne).toFixed(2)} / 20`)}</td>
        <td>${escapeHtml(`${learner.seances_presentes} / ${learner.seances_total}`)}</td>
        <td>${escapeHtml(learner.taux_presence == null ? '—' : `${Number(learner.taux_presence).toFixed(1)} %`)}</td>
      </tr>`).join('');
    printWindow.document.write(`<!doctype html>
      <html lang="fr"><head><meta charset="utf-8"><title>Apprenants certifiés - ${escapeHtml(formation.titre)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#18181b;margin:36px}
        h1{margin-bottom:6px;color:#f97316}p{color:#71717a;margin:4px 0 24px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #e4e4e7;padding:10px;text-align:left}
        th{background:#fff7ed;color:#c2410c}
        @media print{body{margin:12mm}}
      </style></head><body>
      <h1>Liste des apprenants certifiés</h1>
      <p>${escapeHtml(formation.titre)} · Formation terminée le ${escapeHtml(formatDate(formation.date_fin))} · ${certifiedLearners.length} apprenant(s)</p>
      <table><thead><tr><th>Apprenant</th><th>E-mail</th><th>Moyenne</th><th>Présences</th><th>Taux de présence</th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="5">Aucun apprenant certifié.</td></tr>'}</tbody></table>
      <script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
    setError('');
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6 sm:px-6 lg:px-8">
      {/* En-tête */}
      <header className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-zinc-950 shadow-xl shadow-orange-500/10 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-zinc-950/10 p-3 text-zinc-950"><Award size={28} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-950/70">Espace responsable</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Certifications</h1>
            <p className="mt-1.5 max-w-2xl text-xs font-medium text-zinc-950/80 sm:text-sm">
              Consultez les résultats et présences, choisissez les apprenants à certifier et exportez la liste validée.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {!formation ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white sm:text-xl">Formations terminées</h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">La plus récemment clôturée apparaît en premier.</p>
            </div>
            <span className="rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-700 dark:text-orange-400">
              {formations.length} formation{formations.length > 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className={`${cardClass} p-10 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400`}>
              Chargement des formations…
            </div>
          ) : formations.length === 0 ? (
            <div className={`${cardClass} border-dashed p-10 text-center`}>
              <CalendarDays className="mx-auto text-zinc-400" size={32} />
              <h3 className="mt-3 text-sm font-bold text-zinc-800 dark:text-white">Aucune formation terminée</h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Les formations apparaîtront ici dès leur date de clôture.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {formations.map((item) => (
                <button
                  key={item.id_formation}
                  onClick={() => openFormation(item)}
                  className={`${cardClass} group p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-md dark:hover:border-orange-500`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <Award size={22} />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${item.is_saved ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                      {item.is_saved ? 'Liste enregistrée' : 'À certifier'}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-black text-zinc-900 group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">{item.titre}</h3>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Clock3 size={14} /> Clôturée le {formatDate(item.date_fin)}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-600 dark:text-zinc-300">
                      <Users size={15} /> {item.apprenants_count} apprenant{Number(item.apprenants_count) > 1 ? 's' : ''}
                    </span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      {item.certifies_count} certifié{Number(item.certifies_count) > 1 ? 's' : ''}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <button
            onClick={() => { setFormation(null); setLearners([]); setError(''); setNotice(''); }}
            className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft size={16} /> Retour aux formations
          </button>

          <div className={`${cardClass} mb-5 flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6`}>
            <div>
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Clôturée le {formatDate(formation.date_fin)}</p>
              <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-white sm:text-2xl">{formation.titre}</h2>
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {certifiedCount} apprenant{certifiedCount > 1 ? 's' : ''} sélectionné{certifiedCount > 1 ? 's' : ''} sur {learners.length}
                {isSaved && <span className="ml-2 inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={14} /> Liste enregistrée</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isSaved && (
                <>
                  <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <FileSpreadsheet size={15} /> Excel (.csv)
                  </button>
                  <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <FileText size={15} /> PDF
                  </button>
                </>
              )}
              <button
                onClick={saveSelection}
                disabled={saving || detailLoading || learners.length === 0 || (isSaved && formation.statut === 'ARCHIVEE')}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={16} /> {saving ? 'Archivage…' : isSaved ? 'Figer et archiver la formation' : 'Figer la liste et archiver'}
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">La liste privilégie les meilleures moyennes et assiduités, tout en laissant le responsable libre de sélectionner tout apprenant.</p>
            <label className="relative block w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un apprenant"
                className={`${inputClass} w-full pl-10`}
              />
            </label>
          </div>

          {detailLoading ? (
            <div className={`${cardClass} p-10 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400`}>
              Chargement des apprenants…
            </div>
          ) : learners.length === 0 ? (
            <div className={`${cardClass} p-10 text-center text-xs text-zinc-500 dark:text-zinc-400`}>
              Aucun apprenant accepté n’est associé à cette formation.
            </div>
          ) : filteredLearners.length === 0 ? (
            <p className={`${cardClass} p-6 text-center text-xs text-zinc-500 dark:text-zinc-400`}>Aucun résultat pour cette recherche.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredLearners.map((learner) => {
                const selected = selectedLearnerIds.includes(learner.id_apprenant);
                const present = Number(learner.seances_presentes);
                const total = Number(learner.seances_total);
                return (
                  <article key={learner.id_apprenant} className={`${cardClass} p-5 transition ${selected ? 'border-orange-500/50 ring-1 ring-orange-500/30' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-zinc-900 dark:text-white">{learner.prenom} {learner.nom}</h3>
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{learner.email}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${selected ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                        {selected ? 'Certifié' : 'Non certifié'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                        <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Moyenne</p>
                        <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">{formatAverage(learner.moyenne)}</p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                        <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Présences</p>
                        <p className="mt-1 text-sm font-black text-zinc-900 dark:text-white">{present} / {total}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{learner.taux_presence == null ? 'Aucune séance' : `${Number(learner.taux_presence).toFixed(1)} %`}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => setProfileLearner(learner)} className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                        Voir le profil
                      </button>
                      <button
                        onClick={() => toggleLearner(learner.id_apprenant)}
                        aria-pressed={selected}
                        disabled={isSaved}
                        className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border border-orange-500/30 text-orange-700 hover:bg-orange-500/10 dark:text-orange-300' : 'bg-orange-500 text-zinc-950 hover:bg-orange-400'}`}
                      >
                        {selected ? 'Retirer' : 'Certifier'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {profileLearner && <ProfileModal learner={profileLearner} onClose={() => setProfileLearner(null)} />}
    </main>
  );
}