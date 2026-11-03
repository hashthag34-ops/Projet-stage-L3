// frontend/src/pages/Certification.jsx
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
  NON_CERTIFIE: 'Non certifié'
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

const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';
const cardClass = 'rounded-3xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900';

function SummaryCard({ label, value, icon: Icon, colorClass }) {
  return (
    <article className={`${cardClass} p-5 transition-shadow hover:shadow-md`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-black tabular-nums text-zinc-900 dark:text-white sm:text-3xl">{value}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colorClass}`}>
          <Icon size={24} />
        </div>
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
        h1{margin-bottom:6px;color:#f97316}p{color:#52525b;margin:4px 0 24px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #d4d4d8;padding:10px;text-align:left}
        th{background:#fff7ed;color:#ea580c}
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
    <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-3 py-6 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:px-6">
      <header className="rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-zinc-950 shadow-xl shadow-orange-500/10 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center rounded-2xl bg-zinc-950/10 p-3 text-zinc-950">
            <Award size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-950/70">Espace administrateur</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Suivi des certifications</h1>
            <p className="mt-2 max-w-2xl text-xs font-medium text-zinc-950/80 sm:text-sm">
              Consultez les statistiques de certification et les listes par formation. Cette page est en lecture seule.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {selectedFormation ? (
        <section className="space-y-4">
          <button
            onClick={() => { setSelectedFormation(null); setLearners([]); setError(''); }}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <ArrowLeft size={16} /> Retour aux statistiques
          </button>
          
          <div className={`${cardClass} flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6`}>
            <div>
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Clôturée le {formatDate(selectedFormation.date_fin)}</p>
              <h2 className="mt-1 text-xl font-black text-zinc-900 dark:text-white sm:text-2xl">{selectedFormation.titre}</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{filteredLearners.length} apprenant{filteredLearners.length > 1 ? 's' : ''} affiché{filteredLearners.length > 1 ? 's' : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={exportCsv} 
                disabled={learnersLoading} 
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
              >
                <FileSpreadsheet size={16} /> Exporter Excel
              </button>
              <button 
                onClick={printList} 
                disabled={learnersLoading} 
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
              >
                <FileText size={16} /> Imprimer / PDF
              </button>
            </div>
          </div>

          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['TOUS', 'Tous'],
                  ['CERTIFIE', 'Certifiés'],
                  ['NON_CERTIFIE', 'Non certifiés']
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setFilter(value)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${filter === value ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un apprenant"
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
          </div>

          {learnersLoading ? (
            <div className={`${cardClass} p-12 text-center text-xs text-zinc-500`}>Chargement des apprenants…</div>
          ) : filteredLearners.length === 0 ? (
            <div className={`${cardClass} border-dashed p-12 text-center text-xs text-zinc-500`}>Aucun apprenant ne correspond à ce filtre.</div>
          ) : (
            <div className={`${cardClass} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead className="border-b border-zinc-100 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-400">
                    <tr>
                      <th className="p-4 pl-5">Apprenant</th>
                      <th className="p-4">E-mail</th>
                      <th className="p-4">Statut</th>
                      <th className="p-4 pr-5">Date de certification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredLearners.map((learner) => {
                      const status = learner.certification_statut;
                      const statusBadge = status === 'CERTIFIE'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : status === 'NON_CERTIFIE'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
                      return (
                        <tr key={learner.id_apprenant} className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                          <td className="p-4 pl-5 font-bold text-zinc-900 dark:text-white">{learner.prenom} {learner.nom}</td>
                          <td className="p-4 font-medium text-zinc-500 dark:text-zinc-400">{learner.email}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusBadge}`}>
                              {statusLabels[status] || status}
                            </span>
                          </td>
                          <td className="p-4 pr-5 font-medium text-zinc-500 dark:text-zinc-400">{formatDate(learner.date_certification)}</td>
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
            <SummaryCard
              label="Apprenants des formations clôturées"
              value={totalLearners}
              icon={Users}
              colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <SummaryCard
              label="Certifications accordées"
              value={totalCertified}
              icon={CheckCircle2}
              colorClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
          </section>

          <section className={`${cardClass} p-5 sm:p-6`}>
            <div className="mb-5">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Certifications par formation</h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Nombre d’apprenants inscrits comparé au nombre de certifiés.</p>
            </div>
            {loading ? (
              <div className="flex h-72 items-center justify-center text-xs font-medium text-zinc-500">Chargement des statistiques…</div>
            ) : chartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-xs font-medium text-zinc-500">Aucune formation terminée à afficher.</div>
            ) : (
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -16, bottom: 8 }}>
                    <defs>
                      <linearGradient id="certifiedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="learnersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#71717a" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#71717a" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#71717a" opacity={0.15} />
                    <XAxis dataKey="titre_court" tick={{ fontSize: 11, fill: '#71717a' }} interval={0} angle={-15} textAnchor="end" height={56} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.titre || ''} />
                    <Area type="monotone" dataKey="apprenants_count" name="Apprenants" stroke="#71717a" fill="url(#learnersGradient)" strokeWidth={2} />
                    <Area type="monotone" dataKey="certifies_count" name="Certifiés" stroke="#f97316" fill="url(#certifiedGradient)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Détail par formation</h2>
              <Download size={18} className="text-orange-500" />
            </div>
            {loading ? null : formations.length === 0 ? (
              <div className={`${cardClass} border-dashed p-10 text-center text-xs text-zinc-500`}>Aucune formation clôturée.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {formations.map((item) => (
                  <button
                    key={item.id_formation}
                    onClick={() => openFormation(item)}
                    className={`${cardClass} p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-500 hover:shadow-md dark:hover:border-orange-500`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                        <Award size={20} />
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                        Clôturée le {formatDate(item.date_fin)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-black text-zinc-900 dark:text-white line-clamp-2">{item.titre}</h3>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Apprenants</p>
                        <p className="mt-0.5 text-xs font-black text-zinc-900 dark:text-white">{item.apprenants_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Certifiés</p>
                        <p className="mt-0.5 text-xs font-black text-emerald-600 dark:text-emerald-400">{item.certifies_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-zinc-400">Non certifiés</p>
                        <p className="mt-0.5 text-xs font-black text-zinc-900 dark:text-white">{item.non_certifies_count}</p>
                      </div>
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