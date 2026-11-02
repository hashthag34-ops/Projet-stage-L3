// frontend/src/pages/Formateur/Planning.jsx
import { useEffect, useState } from 'react';
import API from '../../services/api';

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
    <div className="fp-container [min-height:100vh] [background-color:var(--fp-bg)] [color:var(--fp-text)] [font-family:inherit] [padding:12px] [box-sizing:border-box] [transition:background-color_0.3s_ease,_color_0.3s_ease]">

      {/* CONTENEUR PRINCIPAL */}
      <div className="fp-main-card [background-color:var(--fp-panel)] [border-radius:24px] [border:1px_solid_var(--fp-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [padding:16px] [position:relative] [box-sizing:border-box]">
        
        {/* BARRE SUPÉRIEURE DE NAVIGATION */}
        <div className="fp-topbar [margin-bottom:24px] [display:flex] [flex-direction:column] [gap:16px] [border-bottom:1px_solid_var(--fp-border)] [padding-bottom:20px]">
          
          <div className="fp-topbar-left [display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:space-between] [gap:12px] [width:100%]">
            <h1 className="fp-month-title [margin:0] [font-size:20px] [font-weight:900] [letter-spacing:-0.025em] [color:var(--fp-text)] capitalize">
              {monthName}
            </h1>

            <div className="fp-nav-controls [display:flex] [align-items:center] [gap:8px]">
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="fp-today-btn [border-radius:12px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:6px_12px] [font-size:11px] [font-weight:700] [color:var(--fp-text)] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:var(--fp-hover)]"
              >
                Aujourd'hui
              </button>

              <div className="fp-arrows-group [display:flex] [align-items:center] [gap:4px]">
                <button
                  onClick={() => navigateTime(-1)}
                  className="fp-arrow-btn [display:flex] [height:32px] [width:32px] [align-items:center] [justify-content:center] [border-radius:12px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [color:var(--fp-muted)] [cursor:pointer] [transition:background-color_0.2s,_color_0.2s] [&:hover]:[background-color:var(--fp-hover)] [&:hover]:[color:var(--fp-text)]"
                  title="Précédent"
                >
                  <i className="bi bi-chevron-left text-xs"></i>
                </button>
                <button
                  onClick={() => navigateTime(1)}
                  className="fp-arrow-btn [display:flex] [height:32px] [width:32px] [align-items:center] [justify-content:center] [border-radius:12px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [color:var(--fp-muted)] [cursor:pointer] [transition:background-color_0.2s,_color_0.2s] [&:hover]:[background-color:var(--fp-hover)] [&:hover]:[color:var(--fp-text)]"
                  title="Suivant"
                >
                  <i className="bi bi-chevron-right text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="fp-topbar-right [display:flex] [flex-wrap:wrap] [align-items:center] [gap:10px]">
            <select
              value={selectedFormation}
              onChange={(e) => setSelectedFormation(e.target.value)}
              className="fp-select [width:100%] [border-radius:12px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:8px_12px] [font-size:11px] [font-weight:600] [color:var(--fp-text)] [outline:none] [box-sizing:border-box]"
            >
              <option value="">Toutes les formations</option>
              {formations.map(f => (
                <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
              ))}
            </select>

            <button
              onClick={() => handleOpenCreateForDate(selectedDateISO)}
              className="fp-create-btn [display:flex] [align-items:center] [gap:8px] [border-radius:12px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:8px_16px] [font-size:11px] [font-weight:800] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [&:hover]:[opacity:0.9] desktop-only"
            >
              <i className="bi bi-plus-lg text-sm"></i>
              <span>Nouvelle Séance</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* VUE MOBILE / TABLETTE                                     */}
        {/* ========================================================= */}
        <div className="fp-mobile-view [display:block]">
          
          {/* Bandeau de jours défilant horizontalement */}
          <div className="fp-days-strip [display:flex] [align-items:center] [gap:8px] [overflow-x:auto] [padding-bottom:16px] [padding-top:4px] [scrollbar-width:none]">
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
                  <span className="fp-day-name [font-size:10px] [font-weight:800] [text-transform:uppercase]">
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
            <div className="fp-loading [padding:48px_0] [text-align:center] [font-size:12px] [color:var(--fp-muted)]">Chargement...</div>
          ) : currentDaySeances.length === 0 ? (
            <div className="fp-empty-day [padding:48px_16px] [text-align:center] [font-size:12px] [color:var(--fp-muted)] [border:2px_dashed_var(--fp-border)] [border-radius:16px] [margin:16px_0]">
              Aucune séance programmée pour cette journée.
            </div>
          ) : (
            <div className="fp-mobile-seances-list [display:flex] [flex-direction:column] [gap:12px] [margin:16px_0]">
              {currentDaySeances.map((s) => (
                <div
                  key={s.id_seance}
                  onClick={() => setSelectedSeanceDetails(s)}
                  className="fp-mobile-seance-card [display:flex] [align-items:flex-start] [gap:12px] [padding:16px] [border-radius:16px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:var(--fp-hover)]"
                >
                  <div className="fp-mobile-time [text-align:right] [flex-shrink:0] [min-width:48px]">
                    <p className="fp-time-start [margin:0] [font-size:12px] [font-weight:800] [color:var(--fp-text)]">{s.heure_debut?.substring(0, 5)}</p>
                    <p className="fp-time-end [margin:2px_0_0_0] [font-size:10px] [font-weight:700] [color:var(--fp-muted)]">{s.heure_fin?.substring(0, 5)}</p>
                  </div>

                  <div className="fp-mobile-details [flex:1] [min-width:0] [border-left:2px_solid_var(--orange-primary)] [padding-left:12px]">
                    <span className="fp-mobile-badge [display:inline-block] [border-radius:6px] [background-color:var(--orange-bg-light)] [padding:2px_8px] [font-size:9px] [font-weight:800] [color:var(--orange-primary)] [margin-bottom:4px]">
                      {s.type_seance || 'Séance'}
                    </span>
                    <h4 className="fp-mobile-title [margin:0] [font-size:12px] [font-weight:800] [color:var(--fp-text)] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]">
                      {s.titre || s.type_seance}
                    </h4>
                    {s.formation_titre && (
                      <p className="fp-mobile-formation [margin:2px_0_0_0] [font-size:11px] [color:var(--fp-muted)] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]">
                        {s.formation_titre}
                      </p>
                    )}
                    {s.salle && (
                      <p className="fp-mobile-room [margin:4px_0_0_0] [font-size:10px] [color:var(--fp-muted)] [display:flex] [align-items:center] [gap:4px]">
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
            className="fp-fab-btn [position:fixed] [bottom:24px] [right:24px] [z-index:40] [display:flex] [height:52px] [width:52px] [align-items:center] [justify-content:center] [border-radius:50%] [background-color:var(--orange-primary)] [color:\#18181b] [box-shadow:0_10px_25px_rgba(249,_115,_22,_0.4)] [border:none] [cursor:pointer]"
          >
            <i className="bi bi-plus-lg text-lg"></i>
          </button>
        </div>

        {/* ========================================================= */}
        {/* VUE DESKTOP (GRILLE SEMAINE)                              */}
        {/* ========================================================= */}
        <div className="fp-desktop-view [display:none]">
          {loading ? (
            <div className="fp-loading [padding:48px_0] [text-align:center] [font-size:12px] [color:var(--fp-muted)] lg">Chargement du planning...</div>
          ) : (
            <div className="fp-grid-wrapper [min-width:900px]">
              
              {/* En-tête des jours */}
              <div className="fp-grid-header-row [display:grid] [grid-template-columns:repeat(8,_minmax(0,_1fr))] [border-bottom:1px_solid_var(--fp-border)] [padding-bottom:12px] [text-align:center]">
                <div className="fp-time-col-header [font-size:11px] [font-weight:800] [color:var(--fp-muted)] [display:flex] [align-items:center] [justify-content:center] [text-transform:uppercase]">
                  Heure
                </div>
                {weekDays.map((day, idx) => {
                  const dateISO = formatDateLocal(day);
                  const isToday = formatDateLocal(new Date()) === dateISO;
                  return (
                    <div key={idx} className="fp-day-col-header [display:flex] [flex-direction:column] [align-items:center]">
                      <span className="fp-header-dayname [font-size:10px] [font-weight:700] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fp-muted)]">
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
              <div className="fp-grid-body [position:relative]">
                {hoursList.map((hour, hIdx) => {
                  const currentSlotHour = parseInt(hour.substring(0, 2), 10);

                  return (
                    <div key={hIdx} className="fp-hour-row [display:grid] [grid-template-columns:repeat(8,_minmax(0,_1fr))] [min-height:90px] [border-bottom:1px_solid_var(--fp-border)]">
                      
                      <div className="fp-hour-label [padding-right:12px] [padding-top:6px] [text-align:right] [font-size:11px] [font-weight:700] [color:var(--fp-muted)]">
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
                            className="fp-slot-cell [padding:6px] [border-left:1px_solid_var(--fp-border)] [cursor:pointer] [position:relative] [transition:background-color_0.2s] [box-sizing:border-box] [&:hover]:[background-color:var(--fp-hover)]"
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
                                  className="fp-event-card [position:absolute] [left:6px] [right:6px] [top:6px] [z-index:20] [cursor:pointer] [border-radius:16px] [border:1px_solid_rgba(249,_115,_22,_0.3)] [background-color:var(--fp-panel)] [padding:10px] [display:flex] [flex-direction:column] [justify-content:space-between] [overflow:hidden] [box-shadow:0_4px_12px_var(--shadow-color)] [box-sizing:border-box] [transition:border-color_0.2s] [&:hover]:[border-color:var(--orange-primary)]"
                                >
                                  <div>
                                    <div className="fp-event-top-row [display:flex] [align-items:center] [justify-content:space-between] [font-size:9px] [font-weight:800] [color:var(--orange-primary)] [text-transform:uppercase]">
                                      <span>{s.type_seance || 'Séance'}</span>
                                      <span className="fp-event-time [color:var(--fp-muted)] [font-weight:600]">
                                        {s.heure_debut?.substring(0, 5)}
                                      </span>
                                    </div>

                                    <h4 className="fp-event-title [margin:4px_0_0_0] [font-size:11px] [font-weight:800] [color:var(--fp-text)] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]">
                                      {s.titre || s.type_seance}
                                    </h4>

                                    {s.formation_titre && (
                                      <p className="fp-event-formation [margin:2px_0_0_0] [font-size:9px] [color:var(--fp-muted)] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]">
                                        {s.formation_titre}
                                      </p>
                                    )}
                                  </div>

                                  {s.salle && (
                                    <div className="fp-event-room [font-size:9px] [font-weight:700] [color:var(--fp-muted)] [display:flex] [align-items:center] [gap:4px]">
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
        <div className="fp-modal-backdrop [position:fixed] [inset:0] [z-index:50] [display:flex] [align-items:center] [justify-content:center] [background-color:rgba(0,_0,_0,_0.7)] [backdrop-filter:blur(4px)] [padding:16px] [box-sizing:border-box]" onClick={closeModal}>
          <div className="fp-modal-card [position:relative] [width:100%] [max-width:440px] [max-height:90vh] [overflow-y:auto] [border-radius:24px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-panel)] [padding:24px] [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.5)] [box-sizing:border-box]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeModal}
              className="fp-modal-close [position:absolute] [right:16px] [top:16px] [background:none] [border:none] [cursor:pointer] [color:var(--fp-muted)] [padding:4px] [&:hover]:[color:var(--fp-text)]"
            >
              <i className="bi bi-x-lg text-lg"></i>
            </button>

            <h2 className="fp-modal-heading [margin:0_0_16px_0] [font-size:16px] [font-weight:900] [color:var(--fp-text)] [border-bottom:1px_solid_var(--fp-border)] [padding-bottom:12px]">
              {editingSeanceId ? 'Modifier la séance' : 'Programmer une Séance'}
            </h2>

            {errorMsg && (
              <div className="fp-error-banner [margin-bottom:16px] [display:flex] [align-items:center] [gap:8px] [border-radius:12px] [border:1px_solid_rgba(225,_29,_72,_0.3)] [background-color:rgba(225,_29,_72,_0.1)] [padding:12px] [font-size:11px] [font-weight:700] [color:\#e11d48]">
                <i className="bi bi-exclamation-circle shrink-0 text-base"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="fp-form-space [display:flex] [flex-direction:column] [gap:16px]">
              <div>
                <label className="fp-field-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fp-muted)] [margin-bottom:6px]">Formation</label>
                <select
                  required
                  value={formData.id_formation}
                  onChange={handleModalFormationChange}
                  className="fp-input [width:100%] [border-radius:14px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:10px_14px] [font-size:12px] [font-weight:600] [color:var(--fp-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
                >
                  <option value="">Sélectionner une formation</option>
                  {formations.map(f => (
                    <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
                  ))}
                </select>
              </div>

              <div className="fp-modal-grid-2 [display:grid] [grid-template-columns:1fr] [gap:12px]">
                <div>
                  <label className="fp-field-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fp-muted)] [margin-bottom:6px]">Type de Séance</label>
                  <select
                    value={formData.type_seance}
                    onChange={(e) => setFormData({ ...formData, type_seance: e.target.value })}
                    className="fp-input [width:100%] [border-radius:14px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:10px_14px] [font-size:12px] [font-weight:600] [color:var(--fp-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
                  >
                    <option value="Cours Magistral">Cours Magistral</option>
                    <option value="Travaux Pratiques (TP)">Travaux Pratiques (TP)</option>
                    <option value="Travaux Dirigés (TD)">Travaux Dirigés (TD)</option>
                    <option value="Atelier / Workshop">Atelier / Workshop</option>
                    <option value="Examen / Évaluation">Examen / Évaluation</option>
                  </select>
                </div>

                <div>
                  <label className="fp-field-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fp-muted)] [margin-bottom:6px]">Salle / Lieu</label>
                  <input
                    type="text"
                    placeholder="Labo 2 / Zoom"
                    value={formData.salle}
                    onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                    className="fp-input [width:100%] [border-radius:14px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:10px_14px] [font-size:12px] [font-weight:600] [color:var(--fp-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
                  />
                </div>
              </div>

              <div>
                <label className="fp-field-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fp-muted)] [margin-bottom:6px]">Date</label>
                <input
                  type="date"
                  required
                  disabled={!formData.id_formation}
                  min={activeModalFormation?.date_debut ? formatDateLocal(activeModalFormation.date_debut) : ''}
                  max={activeModalFormation?.date_fin ? formatDateLocal(activeModalFormation.date_fin) : ''}
                  value={formData.date_seance}
                  onChange={(e) => setFormData({ ...formData, date_seance: e.target.value })}
                  className="fp-input [width:100%] [border-radius:14px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:10px_14px] [font-size:12px] [font-weight:600] [color:var(--fp-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
                />
              </div>

              <div className="fp-modal-grid-2 [display:grid] [grid-template-columns:1fr] [gap:12px]">
                <div>
                  <label className="fp-field-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fp-muted)] [margin-bottom:6px]">Heure Début</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                    className="fp-input [width:100%] [border-radius:14px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:10px_14px] [font-size:12px] [font-weight:600] [color:var(--fp-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
                  />
                </div>
                <div>
                  <label className="fp-field-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fp-muted)] [margin-bottom:6px]">Heure Fin</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                    className="fp-input [width:100%] [border-radius:14px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:10px_14px] [font-size:12px] [font-weight:600] [color:var(--fp-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
                  />
                </div>
              </div>

              <div>
                <label className="fp-field-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fp-muted)] [margin-bottom:6px]">Description (Optionnel)</label>
                <textarea
                  rows="2"
                  placeholder="Informations complémentaires..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="fp-input [width:100%] [border-radius:14px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:10px_14px] [font-size:12px] [font-weight:600] [color:var(--fp-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] resize-none"
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
                className="fp-submit-btn [width:100%] [border-radius:14px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:12px] [font-size:12px] [font-weight:900] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [margin-top:8px] [transition:opacity_0.2s] [&:hover]:[opacity:0.9]"
              >
                {editingSeanceId ? 'Enregistrer les modifications' : 'Valider la Séance'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Séance */}
      {selectedSeanceDetails && (
        <div className="fp-modal-backdrop [position:fixed] [inset:0] [z-index:50] [display:flex] [align-items:center] [justify-content:center] [background-color:rgba(0,_0,_0,_0.7)] [backdrop-filter:blur(4px)] [padding:16px] [box-sizing:border-box]" onClick={() => setSelectedSeanceDetails(null)}>
          <div className="fp-modal-card [position:relative] [width:100%] [max-width:440px] [max-height:90vh] [overflow-y:auto] [border-radius:24px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-panel)] [padding:24px] [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.5)] [box-sizing:border-box] max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedSeanceDetails(null)}
              className="fp-modal-close [position:absolute] [right:16px] [top:16px] [background:none] [border:none] [cursor:pointer] [color:var(--fp-muted)] [padding:4px] [&:hover]:[color:var(--fp-text)]"
            >
              <i className="bi bi-x-lg text-lg"></i>
            </button>

            <div className="fp-details-badges [display:flex] [flex-wrap:wrap] [gap:8px] [margin-bottom:8px]">
              <span className="fp-badge [border-radius:6px] [background-color:var(--orange-bg-light)] [padding:4px_10px] [font-size:10px] [font-weight:800] [color:var(--orange-primary)]">
                {selectedSeanceDetails.type_seance || 'Séance'}
              </span>
            </div>

            <h3 className="fp-details-title [margin:0_0_16px_0] [font-size:16px] [font-weight:900] [color:var(--fp-text)]">
              {selectedSeanceDetails.titre || selectedSeanceDetails.type_seance}
            </h3>

            <div className="fp-details-box [margin-bottom:20px] [display:flex] [flex-direction:column] [gap:10px] [border-radius:16px] [border:1px_solid_var(--fp-border)] [background-color:var(--fp-subbox)] [padding:16px] [font-size:12px] [color:var(--fp-text)]">
              <div className="fp-details-row [display:flex] [align-items:center] [gap:10px]">
                <i className="bi bi-clock shrink-0 text-sm"></i>
                <span>
                  {new Date(selectedSeanceDetails.date_seance).toLocaleDateString('fr-FR')} ({selectedSeanceDetails.heure_debut?.substring(0, 5)} - {selectedSeanceDetails.heure_fin?.substring(0, 5)})
                </span>
              </div>
              <div className="fp-details-row [display:flex] [align-items:center] [gap:10px]">
                <i className="bi bi-geo-alt shrink-0 text-sm"></i>
                <span>Salle : <strong>{selectedSeanceDetails.salle || 'Non spécifiée'}</strong></span>
              </div>
              {selectedSeanceDetails.description && (
                <div className="fp-details-desc [padding-top:8px] [border-top:1px_solid_var(--fp-border)] [font-style:italic] [color:var(--fp-muted)]">
                  <p>{selectedSeanceDetails.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(selectedSeanceDetails.id_seance)}
              disabled={!canDeleteSeance(selectedSeanceDetails)}
              title={!canDeleteSeance(selectedSeanceDetails) ? "Séance terminée ou contenant des présences" : "Supprimer cette séance"}
              className="fp-delete-btn [display:flex] [width:100%] [align-items:center] [justify-content:center] [gap:8px] [border-radius:14px] [border:1px_solid_rgba(225,_29,_72,_0.3)] [background-color:rgba(225,_29,_72,_0.1)] [padding:12px] [font-size:12px] [font-weight:800] [color:\#e11d48] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:rgba(225,_29,_72,_0.2)]"
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