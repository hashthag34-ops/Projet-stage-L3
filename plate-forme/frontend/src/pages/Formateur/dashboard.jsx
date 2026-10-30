// frontend/src/pages/Formateur/dashboard.jsx
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import API from '../../services/api';
import '../css/FormateurDashboard.css'; // Importation du CSS classique

export default function FormateurDashboard() {
  const [formations, setFormations] = useState([]);
  const [apprenantStats, setApprenantStats] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    // Chargement parallèle des données du Dashboard
    Promise.all([
      API.get('/formateur/formations').catch(() => ({ data: [] })),
      API.get('/formateur/apprenants/statistiques').catch(() => ({ data: [] })),
      API.get('/formateur/evaluations').catch(() => ({ data: [] }))
    ]).then(([formationsRes, statsRes, evalsRes]) => {
      if (active) {
        setFormations(formationsRes.data || []);
        setApprenantStats(statsRes.data || []);
        setEvaluations(evalsRes.data || []);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, []);

  // Calcul des statistiques cumulées pour les cartes
  const globalMetrics = useMemo(() => {
    const totalApprenants = formations.reduce((acc, curr) => acc + (curr.apprenants_count || 0), 0);
    const totalEvals = evaluations.length;
    const totalTentatives = evaluations.reduce((acc, curr) => acc + (Number(curr.tentatives_count) || 0), 0);
    
    const avgReussite = apprenantStats.length > 0
      ? (apprenantStats.reduce((acc, curr) => acc + (Number(curr.taux_reussite) || 0), 0) / apprenantStats.length).toFixed(1)
      : 0;

    const avgPresence = apprenantStats.length > 0
      ? (apprenantStats.reduce((acc, curr) => acc + (Number(curr.taux_presence) || 0), 0) / apprenantStats.length).toFixed(1)
      : 0;

    return { totalApprenants, totalEvals, totalTentatives, avgReussite, avgPresence };
  }, [formations, apprenantStats, evaluations]);

  // Données préparées pour le graphique Recharts
  const chartData = useMemo(() => {
    if (apprenantStats.length > 0) {
      return apprenantStats.map(stat => ({
        name: stat.formation_titre.length > 12 ? stat.formation_titre.substring(0, 12) + '...' : stat.formation_titre,
        fullTitle: stat.formation_titre,
        Reussite: Number(stat.taux_reussite) || 0,
        Presence: Number(stat.taux_presence) || 0,
      }));
    }
    return [
      { name: 'S1', Reussite: 65, Presence: 85 },
      { name: 'S2', Reussite: 78, Presence: 90 },
      { name: 'S3', Reussite: 82, Presence: 88 },
      { name: 'S4', Reussite: 91, Presence: 95 },
    ];
  }, [apprenantStats]);

  return (
    <div className="formateur-dashboard-container">
      
      {/* HEADER SECTION */}
      <div className="formateur-header-box">
        <div>
          <div className="formateur-badge-overview">
            <i className="bi bi-stars"></i> Vue d'ensemble du formateur
          </div>
          <h1 className="formateur-title">
            Tableau de bord
          </h1>
        </div>

        {/* RACCOURCIS DE NAVIGATION DIRECTE */}
        <div className="formateur-shortcuts-bar">
          <Link
            to="/Formateur/Apprenants"
            className="shortcut-btn"
          >
            <i className="bi bi-people text-orange-500"></i>
            <span>Apprenants</span>
          </Link>

          <Link
            to="/Formateur/Planning"
            className="shortcut-btn"
          >
            <i className="bi bi-calendar-event text-orange-500"></i>
            <span>Planning</span>
          </Link>

          <Link
            to="/Formateur/Forum"
            className="shortcut-btn"
          >
            <i className="bi bi-chat-square-text text-orange-500"></i>
            <span>Forum</span>
          </Link>

          <Link
            to="/Formateur/Evaluations"
            className="shortcut-btn primary"
          >
            <i className="bi bi-clipboard-check text-orange-500"></i>
            <span>Évaluations</span>
          </Link>
        </div>
      </div>

      {/* TOP METRICS CARDS */}
      <div className="formateur-metrics-grid">
        
        {/* Card 1 : Taux de Réussite */}
        <div className="formateur-metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Taux de Réussite</span>
            <div className="metric-icon-wrap">
              <i className="bi bi-award"></i>
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{globalMetrics.avgReussite}%</span>
            <span className="metric-trend">
              <i className="bi bi-trending-up me-0.5"></i> +2.4%
            </span>
          </div>
          <div className="metric-progress-track">
            <div className="metric-progress-fill" style={{ width: `${Math.min(globalMetrics.avgReussite, 100)}%` }} />
          </div>
        </div>

        {/* Card 2 : Taux de Présence */}
        <div className="formateur-metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Taux de Présence</span>
            <div className="metric-icon-wrap">
              <i className="bi bi-check-circle"></i>
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{globalMetrics.avgPresence}%</span>
            <span className="metric-trend">
              <i className="bi bi-trending-up me-0.5"></i> +1.2%
            </span>
          </div>
          <div className="metric-progress-track">
            <div className="metric-progress-fill" style={{ width: `${Math.min(globalMetrics.avgPresence, 100)}%` }} />
          </div>
        </div>

        {/* Card 3 : Évaluations Créées & Tentatives */}
        <div className="formateur-metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Évaluations & Tests</span>
            <div className="metric-icon-wrap">
              <i className="bi bi-clipboard-check"></i>
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{globalMetrics.totalEvals}</span>
            <span className="metric-subtext">sujets ({globalMetrics.totalTentatives} tps)</span>
          </div>
          <p className="metric-footer-note">Suivi actif des compétences</p>
        </div>

        {/* Card 4 : Total Apprenants */}
        <div className="formateur-metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Apprenants Inscrits</span>
            <div className="metric-icon-wrap">
              <i className="bi bi-people"></i>
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{globalMetrics.totalApprenants}</span>
            <span className="metric-subtext">élèves suivis</span>
          </div>
          <p className="metric-footer-note">Répartis sur vos modules</p>
        </div>

      </div>

      {/* SECTION GRAPHIQUE + BANNÈRE */}
      <div className="formateur-main-grid">
        
        {/* GRAPHIQUE */}
        <div className="formateur-chart-panel">
          <div className="chart-header-row">
            <div>
              <h2 className="chart-title">Performances par Module</h2>
              <p className="chart-subtitle">Comparatif réussite et assiduité en temps réel</p>
            </div>
            <div className="chart-legend-box">
              <span className="legend-item"><span className="legend-dot success"></span> Réussite</span>
              <span className="legend-item"><span className="legend-dot presence"></span> Présence</span>
            </div>
          </div>

          <div className="chart-container-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReussite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPresence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderRadius: '16px', border: '1px solid #27272a', color: '#fff', fontSize: '11px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Reussite" 
                  stroke="#71717a" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorReussite)" 
                  isAnimationActive={true}
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="Presence" 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorPresence)" 
                  isAnimationActive={true}
                  animationDuration={1800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BANNIÈRE LATÉRALE */}
        <div className="formateur-banner-card">
          <div>
            <div className="banner-top-row">
              <div className="banner-icon-wrap">
                <i className="bi bi-stars"></i>
              </div>
              <span className="banner-badge">
                Espace Formateur
              </span>
            </div>
            <h3 className="banner-heading">Module d'évaluation Pédagogique</h3>
            <p className="banner-desc">
              Consultez les résultats de vos étudiants, attribuez des notes et publiez de nouvelles évaluations en toute simplicité.
            </p>
          </div>

          <div className="banner-action-box">
            <Link
              to="/Formateur/Evaluations"
              className="banner-cta-btn"
            >
              Gérer les évaluations
            </Link>
          </div>
        </div>

      </div>

      {/* LISTE DES FORMATIONS ASSIGNÉES */}
      <section className="formateur-formations-section">
        <div className="formations-section-header">
          <div className="formations-title-row">
            <i className="bi bi-book text-orange-500"></i>
            <h2 className="formations-section-title">Formations qui vous sont assignées</h2>
          </div>
          <span className="formations-count-badge">{formations.length} module(s)</span>
        </div>

        {loading ? (
          <p className="formations-loading-text">Chargement des formations...</p>
        ) : formations.length === 0 ? (
          <div className="formations-empty-box">
            Aucune formation ne vous est assignée pour le moment.
          </div>
        ) : (
          <div className="formations-cards-grid">
            {formations.map((formation) => (
              <div 
                key={formation.id_formation} 
                className="formation-card-item"
              >
                <div>
                  <div className="formation-card-top">
                    <h3 className="formation-card-name">{formation.titre}</h3>
                    <span className="formation-card-status">
                      {formation.statut || 'En cours'}
                    </span>
                  </div>
                  <p className="formation-card-desc">
                    {formation.description || 'Aucune description fournie.'}
                  </p>
                </div>

                <div className="formation-card-footer">
                  <div className="formation-learners-info">
                    <i className="bi bi-people text-orange-500"></i>
                    <span>{formation.apprenants_count || 0} apprenant(s)</span>
                  </div>
                  <span className="formation-readonly-tag">Lecture seule</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}