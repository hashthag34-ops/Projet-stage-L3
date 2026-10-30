// frontend/src/pages/Apprenant/ApprenantDashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Clock3, MapPin, Star, Target, TrendingUp } from 'lucide-react';
import API from '../../services/api';
import '../css/ApprenantDashboard.css'; // Importation du CSS classique

export default function ApprenantDashboard() {
  const [formations, setFormations] = useState([]);
  const [seances, setSeances] = useState([]); // Ajouté pour éviter l'erreur de référence sur 'seances'
  const [nextSeance, setNextSeance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [resFormations, resSeances] = await Promise.all([
          API.get('/apprenant/mes-formations'),
          API.get('/apprenant/seances')
        ]);

        setFormations(resFormations.data || []);
        const fetchedSeances = resSeances.data || [];
        setSeances(fetchedSeances);
        
        // Les séances sont triées par l'API, mais on vérifie la date pour ignorer l'historique.
        const upcoming = fetchedSeances.find((seance) => {
          const sessionDate = new Date(`${seance.date_seance}T${seance.heure_fin || '23:59'}`);
          return sessionDate >= new Date();
        });
        if (upcoming) {
          setNextSeance(upcoming);
        }
      } catch (err) {
        console.error("Erreur de chargement du dashboard :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const attendance = seances.filter((seance) => ['PRESENT', 'RETARD', 'ABSENT'].includes(seance.statut_presence));
  const presentCount = seances.filter((seance) => seance.statut_presence === 'PRESENT').length;
  const lateCount = seances.filter((seance) => seance.statut_presence === 'RETARD').length;
  const absentCount = seances.filter((seance) => seance.statut_presence === 'ABSENT').length;
  const attendanceRate = attendance.length ? Math.round(((presentCount + lateCount) / attendance.length) * 100) : 0;
  const completedSessions = seances.filter((seance) => seance.statut_presence).length;

  if (loading) return <div className="student-loading">Chargement de ton espace...</div>;

  return (
    <div className="student-dashboard-container">
      
      {/* En-tête de bienvenue */}
      <header className="student-hero-banner">
        <p className="student-hero-tag">Tableau de bord</p>
        <h1 className="student-hero-title">Ravi de te revoir</h1>
        <p className="student-hero-desc">Suis ton parcours, tes présences et tes prochaines échéances depuis un seul espace.</p>
      </header>

      {/* Cartes KPI Principales */}
      <section className="student-kpi-grid">
        <div className="student-kpi-card">
          <div>
            <p className="student-kpi-label">Formations suivies</p>
            <p className="student-kpi-value">{formations.length}</p>
          </div>
          <div className="student-kpi-icon"><BookOpen size={24} /></div>
        </div>

        <div className="student-kpi-card">
          <div>
            <p className="student-kpi-label">Séances réalisées</p>
            <p className="student-kpi-value">{completedSessions}</p>
          </div>
          <div className="student-kpi-icon"><CalendarDays size={24} /></div>
        </div>

        <div className="student-kpi-card">
          <div>
            <p className="student-kpi-label">Assiduité</p>
            <p className="student-kpi-value orange">{attendanceRate} %</p>
          </div>
          <div className="student-kpi-icon"><Target size={24} /></div>
        </div>

        <div className="student-kpi-card">
          <div>
            <p className="student-kpi-label">Évaluations</p>
            <p className="student-kpi-value subtitle">Aucune note</p>
          </div>
          <div className="student-kpi-icon"><Star size={24} /></div>
        </div>
      </section>

      {/* Grille principale : Formations et Prochaine séance */}
      <div className="student-main-grid">
        
        {/* Mes Formations */}
        <section className="student-panel">
          <div className="student-panel-header">
            <div>
              <p className="student-panel-tag">Historique</p>
              <h2 className="student-panel-title">Mes formations</h2>
            </div>
            <Link to="/apprenant/catalogue" className="student-panel-link">
              Catalogue <ArrowRight size={14} />
            </Link>
          </div>

          {formations.length === 0 ? (
            <p className="student-empty-text">Tu n'es inscrit à aucune formation pour le moment.</p>
          ) : (
            <div className="student-formations-list">
              {formations.map((f) => (
                <div key={f.id_formation} className="student-formation-item">
                  <div className="student-formation-top">
                    <div>
                      <h3 className="student-formation-name">{f.titre}</h3>
                      <p className="student-formation-desc">{f.description}</p>
                    </div>
                    <span className="student-formation-badge">
                      {f.statut || 'EN_COURS'}
                    </span>
                  </div>

                  <div className="student-progress-wrapper">
                    <div className="student-progress-labels">
                      <span>Progression</span>
                      <span>{f.progression || 0}%</span>
                    </div>
                    <div className="student-progress-track">
                      <div 
                        className="student-progress-fill"
                        style={{ width: `${f.progression || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Prochaine séance */}
        <section className="student-panel">
          <div className="student-panel-header">
            <div>
              <p className="student-panel-tag">À venir</p>
              <h2 className="student-panel-title">Prochaine séance</h2>
            </div>
            <Link to="/apprenant/planning" className="student-panel-link">
              Tout voir <ArrowRight size={14} />
            </Link>
          </div>

          {nextSeance ? (
            <div className="student-next-session-card">
              <span className="student-session-badge">
                {nextSeance.type_seance || 'Cours Pratique'}
              </span>
              <h3 className="student-session-title">{nextSeance.titre}</h3>
              <p className="student-session-desc">{nextSeance.description}</p>
              
              <div className="student-session-meta">
                <p><CalendarDays size={15} className="meta-icon" /><strong>Date :</strong> {new Date(nextSeance.date_seance).toLocaleDateString('fr-FR')}</p>
                <p><Clock3 size={15} className="meta-icon" /><strong>Horaire :</strong> {nextSeance.heure_debut} - {nextSeance.heure_fin}</p>
                <p><MapPin size={15} className="meta-icon" /><strong>Lieu :</strong> {nextSeance.salle || 'En ligne'}</p>
              </div>
            </div>
          ) : (
            <p className="student-empty-text">Aucun cours prévu prochainement.</p>
          )}
        </section>

      </div>

      {/* Suivi présence */}
      <section className="student-panel">
        <div className="student-presence-header">
          <div className="student-presence-icon"><TrendingUp size={19} /></div>
          <div>
            <p className="student-panel-tag">Suivi présence</p>
            <h2 className="student-panel-title">Ton assiduité</h2>
          </div>
        </div>

        <div className="student-presence-grid">
          <div className="presence-box present">
            <p className="presence-box-label">Présences</p>
            <p className="presence-box-value orange">{presentCount}</p>
          </div>
          <div className="presence-box late">
            <p className="presence-box-label">Retards</p>
            <p className="presence-box-value">{lateCount}</p>
          </div>
          <div className="presence-box absent">
            <p className="presence-box-label">Absences</p>
            <p className="presence-box-value">{absentCount}</p>
          </div>
        </div>
      </section>

    </div>
  );
}