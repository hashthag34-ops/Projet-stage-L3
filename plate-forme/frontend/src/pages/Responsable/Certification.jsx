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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <section
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="learner-profile-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-orange-600">Profil apprenant</p>
            <h2 id="learner-profile-title" className="mt-1 text-2xl font-black text-zinc-900 dark:text-white">
              {learner.prenom} {learner.nom}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{learner.email}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-zinc-800">
            <p className="text-xs font-semibold text-zinc-500">Moyenne générale</p>
            <p className="mt-1 text-xl font-black text-zinc-900 dark:text-white">{formatAverage(learner.moyenne)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-zinc-800">
            <p className="text-xs font-semibold text-zinc-500">Présence</p>
            <p className="mt-1 text-xl font-black text-zinc-900 dark:text-white">
              {learner.taux_presence == null ? '—' : `${Number(learner.taux_presence).toFixed(1)} %`}
            </p>
          </div>
        </div>

        <h3 className="mb-3 font-bold text-zinc-900 dark:text-white">Notes aux évaluations</h3>
        {learner.notes?.length ? (
          <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
            {learner.notes.map((note, index) => (
              <li key={`${note.titre}-${note.date}-${index}`} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">{note.titre || 'Évaluation'}</p>
                  <p className="text-xs text-zinc-500">{formatDate(note.date)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-sm font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                  {Number(note.note).toFixed(2)} / 20
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-zinc-500 dark:bg-zinc-800">
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
      setNotice('La liste des apprenants certifiés a bien été enregistrée.');
      setFormations((current) => current.map((item) => (
        item.id_formation === formation.id_formation
          ? { ...item, is_saved: true, decisions_count: learners.length, certifies_count: selectedLearnerIds.length }
          : item
      )));
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
        h1{margin-bottom:6px;color:#c2410c}p{color:#52525b;margin:4px 0 24px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #d4d4d8;padding:10px;text-align:left}
        th{background:#fff7ed;color:#9a3412}
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
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-3xl bg-gradient-to-br from-orange-600 to-amber-500 p-6 text-white shadow-lg shadow-orange-900/10 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/15 p-3"><Award size={28} /></div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-100">Espace responsable</p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">Certifications</h1>
            <p className="mt-2 max-w-2xl text-sm text-orange-50 sm:text-base">
              Consultez les résultats et présences, choisissez les apprenants à certifier et exportez la liste validée.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {!formation ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">Formations terminées</h2>
              <p className="mt-1 text-sm text-zinc-500">La plus récemment clôturée apparaît en premier.</p>
            </div>
            <span className="rounded-full bg-orange-100 px-3 py-1.5 text-sm font-bold text-orange-800 dark:bg-orange-950/50 dark:text-orange-200">
              {formations.length} formation{formations.length > 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              Chargement des formations…
            </div>
          ) : formations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <CalendarDays className="mx-auto text-zinc-400" size={32} />
              <h3 className="mt-3 font-bold text-zinc-800 dark:text-white">Aucune formation terminée</h3>
              <p className="mt-1 text-sm text-zinc-500">Les formations apparaîtront ici dès leur date de clôture.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {formations.map((item) => (
                <button
                  key={item.id_formation}
                  onClick={() => openFormation(item)}
                  className="group rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
                      <Award size={22} />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.is_saved ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                      {item.is_saved ? 'Liste enregistrée' : 'À certifier'}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-zinc-900 group-hover:text-orange-700 dark:text-white dark:group-hover:text-orange-300">{item.titre}</h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                    <Clock3 size={15} /> Clôturée le {formatDate(item.date_fin)}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
                    <span className="flex items-center gap-2 font-semibold text-zinc-600 dark:text-zinc-300">
                      <Users size={16} /> {item.apprenants_count} apprenant{Number(item.apprenants_count) > 1 ? 's' : ''}
                    </span>
                    <span className="font-bold text-orange-700 dark:text-orange-300">
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
            className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft size={17} /> Retour aux formations
          </button>

          <div className="mb-5 flex flex-col justify-between gap-4 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Clôturée le {formatDate(formation.date_fin)}</p>
              <h2 className="mt-1 text-2xl font-black text-zinc-900 dark:text-white">{formation.titre}</h2>
              <p className="mt-2 text-sm text-zinc-500">
                {certifiedCount} apprenant{certifiedCount > 1 ? 's' : ''} sélectionné{certifiedCount > 1 ? 's' : ''} sur {learners.length}
                {isSaved && <span className="ml-2 inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={15} /> Liste enregistrée</span>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isSaved && (
                <>
                  <button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <FileSpreadsheet size={17} /> Excel (.csv)
                  </button>
                  <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <FileText size={17} /> PDF
                  </button>
                </>
              )}
              <button
                onClick={saveSelection}
                disabled={saving || detailLoading || learners.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={17} /> {saving ? 'Enregistrement…' : isSaved ? 'Enregistrer les modifications' : 'Valider la liste'}
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">La liste privilégie les meilleures moyennes et assiduités, tout en laissant le responsable libre de sélectionner tout apprenant.</p>
            <label className="relative block w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un apprenant"
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              />
            </label>
          </div>

          {detailLoading ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
              Chargement des apprenants…
            </div>
          ) : learners.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
              Aucun apprenant accepté n’est associé à cette formation.
            </div>
          ) : filteredLearners.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500 dark:bg-zinc-900">Aucun résultat pour cette recherche.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredLearners.map((learner) => {
                const selected = selectedLearnerIds.includes(learner.id_apprenant);
                const present = Number(learner.seances_presentes);
                const total = Number(learner.seances_total);
                return (
                  <article key={learner.id_apprenant} className={`rounded-3xl border bg-white p-5 shadow-sm transition dark:bg-zinc-900 ${selected ? 'border-orange-400 ring-1 ring-orange-300 dark:border-orange-700 dark:ring-orange-900' : 'border-zinc-200 dark:border-zinc-800'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-zinc-900 dark:text-white">{learner.prenom} {learner.nom}</h3>
                        <p className="mt-1 truncate text-sm text-zinc-500">{learner.email}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${selected ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                        {selected ? 'Certifié' : 'Non certifié'}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-zinc-800">
                        <p className="text-xs font-semibold text-zinc-500">Moyenne</p>
                        <p className="mt-1 font-black text-zinc-900 dark:text-white">{formatAverage(learner.moyenne)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-zinc-800">
                        <p className="text-xs font-semibold text-zinc-500">Présences</p>
                        <p className="mt-1 font-black text-zinc-900 dark:text-white">{present} / {total}</p>
                        <p className="text-xs text-zinc-500">{learner.taux_presence == null ? 'Aucune séance' : `${Number(learner.taux_presence).toFixed(1)} %`}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => setProfileLearner(learner)} className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                        Voir le profil
                      </button>
                      <button
                        onClick={() => toggleLearner(learner.id_apprenant)}
                        aria-pressed={selected}
                        className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${selected ? 'border border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900 dark:text-orange-300 dark:hover:bg-orange-950/40' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
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
