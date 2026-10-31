// frontend/src/pages/Formateur/Planning.jsx
import { useEffect, useState } from 'react';
import API from '../../services/api';
import '../css/FormateurPlanning.css'; // Importation du CSS classique

export default function FormateurPlanning() {
  const [seances, setSeances] = useState([]);
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSeanceDetails, setSelectedSeanceDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingSeanceId, setEditingSeanceId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Vue Semaine/Mois sur Desktop
  const [currentView, setCurrentView] = useState('Week');

  const initialFormState = {
    id_formation: '',
    titre: '',
    description: '',
    date_seance: '',
    heure_debut: '08:00',
    heure_fin: '10:00',
    type_seance: 'Cours Magistral',
    salle: 'salle odc'
  };

  const [formData, setFormData] = useState(initialFormState);

  const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    fetchFormations();
  }, []);

  useEffect(() => {
    fetchSeances();

    if (selectedFormation) {
      const formFound = formations.find(f => String(f.id_formation) === String(selectedFormation));
      if (formFound && formFound.date_debut) {
        setCurrentDate(new Date(formFound.date_debut));
      }
    }
  }, [selectedFormation]);

  const fetchFormations = async () => {
    try {
      const res = await API.get('/formateur/formations');
      setFormations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erreur chargement formations :", err);
    }
  };

  const fetchSeances = async () => {
    setLoading(true);
    try {
      const url = selectedFormation
        ? `/formateur/planning?id_formation=${selectedFormation}`
        : '/formateur/planning';
      const res = await API.get(url);
      setSeances(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erreur chargement séances :", err);
    } finally {
      setLoading(false);
    }
  };

  const activeModalFormation = formations.find(
    f => String(f.id_formation) === String(formData.id_formation || selectedFormation)
  );

  const handleModalFormationChange = (e) => {
    const formationId = e.target.value;
    const selected = formations.find(f => String(f.id_formation) === String(formationId));

    setFormData({
      ...formData,
      id_formation: formationId,
      date_seance: selected && selected.date_debut ? formatDateLocal(selected.date_debut) : formData.date_seance
    });
  };

  const getWeekDays = (startDate) => {
    const start = new Date(startDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);

  const navigateTime = (direction) => {
    const newDate = new Date(currentDate);
    if (currentView === 'Week') {
      newDate.setDate(currentDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const handleOpenCreateForDate = (dateISO) => {
    const targetFormationId = selectedFormation || (formations[0]?.id_formation ? String(formations[0].id_formation) : '');
    setFormData({
      ...initialFormState,
      id_formation: targetFormationId,
      date_seance: dateISO
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const targetFormation = formations.find(f => String(f.id_formation) === String(formData.id_formation));
    const titreParDefaut = targetFormation ? `${formData.type_seance} - ${targetFormation.titre}` : formData.type_seance;

    const payload = {
      ...formData,
      titre: formData.titre?.trim() || titreParDefaut
    };

    try {
      if (editingSeanceId) {
        await API.patch(`/formateur/planning/${editingSeanceId}`, payload);
      } else {
        await API.post('/formateur/planning', payload);
      }
      setShowModal(false);
      setFormData(initialFormState);
      setEditingSeanceId(null);
      fetchSeances();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la création de la séance.";
      setErrorMsg(msg);
    }
  };

  const handleDelete = async (id_seance) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette séance ?")) return;
    try {
      await API.delete(`/formateur/planning/${id_seance}`);
      setSelectedSeanceDetails(null);
      fetchSeances();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la suppression.");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setErrorMsg('');
    setEditingSeanceId(null);
    setFormData(initialFormState);
  };

  const handleEdit = (seance) => {
    setEditingSeanceId(seance.id_seance);
    setFormData({
      id_formation: String(seance.id_formation),
      titre: seance.titre || '',
      description: seance.description || '',
      date_seance: formatDateLocal(seance.date_seance),
      heure_debut: seance.heure_debut?.substring(0, 5) || '08:00',
      heure_fin: seance.heure_fin?.substring(0, 5) || '10:00',
      type_seance: seance.type_seance || 'Cours Magistral',
      salle: seance.salle || ''
    });
    setSelectedSeanceDetails(null);
    setErrorMsg('');
    setShowModal(true);
  };

  const hoursList = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const selectedDateISO = formatDateLocal(currentDate);

  // Filtrer les séances du jour courant pour la vue mobile
  const currentDaySeances = seances.filter(s => s.date_seance && formatDateLocal(s.date_seance) === selectedDateISO);
  const todayISO = formatDateLocal(new Date());
  const canDeleteSeance = (seance) =>
    formatDateLocal(seance.date_seance) >= todayISO && Number(seance.total_presences || 0) === 0;

  return (
    <div className="fp-container">

      {/* CONTENEUR PRINCIPAL */}
      <div className="fp-main-card">
        
        {/* BARRE SUPÉRIEURE DE NAVIGATION */}
        <div className="fp-topbar">
          
          <div className="fp-topbar-left">
            <h1 className="fp-month-title capitalize">
              {monthName}
            </h1>

            <div className="fp-nav-controls">
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="fp-today-btn"
              >
                Aujourd'hui
              </button>

              <div className="fp-arrows-group">
                <button
                  onClick={() => navigateTime(-1)}
                  className="fp-arrow-btn"
                  title="Précédent"
                >
                  <i className="bi bi-chevron-left text-xs"></i>
                </button>
                <button
                  onClick={() => navigateTime(1)}
                  className="fp-arrow-btn"
                  title="Suivant"
                >
                  <i className="bi bi-chevron-right text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="fp-topbar-right">
            <select
              value={selectedFormation}
              onChange={(e) => setSelectedFormation(e.target.value)}
              className="fp-select"
            >
              <option value="">Toutes les formations</option>
              {formations.map(f => (
                <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
              ))}
            </select>

            <button
              onClick={() => handleOpenCreateForDate(selectedDateISO)}
              className="fp-create-btn desktop-only"
            >
              <i className="bi bi-plus-lg text-sm"></i>
              <span>Nouvelle Séance</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VUE MOBILE / TABLETTE                                     */}
        {/* ========================================================= */}
        <div className="fp-mobile-view">
          
          {/* Bandeau de jours défilant horizontalement */}
          <div className="fp-days-strip">
            {weekDays.map((day, idx) => {
              const dateISO = formatDateLocal(day);
              const isSelected = selectedDateISO === dateISO;
              const isToday = formatDateLocal(new Date()) === dateISO;

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentDate(day)}
                  className={`fp-day-pill ${isSelected ? 'selected' : ''}`}
                >
                  <span className="fp-day-name">
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </span>
                  <span className={`fp-day-num ${isToday && !isSelected ? 'today' : ''}`}>
                    {day.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Liste chronologique des séances du jour */}
          {loading ? (
            <div className="fp-loading">Chargement...</div>
          ) : currentDaySeances.length === 0 ? (
            <div className="fp-empty-day">
              Aucune séance programmée pour cette journée.
            </div>
          ) : (
            <div className="fp-mobile-seances-list">
              {currentDaySeances.map((s) => (
                <div
                  key={s.id_seance}
                  onClick={() => setSelectedSeanceDetails(s)}
                  className="fp-mobile-seance-card"
                >
                  <div className="fp-mobile-time">
                    <p className="fp-time-start">{s.heure_debut?.substring(0, 5)}</p>
                    <p className="fp-time-end">{s.heure_fin?.substring(0, 5)}</p>
                  </div>

                  <div className="fp-mobile-details">
                    <span className="fp-mobile-badge">
                      {s.type_seance || 'Séance'}
                    </span>
                    <h4 className="fp-mobile-title">
                      {s.titre || s.type_seance}
                    </h4>
                    {s.formation_titre && (
                      <p className="fp-mobile-formation">
                        {s.formation_titre}
                      </p>
                    )}
                    {s.salle && (
                      <p className="fp-mobile-room">
                        <i className="bi bi-geo-alt"></i> {s.salle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bouton Flottant (FAB) d'ajout sur Mobile */}
          <button
            onClick={() => handleOpenCreateForDate(selectedDateISO)}
            className="fp-fab-btn"
          >
            <i className="bi bi-plus-lg text-lg"></i>
          </button>
        </div>

        {/* ========================================================= */}
        {/* VUE DESKTOP (GRILLE SEMAINE)                              */}
        {/* ========================================================= */}
        <div className="fp-desktop-view">
          {loading ? (
            <div className="fp-loading lg">Chargement du planning...</div>
          ) : (
            <div className="fp-grid-wrapper">
              
              {/* En-tête des jours */}
              <div className="fp-grid-header-row">
                <div className="fp-time-col-header">
                  Heure
                </div>
                {weekDays.map((day, idx) => {
                  const dateISO = formatDateLocal(day);
                  const isToday = formatDateLocal(new Date()) === dateISO;
                  return (
                    <div key={idx} className="fp-day-col-header">
                      <span className="fp-header-dayname">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </span>
                      <span className={`fp-header-daynum ${isToday ? 'today' : ''}`}>
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Lignes Heures + Créneaux */}
              <div className="fp-grid-body">
                {hoursList.map((hour, hIdx) => {
                  const currentSlotHour = parseInt(hour.substring(0, 2), 10);

                  return (
                    <div key={hIdx} className="fp-hour-row">
                      
                      <div className="fp-hour-label">
                        {hour}
                      </div>

                      {weekDays.map((day, dIdx) => {
                        const dateISO = formatDateLocal(day);
                        
                        const daySeances = seances.filter(s => {
                          if (!s.date_seance || formatDateLocal(s.date_seance) !== dateISO) return false;
                          if (!s.heure_debut || !s.heure_fin) return false;
                          
                          const startHour = parseInt(s.heure_debut.substring(0, 2), 10);
                          return currentSlotHour === startHour;
                        });

                        return (
                          <div
                            key={dIdx}
                            onClick={() => handleOpenCreateForDate(dateISO)}
                            className="fp-slot-cell"
                          >
                            {daySeances.map(s => {
                              const startHour = parseInt(s.heure_debut.substring(0, 2), 10);
                              const endHour = parseInt(s.heure_fin.substring(0, 2), 10);
                              const durationHours = Math.max(1, endHour - startHour);
                              const computedHeight = `${durationHours * 90 - 10}px`;

                              return (
                                <div
                                  key={s.id_seance}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSeanceDetails(s);
                                  }}
                                  style={{ height: computedHeight }}
                                  className="fp-event-card"
                                >
                                  <div>
                                    <div className="fp-event-top-row">
                                      <span>{s.type_seance || 'Séance'}</span>
                                      <span className="fp-event-time">
                                        {s.heure_debut?.substring(0, 5)}
                                      </span>
                                    </div>

                                    <h4 className="fp-event-title">
                                      {s.titre || s.type_seance}
                                    </h4>

                                    {s.formation_titre && (
                                      <p className="fp-event-formation">
                                        {s.formation_titre}
                                      </p>
                                    )}
                                  </div>

                                  {s.salle && (
                                    <div className="fp-event-room">
                                      <i className="bi bi-geo-alt"></i> {s.salle}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Modal Création de Séance */}
      {showModal && (
        <div className="fp-modal-backdrop" onClick={closeModal}>
          <div className="fp-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeModal}
              className="fp-modal-close"
            >
              <i className="bi bi-x-lg text-lg"></i>
            </button>

            <h2 className="fp-modal-heading">
              {editingSeanceId ? 'Modifier la séance' : 'Programmer une Séance'}
            </h2>

            {errorMsg && (
              <div className="fp-error-banner">
                <i className="bi bi-exclamation-circle shrink-0 text-base"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="fp-form-space">
              <div>
                <label className="fp-field-label">Formation</label>
                <select
                  required
                  value={formData.id_formation}
                  onChange={handleModalFormationChange}
                  className="fp-input"
                >
                  <option value="">Sélectionner une formation</option>
                  {formations.map(f => (
                    <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
                  ))}
                </select>
              </div>

              <div className="fp-modal-grid-2">
                <div>
                  <label className="fp-field-label">Type de Séance</label>
                  <select
                    value={formData.type_seance}
                    onChange={(e) => setFormData({ ...formData, type_seance: e.target.value })}
                    className="fp-input"
                  >
                    <option value="Cours Magistral">Cours Magistral</option>
                    <option value="Travaux Pratiques (TP)">Travaux Pratiques (TP)</option>
                    <option value="Travaux Dirigés (TD)">Travaux Dirigés (TD)</option>
                    <option value="Atelier / Workshop">Atelier / Workshop</option>
                    <option value="Examen / Évaluation">Examen / Évaluation</option>
                  </select>
                </div>

                <div>
                  <label className="fp-field-label">Salle / Lieu</label>
                  <input
                    type="text"
                    placeholder="Labo 2 / Zoom"
                    value={formData.salle}
                    onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                    className="fp-input"
                  />
                </div>
              </div>

              <div>
                <label className="fp-field-label">Date</label>
                <input
                  type="date"
                  required
                  disabled={!formData.id_formation}
                  min={activeModalFormation?.date_debut ? formatDateLocal(activeModalFormation.date_debut) : ''}
                  max={activeModalFormation?.date_fin ? formatDateLocal(activeModalFormation.date_fin) : ''}
                  value={formData.date_seance}
                  onChange={(e) => setFormData({ ...formData, date_seance: e.target.value })}
                  className="fp-input"
                />
              </div>

              <div className="fp-modal-grid-2">
                <div>
                  <label className="fp-field-label">Heure Début</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                    className="fp-input"
                  />
                </div>
                <div>
                  <label className="fp-field-label">Heure Fin</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                    className="fp-input"
                  />
                </div>
              </div>

              <div>
                <label className="fp-field-label">Description (Optionnel)</label>
                <textarea
                  rows="2"
                  placeholder="Informations complémentaires..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="fp-input resize-none"
                />
              </div>

              <button
                onClick={() => handleEdit(selectedSeanceDetails)}
                className="fp-edit-btn"
              >
                Modifier cette séance
              </button>
              <button
                type="submit"
                className="fp-submit-btn"
              >
                {editingSeanceId ? 'Enregistrer les modifications' : 'Valider la Séance'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Séance */}
      {selectedSeanceDetails && (
        <div className="fp-modal-backdrop" onClick={() => setSelectedSeanceDetails(null)}>
          <div className="fp-modal-card max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedSeanceDetails(null)}
              className="fp-modal-close"
            >
              <i className="bi bi-x-lg text-lg"></i>
            </button>

            <div className="fp-details-badges">
              <span className="fp-badge">
                {selectedSeanceDetails.type_seance || 'Séance'}
              </span>
            </div>

            <h3 className="fp-details-title">
              {selectedSeanceDetails.titre || selectedSeanceDetails.type_seance}
            </h3>

            <div className="fp-details-box">
              <div className="fp-details-row">
                <i className="bi bi-clock shrink-0 text-sm"></i>
                <span>
                  {new Date(selectedSeanceDetails.date_seance).toLocaleDateString('fr-FR')} ({selectedSeanceDetails.heure_debut?.substring(0, 5)} - {selectedSeanceDetails.heure_fin?.substring(0, 5)})
                </span>
              </div>
              <div className="fp-details-row">
                <i className="bi bi-geo-alt shrink-0 text-sm"></i>
                <span>Salle : <strong>{selectedSeanceDetails.salle || 'Non spécifiée'}</strong></span>
              </div>
              {selectedSeanceDetails.description && (
                <div className="fp-details-desc">
                  <p>{selectedSeanceDetails.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(selectedSeanceDetails.id_seance)}
              disabled={!canDeleteSeance(selectedSeanceDetails)}
              title={!canDeleteSeance(selectedSeanceDetails) ? "Séance terminée ou contenant des présences" : "Supprimer cette séance"}
              className="fp-delete-btn"
            >
              <i className="bi bi-trash text-sm"></i>
              {canDeleteSeance(selectedSeanceDetails) ? 'Supprimer cette séance' : 'Suppression non autorisée'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}