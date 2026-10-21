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
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Nouvel état pour gérer la vue "Week" (semaine) ou "Month" (mois) comme sur l'image
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
        ? `/responsable/seances?id_formation=${selectedFormation}`
        : '/responsable/seances';
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
    for (let i = 0; i < 7; i++) { // Ajusté à 7 jours pour correspondre exactement au design
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
      await API.post('/responsable/seances', payload);
      setShowModal(false);
      setFormData(initialFormState);
      fetchSeances();
    } catch (err) {
      const msg = err.response?.data?.message || "Erreur lors de la création de la séance.";
      setErrorMsg(msg);
    }
  };

  const handleDelete = async (id_seance) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette séance ?")) return;
    try {
      await API.delete(`/responsable/seances/${id_seance}`);
      setSelectedSeanceDetails(null);
      fetchSeances();
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setErrorMsg('');
    setFormData(initialFormState);
  };

  const hoursList = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 dark:bg-[#0b0c10] dark:text-zinc-100 font-sans p-3 sm:p-6 transition-colors duration-300">

      {/* Conteneur Principal Style Barbers / SaaS Moderne */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm p-5 sm:p-8">
        
        {/* BARRE SUPÉRIEURE DE NAVIGATION ET VUES */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-zinc-800 pb-5">
          
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
              {monthName}
            </h1>

            <button 
              onClick={() => setCurrentDate(new Date())}
              className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition shadow-xs"
            >
              Aujourd'hui
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateTime(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition shadow-xs"
                title="Précédent"
              >
                <i className="bi bi-chevron-left text-xs"></i>
              </button>
              <button
                onClick={() => navigateTime(1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition shadow-xs"
                title="Suivant"
              >
                <i className="bi bi-chevron-right text-xs"></i>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bascule Vue Semaine / Mois inspirée de l'image */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-zinc-950 p-1 border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setCurrentView('Week')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  currentView === 'Week' 
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCurrentView('Month')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  currentView === 'Month' 
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Month
              </button>
            </div>

            <select
              value={selectedFormation}
              onChange={(e) => setSelectedFormation(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 dark:border-zinc-800 dark:bg-zinc-950 px-3 py-2 text-xs font-medium text-slate-800 dark:text-zinc-200 outline-none focus:border-orange-500 shadow-xs"
            >
              <option value="">Toutes les formations</option>
              {formations.map(f => (
                <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
              ))}
            </select>

            <button
              onClick={() => handleOpenCreateForDate(formatDateLocal(new Date()))}
              className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-md transition"
            >
              <i className="bi bi-plus-lg text-sm"></i>
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* GRILLE AGENDA */}
        {loading ? (
          <div className="py-24 text-center text-sm font-medium text-slate-400">Chargement du planning...</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              
              {/* En-tête des jours */}
              <div className="grid grid-cols-8 border-b border-slate-200 dark:border-zinc-800 pb-3 text-center">
                <div className="text-xs font-bold text-slate-400 dark:text-zinc-500 flex items-center justify-center">
                  Time
                </div>
                {weekDays.map((day, idx) => {
                  const dateISO = formatDateLocal(day);
                  const isToday = formatDateLocal(new Date()) === dateISO;
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                      </span>
                      <span className={`text-xs font-extrabold mt-0.5 px-2.5 py-0.5 rounded-full ${
                        isToday ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-800 dark:text-zinc-200'
                      }`}>
                        {day.getDate() < 10 ? `0${day.getDate()}` : day.getDate()}-{String(day.getMonth() + 1).padStart(2, '0')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Lignes Heures + Créneaux */}
              <div className="relative divide-y divide-slate-100 dark:divide-zinc-800/60">
                {hoursList.map((hour, hIdx) => {
                  const currentSlotHour = parseInt(hour.substring(0, 2), 10);

                  return (
                    <div key={hIdx} className="grid grid-cols-8 min-h-[95px]">
                      
                      {/* Heure fixe */}
                      <div className="pr-3 py-2 text-right text-xs font-medium text-slate-400 dark:text-zinc-500 flex items-start justify-end pt-1">
                        {hour}
                      </div>

                      {/* Cellules des jours */}
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
                            className="p-1.5 border-l border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition cursor-pointer flex flex-col gap-1.5 relative"
                          >
                            {daySeances.map(s => {
                              const startHour = parseInt(s.heure_debut.substring(0, 2), 10);
                              const endHour = parseInt(s.heure_fin.substring(0, 2), 10);
                              const durationHours = Math.max(1, endHour - startHour);
                              const computedHeight = `${durationHours * 95 - 10}px`;

                              return (
                                <div
                                  key={s.id_seance}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSeanceDetails(s);
                                  }}
                                  style={{ height: computedHeight }}
                                  className="absolute inset-x-1.5 top-1.5 z-20 cursor-pointer rounded-2xl bg-emerald-500/10 border border-emerald-500/20 dark:bg-emerald-500/15 p-3 transition hover:bg-emerald-500/20 text-left flex flex-col justify-between overflow-hidden shadow-2xs"
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                      <span>{s.type_seance || 'Séance'}</span>
                                      <span className="text-slate-400 dark:text-zinc-400 font-normal">
                                        {s.heure_debut?.substring(0, 5)}
                                      </span>
                                    </div>

                                    <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 mt-1 truncate">
                                      {s.titre || s.type_seance}
                                    </h4>

                                    {s.formation_titre && (
                                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                                        {s.formation_titre}
                                      </p>
                                    )}
                                  </div>

                                  {s.salle && (
                                    <div className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                                      <i className="bi bi-geo-alt-fill text-emerald-500"></i> {s.salle}
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
          </div>
        )}

      </div>

      {/* Modal Création de Séance */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-slate-800 dark:text-zinc-100 shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            >
              <i className="bi bi-x-lg text-lg"></i>
            </button>

            <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3 text-lg font-bold text-slate-900 dark:text-white">
              <span className="w-2 h-5 bg-orange-500 rounded-full inline-block"></span>
              Programmer une Séance
            </h2>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-600 dark:text-orange-400">
                <i className="bi bi-exclamation-circle shrink-0 text-base"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Formation</label>
                <select
                  required
                  value={formData.id_formation}
                  onChange={handleModalFormationChange}
                  className="w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-white"
                >
                  <option value="">Sélectionner une formation</option>
                  {formations.map(f => (
                    <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Type de Séance</label>
                  <select
                    value={formData.type_seance}
                    onChange={(e) => setFormData({ ...formData, type_seance: e.target.value })}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-white"
                  >
                    <option value="Cours Magistral">Cours Magistral</option>
                    <option value="Travaux Pratiques (TP)">Travaux Pratiques (TP)</option>
                    <option value="Travaux Dirigés (TD)">Travaux Dirigés (TD)</option>
                    <option value="Atelier / Workshop">Atelier / Workshop</option>
                    <option value="Examen / Évaluation">Examen / Évaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Salle / Lieu</label>
                  <input
                    type="text"
                    placeholder="Labo 2 / Zoom"
                    value={formData.salle}
                    onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="date"
                  required
                  disabled={!formData.id_formation}
                  min={activeModalFormation?.date_debut ? formatDateLocal(activeModalFormation.date_debut) : ''}
                  max={activeModalFormation?.date_fin ? formatDateLocal(activeModalFormation.date_fin) : ''}
                  value={formData.date_seance}
                  onChange={(e) => setFormData({ ...formData, date_seance: e.target.value })}
                  className="w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {activeModalFormation && (
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-1">
                    Du {new Date(activeModalFormation.date_debut).toLocaleDateString('fr-FR')} au {new Date(activeModalFormation.date_fin).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Heure Début</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Heure Fin</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                    className="w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Description / Remarques (Optionnel)</label>
                <textarea
                  rows="2"
                  placeholder="Informations complémentaires..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md transition mt-2 text-xs"
              >
                Valider la Séance
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Séance */}
      {selectedSeanceDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-slate-800 dark:text-zinc-100 shadow-2xl">
            <button
              onClick={() => setSelectedSeanceDetails(null)}
              className="absolute right-4 top-4 text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            >
              <i className="bi bi-x-lg text-lg"></i>
            </button>

            <div className="flex flex-wrap gap-2 mb-2">
              <span className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 font-bold text-xs px-2.5 py-1 rounded-md">
                {selectedSeanceDetails.type_seance || 'Séance'}
              </span>
              {selectedSeanceDetails.formation_titre && (
                <span className="max-w-[180px] truncate rounded-md bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-zinc-300">
                  {selectedSeanceDetails.formation_titre}
                </span>
              )}
            </div>

            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
              {selectedSeanceDetails.titre || selectedSeanceDetails.type_seance || 'Séance de cours'}
            </h3>

            <div className="mb-6 space-y-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-4 text-xs text-slate-600 dark:text-zinc-300">
              <div className="flex items-center gap-2.5">
                <i className="bi bi-clock text-emerald-500 shrink-0 text-sm"></i>
                <span>
                  {new Date(selectedSeanceDetails.date_seance).toLocaleDateString('fr-FR')} ({selectedSeanceDetails.heure_debut?.substring(0, 5)} - {selectedSeanceDetails.heure_fin?.substring(0, 5)})
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <i className="bi bi-geo-alt text-emerald-500 shrink-0 text-sm"></i>
                <span>Salle : <strong>{selectedSeanceDetails.salle || 'Non spécifiée'}</strong></span>
              </div>
              {selectedSeanceDetails.description && (
                <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
                  <p className="italic text-slate-500 dark:text-zinc-400">{selectedSeanceDetails.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(selectedSeanceDetails.id_seance)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition"
            >
              <i className="bi bi-trash text-sm"></i>
              Supprimer cette séance
            </button>
          </div>
        </div>
      )}

    </div>
  );
}