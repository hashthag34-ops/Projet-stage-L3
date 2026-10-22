import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Users
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import API from '../../services/api';

const statusLabels = {
  CERTIFIE: 'Certifié',
  NON_CERTIFIE: 'Non certifié',
  EN_ATTENTE: 'En attente'
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const csvCell = (value) => {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-zinc-900 dark:text-white">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${color}`}><Icon size={22} /></div>
      </div>
    </article>
  );
}

export default function AdminCertification() {
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [learners, setLearners] = useState([]);
  const [filter, setFilter] = useState('TOUS');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    API.get('/admin/certifications/formations')
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error('Réponse invalide pour les statistiques de certification.');
        if (!cancelled) setFormations(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.response?.data?.message || requestError.message || 'Impossible de charger les statistiques.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const totalLearners = useMemo(
    () => formations.reduce((total, item) => total + Number(item.apprenants_count), 0),
    [formations]
  );
  const totalCertified = useMemo(
    () => formations.reduce((total, item) => total + Number(item.certifies_count), 0),
    [formations]
  );
  const chartData = useMemo(() => [...formations].reverse().map((item) => ({
    ...item,
    titre_court: item.titre.length > 22 ? `${item.titre.slice(0, 22)}…` : item.titre,
    apprenants_count: Number(item.apprenants_count),
    certifies_count: Number(item.certifies_count)
  })), [formations]);

  const openFormation = async (item) => {
    setSelectedFormation(item);
    setLearners([]);
    setFilter('TOUS');
    setSearch('');
    setLearnersLoading(true);
    setError('');
    try {
      const response = await API.get(`/admin/certifications/formations/${item.id_formation}/apprenants`);
      if (!response.data?.formation || !Array.isArray(response.data.learners)) {
        throw new Error('Réponse invalide pour la liste des apprenants.');
      }
      setSelectedFormation(response.data.formation);
      setLearners(response.data.learners);
    } catch (requestError) {
      setSelectedFormation(null);
      setError(requestError.response?.data?.message || requestError.message || 'Impossible de charger les apprenants.');
    } finally {
      setLearnersLoading(false);
    }
  };

  const filteredLearners = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return learners.filter((learner) => {
      const statusMatches = filter === 'TOUS' || learner.certification_statut === filter;
      const queryMatches = !query || `${learner.prenom} ${learner.nom} ${learner.email}`.toLocaleLowerCase('fr').includes(query);
      return statusMatches && queryMatches;
    });
  }, [learners, filter, search]);

  const exportCsv = () => {
    if (!selectedFormation) return;
    const rows = [
      ['Apprenant', 'E-mail', 'Statut de certification', 'Date de certification'],
      ...filteredLearners.map((learner) => [
        `${learner.prenom} ${learner.nom}`,
        learner.email,
        statusLabels[learner.certification_statut] || learner.certification_statut,
        formatDate(learner.date_certification)
      ])
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `certifications-${selectedFormation.titre.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    if (!selectedFormation) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Autorisez les fenêtres pop-up pour imprimer la liste.');
      return;
    }
    const rows = filteredLearners.map((learner) => `
      <tr>
        <td>${escapeHtml(`${learner.prenom} ${learner.nom}`)}</td>
        <td>${escapeHtml(learner.email)}</td>
        <td>${escapeHtml(statusLabels[learner.certification_statut] || learner.certification_statut)}</td>
        <td>${escapeHtml(formatDate(learner.date_certification))}</td>
      </tr>`).join('');
    printWindow.document.write(`<!doctype html>
      <html lang="fr"><head><meta charset="utf-8"><title>Certifications - ${escapeHtml(selectedFormation.titre)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#18181b;margin:36px}
        h1{margin-bottom:6px;color:#c2410c}p{color:#52525b;margin:4px 0 24px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #d4d4d8;padding:10px;text-align:left}
        th{background:#fff7ed;color:#9a3412}
        @media print{body{margin:12mm}}
      </style></head><body>
      <h1>Suivi des certifications</h1>
      <p>${escapeHtml(selectedFormation.titre)} · Formation clôturée le ${escapeHtml(formatDate(selectedFormation.date_fin))}</p>
      <table><thead><tr><th>Apprenant</th><th>E-mail</th><th>Statut</th><th>Date de certification</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">Aucun apprenant dans cette sélection.</td></tr>'}</tbody></table>
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
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-orange-100">Espace administrateur</p>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">Suivi des certifications</h1>
            <p className="mt-2 max-w-2xl text-sm text-orange-50 sm:text-base">
              Consultez les statistiques de certification et les listes par formation. Cette page est en lecture seule.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      {selectedFormation ? (
        <section>
          <button
            onClick={() => { setSelectedFormation(null); setLearners([]); setError(''); }}
            className="mb-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <ArrowLeft size={17} /> Retour aux statistiques
          </button>
          <div className="mb-5 flex flex-col justify-between gap-4 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:p-6">
            <div>
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Clôturée le {formatDate(selectedFormation.date_fin)}</p>
              <h2 className="mt-1 text-2xl font-black text-zinc-900 dark:text-white">{selectedFormation.titre}</h2>
              <p className="mt-2 text-sm text-zinc-500">{filteredLearners.length} apprenant{filteredLearners.length > 1 ? 's' : ''} affiché{filteredLearners.length > 1 ? 's' : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportCsv} disabled={learnersLoading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                <FileSpreadsheet size={17} /> Exporter Excel
              </button>
              <button onClick={printList} disabled={learnersLoading} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
                <FileText size={17} /> Imprimer / PDF
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                ['TOUS', 'Tous'],
                ['CERTIFIE', 'Certifiés'],
                ['NON_CERTIFIE', 'Non certifiés'],
                ['EN_ATTENTE', 'En attente']
              ].map(([value, label]) => (
                <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${filter === value ? 'bg-orange-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}>
                  {label}
                </button>
              ))}
            </div>
            <label className="relative block w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={17} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un apprenant" className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
            </label>
          </div>

          {learnersLoading ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">Chargement des apprenants…</div>
          ) : filteredLearners.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">Aucun apprenant ne correspond à ce filtre.</div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
                    <tr><th className="px-5 py-4">Apprenant</th><th className="px-5 py-4">E-mail</th><th className="px-5 py-4">Statut</th><th className="px-5 py-4">Date de certification</th></tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredLearners.map((learner) => {
                      const status = learner.certification_statut;
                      const statusStyle = status === 'CERTIFIE'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : status === 'NON_CERTIFIE'
                          ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
                      return (
                        <tr key={learner.id_apprenant} className="text-zinc-700 dark:text-zinc-200">
                          <td className="px-5 py-4 font-bold">{learner.prenom} {learner.nom}</td>
                          <td className="px-5 py-4 text-zinc-500">{learner.email}</td>
                          <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>{statusLabels[status] || status}</span></td>
                          <td className="px-5 py-4 text-zinc-500">{formatDate(learner.date_certification)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <SummaryCard label="Apprenants des formations clôturées" value={totalLearners} icon={Users} color="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300" />
            <SummaryCard label="Certifications accordées" value={totalCertified} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300" />
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">Certifications par formation</h2>
              <p className="mt-1 text-sm text-zinc-500">Nombre d’apprenants inscrits comparé au nombre de certifiés.</p>
            </div>
            {loading ? (
              <div className="flex h-72 items-center justify-center text-sm font-semibold text-zinc-500">Chargement des statistiques…</div>
            ) : chartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-sm text-zinc-500">Aucune formation terminée à afficher.</div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -16, bottom: 8 }}>
                    <defs>
                      <linearGradient id="certifiedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="learnersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="titre_court" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={56} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.titre || ''} />
                    <Area type="monotone" dataKey="apprenants_count" name="Apprenants" stroke="#64748b" fill="url(#learnersGradient)" strokeWidth={2} />
                    <Area type="monotone" dataKey="certifies_count" name="Certifiés" stroke="#f97316" fill="url(#certifiedGradient)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">Détail par formation</h2>
              <Download size={18} className="text-orange-600" />
            </div>
            {loading ? null : formations.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">Aucune formation clôturée.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {formations.map((item) => (
                  <button key={item.id_formation} onClick={() => openFormation(item)} className="rounded-3xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-700">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300"><Award size={22} /></div>
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">Clôturée le {formatDate(item.date_fin)}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-black text-zinc-900 dark:text-white">{item.titre}</h3>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                      <div><p className="text-xs text-zinc-500">Apprenants</p><p className="mt-1 font-black text-zinc-900 dark:text-white">{item.apprenants_count}</p></div>
                      <div><p className="text-xs text-zinc-500">Certifiés</p><p className="mt-1 font-black text-emerald-700 dark:text-emerald-300">{item.certifies_count}</p></div>
                      <div><p className="text-xs text-zinc-500">Non certifiés</p><p className="mt-1 font-black text-zinc-700 dark:text-zinc-200">{item.non_certifies_count}</p></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
