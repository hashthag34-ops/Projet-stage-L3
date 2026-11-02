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
      <div className="custom-tooltip [border-radius:16px] [border:1px_solid_var(--border-color)] [background-color:var(--tooltip-bg)] [padding:14px] [box-shadow:0_10px_25px_var(--shadow-color)] [backdrop-filter:blur(12px)]">
        {label && <p className="tooltip-label [margin:0_0_6px_0] [font-size:12px] [font-weight:700] [color:var(--text-primary)]">{label}</p>}
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="tooltip-item [display:flex] [align-items:center] [gap:8px] [font-size:12px] [font-weight:600] [margin-top:4px]">
            <span className="tooltip-dot [height:8px] [width:8px] [border-radius:50%]" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
            <span className="tooltip-name [color:var(--text-secondary)]">{entry.name}:</span>
            <span className="tooltip-value [font-weight:800] [color:var(--orange-primary)]">
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
    <article className="stat-card [display:flex] [flex-direction:column] [justify-content:space-between] [overflow:hidden] [border-radius:24px] [background-color:var(--panel-bg)] [padding:20px] [box-shadow:0_1px_3px_var(--shadow-color)] [border:1px_solid_var(--border-color)] [transition:all_0.3s] [&:hover]:[box-shadow:0_10px_25px_var(--shadow-color)]">
      <div className="stat-card-header [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px]">
        <div>
          <p className="stat-card-label [font-size:12px] [font-weight:700] [color:var(--text-secondary)] [margin:0]">{label}</p>
          <p className="stat-card-value [margin-top:8px] [font-size:24px] [font-weight:900] [color:var(--text-primary)] [font-variant-numeric:tabular-nums]">{value ?? 0}</p>
        </div>
        <div className="stat-card-icon-wrapper [display:flex] [height:36px] [width:36px] [flex-shrink:0] [align-items:center] [justify-content:center] [border-radius:14px] [background-color:var(--orange-bg-light)] [color:var(--orange-primary)]">
          <Icon size={18} />
        </div>
      </div>
      <p className="stat-card-detail [margin-top:12px] [font-size:11px] [font-weight:600] [color:var(--text-secondary)]">{detail}</p>
    </article>
  );
}

function ChartPanel({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="chart-panel [display:flex] [flex-direction:column] [border-radius:24px] [background-color:var(--panel-bg)] [padding:24px] [box-shadow:0_1px_3px_var(--shadow-color)] [border:1px_solid_var(--border-color)] [transition:all_0.3s]">
      <div className="chart-panel-header [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:16px] [margin-bottom:24px]">
        <div>
          <h2 className="chart-panel-title [display:flex] [align-items:center] [gap:8px] [font-size:14px] [font-weight:700] [color:var(--text-primary)] [margin:0]">
            {Icon && <Icon size={16} className="chart-title-icon [color:var(--orange-primary)]" />}
            {title}
          </h2>
          <p className="chart-panel-subtitle [margin-top:2px] [font-size:11px] [color:var(--text-secondary)]">{subtitle}</p>
        </div>
      </div>
      <div className="chart-panel-body [flex:1]">{children}</div>
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
    <div className="admin-stats-container [display:flex] [flex-direction:column] [gap:32px] [padding:8px_16px] [font-family:inherit] [color:var(--text-primary)] [background-color:var(--stats-bg)] [transition:background-color_0.3s_ease,_color_0.3s_ease] [box-sizing:border-box]">
      
      {/* En-tête principal */}
      <header className="admin-stats-header [display:flex] [flex-direction:column] [justify-content:space-between] [gap:16px]">
        <div>
          <div className="admin-badge [display:inline-flex] [align-items:center] [gap:8px] [padding:4px_12px] [border-radius:9999px] [background-color:var(--orange-bg-light)] [font-size:12px] [font-weight:700] [color:var(--orange-primary)]">
            <Sparkles size={13} /> Panneau Administration
          </div>
          <h1 className="admin-title [margin-top:8px] [font-size:24px] [font-weight:900] [letter-spacing:-0.025em] [color:var(--text-primary)]">Vue statistique globale</h1>
        </div>

        <button
          type="button"
          onClick={loadStatistics}
          disabled={loading}
          aria-label="Actualiser les statistiques"
          title="Actualiser"
          className="refresh-btn [display:inline-flex] [align-items:center] [gap:8px] [padding:10px_16px] [border-radius:16px] [background-color:var(--panel-bg)] [color:var(--text-primary)] [border:1px_solid_var(--border-color)] [font-size:12px] [font-weight:700] [box-shadow:0_1px_2px_var(--shadow-color)] [cursor:pointer] [transition:all_0.2s] [&:hover]:[background-color:var(--hover-bg)]"
        >
          <RefreshCw size={15} className={`refresh-icon ${loading ? 'spinning' : ''}`} />
          <span>Actualiser</span>
        </button>
      </header>

      {/* Message d'erreur */}
      {error && (
        <div role="alert" className="error-banner [padding:16px] [border-radius:16px] [background-color:rgba(239,_68,_68,_0.1)] [color:\#ef4444] [font-size:12px] [font-weight:700] [border:1px_solid_rgba(239,_68,_68,_0.2)]">
          {error}
        </div>
      )}

      {/* Skeletons / Chargement */}
      {loading && !statistics ? (
        <div className="stats-skeleton-wrapper [display:flex] [flex-direction:column] [gap:24px]">
          <div className="stats-grid-4 [display:grid] [gap:16px] [grid-template-columns:1fr]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-card [height:112px] [animation:pulse_2s_cubic-bezier(0.4,_0,_0.6,_1)_infinite] [border-radius:24px] [background-color:var(--skeleton-bg)]" />
            ))}
          </div>
          <div className="stats-grid-2 [display:grid] [gap:24px] [grid-template-columns:1fr]">
            <div className="skeleton-chart [height:320px] [animation:pulse_2s_cubic-bezier(0.4,_0,_0.6,_1)_infinite] [border-radius:24px] [background-color:var(--skeleton-bg)]" />
            <div className="skeleton-chart [height:320px] [animation:pulse_2s_cubic-bezier(0.4,_0,_0.6,_1)_infinite] [border-radius:24px] [background-color:var(--skeleton-bg)]" />
          </div>
        </div>
      ) : statistics && (
        <>
          {/* Cartes KPI */}
          <section className="stats-grid-4 [display:grid] [gap:16px] [grid-template-columns:1fr]">
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
              detail={`${overview.formations_archivees || 0} formation(s) archivée(s) incluse(s)`}
              icon={BookOpen}
            />
          </section>

          {/* Grille de Graphiques Fluides */}
          <div className="stats-grid-2 [display:grid] [gap:24px] [grid-template-columns:1fr]">
            
            {/* 1. AreaChart : Formations créées */}
            <ChartPanel
              title="Formations créées"
              subtitle="Évolution chronologique sur les 12 derniers mois"
              icon={TrendingUp}
            >
              <div className="chart-container [height:256px] [width:100%] [padding-top:8px]">
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
                <div className="chart-empty [display:flex] [height:256px] [align-items:center] [justify-content:center] [font-size:12px] [color:var(--text-secondary)]">Aucune donnée disponible.</div>
              ) : (
                <div className="chart-container [height:256px] [width:100%] [padding-top:8px]">
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
                          <span className="legend-text [font-size:10px] [font-weight:600] [color:var(--text-secondary)]">
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
                <div className="chart-empty [display:flex] [height:256px] [align-items:center] [justify-content:center] [font-size:12px] [color:var(--text-secondary)]">Aucune évaluation terminée.</div>
              ) : (
                <div className="chart-container [height:256px] [width:100%] [padding-top:8px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={successData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#27272a" opacity={0.15} />
                      <XAxis
                        dataKey="titre"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval={0}
                        tickFormatter={(v) => (v.length > 10 ? `${v.substring(0, 8)}...` : v)}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
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
                <div className="chart-empty [display:flex] [height:256px] [align-items:center] [justify-content:center] [font-size:12px] [color:var(--text-secondary)]">Aucun avis publié pour le moment.</div>
              ) : (
                <div className="chart-container [height:256px] [width:100%] [padding-top:8px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={averageRating} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#27272a" opacity={0.15} />
                      <XAxis
                        dataKey="titre"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickFormatter={(v) => (v.length > 10 ? `${v.substring(0, 8)}…` : v)}
                      />
                      <YAxis
                        domain={[0, 5]}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
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

          <section className="admin-ranking-section [display:flex] [flex-direction:column] [gap:16px]">
            <div className="admin-ranking-header">
              <h2><Award size={17} /> Classements des apprenants</h2>
              <p>Classement selon les résultats enregistrés.</p>
            </div>
            <div className="admin-ranking-grid [display:grid] [gap:16px]">
              <ChartPanel title="Classement par formation" subtitle="Moyenne générale des notes des apprenants">
                <div className="admin-ranking-list [max-height:420px] [overflow-y:auto]">
                  {formationRanking.map((formation) => (
                    <div className="admin-ranking-group [border-radius:14px] [background:var(--stat-subbox)] [padding:14px] [margin-bottom:12px]" key={formation.id_formation}>
                      <h3>{formation.titre || formation.formation_titre}</h3>
                      {formation.apprenants.length === 0 ? (
                        <p className="chart-empty [display:flex] [height:256px] [align-items:center] [justify-content:center] [font-size:12px] [color:var(--text-secondary)]">Aucun résultat disponible.</p>
                      ) : formation.apprenants.map((learner, index) => (
                        <div className="admin-ranking-row [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [border-bottom:1px_solid_var(--stat-border)] [padding:9px_0] [font-size:12px]" key={learner.id_apprenant}>
                          <span><b>{index + 1}</b> {learner.prenom} {learner.nom}</span>
                          <strong>{Number(learner.moyenne).toFixed(2)} / 20</strong>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </ChartPanel>

              <ChartPanel title="Classement par évaluation" subtitle="Meilleure note obtenue par apprenant">
                <div className="admin-ranking-list [max-height:420px] [overflow-y:auto]">
                  {evaluationRanking.map((evaluation) => (
                    <div className="admin-ranking-group [border-radius:14px] [background:var(--stat-subbox)] [padding:14px] [margin-bottom:12px]" key={evaluation.id_evaluation_sujet}>
                      <h3>{evaluation.evaluation_titre}</h3>
                      <small>{evaluation.formation_titre}</small>
                      {evaluation.apprenants.length === 0 ? (
                        <p className="chart-empty [display:flex] [height:256px] [align-items:center] [justify-content:center] [font-size:12px] [color:var(--text-secondary)]">Aucun résultat disponible.</p>
                      ) : evaluation.apprenants.map((learner, index) => (
                        <div className="admin-ranking-row [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [border-bottom:1px_solid_var(--stat-border)] [padding:9px_0] [font-size:12px]" key={learner.id_tentative}>
                          <span><b>{index + 1}</b> {learner.prenom} {learner.nom}</span>
                          <strong>{Number(learner.note).toFixed(2)} / 20</strong>
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