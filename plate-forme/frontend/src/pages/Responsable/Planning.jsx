import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Trash2, 
  X, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Plus 
} from 'lucide-react';
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
    salle: 'salle odc'
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

  // Couleurs adaptées pour les en-têtes en Mode Sombre & Clair
  const headerColors = [
    'bg-[#3b4366] dark:bg-[#3b4366] text-white',
    'bg-[#3f5045] dark:bg-[#3f5045] text-white',
    'bg-[#453f52] dark:bg-[#453f52] text-white',
    'bg-[#364954] dark:bg-[#364954] text-white',
    'bg-[#434258] dark:bg-[#434258] text-white',
    'bg-[#3a3f4d] dark:bg-[#3a3f4d] text-white'
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-[#1c1d22] dark:text-[#d1d5db] font-sans p-3 sm:p-6 transition-colors duration-300">
      
      {/* En-tête / Top Navbar style CRM Kanban */}
      <div className="mb-6 flex flex-col gap-4 bg-white dark:bg-[#23252d] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20 dark:border-orange-500/30">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Gestion du planning</h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">Programmez et organisez les créneaux des formations</p>
          </div>
        </div>

        {/* Commandes et Filtres */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedFormation}
            onChange={(e) => setSelectedFormation(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-[#18191e] px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          >
            <option value="">Toutes les formations</option>
            {formations.map(f => (
              <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
            ))}
          </select>

          {/* Navigation Semaine */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-[#18191e] p-1 border border-slate-200 dark:border-white/10">
            <button
              onClick={() => navigateWeek(-1)}
              className="rounded-lg p-1.5 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-[#282a33] hover:text-slate-900 dark:hover:text-white transition"
              title="Semaine précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-700 dark:text-gray-300">
              {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {weekDays[weekDays.length - 1].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
            <button
              onClick={() => navigateWeek(1)}
              className="rounded-lg p-1.5 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-[#282a33] hover:text-slate-900 dark:hover:text-white transition"
              title="Semaine suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grille des Colonnes Kanban */}
      {loading ? (
        <div className="py-24 text-center text-sm font-medium text-slate-500 dark:text-gray-500">Chargement du planning...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {weekDays.map((day, idx) => {
            const dateISO = formatDateLocal(day);
            const daySeances = seances.filter(s => s.date_seance && formatDateLocal(s.date_seance) === dateISO);
            const isToday = formatDateLocal(new Date()) === dateISO;
            const headerBg = headerColors[idx % headerColors.length];

            return (
              <div
                key={idx}
                onClick={() => handleOpenCreateForDate(dateISO)}
                title="Cliquer sur la journée pour ajouter une séance"
                className="group/col flex cursor-pointer flex-col gap-3 rounded-2xl bg-slate-100/80 dark:bg-[#23252d] p-3 border border-slate-200/80 dark:border-white/5 shadow-sm dark:shadow-lg min-h-[500px] transition-all hover:border-orange-500/40 hover:bg-slate-200/50 dark:hover:bg-[#262832]"
              >
                {/* En-tête de la Colonne style CRM */}
                <div className={`rounded-xl ${headerBg} p-3 shadow-md border border-white/10`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })} {day.getDate()}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-black uppercase text-black">
                        Aujourd'hui
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] font-medium opacity-80">
                    {daySeances.length} {daySeances.length > 1 ? 'séances' : 'séance'}
                  </div>
                </div>

                {/* Liste des Cartes Kanban du Jour */}
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
                  {daySeances.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-4 text-center text-slate-400 dark:text-gray-500 transition group-hover/col:border-orange-500/40 group-hover/col:text-orange-500 dark:group-hover/col:text-orange-400">
                      <Plus size={18} className="mb-1" />
                      <span className="text-[11px] font-medium">Cliquer pour ajouter</span>
                    </div>
                  ) : (
                    daySeances.map(s => (
                      <div
                        key={s.id_seance}
                        onClick={(e) => {
                          e.stopPropagation(); // Empêche l'ouverture de la modal d'ajout lors du clic sur une carte
                          setSelectedSeanceDetails(s);
                        }}
                        className="group cursor-pointer rounded-xl bg-white dark:bg-[#2b2d37] p-3.5 border border-slate-200 dark:border-white/5 shadow-sm hover:border-orange-500/40 hover:bg-orange-50/20 dark:hover:bg-[#31333f] transition duration-200 text-left"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400">
                          <span className="font-semibold text-orange-600 dark:text-orange-400">
                            {s.type_seance || 'Séance'}
                          </span>
                          <span className="text-[10px]">
                            {s.date_seance ? new Date(s.date_seance).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : ''}
                          </span>
                        </div>

                        <h4 className="mt-1.5 text-xs font-bold text-slate-800 dark:text-gray-100 line-clamp-2 leading-snug">
                          {s.titre || s.type_seance}
                        </h4>

                        {s.formation_titre && (
                          <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-gray-400 font-medium">
                            {s.formation_titre}
                          </p>
                        )}

                        {/* Micro-badges style Kanban */}
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-slate-100 dark:bg-[#202127] px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-white/5">
                            {s.heure_debut?.substring(0, 5)} - {s.heure_fin?.substring(0, 5)}
                          </span>
                          {s.salle && (
                            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {s.salle}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-gray-500 pt-2 border-t border-slate-100 dark:border-white/5">
                          <span>Début</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {s.heure_debut?.substring(0, 5)}
                          </span>
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

      {/* Modal Création de Séance */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#23252d] p-6 text-slate-800 dark:text-gray-200 shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-white/10 pb-3 text-lg font-bold text-slate-900 dark:text-white">
              <span className="w-2 h-5 bg-orange-500 rounded-full inline-block"></span>
              Programmer une Séance
            </h2>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-600 dark:text-orange-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Formation</label>
                <select
                  required
                  value={formData.id_formation}
                  onChange={handleModalFormationChange}
                  className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-[#18191e] text-slate-800 dark:text-white"
                >
                  <option value="">Sélectionner une formation</option>
                  {formations.map(f => (
                    <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Type de Séance</label>
                  <select
                    value={formData.type_seance}
                    onChange={(e) => setFormData({ ...formData, type_seance: e.target.value })}
                    className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-[#18191e] text-slate-800 dark:text-white"
                  >
                    <option value="Cours Magistral">Cours Magistral</option>
                    <option value="Travaux Pratiques (TP)">Travaux Pratiques (TP)</option>
                    <option value="Travaux Dirigés (TD)">Travaux Dirigés (TD)</option>
                    <option value="Atelier / Workshop">Atelier / Workshop</option>
                    <option value="Examen / Évaluation">Examen / Évaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Salle / Lieu</label>
                  <input
                    type="text"
                    placeholder="Labo 2 / Zoom"
                    value={formData.salle}
                    onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                    className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-[#18191e] text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="date"
                  required
                  disabled={!formData.id_formation}
                  min={activeModalFormation?.date_debut ? formatDateLocal(activeModalFormation.date_debut) : ''}
                  max={activeModalFormation?.date_fin ? formatDateLocal(activeModalFormation.date_fin) : ''}
                  value={formData.date_seance}
                  onChange={(e) => setFormData({ ...formData, date_seance: e.target.value })}
                  className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-[#18191e] text-slate-800 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {activeModalFormation && (
                  <p className="text-[10px] text-slate-400 dark:text-gray-400 mt-1">
                    Du {new Date(activeModalFormation.date_debut).toLocaleDateString('fr-FR')} au {new Date(activeModalFormation.date_fin).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Heure Début</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                    className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-[#18191e] text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Heure Fin</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                    className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-[#18191e] text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Description / Remarques (Optionnel)</label>
                <textarea
                  rows="2"
                  placeholder="Informations complémentaires..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50 dark:bg-[#18191e] text-slate-800 dark:text-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 rounded-xl shadow-lg shadow-orange-500/20 transition mt-2 text-xs"
              >
                Valider la Séance
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Séance */}
      {selectedSeanceDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#23252d] p-6 text-slate-800 dark:text-gray-200 shadow-2xl">
            <button
              onClick={() => setSelectedSeanceDetails(null)}
              className="absolute right-4 top-4 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex flex-wrap gap-2 mb-2">
              <span className="bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-500/20 dark:border-orange-500/30 font-bold text-xs px-2.5 py-1 rounded-md">
                {selectedSeanceDetails.type_seance || 'Séance'}
              </span>
              {selectedSeanceDetails.formation_titre && (
                <span className="max-w-[180px] truncate rounded-md bg-slate-100 dark:bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-gray-300">
                  {selectedSeanceDetails.formation_titre}
                </span>
              )}
            </div>

            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
              {selectedSeanceDetails.titre || selectedSeanceDetails.type_seance || 'Séance de cours'}
            </h3>

            <div className="mb-6 space-y-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#18191e] p-4 text-xs text-slate-600 dark:text-gray-300">
              <div className="flex items-center gap-2.5">
                <Clock size={15} className="text-orange-500 dark:text-orange-400 shrink-0" />
                <span>
                  {new Date(selectedSeanceDetails.date_seance).toLocaleDateString('fr-FR')} ({selectedSeanceDetails.heure_debut?.substring(0, 5)} - {selectedSeanceDetails.heure_fin?.substring(0, 5)})
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={15} className="text-orange-500 dark:text-orange-400 shrink-0" />
                <span>Salle : <strong>{selectedSeanceDetails.salle || 'Non spécifiée'}</strong></span>
              </div>
              {selectedSeanceDetails.description && (
                <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                  <p className="italic text-slate-500 dark:text-gray-400">{selectedSeanceDetails.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => handleDelete(selectedSeanceDetails.id_seance)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition"
            >
              <Trash2 size={15} />
              Supprimer cette séance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}