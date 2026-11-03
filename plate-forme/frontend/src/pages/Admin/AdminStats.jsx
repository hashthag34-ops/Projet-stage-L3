// frontend/src/pages/AdminStats.jsx
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
  Line,
  LineChart,
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

// Tooltip sur-mesure stylé Zinc / Blanc / Orange
const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
        {label && <p className="mb-1.5 text-xs font-bold text-zinc-900 dark:text-white">{label}</p>}
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2 text-xs font-semibold mt-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
            <span className="text-zinc-500 dark:text-zinc-400">{entry.name}:</span>
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
    <article className="flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-black text-zinc-900 dark:text-white tabular-nums">{value ?? 0}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{detail}</p>
    </article>
  );
}

function ChartPanel({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs transition dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
            {Icon && <Icon size={16} className="text-orange-500" />}
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
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
      .filter((item) => Number(item.tentatives) > 0),
    [statistics]
  );

  const formationRanking = statistics?.formationRanking || [];
  const evaluationRanking = statistics?.evaluationRanking || [];

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-6 px-3 py-6 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:px-6">
      
      {/* En-tête principal */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
            <Sparkles size={14} /> Panneau Administration
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">Vue statistique globale</h1>
        </div>

        <button
          type="button"
          onClick={loadStatistics}
          disabled={loading}
          aria-label="Actualiser les statistiques"
          title="Actualiser"
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Actualiser</span>
        </button>
      </header>

      {/* Message d'erreur */}
      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Skeletons / Chargement */}
      {loading && !statistics ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-80 animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      ) : statistics && (
        <>
          {/* Cartes KPI */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            <StatCard
              label="Formations"
              value={overview.formations}
              detail={`${overview.formations_archivees || 0} archivée(s)`}
              icon={BookOpen}
            />
          </section>

          {/* Grille de Graphiques Fluides */}
          <div className="grid gap-6 lg:grid-cols-2">
            
            {/* 1. AreaChart : Formations créées */}
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
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#71717a" opacity={0.15} />
                    <XAxis
                      dataKey="libelle"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#71717a' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#71717a' }}
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
                <div className="flex h-64 items-center justify-center text-xs text-zinc-500">Aucune donnée disponible.</div>
              ) : (
                <div className="h-64 w-full pt-2">
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
                          <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                            {value.length > 18 ? `${value.substring(0, 18)}…` : value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>

            {/* 3. AreaChart : Taux de Réussite aux Évaluations */}
            <ChartPanel
              title="Taux de Réussite aux Évaluations"
              subtitle="Note moyenne ≥ 10/20 par formation"
              icon={CheckCircle2}
            >
              {successData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-zinc-500">Aucune évaluation terminée.</div>
              ) : (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={successData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#71717a" opacity={0.15} />
                      <XAxis
                        dataKey="titre"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#71717a' }}
                        interval={0}
                        tickFormatter={(v) => (v.length > 10 ? `${v.substring(0, 8)}...` : v)}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#71717a' }}
                      />
                      <Tooltip content={<CustomTooltip suffix="%" />} />
                      <Area
                        type="monotone"
                        dataKey="taux_reussite"
                        name="Taux de réussite"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorSuccess)"
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>

            {/* 4. LineChart : Appréciation des Apprenants */}
            <ChartPanel
              title="Appréciation des Apprenants"
              subtitle="Notes moyennes attribuées (sur 5 étoiles)"
              icon={Star}
            >
              {averageRating.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-zinc-500">Aucun avis publié pour le moment.</div>
              ) : (
                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={averageRating} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#71717a" opacity={0.15} />
                      <XAxis
                        dataKey="titre"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#71717a' }}
                        tickFormatter={(v) => (v.length > 10 ? `${v.substring(0, 8)}…` : v)}
                      />
                      <YAxis
                        domain={[0, 5]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#71717a' }}
                      />
                      <Tooltip content={<CustomTooltip suffix="/ 5" />} />
                      <Line
                        type="monotone"
                        dataKey="note_moyenne"
                        name="Note moyenne"
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f97316' }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>

          </div>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-orange-500" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Classements des apprenants</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <ChartPanel title="Classement par formation" subtitle="Moyenne générale des notes des apprenants">
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {formationRanking.map((formation) => (
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40" key={formation.id_formation}>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-white mb-2">{formation.titre || formation.formation_titre}</h3>
                      {formation.apprenants.length === 0 ? (
                        <p className="py-2 text-xs text-zinc-500">Aucun résultat disponible.</p>
                      ) : formation.apprenants.map((learner, index) => (
                        <div className="flex items-center justify-between gap-3 border-b border-zinc-200/60 py-2 last:border-b-0 text-xs dark:border-zinc-700/50" key={learner.id_apprenant}>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300"><strong className="text-orange-600 dark:text-orange-400 mr-1.5">#{index + 1}</strong> {learner.prenom} {learner.nom}</span>
                          <strong className="font-black text-zinc-900 dark:text-white">{Number(learner.moyenne).toFixed(2)} / 20</strong>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ChartPanel>

              <ChartPanel title="Classement par évaluation" subtitle="Meilleure note obtenue par apprenant">
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {evaluationRanking.map((evaluation) => (
                    <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40" key={evaluation.id_evaluation_sujet}>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-white">{evaluation.evaluation_titre}</h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">{evaluation.formation_titre}</p>
                      {evaluation.apprenants.length === 0 ? (
                        <p className="py-2 text-xs text-zinc-500">Aucun résultat disponible.</p>
                      ) : evaluation.apprenants.map((learner, index) => (
                        <div className="flex items-center justify-between gap-3 border-b border-zinc-200/60 py-2 last:border-b-0 text-xs dark:border-zinc-700/50" key={learner.id_tentative}>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300"><strong className="text-orange-600 dark:text-orange-400 mr-1.5">#{index + 1}</strong> {learner.prenom} {learner.nom}</span>
                          <strong className="font-black text-zinc-900 dark:text-white">{Number(learner.note).toFixed(2)} / 20</strong>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ChartPanel>
            </div>
          </section>
        </>
      )}
    </div>
  );
}