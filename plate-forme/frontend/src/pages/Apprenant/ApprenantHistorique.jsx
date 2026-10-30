// frontend/src/pages/Apprenant/ApprenantHistorique.jsx
import { useEffect, useState } from 'react';
import { Award, BookOpen, CalendarCheck2, ClipboardList, GraduationCap } from 'lucide-react';
import API from '../../services/api';
import '../css/ApprenantHistorique.css'; // Importation du CSS classique

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatStatus = (status) => {
  const labels = {
    BROUILLON: 'En préparation',
    OUVERTE: 'Ouverte',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ARCHIVEE: 'Archivée'
  };
  return labels[status] || status;
};

const certificationLabel = (status) => {
  if (status === 'CERTIFIE') return 'Certifiée';
  if (status === 'NON_CERTIFIE') return 'Non certifiée';
  return 'En attente de décision';
};

export default function ApprenantHistorique() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/apprenant/historique-formations')
      .then((response) => setFormations(Array.isArray(response.data) ? response.data : []))
      .catch((requestError) => {
        console.error('Erreur historique des formations :', requestError);
        setError(requestError.response?.data?.message || 'Impossible de charger votre historique.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="history-container">
      <header className="history-header">
        <h1 className="history-title">Historique de mes formations</h1>
        <p className="history-desc">
          Retrouvez vos notes, votre assiduité et vos décisions de certification.
        </p>
      </header>

      {loading && (
        <p role="status" className="history-state-box">
          Chargement de votre historique…
        </p>
      )}

      {error && (
        <p role="alert" className="history-error-alert">
          {error}
        </p>
      )}

      {!loading && !error && formations.length === 0 && (
        <section className="history-empty-box">
          <BookOpen className="empty-icon-svg" size={30} />
          <p className="empty-title">Aucune formation dans votre historique</p>
          <p className="empty-subtitle">
            Les formations pour lesquelles votre inscription est acceptée apparaîtront ici.
          </p>
        </section>
      )}

      <div className="history-list">
        {formations.map((formation) => {
          const completedSessions = Number(formation.total_seances) || 0;
          const presentCount = Number(formation.presentes) || 0;
          const absentCount = Number(formation.absentes) || 0;
          const lateCount = Number(formation.retards) || 0;
          const attendanceRate = completedSessions
            ? Math.round(((presentCount + lateCount) / completedSessions) * 100)
            : null;

          return (
            <article
              key={formation.id_formation}
              className="history-card"
            >
              <div className="history-card-header">
                <div>
                  <div className="history-card-title-row">
                    <GraduationCap className="history-card-icon" size={19} />
                    <h2 className="history-card-name">{formation.titre}</h2>
                  </div>
                  <p className="history-card-dates">
                    {formatDate(formation.date_debut)} – {formatDate(formation.date_fin)}
                  </p>
                </div>
                <span className="history-status-badge">
                  {formatStatus(formation.statut_formation)}
                </span>
              </div>

              {formation.description && (
                <p className="history-card-desc">{formation.description}</p>
              )}

              <div className="history-grid">
                <section className="history-subbox">
                  <h3 className="history-subbox-title">
                    <CalendarCheck2 className="subbox-icon" size={16} /> Présence
                  </h3>
                  {completedSessions === 0 ? (
                    <p className="history-subbox-text">Aucune séance terminée.</p>
                  ) : (
                    <>
                      <p className="history-subbox-text">
                        {attendanceRate}% de présence · {presentCount} présent{presentCount > 1 ? 's' : ''}
                        {lateCount > 0 ? ` · ${lateCount} retard${lateCount > 1 ? 's' : ''}` : ''}
                        {absentCount > 0 ? ` · ${absentCount} absence${absentCount > 1 ? 's' : ''}` : ''}
                      </p>
                      <p className="history-subbox-subtext">
                        {completedSessions} séance{completedSessions > 1 ? 's' : ''} terminée{completedSessions > 1 ? 's' : ''}
                      </p>
                    </>
                  )}
                </section>

                <section className="history-subbox">
                  <h3 className="history-subbox-title">
                    <Award className="subbox-icon" size={16} /> Certification
                  </h3>
                  <p className="history-subbox-text">{certificationLabel(formation.statut_certification)}</p>
                  {formation.date_certification && (
                    <p className="history-subbox-subtext">
                      Décision du {formatDate(formation.date_certification)}
                    </p>
                  )}
                  {formation.numero_certification && (
                    <p className="history-subbox-subtext break-all">
                      N° {formation.numero_certification}
                    </p>
                  )}
                </section>

                <section className="history-subbox full-width">
                  <h3 className="history-subbox-title">
                    <ClipboardList className="subbox-icon" size={16} /> Notes
                  </h3>
                  {formation.notes.length === 0 ? (
                    <p className="history-subbox-text">Aucune note enregistrée pour cette formation.</p>
                  ) : (
                    <ul className="history-notes-list">
                      {formation.notes.map((note) => (
                        <li key={`${note.origine}-${note.id_note}`} className="history-note-item">
                          <div>
                            <p className="note-type">{note.type_evaluation}</p>
                            <p className="note-origin">
                              {note.origine === 'MANUELLE' ? 'Note du formateur' : 'Évaluation en ligne'}
                              {note.date_evaluation ? ` · ${formatDate(note.date_evaluation)}` : ''}
                            </p>
                            {note.commentaire && (
                              <p className="note-comment">{note.commentaire}</p>
                            )}
                          </div>
                          <span className="note-score">{note.note} / 20</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}