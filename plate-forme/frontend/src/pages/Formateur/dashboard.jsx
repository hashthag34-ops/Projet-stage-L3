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
    <div className="formateur-dashboard-container [display:flex] [flex-direction:column] [gap:24px] [padding:12px_12px_48px_12px] [max-width:1280px] [margin:0_auto] [font-family:inherit] [color:var(--fd-text)] [background-color:var(--fd-bg)] [box-sizing:border-box] [min-height:100vh] [transition:background-color_0.3s_ease,_color_0.3s_ease]">
      
      {/* HEADER SECTION */}
      <div className="formateur-header-box [display:flex] [flex-direction:column] [gap:16px]">
        <div>
          <div className="formateur-badge-overview [display:inline-flex] [align-items:center] [gap:8px] [border-radius:9999px] [background-color:var(--orange-bg-light)] [padding:4px_12px] [font-size:11px] [font-weight:800] [color:var(--orange-primary)]">
            <i className="bi bi-stars"></i> Vue d'ensemble du formateur
          </div>
          <h1 className="formateur-title [margin:8px_0_0_0] [font-size:24px] [font-weight:900] [letter-spacing:-0.025em] [color:var(--fd-text)]">
            Tableau de bord
          </h1>
        </div>

        {/* RACCOURCIS DE NAVIGATION DIRECTE */}
        <div className="formateur-shortcuts-bar [display:flex] [flex-wrap:wrap] [align-items:center] [gap:8px]">
          <Link
            to="/Formateur/Apprenants"
            className="shortcut-btn [display:flex] [align-items:center] [gap:8px] [border-radius:16px] [background-color:var(--fd-panel)] [padding:10px_14px] [font-size:12px] [font-weight:800] [color:var(--fd-text)] [box-shadow:0_1px_3px_var(--shadow-color)] [text-decoration:none] [border:1px_solid_var(--fd-border)] [transition:background-color_0.2s] [box-sizing:border-box] [&:hover]:[background-color:var(--fd-hover)]"
          >
            <i className="bi bi-people text-orange-500"></i>
            <span>Apprenants</span>
          </Link>

          <Link
            to="/Formateur/Planning"
            className="shortcut-btn [display:flex] [align-items:center] [gap:8px] [border-radius:16px] [background-color:var(--fd-panel)] [padding:10px_14px] [font-size:12px] [font-weight:800] [color:var(--fd-text)] [box-shadow:0_1px_3px_var(--shadow-color)] [text-decoration:none] [border:1px_solid_var(--fd-border)] [transition:background-color_0.2s] [box-sizing:border-box] [&:hover]:[background-color:var(--fd-hover)]"
          >
            <i className="bi bi-calendar-event text-orange-500"></i>
            <span>Planning</span>
          </Link>

          <Link
            to="/Formateur/Forum"
            className="shortcut-btn [display:flex] [align-items:center] [gap:8px] [border-radius:16px] [background-color:var(--fd-panel)] [padding:10px_14px] [font-size:12px] [font-weight:800] [color:var(--fd-text)] [box-shadow:0_1px_3px_var(--shadow-color)] [text-decoration:none] [border:1px_solid_var(--fd-border)] [transition:background-color_0.2s] [box-sizing:border-box] [&:hover]:[background-color:var(--fd-hover)]"
          >
            <i className="bi bi-chat-square-text text-orange-500"></i>
            <span>Forum</span>
          </Link>

          <Link
            to="/Formateur/Evaluations"
            className="shortcut-btn [display:flex] [align-items:center] [gap:8px] [border-radius:16px] [background-color:var(--fd-panel)] [padding:10px_14px] [font-size:12px] [font-weight:800] [color:var(--fd-text)] [box-shadow:0_1px_3px_var(--shadow-color)] [text-decoration:none] [border:1px_solid_var(--fd-border)] [transition:background-color_0.2s] [box-sizing:border-box] [&:hover]:[background-color:var(--fd-hover)] primary"
          >
            <i className="bi bi-clipboard-check text-orange-500"></i>
            <span>Évaluations</span>
          </Link>
        </div>
      </div>

      {/* TOP METRICS CARDS */}
      <div className="formateur-metrics-grid [display:grid] [gap:16px] [grid-template-columns:1fr]">
        
        {/* Card 1 : Taux de Réussite */}
        <div className="formateur-metric-card [position:relative] [overflow:hidden] [border-radius:24px] [background-color:var(--fd-panel)] [padding:20px] [border:1px_solid_var(--fd-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box] [transition:transform_0.2s,_box-shadow_0.2s] [&:hover]:[box-shadow:0_8px_20px_var(--shadow-color)]">
          <div className="metric-card-top [display:flex] [align-items:center] [justify-content:space-between]">
            <span className="metric-label [font-size:11px] [font-weight:700] [color:var(--fd-muted)] [text-transform:uppercase] [letter-spacing:0.05em]">Taux de Réussite</span>
            <div className="metric-icon-wrap [display:flex] [height:32px] [width:32px] [align-items:center] [justify-content:center] [border-radius:12px] [background-color:var(--orange-bg-light)] [color:var(--orange-primary)]">
              <i className="bi bi-award"></i>
            </div>
          </div>
          <div className="metric-value-row [margin-top:16px] [display:flex] [align-items:baseline] [gap:8px]">
            <span className="metric-value [font-size:24px] [font-weight:900] [color:var(--fd-text)]">{globalMetrics.avgReussite}%</span>
            <span className="metric-trend [font-size:11px] [font-weight:800] [color:var(--orange-primary)] [display:flex] [align-items:center]">
              <i className="bi bi-trending-up me-0.5"></i> +2.4%
            </span>
          </div>
          <div className="metric-progress-track [margin-top:12px] [height:6px] [width:100%] [overflow:hidden] [border-radius:9999px] [background-color:var(--fd-border)]">
            <div className="metric-progress-fill [height:100%] [border-radius:9999px] [background-color:var(--orange-primary)] [transition:width_1s_ease]" style={{ width: `${Math.min(globalMetrics.avgReussite, 100)}%` }} />
          </div>
        </div>

        {/* Card 2 : Taux de Présence */}
        <div className="formateur-metric-card [position:relative] [overflow:hidden] [border-radius:24px] [background-color:var(--fd-panel)] [padding:20px] [border:1px_solid_var(--fd-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box] [transition:transform_0.2s,_box-shadow_0.2s] [&:hover]:[box-shadow:0_8px_20px_var(--shadow-color)]">
          <div className="metric-card-top [display:flex] [align-items:center] [justify-content:space-between]">
            <span className="metric-label [font-size:11px] [font-weight:700] [color:var(--fd-muted)] [text-transform:uppercase] [letter-spacing:0.05em]">Taux de Présence</span>
            <div className="metric-icon-wrap [display:flex] [height:32px] [width:32px] [align-items:center] [justify-content:center] [border-radius:12px] [background-color:var(--orange-bg-light)] [color:var(--orange-primary)]">
              <i className="bi bi-check-circle"></i>
            </div>
          </div>
          <div className="metric-value-row [margin-top:16px] [display:flex] [align-items:baseline] [gap:8px]">
            <span className="metric-value [font-size:24px] [font-weight:900] [color:var(--fd-text)]">{globalMetrics.avgPresence}%</span>
            <span className="metric-trend [font-size:11px] [font-weight:800] [color:var(--orange-primary)] [display:flex] [align-items:center]">
              <i className="bi bi-trending-up me-0.5"></i> +1.2%
            </span>
          </div>
          <div className="metric-progress-track [margin-top:12px] [height:6px] [width:100%] [overflow:hidden] [border-radius:9999px] [background-color:var(--fd-border)]">
            <div className="metric-progress-fill [height:100%] [border-radius:9999px] [background-color:var(--orange-primary)] [transition:width_1s_ease]" style={{ width: `${Math.min(globalMetrics.avgPresence, 100)}%` }} />
          </div>
        </div>

        {/* Card 3 : Évaluations Créées & Tentatives */}
        <div className="formateur-metric-card [position:relative] [overflow:hidden] [border-radius:24px] [background-color:var(--fd-panel)] [padding:20px] [border:1px_solid_var(--fd-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box] [transition:transform_0.2s,_box-shadow_0.2s] [&:hover]:[box-shadow:0_8px_20px_var(--shadow-color)]">
          <div className="metric-card-top [display:flex] [align-items:center] [justify-content:space-between]">
            <span className="metric-label [font-size:11px] [font-weight:700] [color:var(--fd-muted)] [text-transform:uppercase] [letter-spacing:0.05em]">Évaluations & Tests</span>
            <div className="metric-icon-wrap [display:flex] [height:32px] [width:32px] [align-items:center] [justify-content:center] [border-radius:12px] [background-color:var(--orange-bg-light)] [color:var(--orange-primary)]">
              <i className="bi bi-clipboard-check"></i>
            </div>
          </div>
          <div className="metric-value-row [margin-top:16px] [display:flex] [align-items:baseline] [gap:8px]">
            <span className="metric-value [font-size:24px] [font-weight:900] [color:var(--fd-text)]">{globalMetrics.totalEvals}</span>
            <span className="metric-subtext [font-size:11px] [font-weight:600] [color:var(--fd-muted)]">sujets ({globalMetrics.totalTentatives} tps)</span>
          </div>
          <p className="metric-footer-note [margin:12px_0_0_0] [font-size:10px] [font-weight:700] [color:var(--orange-primary)] [text-transform:uppercase] [letter-spacing:0.05em]">Suivi actif des compétences</p>
        </div>

        {/* Card 4 : Total Apprenants */}
        <div className="formateur-metric-card [position:relative] [overflow:hidden] [border-radius:24px] [background-color:var(--fd-panel)] [padding:20px] [border:1px_solid_var(--fd-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box] [transition:transform_0.2s,_box-shadow_0.2s] [&:hover]:[box-shadow:0_8px_20px_var(--shadow-color)]">
          <div className="metric-card-top [display:flex] [align-items:center] [justify-content:space-between]">
            <span className="metric-label [font-size:11px] [font-weight:700] [color:var(--fd-muted)] [text-transform:uppercase] [letter-spacing:0.05em]">Apprenants Inscrits</span>
            <div className="metric-icon-wrap [display:flex] [height:32px] [width:32px] [align-items:center] [justify-content:center] [border-radius:12px] [background-color:var(--orange-bg-light)] [color:var(--orange-primary)]">
              <i className="bi bi-people"></i>
            </div>
          </div>
          <div className="metric-value-row [margin-top:16px] [display:flex] [align-items:baseline] [gap:8px]">
            <span className="metric-value [font-size:24px] [font-weight:900] [color:var(--fd-text)]">{globalMetrics.totalApprenants}</span>
            <span className="metric-subtext [font-size:11px] [font-weight:600] [color:var(--fd-muted)]">élèves suivis</span>
          </div>
          <p className="metric-footer-note [margin:12px_0_0_0] [font-size:10px] [font-weight:700] [color:var(--orange-primary)] [text-transform:uppercase] [letter-spacing:0.05em]">Répartis sur vos modules</p>
        </div>

      </div>

      {/* SECTION GRAPHIQUE + BANNÈRE */}
      <div className="formateur-main-grid [display:grid] [gap:24px] [grid-template-columns:1fr]">
        
        {/* GRAPHIQUE */}
        <div className="formateur-chart-panel [border-radius:24px] [background-color:var(--fd-panel)] [padding:24px] [border:1px_solid_var(--fd-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box]">
          <div className="chart-header-row [margin-bottom:24px] [display:flex] [flex-direction:column] [gap:12px]">
            <div>
              <h2 className="chart-title [margin:0] [font-size:15px] [font-weight:800] [color:var(--fd-text)]">Performances par Module</h2>
              <p className="chart-subtitle [margin:2px_0_0_0] [font-size:11px] [color:var(--fd-muted)]">Comparatif réussite et assiduité en temps réel</p>
            </div>
            <div className="chart-legend-box [display:flex] [align-items:center] [gap:12px] [font-size:11px] [font-weight:700]">
              <span className="legend-item [display:flex] [align-items:center] [gap:6px]"><span className="legend-dot [height:8px] [width:8px] [border-radius:50%] [flex-shrink:0] success"></span> Réussite</span>
              <span className="legend-item [display:flex] [align-items:center] [gap:6px]"><span className="legend-dot [height:8px] [width:8px] [border-radius:50%] [flex-shrink:0] presence"></span> Présence</span>
            </div>
          </div>

          <div className="chart-container-box [height:250px] [width:100%]">
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
        <div className="formateur-banner-card [position:relative] [display:flex] [flex-direction:column] [justify-content:space-between] [overflow:hidden] [border-radius:24px] [background:linear-gradient(135deg,_\#18181b_0%,_\#09090b_100%)] [padding:24px] [color:\#ffffff] [box-shadow:0_10px_30px_var(--shadow-color)] [border:1px_solid_var(--fd-border)] [box-sizing:border-box]">
          <div>
            <div className="banner-top-row [display:flex] [align-items:center] [justify-content:space-between]">
              <div className="banner-icon-wrap [display:flex] [height:36px] [width:36px] [align-items:center] [justify-content:center] [border-radius:12px] [background-color:rgba(255,_255,_255,_0.1)] [backdrop-filter:blur(4px)] [color:\#fb923c]">
                <i className="bi bi-stars"></i>
              </div>
              <span className="banner-badge [border-radius:9999px] [background-color:rgba(249,_115,_22,_0.2)] [padding:4px_12px] [font-size:10px] [font-weight:800] [color:\#fed7aa] [backdrop-filter:blur(4px)]">
                Espace Formateur
              </span>
            </div>
            <h3 className="banner-heading [margin:20px_0_0_0] [font-size:18px] [font-weight:900] [line-height:1.3]">Module d'évaluation Pédagogique</h3>
            <p className="banner-desc [margin:8px_0_0_0] [font-size:12px] [color:\#a1a1aa] [line-height:1.5]">
              Consultez les résultats de vos étudiants, attribuez des notes et publiez de nouvelles évaluations en toute simplicité.
            </p>
          </div>

          <div className="banner-action-box [margin-top:24px]">
            <Link
              to="/Formateur/Evaluations"
              className="banner-cta-btn [display:flex] [width:100%] [align-items:center] [justify-content:center] [border-radius:16px] [background-color:rgba(255,_255,_255,_0.1)] [padding:12px] [font-size:12px] [font-weight:800] [color:\#ffffff] [text-decoration:none] [backdrop-filter:blur(4px)] [transition:background-color_0.2s] [box-sizing:border-box] [&:hover]:[background-color:rgba(255,_255,_255,_0.2)]"
            >
              Gérer les évaluations
            </Link>
          </div>
        </div>

      </div>

      {/* LISTE DES FORMATIONS ASSIGNÉES */}
      <section className="formateur-formations-section [display:flex] [flex-direction:column] [gap:16px]">
        <div className="formations-section-header [display:flex] [align-items:center] [justify-content:space-between]">
          <div className="formations-title-row [display:flex] [align-items:center] [gap:8px]">
            <i className="bi bi-book text-orange-500"></i>
            <h2 className="formations-section-title [margin:0] [font-size:15px] [font-weight:800] [color:var(--fd-text)]">Formations qui vous sont assignées</h2>
          </div>
          <span className="formations-count-badge [font-size:12px] [font-weight:700] [color:var(--fd-muted)]">{formations.length} module(s)</span>
        </div>

        {loading ? (
          <p className="formations-loading-text [padding:32px_0] [text-align:center] [font-size:12px] [color:var(--fd-muted)]">Chargement des formations...</p>
        ) : formations.length === 0 ? (
          <div className="formations-empty-box [border-radius:24px] [border:2px_dashed_var(--fd-border)] [background-color:var(--fd-panel)] [padding:32px] [text-align:center] [font-size:12px] [color:var(--fd-muted)]">
            Aucune formation ne vous est assignée pour le moment.
          </div>
        ) : (
          <div className="formations-cards-grid [display:grid] [gap:16px] [grid-template-columns:1fr]">
            {formations.map((formation) => (
              <div 
                key={formation.id_formation} 
                className="formation-card-item [display:flex] [flex-direction:column] [justify-content:space-between] [border-radius:24px] [background-color:var(--fd-panel)] [padding:20px] [border:1px_solid_var(--fd-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box] [transition:transform_0.2s,_box-shadow_0.2s] [&:hover]:[box-shadow:0_8px_20px_var(--shadow-color)]"
              >
                <div>
                  <div className="formation-card-top [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px]">
                    <h3 className="formation-card-name [margin:0] [font-size:14px] [font-weight:800] [color:var(--fd-text)]">{formation.titre}</h3>
                    <span className="formation-card-status [flex-shrink:0] [border-radius:9999px] [background-color:var(--orange-bg-light)] [padding:2px_10px] [font-size:10px] [font-weight:800] [color:var(--orange-primary)]">
                      {formation.statut || 'En cours'}
                    </span>
                  </div>
                  <p className="formation-card-desc [margin:8px_0_0_0] [font-size:12px] [color:var(--fd-muted)] [line-height:1.4] [display:-webkit-box] [-webkit-line-clamp:2] [line-clamp:2] [-webkit-box-orient:vertical] [overflow:hidden]">
                    {formation.description || 'Aucune description fournie.'}
                  </p>
                </div>

                <div className="formation-card-footer [margin-top:20px] [display:flex] [align-items:center] [justify-content:space-between] [border-top:1px_solid_var(--fd-border)] [padding-top:12px] [font-size:12px]">
                  <div className="formation-learners-info [display:flex] [align-items:center] [gap:6px] [font-weight:700] [color:var(--fd-text)]">
                    <i className="bi bi-people text-orange-500"></i>
                    <span>{formation.apprenants_count || 0} apprenant(s)</span>
                  </div>
                  <span className="formation-readonly-tag [font-size:10px] [font-weight:600] [color:var(--fd-muted)]">Lecture seule</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}