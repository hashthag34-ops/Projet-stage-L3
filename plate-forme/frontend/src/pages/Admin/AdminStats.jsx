import React, { useEffect, useState, useMemo } from 'react';
import { 
  Activity, 
  Award, 
  RefreshCw, 
  Star, 
  Users, 
  Sparkles, 
  TrendingUp, 
  GraduationCap, 
  CheckCircle2, 
  BookOpen,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import API from '../../services/api';

const ORANGE_PALETTE = [
  '#f97316', // Orange principal ODC
  '#fb923c', // Orange clair
  '#ea580c', // Orange foncé
  '#c2410c', // Orange très foncé
  '#fdba74', // Orange doux
  '#71717a', // Zinc neutre
  '#27272a', // Zinc sombre
];

const monthName = (month) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' });

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40';

// Tooltip sur-mesure stylé Noir / Blanc / Orange
const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
        {label && <p className="mb-1.5 text-xs font-bold text-slate-900 dark:text-white">{label}</p>}
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="text-slate-500 dark:text-zinc-400">{entry.name}:</span>
            <span className="font-extrabold text-orange-600 dark:text-orange-400">
              {entry.value} {suffix}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-zinc-900/90 dark:border dark:border-zinc-800/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black text-slate-900 tabular-nums dark:text-white">
            {value ?? 0}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">{detail}</p>
    </article>
  );
}

function ChartPanel({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="flex flex-col rounded-3xl bg-white p-6 shadow-sm transition-all dark:bg-zinc-900/90 dark:border dark:border-zinc-800/80">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            {Icon && <Icon size={16} className="text-orange-500" />}
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

export default function AdminStats() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStatistics = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.get('/admin/statistics');
      setStatistics(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || 'Impossible de charger les statistiques.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  const overview = statistics?.overview || {};
  const averageRating = useMemo(() => 
    statistics?.ratingsByFormation?.filter((item) => Number(item.avis_count) > 0) || [],
    [statistics]
  );
  
  const totalReviews = useMemo(() => 
    averageRating.reduce((sum, item) => sum + Number(item.avis_count), 0),
    [averageRating]
  );
  
  const weightedRating = useMemo(() => 
    totalReviews
      ? averageRating.reduce((sum, item) => sum + Number(item.note_moyenne) * Number(item.avis_count), 0) / totalReviews
      : null,
    [averageRating, totalReviews]
  );

  const monthlyData = useMemo(() => 
    statistics?.formationsByMonth?.map((item) => ({
      ...item,
      libelle: monthName(item.mois),
    })) || [],
    [statistics]
  );

  const applicationData = useMemo(() => 
    statistics?.applicationsByFormation || [],
    [statistics]
  );

  const successData = useMemo(() => 
    (statistics?.successByFormation || [])
      .filter((item) => Number(item.tentatives) > 0)
      .map((item, idx) => ({
        ...item,
        fill: ORANGE_PALETTE[idx % ORANGE_PALETTE.length],
      })),
    [statistics]
  );

  return (
    <div className="space-y-8 p-2 sm:p-4 font-sans text-slate-800 dark:text-zinc-100 transition-colors duration-300">
      
      {/* En-tête principal */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <Sparkles size={13} /> Panneau Administration
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Vue statistique globale
          </h1>
        </div>

        <button
          type="button"
          onClick={loadStatistics}
          disabled={loading}
          aria-label="Actualiser les statistiques"
          title="Actualiser"
          className={`inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 ${focusRing}`}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin text-orange-500' : 'text-orange-500'} />
          <span>Actualiser</span>
        </button>
      </header>

      {/* Message d'erreur */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400"
        >
          {error}
        </div>
      )}

      {/* Skeletons / Chargement */}
      {loading && !statistics ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-zinc-800/50" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-zinc-800/50" />
            <div className="h-80 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-zinc-800/50" />
          </div>
        </div>
      ) : statistics && (
        <>
          {/* Cartes KPI */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Comptes Utilisateurs"
              value={overview.utilisateurs}
              detail={`${overview.apprenants || 0} apprenants inscrits`}
              icon={Users}
            />
            <StatCard
              label="Formateurs & Staff"
              value={overview.formateurs}
              detail={`${overview.responsables || 0} responsables ODC`}
              icon={GraduationCap}
            />
            <StatCard
              label="Total Candidatures"
              value={applicationData.reduce((sum, item) => sum + Number(item.candidatures), 0)}
              detail={`${overview.administrateurs || 0} administrateurs`}
              icon={Award}
            />
            <StatCard
              label="Avis Formations"
              value={totalReviews}
              detail={
                weightedRating === null
                  ? 'Aucune note disponible'
                  : `Moyenne : ${weightedRating.toFixed(1)} / 5 ★`
              }
              icon={Star}
            />
          </section>

          {/* Grille de Graphiques Stylés (Même style Recharts animé du Dashboard) */}
          <div className="grid gap-6 lg:grid-cols-2">
            
            {/* 1. AreaChart : Formations créées (Identique au Dashboard) */}
            <ChartPanel
              title="Formations créées"
              subtitle="Évolution chronologique sur les 12 derniers mois"
              icon={TrendingUp}
            >
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="colorOrangeStats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#27272a" opacity={0.15} />
                    <XAxis
                      dataKey="libelle"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                    />
                    <Tooltip content={<CustomTooltip suffix="formation(s)" />} />
                    <Area
                      type="monotone"
                      dataKey="formations"
                      name="Formations"
                      stroke="#f97316"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorOrangeStats)"
                      isAnimationActive={true}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>

            {/* 2. PieChart (Donut) : Répartition des Candidatures */}
            <ChartPanel
              title="Répartition des Candidatures"
              subtitle="Volume de candidatures reçues par formation"
              icon={PieChartIcon}
            >
              {applicationData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-400">
                  Aucune donnée disponible.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={applicationData}
                        dataKey="candidatures"
                        nameKey="titre"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        cornerRadius={6}
                        isAnimationActive={true}
                      >
                        {applicationData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={ORANGE_PALETTE[index % ORANGE_PALETTE.length]}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip suffix="candidature(s)" />} />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                            {value.length > 18 ? `${value.substring(0, 18)}…` : value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>

            {/* 3. BarChart : Réussite aux Évaluations */}
            <ChartPanel
              title="Taux de Réussite aux Évaluations"
              subtitle="Note moyenne ≥ 10/20 par formation"
              icon={CheckCircle2}
            >
              {successData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-400">
                  Aucune évaluation terminée.
                </div>
              ) : (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={successData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#27272a" opacity={0.15} />
                      <XAxis
                        dataKey="titre"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval={0}
                        tickFormatter={(v) => (v.length > 12 ? `${v.substring(0, 10)}...` : v)}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                      />
                      <Tooltip content={<CustomTooltip suffix="%" />} />
                      <Bar
                        dataKey="taux_reussite"
                        name="Taux de réussite"
                        radius={[6, 6, 0, 0]}
                        barSize={24}
                        isAnimationActive={true}
                        animationDuration={1500}
                      >
                        {successData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>

            {/* 4. Horizontal BarChart : Notes Moyennes des Formations */}
            <ChartPanel
              title="Appréciation des Apprenants"
              subtitle="Notes moyennes attribuées (sur 5 étoiles)"
              icon={Star}
            >
              {averageRating.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-400">
                  Aucun avis publié pour le moment.
                </div>
              ) : (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={averageRating}
                      margin={{ top: 5, right: 20, bottom: 5, left: 30 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#27272a" opacity={0.15} />
                      <XAxis
                        type="number"
                        domain={[0, 5]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                      />
                      <YAxis
                        dataKey="titre"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickFormatter={(v) => (v.length > 14 ? `${v.substring(0, 12)}…` : v)}
                      />
                      <Tooltip content={<CustomTooltip suffix="/ 5" />} />
                      <Bar
                        dataKey="note_moyenne"
                        name="Note moyenne"
                        fill="#f97316"
                        radius={[0, 6, 6, 0]}
                        barSize={18}
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>

          </div>
        </>
      )}
    </div>
  );
}