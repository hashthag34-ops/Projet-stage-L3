// frontend/src/pages/Responsable/Planning.jsx
import React, { useState, useEffect, useMemo } from 'react';
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
  const [editingSeanceId, setEditingSeanceId] = useState(null);

  const [currentDate, setCurrentDate] = useState(new Date());
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

  // Formater la date au format YYYY-MM-DD en temps local
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
        await API.patch(`/responsable/seances/${editingSeanceId}`, payload);
      } else {
        await API.post('/responsable/seances', payload);
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
      await API.delete(`/responsable/seances/${id_seance}`);
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

  // Génération du mois pour le mini-calendrier Google Calendar de droite
  const miniCalendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    const offset = (firstDayIndex === 0 ? 6 : firstDayIndex - 1);
    
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentDate]);

  const currentDaySeances = seances.filter(s => s.date_seance && formatDateLocal(s.date_seance) === selectedDateISO);
  const todayISO = formatDateLocal(new Date());
  const canDeleteSeance = (seance) =>
    formatDateLocal(seance.date_seance) >= todayISO && Number(seance.total_presences || 0) === 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:px-6 sm:py-6">

      {/* BARRE SUPÉRIEURE DE NAVIGATION GLOBALE */}
      <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 sm:text-xs">Agenda & Planning</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight capitalize sm:text-3xl">{monthName}</h1>
          <p className="mt-1 text-xs text-zinc-300 sm:text-sm">Planning Responsable · Gérez et planifiez les sessions de formation.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedFormation}
            onChange={(e) => setSelectedFormation(e.target.value)}
            className="rounded-2xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs font-semibold text-white outline-none transition focus:border-orange-500"
          >
            <option value="">Toutes les formations</option>
            {formations.map(f => (
              <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
            ))}
          </select>

          <button 
            onClick={() => setCurrentDate(new Date())}
            className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800"
          >
            Aujourd'hui
          </button>

          <div className="flex items-center gap-1 bg-zinc-900 rounded-2xl border border-zinc-700 p-1">
            <button
              onClick={() => navigateTime(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              title="Précédent"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => navigateTime(1)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              title="Suivant"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateForDate(selectedDateISO)}
            className="hidden sm:inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400"
          >
            <Plus size={15} />
            <span>Nouvelle Séance</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* VUE MOBILE / TABLETTE                                     */}
      {/* ========================================================= */}
      <div className="block lg:hidden space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {weekDays.map((day, idx) => {
            const dateISO = formatDateLocal(day);
            const isSelected = selectedDateISO === dateISO;
            const isToday = formatDateLocal(new Date()) === dateISO;

            return (
              <button
                key={idx}
                onClick={() => setCurrentDate(day)}
                className={`flex flex-col items-center justify-center rounded-2xl p-3 min-w-[56px] transition ${isSelected ? 'bg-orange-500 text-zinc-950 font-black shadow-md' : 'border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'}`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider">
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </span>
                <span className={`mt-1 text-sm font-black ${isToday && !isSelected ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">Chargement...</div>
        ) : currentDaySeances.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            Aucune séance programmée pour cette journée.
          </div>
        ) : (
          <div className="space-y-3">
            {currentDaySeances.map((s) => (
              <div
                key={s.id_seance}
                onClick={() => setSelectedSeanceDetails(s)}
                className="flex items-start gap-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-xs cursor-pointer transition hover:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="text-right shrink-0 min-w-[50px]">
                  <p className="text-xs font-black text-zinc-900 dark:text-white">{s.heure_debut?.substring(0, 5)}</p>
                  <p className="text-[10px] font-bold text-zinc-400">{s.heure_fin?.substring(0, 5)}</p>
                </div>

                <div className="flex-1 min-w-0 border-l-2 border-orange-500 pl-3">
                  <span className="inline-block rounded-md bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-orange-600 dark:text-orange-400 mb-1">
                    {s.type_seance || 'Séance'}
                  </span>
                  <h4 className="text-xs font-black text-zinc-900 dark:text-white truncate">
                    {s.titre || s.type_seance}
                  </h4>
                  {s.formation_titre && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {s.formation_titre}
                    </p>
                  )}
                  {s.salle && (
                    <p className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 mt-1">
                      <MapPin size={11} /> {s.salle}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => handleOpenCreateForDate(selectedDateISO)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-zinc-950 shadow-xl border-2 border-white dark:border-zinc-900"
        >
          <Plus size={22} className="font-black" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* VUE DESKTOP : TYPE GOOGLE CALENDAR (Semaine à gauche / Mini-Calendar à droite) */}
      {/* ========================================================= */}
      <div className="hidden lg:grid grid-cols-[1fr_300px] gap-6 items-start">
        
        {/* COLONNE GAUCHE : GRILLE HEBDOMADAIRE DETAILLEE */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-x-auto">
          {loading ? (
            <div className="py-24 text-center text-xs font-semibold text-zinc-500">Chargement du planning...</div>
          ) : (
            <div className="min-w-[850px]">
              
              {/* En-tête des jours */}
              <div className="grid grid-cols-[70px_repeat(7,_1fr)] border-b border-zinc-100 pb-3 text-center dark:border-zinc-800">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-center">
                  Heure
                </div>
                {weekDays.map((day, idx) => {
                  const dateISO = formatDateLocal(day);
                  const isToday = formatDateLocal(new Date()) === dateISO;
                  return (
                    <div key={idx} className="flex flex-col items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </span>
                      <span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${isToday ? 'bg-orange-500 text-zinc-950 shadow-xs' : 'text-zinc-900 dark:text-white'}`}>
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Lignes Heures + Créneaux */}
              <div className="relative">
                {hoursList.map((hour, hIdx) => {
                  const currentSlotHour = parseInt(hour.substring(0, 2), 10);

                  return (
                    <div key={hIdx} className="grid grid-cols-[70px_repeat(7,_1fr)] min-h-[90px] border-b border-zinc-100 dark:border-zinc-800/60">
                      
                      <div className="pr-3 pt-2 text-right text-xs font-bold text-zinc-400">
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
                            className="p-1.5 border-l border-zinc-100 dark:border-zinc-800/60 cursor-pointer relative transition hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
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
                                  className="absolute left-1.5 right-1.5 top-1.5 z-20 cursor-pointer rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 flex flex-col justify-between overflow-hidden shadow-xs transition hover:border-orange-500 hover:bg-orange-500/20"
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">
                                      <span>{s.type_seance || 'Séance'}</span>
                                      <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                                        {s.heure_debut?.substring(0, 5)}
                                      </span>
                                    </div>

                                    <h4 className="mt-1 text-xs font-black text-zinc-900 dark:text-white truncate">
                                      {s.titre || s.type_seance}
                                    </h4>

                                    {s.formation_titre && (
                                      <p className="mt-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                                        {s.formation_titre}
                                      </p>
                                    )}
                                  </div>

                                  {s.salle && (
                                    <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                      <MapPin size={11} /> {s.salle}
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

        {/* COLONNE DROITE : MINI CALENDRIER TYPE GOOGLE */}
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => navigateTime(-1)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => navigateTime(1)} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center gap-1">
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <span key={i} className="text-[10px] font-black text-zinc-400 py-1">{d}</span>
            ))}
            {miniCalendarDays.map((date, idx) => {
              if (!date) return <div key={idx} />;
              const dateISO = formatDateLocal(date);
              const isSelected = selectedDateISO === dateISO;
              const isToday = formatDateLocal(new Date()) === dateISO;
              const hasSeance = seances.some(s => s.date_seance && formatDateLocal(s.date_seance) === dateISO);

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentDate(date)}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition mx-auto ${isSelected ? 'bg-orange-500 text-zinc-950 font-black shadow-xs' : isToday ? 'border border-orange-500 text-orange-600 dark:text-orange-400' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}
                >
                  {date.getDate()}
                  {hasSeance && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-orange-500"></span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Séances du jour sélectionné</h4>
            {currentDaySeances.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">Aucune séance ce jour.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {currentDaySeances.map(s => (
                  <div key={s.id_seance} onClick={() => setSelectedSeanceDetails(s)} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-xs cursor-pointer hover:border-orange-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <p className="font-bold text-zinc-900 dark:text-white truncate">{s.titre || s.type_seance}</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{s.heure_debut?.substring(0, 5)} - {s.heure_fin?.substring(0, 5)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal Création / Modification de Séance */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4" onClick={closeModal}>
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeModal}
              className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-black text-zinc-900 dark:text-white border-b border-zinc-100 pb-3 dark:border-zinc-800">
              {editingSeanceId ? 'Modifier la séance' : 'Programmer une Séance'}
            </h2>

            {errorMsg && (
              <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Formation</label>
                <select
                  required
                  value={formData.id_formation}
                  onChange={handleModalFormationChange}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500"
                >
                  <option value="">Sélectionner une formation</option>
                  {formations.map(f => (
                    <option key={f.id_formation} value={f.id_formation}>{f.titre}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Type de Séance</label>
                  <select
                    value={formData.type_seance}
                    onChange={(e) => setFormData({ ...formData, type_seance: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500"
                  >
                    <option value="Cours Magistral">Cours Magistral</option>
                    <option value="Travaux Pratiques (TP)">Travaux Pratiques (TP)</option>
                    <option value="Travaux Dirigés (TD)">Travaux Dirigés (TD)</option>
                    <option value="Atelier / Workshop">Atelier / Workshop</option>
                    <option value="Examen / Évaluation">Examen / Évaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Salle / Lieu</label>
                  <input
                    type="text"
                    placeholder="Labo 2 / Zoom"
                    value={formData.salle}
                    onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  disabled={!formData.id_formation}
                  min={activeModalFormation?.date_debut ? formatDateLocal(activeModalFormation.date_debut) : ''}
                  max={activeModalFormation?.date_fin ? formatDateLocal(activeModalFormation.date_fin) : ''}
                  value={formData.date_seance}
                  onChange={(e) => setFormData({ ...formData, date_seance: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500 disabled:opacity-50"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Heure Début</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_debut}
                    onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Heure Fin</label>
                  <input
                    type="time"
                    required
                    value={formData.heure_fin}
                    onChange={(e) => setFormData({ ...formData, heure_fin: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Description (Optionnel)</label>
                <textarea
                  rows="2"
                  placeholder="Informations complémentaires..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500 resize-none"
                />
              </div>

              {editingSeanceId && (
                <button
                  type="button"
                  onClick={() => handleEdit(selectedSeanceDetails)}
                  className="w-full rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  Modifier cette séance
                </button>
              )}

              <button
                type="submit"
                className="w-full rounded-2xl bg-orange-500 py-3 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 mt-2"
              >
                {editingSeanceId ? 'Enregistrer les modifications' : 'Valider la Séance'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Séance */}
      {selectedSeanceDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4" onClick={() => setSelectedSeanceDetails(null)}>
          <div className="relative w-full max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedSeanceDetails(null)}
              className="absolute right-5 top-5 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X size={18} />
            </button>

            <div>
              <span className="inline-block rounded-md bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-orange-600 dark:text-orange-400 mb-2">
                {selectedSeanceDetails.type_seance || 'Séance'}
              </span>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                {selectedSeanceDetails.titre || selectedSeanceDetails.type_seance}
              </h3>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-300">
              <div className="flex items-center gap-2.5">
                <Clock size={14} className="text-orange-500" />
                <span>
                  {new Date(selectedSeanceDetails.date_seance).toLocaleDateString('fr-FR')} ({selectedSeanceDetails.heure_debut?.substring(0, 5)} - {selectedSeanceDetails.heure_fin?.substring(0, 5)})
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={14} className="text-orange-500" />
                <span>Salle : <strong>{selectedSeanceDetails.salle || 'Non spécifiée'}</strong></span>
              </div>
              {selectedSeanceDetails.description && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 italic text-zinc-500">
                  <p>{selectedSeanceDetails.description}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(selectedSeanceDetails)}
                className="flex-1 rounded-2xl border border-zinc-200 bg-white py-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDelete(selectedSeanceDetails.id_seance)}
                disabled={!canDeleteSeance(selectedSeanceDetails)}
                title={!canDeleteSeance(selectedSeanceDetails) ? "Séance terminée ou contenant des présences" : "Supprimer cette séance"}
                className="flex-1 rounded-2xl border border-rose-500/20 bg-rose-500/10 py-3 text-xs font-bold text-rose-700 transition hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}