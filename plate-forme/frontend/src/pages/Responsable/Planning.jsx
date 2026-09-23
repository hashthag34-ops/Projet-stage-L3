import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Trash2, X, Clock, MapPin, ChevronLeft, ChevronRight, AlertCircle, Plus } from 'lucide-react';
import API from '../../services/api';

export default function Planning() {
  const [seances, setSeances] = useState([]);
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSeanceDetails, setSelectedSeanceDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [currentDate, setCurrentDate] = useState(new Date());

  const initialFormState = {
    id_formation: '',
    titre: '',
    description: '',
    date_seance: '',
    heure_debut: '08:00',
    heure_fin: '10:00',
    type_seance: 'Cours Magistral',
    salle: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // Helper pour formater la date au format YYYY-MM-DD en temps local
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
        // Aligne directement le calendrier sur la date exacte du début de la formation
        setCurrentDate(new Date(formFound.date_debut));
      }
    }
  }, [selectedFormation]);

  const fetchFormations = async () => {
    try {
      const res = await API.get('/responsable/formations');
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

  // Génère les 6 jours à afficher à partir de currentDate
  const getWeekDays = (startDate) => {
    const start = new Date(startDate);
    const days = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + direction * 7);
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

  // SOUMISSION DU FORMULAIRE DE CRÉATION
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Définition d'un nom par défaut automatique si non précisé
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

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-white px-4 py-8 text-black transition-colors duration-300 dark:bg-black dark:text-white sm:px-6 lg:px-8">
      {/* En-tête */}
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-2xl border border-black/10 bg-black/[0.03] p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.04] md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-500 p-3 text-black shadow-lg shadow-orange-500/20">
            <CalendarIcon size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Gestion du planning</h1>
            <p className="mt-1 text-sm text-black/55 dark:text-white/55">Programmez et organisez les créneaux des formations</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedFormation}
            onChange={(e) => setSelectedFormation(e.target.value)}
            className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/20 dark:bg-black dark:text-white"
          >
            <option value="">Toutes les formations</option>
            {formations.map(f => (
              <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Calendrier */}
      <div className="mb-6 flex items-center justify-between rounded-xl border border-black/10 bg-black/[0.03] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <button
          onClick={() => navigateWeek(-1)}
          className="rounded-lg p-2 text-orange-600 transition hover:bg-orange-500/10 dark:text-orange-400"
          title="Semaine précédente"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 block">Période affichée</span>
          <span className="text-sm font-bold sm:text-base">
            Du {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} au {weekDays[weekDays.length - 1].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <button
          onClick={() => navigateWeek(1)}
          className="rounded-lg p-2 text-orange-600 transition hover:bg-orange-500/10 dark:text-orange-400"
          title="Semaine suivante"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Grille des Jours */}
      {loading ? (
        <div className="py-20 text-center text-black/45 dark:text-white/45">Chargement du planning...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {weekDays.map((day, idx) => {
            const dateISO = formatDateLocal(day);
            const daySeances = seances.filter(s => s.date_seance && formatDateLocal(s.date_seance) === dateISO);
            const isToday = formatDateLocal(new Date()) === dateISO;

            return (
              <div
                key={idx}
                className={`flex min-h-[360px] cursor-pointer flex-col rounded-2xl border p-4 transition-all ${
                  isToday ? 'border-orange-500/50 bg-orange-500/[0.05] shadow-lg shadow-orange-500/10' : 'border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]'
                }`}
                onClick={() => handleOpenCreateForDate(dateISO)}
                title="Cliquer pour ajouter une séance à cette date"
              >
                <div className="mb-3 flex items-center justify-between border-b border-black/10 pb-3 text-center dark:border-white/10">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-orange-600 dark:text-orange-400' : 'text-black/45 dark:text-white/45'}`}>
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </span>
                  <span className={`rounded-lg px-2.5 py-0.5 text-base font-extrabold ${isToday ? 'bg-orange-500 text-black' : 'bg-black/10 text-black dark:bg-white/10 dark:text-white'}`}>
                    {day.getDate()}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {daySeances.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-black/40 dark:text-white/40 hover:text-orange-500 transition">
                      <Plus size={20} className="mb-1" />
                      <p className="text-xs italic">Ajouter une séance</p>
                    </div>
                  ) : (
                    daySeances.map(s => (
                      <div
                        key={s.id_seance}
                        onClick={(event) => { event.stopPropagation(); setSelectedSeanceDetails(s); }}
                        className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl shadow-md border-l-4 border-orange-500 hover:translate-y-[-2px] hover:shadow-orange-500/10 cursor-pointer transition text-left group"
                      >
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 px-2 py-0.5 rounded-md inline-block mb-1">
                          {s.type_seance || 'Séance'}
                        </span>
                        {s.formation_titre && (
                          <p className="truncate text-[11px] font-semibold text-black/45 dark:text-white/45">
                            {s.formation_titre}
                          </p>
                        )}
                        <h4 className="mt-0.5 line-clamp-1 text-sm font-bold transition group-hover:text-orange-600 dark:group-hover:text-orange-400">
                          {s.titre || `${s.type_seance || 'Séance'}`}
                        </h4>
                        <div className="mt-2 space-y-1 text-xs text-black/50 dark:text-white/50">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-orange-500" />
                            <span className="font-medium text-black/65 dark:text-white/65">
                              {s.heure_debut?.substring(0, 5)} - {s.heure_fin?.substring(0, 5)}
                            </span>
                          </div>
                          {s.salle && (
                            <div className="flex items-center gap-1.5">
                              <MapPin size={13} className="text-black/35 dark:text-white/35" />
                              <span className="truncate">{s.salle}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Création */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-black/10 bg-white p-6 text-black shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-white">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-black/40 hover:text-orange-600 dark:text-white/40 dark:hover:text-orange-400"
            >
              <X size={20} />
            </button>

            <h2 className="mb-4 flex items-center gap-2 border-b border-black/10 pb-3 text-xl font-black dark:border-white/10">
              <span className="w-2.5 h-6 bg-orange-500 rounded-full inline-block"></span>
              Programmer une Séance
            </h2>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-700 dark:text-orange-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black/70 dark:text-white/70 uppercase mb-1">Formation</label>
                <select
                  required
                  value={formData.id_formation}
                  onChange={handleModalFormationChange}
                  className="w-full border border-black/15 dark:border-white/20 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-black/[0.02] dark:bg-white/[0.05]"
                >
                  <option value="">Sélectionner une formation</option>
                  {formations.map(f => (
                    <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black/70 dark:text-white/70 uppercase mb-1">Type de Séance</label>
                  <select
                    value={formData.type_seance}
                    onChange={(e) => setFormData({ ...formData, type_seance: e.target.value })}
                    className="w-full border border-black/15 dark:border-white/20 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-black/[0.02] dark:bg-white/[0.05]"
                  >
                    <option value="Cours Magistral">Cours Magistral</option>
                    <option value="Travaux Pratiques (TP)">Travaux Pratiques (TP)</option>
                    <option value="Travaux Dirigés (TD)">Travaux Dirigés (TD)</option>
                    <option value="Atelier / Workshop">Atelier / Workshop</option>
                    <option value="Examen / Évaluation">Examen / Évaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/70 dark:text-white/70 uppercase mb-1">Salle / Lieu</label>
                  <input
                    type="text"
                    placeholder="Labo 2 / Zoom"
                    value={formData.salle}
                    onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                    className="w-full border border-black/15 dark:border-white/20 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-black/[0.02] dark:bg-white/[0.05]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/70 dark:text-white/70 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  disabled={!formData.id_formation}
                  min={activeModalFormation?.date_debut ? formatDateLocal(activeModalFormation.date_debut) : ''}
                  max={activeModalFormation?.date_fin ? formatDateLocal(activeModalFormation.date_fin) : ''}
                  value={formData.date_seance}
                  onChange={(e) => setFormData({ ...formData, date_seance: e.target.value })}
                  className="w-full border border-black/15 dark:border-white/20 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-black/[0.02] dark:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {activeModalFormation && (
                  <p className="text-[10px] text-black/50 dark:text-white/50 mt-1">
                    Du {new Date(activeModalFormation.date_debut).toLocaleDateString('fr-FR')} au {new Date(activeModalFormation.date_fin).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black/70 dark:text-white/70 uppercase mb-1">Heure Début</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                    className="w-full border border-black/15 dark:border-white/20 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-black/[0.02] dark:bg-white/[0.05]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black/70 dark:text-white/70 uppercase mb-1">Heure Fin</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                    className="w-full border border-black/15 dark:border-white/20 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-black/[0.02] dark:bg-white/[0.05]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/70 dark:text-white/70 uppercase mb-1">Description / Remarques (Optionnel)</label>
                <textarea
                  rows="2"
                  placeholder="Informations complémentaires..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-black/15 dark:border-white/20 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-black/[0.02] dark:bg-white/[0.05] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-xl shadow-lg shadow-orange-500/20 transition mt-2"
              >
                Valider la Séance
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Séance */}
      {selectedSeanceDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 text-black shadow-2xl dark:border-white/10 dark:bg-zinc-950 dark:text-white">
            <button
              onClick={() => setSelectedSeanceDetails(null)}
              className="absolute right-4 top-4 text-black/40 hover:text-orange-600 dark:text-white/40 dark:hover:text-orange-400"
            >
              <X size={20} />
            </button>

            <div className="flex flex-wrap gap-2 mb-2">
              <span className="bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 font-bold text-xs px-2.5 py-1 rounded-md">
                {selectedSeanceDetails.type_seance || 'Séance'}
              </span>
              {selectedSeanceDetails.formation_titre && (
                <span className="max-w-[180px] truncate rounded-md bg-black/5 px-2.5 py-1 text-xs font-medium text-black/55 dark:bg-white/10 dark:text-white/55">
                  {selectedSeanceDetails.formation_titre}
                </span>
              )}
            </div>

            <h3 className="mb-4 text-xl font-black">
              {selectedSeanceDetails.titre || selectedSeanceDetails.type_seance || 'Séance de cours'}
            </h3>

            <div className="mb-6 space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4 text-sm text-black/65 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65">
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-orange-500 shrink-0" />
                <span>
                  {new Date(selectedSeanceDetails.date_seance).toLocaleDateString('fr-FR')} ({selectedSeanceDetails.heure_debut?.substring(0, 5)} - {selectedSeanceDetails.heure_fin?.substring(0, 5)})
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={16} className="text-orange-500 shrink-0" />
                <span>Salle : <strong>{selectedSeanceDetails.salle || 'Non spécifiée'}</strong></span>
              </div>
              {selectedSeanceDetails.description && (
                <div className="pt-2 border-t border-black/10 dark:border-white/10">
                  <p className="text-xs italic text-black/50 dark:text-white/50">{selectedSeanceDetails.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(selectedSeanceDetails.id_seance)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 py-2.5 text-sm font-bold text-orange-700 transition hover:bg-orange-500/20 dark:text-orange-400"
            >
              <Trash2 size={16} />
              Supprimer cette séance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}