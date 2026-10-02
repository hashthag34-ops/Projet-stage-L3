import { useEffect, useState } from 'react';
import { Activity, Award, RefreshCw, Star, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import API from '../../services/api';

const chartColors = ['#f97316', '#0f766e', '#2563eb', '#ca8a04', '#dc2626', '#7c3aed'];
const panelClass = 'border-y border-black/10 py-6 dark:border-white/10';
const tooltipStyle = { borderRadius: 8, border: '1px solid rgba(0,0,0,.12)' };

const monthName = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' });

function StatCard({ label, value, detail, icon: Icon, color }) {
  return (
    <article className="flex items-start justify-between border-l-2 border-black/10 py-2 pl-4 dark:border-white/15">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">{label}</p>
        <p className="mt-2 text-3xl font-black tabular-nums">{value ?? 0}</p>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">{detail}</p>
      </div>
      <Icon size={20} className={color} />
    </article>
  );
}

function ChartPanel({ title, subtitle, children }) {
  return (
    <section className={panelClass}>
      <div className="mb-5">
        <h2 className="text-lg font-black">{title}</h2>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export default function AdminStats() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStatistics = async () => {
    setError('');
    try {
      const response = await API.get('/admin/statistics');
      setStatistics(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadStatistics, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const overview = statistics?.overview || {};
  const averageRating = statistics?.ratingsByFormation?.filter((item) => Number(item.avis_count) > 0) || [];
  const totalReviews = averageRating.reduce((sum, item) => sum + Number(item.avis_count), 0);
  const weightedRating = totalReviews
    ? averageRating.reduce((sum, item) => sum + Number(item.note_moyenne) * Number(item.avis_count), 0) / totalReviews
    : null;
  const monthlyData = statistics?.formationsByMonth?.map((item) => ({ ...item, libelle: monthName(item.mois) })) || [];
  const applicationData = statistics?.applicationsByFormation || [];
  const successData = (statistics?.successByFormation || []).filter((item) => Number(item.tentatives) > 0);
  const ratingData = averageRating;

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end dark:border-white/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Administration</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Vue statistique</h1>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Activité des formations, candidatures, évaluations et avis.</p>
        </div>
        <button type="button" onClick={loadStatistics} disabled={loading} aria-label="Actualiser les statistiques" title="Actualiser" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-black/15 transition hover:border-orange-500 hover:text-orange-600 disabled:opacity-50 dark:border-white/15 dark:hover:text-orange-400">
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {error && <p role="alert" className="border-l-2 border-red-500 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {loading && !statistics ? <p className="py-12 text-center text-sm text-black/50 dark:text-white/50">Chargement des indicateurs...</p> : statistics && <>
        <section className="grid gap-6 border-b border-black/10 pb-7 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/10">
          <StatCard label="Comptes utilisateurs" value={overview.utilisateurs} detail={`${overview.apprenants} apprenants`} icon={Users} color="text-orange-500" />
          <StatCard label="Formateurs" value={overview.formateurs} detail={`${overview.responsables} responsables`} icon={Activity} color="text-teal-700 dark:text-teal-400" />
          <StatCard label="Candidatures" value={applicationData.reduce((sum, item) => sum + Number(item.candidatures), 0)} detail={`${overview.administrateurs} administrateurs`} icon={Award} color="text-blue-600 dark:text-blue-400" />
          <StatCard label="Avis formations" value={totalReviews} detail={weightedRating === null ? 'Pas encore de note' : `Moyenne globale ${weightedRating.toFixed(1)} / 5`} icon={Star} color="text-amber-500" />
        </section>

        <div className="grid gap-x-10 lg:grid-cols-2">
          <ChartPanel title="Formations créées par mois" subtitle="Évolution sur les 12 derniers mois">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs><linearGradient id="formationFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={0.28} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="rgba(120,120,120,.18)" />
                  <XAxis dataKey="libelle" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, 'Formations']} />
                  <Area type="monotone" dataKey="formations" stroke="#f97316" strokeWidth={2.5} fill="url(#formationFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>

          <ChartPanel title="Candidatures par formation" subtitle="Toutes candidatures, avec le nombre d'acceptations">
            {applicationData.length === 0 ? <p className="py-14 text-center text-sm text-black/45">Aucune formation enregistrée.</p> : <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applicationData} margin={{ top: 4, right: 10, bottom: 0, left: 4 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(120,120,120,.18)" />
                  <XAxis dataKey="titre" interval={0} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} angle={-18} textAnchor="end" height={55} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="candidatures" name="Candidatures" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="acceptees" name="Acceptées" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>}
          </ChartPanel>

          <ChartPanel title="Réussite aux évaluations" subtitle="Part des tentatives terminées avec une note d'au moins 10/20">
            {successData.length === 0 ? <p className="py-14 text-center text-sm text-black/45">Aucune évaluation terminée.</p> : <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={successData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(120,120,120,.18)" />
                  <XAxis dataKey="titre" interval={0} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} angle={-18} textAnchor="end" height={55} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name, item) => [`${value ?? 0}% (${item.payload.reussites}/${item.payload.tentatives})`, 'Réussite']} />
                  <Bar dataKey="taux_reussite" name="Taux de réussite" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>}
          </ChartPanel>

          <ChartPanel title="Notes des formations terminées" subtitle="Moyenne sur 5 étoiles, uniquement lorsque des apprenants ont donné leur avis">
            {ratingData.length === 0 ? <p className="py-14 text-center text-sm text-black/45">Aucun avis publié pour le moment.</p> : <div className="space-y-4">
              {ratingData.map((item, index) => <div key={item.id_formation} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <div className="min-w-0"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold">{item.titre}</span><span className="shrink-0 text-xs text-black/45 dark:text-white/45">{item.avis_count} avis</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"><div className="h-full rounded-full" style={{ width: `${Number(item.note_moyenne) / 5 * 100}%`, backgroundColor: chartColors[index % chartColors.length] }} /></div></div>
                <span className="flex items-center gap-1 text-sm font-black tabular-nums"><Star size={14} fill="currentColor" className="text-amber-500" /> {Number(item.note_moyenne).toFixed(1)}</span>
              </div>)}
            </div>}
          </ChartPanel>
        </div>
      </>}
    </div>
  );
}
