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
import '../css/AdminStats.css'; // Importation du CSS classique

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
      <div className="custom-tooltip">
        {label && <p className="tooltip-label">{label}</p>}
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="tooltip-item">
            <span className="tooltip-dot" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
            <span className="tooltip-name">{entry.name}:</span>
            <span className="tooltip-value">
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
    <article className="stat-card">
      <div className="stat-card-header">
        <div>
          <p className="stat-card-label">{label}</p>
          <p className="stat-card-value">{value ?? 0}</p>
        </div>
        <div className="stat-card-icon-wrapper">
          <Icon size={18} />
        </div>
      </div>
      <p className="stat-card-detail">{detail}</p>
    </article>
  );
}

function ChartPanel({ title, subtitle, icon: Icon, children }) {
  return (
    <section className="chart-panel">
      <div className="chart-panel-header">
        <div>
          <h2 className="chart-panel-title">
            {Icon && <Icon size={16} className="chart-title-icon" />}
            {title}
          </h2>
          <p className="chart-panel-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="chart-panel-body">{children}</div>
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

  return (
    <div className="admin-stats-container">
      
      {/* En-tête principal */}
      <header className="admin-stats-header">
        <div>
          <div className="admin-badge">
            <Sparkles size={13} /> Panneau Administration
          </div>
          <h1 className="admin-title">Vue statistique globale</h1>
        </div>

        <button
          type="button"
          onClick={loadStatistics}
          disabled={loading}
          aria-label="Actualiser les statistiques"
          title="Actualiser"
          className="refresh-btn"
        >
          <RefreshCw size={15} className={`refresh-icon ${loading ? 'spinning' : ''}`} />
          <span>Actualiser</span>
        </button>
      </header>

      {/* Message d'erreur */}
      {error && (
        <div role="alert" className="error-banner">
          {error}
        </div>
      )}

      {/* Skeletons / Chargement */}
      {loading && !statistics ? (
        <div className="stats-skeleton-wrapper">
          <div className="stats-grid-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
          <div className="stats-grid-2">
            <div className="skeleton-chart" />
            <div className="skeleton-chart" />
          </div>
        </div>
      ) : statistics && (
        <>
          {/* Cartes KPI */}
          <section className="stats-grid-4">
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

          {/* Grille de Graphiques Fluides */}
          <div className="stats-grid-2">
            
            {/* 1. AreaChart : Formations créées */}
            <ChartPanel
              title="Formations créées"
              subtitle="Évolution chronologique sur les 12 derniers mois"
              icon={TrendingUp}
            >
              <div className="chart-container">
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
                <div className="chart-empty">Aucune donnée disponible.</div>
              ) : (
                <div className="chart-container">
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
                          <span className="legend-text">
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
                <div className="chart-empty">Aucune évaluation terminée.</div>
              ) : (
                <div className="chart-container">
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
                <div className="chart-empty">Aucun avis publié pour le moment.</div>
              ) : (
                <div className="chart-container">
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
        </>
      )}
    </div>
  );
}