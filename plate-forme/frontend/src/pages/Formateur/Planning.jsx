import { useEffect, useState } from 'react';
import {
  AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock,
  MapPin, Pencil, Plus, Trash2, X
} from 'lucide-react';
import API from '../../services/api';

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

const headerColors = [
  'bg-[#3b4366]',
  'bg-[#3f5045]',
  'bg-[#453f52]',
  'bg-[#364954]',
  'bg-[#434258]',
  'bg-[#3a3f4d]'
];

const formatDateLocal = (date) => {
  if (!date) return '';
  const value = String(date);
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function FormateurPlanning() {
  const [seances, setSeances] = useState([]);
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSeance, setEditingSeance] = useState(null);
  const [selectedSeanceDetails, setSelectedSeanceDetails] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialFormState);

  const loadPlanningData = () => Promise.all([
    API.get('/formateur/planning'),
    API.get('/formateur/formations')
  ]);

  const fetchData = async () => {
    try {
      const [planning, formationsResponse] = await loadPlanningData();
      setSeances(Array.isArray(planning.data) ? planning.data : []);
      setFormations(Array.isArray(formationsResponse.data) ? formationsResponse.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de charger le planning.');
    }
  };

  useEffect(() => {
    loadPlanningData()
      .then(([planning, formationsResponse]) => {
        setSeances(Array.isArray(planning.data) ? planning.data : []);
        setFormations(Array.isArray(formationsResponse.data) ? formationsResponse.data : []);
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || 'Impossible de charger le planning.');
      })
      .finally(() => setLoading(false));
  }, []);

  const weekDays = Array.from({ length: 6 }, (_, index) => {
    const day = new Date(currentDate);
    day.setDate(day.getDate() + index);
    return day;
  });

  const selectedModalFormation = formations.find(
    (formation) => String(formation.id_formation) === String(formData.id_formation)
  );

  const navigateWeek = (direction) => {
    setCurrentDate((current) => {
      const nextDate = new Date(current);
      nextDate.setDate(nextDate.getDate() + direction * 7);
      return nextDate;
    });
  };

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const openCreate = (date = '') => {
    const formationId = selectedFormation || (formations[0]?.id_formation ? String(formations[0].id_formation) : '');
    setEditingSeance(null);
    setFormData({ ...initialFormState, id_formation: formationId, date_seance: date });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (seance) => {
    setSelectedSeanceDetails(null);
    setEditingSeance(seance);
    setFormData({
      id_formation: seance.id_formation,
      titre: seance.titre || '',
      description: seance.description || '',
      date_seance: formatDateLocal(seance.date_seance),
      heure_debut: seance.heure_debut?.slice(0, 5) || '08:00',
      heure_fin: seance.heure_fin?.slice(0, 5) || '10:00',
      type_seance: seance.type_seance || 'Cours Magistral',
      salle: seance.salle || ''
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSeance(null);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const url = editingSeance ? `/formateur/planning/${editingSeance.id_seance}` : '/formateur/planning';
      if (editingSeance) await API.patch(url, formData);
      else await API.post(url, formData);
      closeModal();
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible d’enregistrer la séance.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (seance) => {
    if (!window.confirm(`Supprimer la séance « ${seance.titre || 'sans titre'} » ?`)) return;
    try {
      await API.delete(`/formateur/planning/${seance.id_seance}`);
      setSelectedSeanceDetails(null);
      await fetchData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de supprimer la séance.');
      setSelectedSeanceDetails(null);
    }
  };

  const weekLabel = `${weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${weekDays[5].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="min-h-screen bg-slate-50 p-3 font-sans text-slate-800 transition-colors duration-300 sm:p-6 dark:bg-[#1c1d22] dark:text-[#d1d5db]">
      <header className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center dark:border-white/5 dark:bg-[#23252d] dark:shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400">
            <CalendarDays size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Mon planning</h1>
            <p className="text-xs text-slate-500 dark:text-gray-400">Organisez les séances de vos formations</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedFormation}
            onChange={(event) => setSelectedFormation(event.target.value)}
            aria-label="Filtrer par formation"
            className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:border-white/10 dark:bg-[#18191e] dark:text-gray-200"
          >
            <option value="">Toutes les formations</option>
            {formations.map((formation) => (
              <option key={formation.id_formation} value={formation.id_formation}>{formation.titre}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-[#18191e]">
            <button
              type="button"
              onClick={() => navigateWeek(-1)}
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-[#282a33] dark:hover:text-white"
              title="Semaine précédente"
              aria-label="Semaine précédente"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-700 dark:text-gray-300">{weekLabel}</span>
            <button
              type="button"
              onClick={() => navigateWeek(1)}
              className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-[#282a33] dark:hover:text-white"
              title="Semaine suivante"
              aria-label="Semaine suivante"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreate()}
            disabled={!formations.length}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} /> Nouvelle séance
          </button>
        </div>
      </header>

      {error && !modalOpen && (
        <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-700 dark:text-orange-400">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-sm font-medium text-slate-500 dark:text-gray-500">Chargement du planning...</div>
      ) : formations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-white/15 dark:text-gray-400">
          Aucune formation n’est affectée à votre compte.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {weekDays.map((day, index) => {
            const dateISO = formatDateLocal(day);
            const daySeances = seances
              .filter((seance) => (
                formatDateLocal(seance.date_seance) === dateISO
                && (!selectedFormation || String(seance.id_formation) === selectedFormation)
              ))
              .sort((first, second) => (first.heure_debut || '').localeCompare(second.heure_debut || ''));
            const isToday = formatDateLocal(new Date()) === dateISO;

            return (
              <div
                key={dateISO}
                onClick={(event) => {
                  if (event.target === event.currentTarget) openCreate(dateISO);
                }}
                title="Cliquer sur la journée pour ajouter une séance"
                className="group/col flex min-h-[440px] cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-3 shadow-sm transition-all hover:border-orange-500/40 hover:bg-slate-200/50 md:min-h-[500px] dark:border-white/5 dark:bg-[#23252d] dark:shadow-lg dark:hover:bg-[#262832]"
              >
                <div className={`rounded-xl border border-white/10 ${headerColors[index % headerColors.length]} p-3 text-white shadow-md`}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })} {day.getDate()}
                    </span>
                    {isToday && <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-black uppercase text-black">Aujourd’hui</span>}
                  </div>
                  <div className="mt-1 text-[11px] font-medium opacity-80">
                    {daySeances.length} {daySeances.length > 1 ? 'séances' : 'séance'}
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
                  {daySeances.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => openCreate(dateISO)}
                      className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-4 text-center text-slate-400 transition hover:border-orange-500/40 hover:text-orange-500 dark:border-white/10 dark:text-gray-500 dark:hover:text-orange-400"
                    >
                      <Plus size={18} className="mb-1" />
                      <span className="text-[11px] font-medium">Cliquer pour ajouter</span>
                    </button>
                  ) : daySeances.map((seance) => (
                    <button
                      type="button"
                      key={seance.id_seance}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedSeanceDetails(seance);
                      }}
                      className="group rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition duration-200 hover:border-orange-500/40 hover:bg-orange-50/20 dark:border-white/5 dark:bg-[#2b2d37] dark:hover:bg-[#31333f]"
                    >
                      <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-gray-400">
                        <span className="truncate font-semibold text-orange-600 dark:text-orange-400">{seance.type_seance || 'Séance'}</span>
                        <span className="shrink-0 text-[10px]">{formatDateLocal(seance.date_seance).slice(8, 10)}/{formatDateLocal(seance.date_seance).slice(5, 7)}</span>
                      </div>
                      <h2 className="mt-1.5 line-clamp-2 text-xs font-bold leading-snug text-slate-800 dark:text-gray-100">
                        {seance.titre || seance.type_seance || 'Séance'}
                      </h2>
                      {seance.formation_titre && (
                        <p className="mt-1 truncate text-[10px] font-medium text-slate-500 dark:text-gray-400">{seance.formation_titre}</p>
                      )}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-white/5 dark:bg-[#202127] dark:text-gray-300">
                          {seance.heure_debut?.slice(0, 5)} - {seance.heure_fin?.slice(0, 5)}
                        </span>
                        {seance.salle && (
                          <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {seance.salle}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-white/5 dark:text-gray-500">
                        <span>Début</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{seance.heure_debut?.slice(0, 5)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm dark:bg-black/80">
          <section role="dialog" aria-modal="true" aria-labelledby="planning-dialog-title" className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl dark:border-white/10 dark:bg-[#23252d] dark:text-gray-200">
            <button type="button" onClick={closeModal} aria-label="Fermer" className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white">
              <X size={20} />
            </button>
            <h2 id="planning-dialog-title" className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-lg font-bold text-slate-900 dark:border-white/10 dark:text-white">
              <span className="inline-block h-5 w-2 rounded-full bg-orange-500" />
              {editingSeance ? 'Modifier la séance' : 'Programmer une séance'}
            </h2>

            {error && (
              <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-600 dark:text-orange-400">
                <AlertCircle size={16} className="shrink-0" /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Formation</span>
                <select required value={formData.id_formation} onChange={(event) => updateField('id_formation', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-orange-500 dark:border-white/10 dark:bg-[#18191e] dark:text-white">
                  <option value="">Sélectionner une formation</option>
                  {formations.map((formation) => <option key={formation.id_formation} value={formation.id_formation}>{formation.titre}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Titre</span>
                <input required value={formData.titre} onChange={(event) => updateField('titre', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-orange-500 dark:border-white/10 dark:bg-[#18191e] dark:text-white" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Type de séance</span>
                  <select value={formData.type_seance} onChange={(event) => updateField('type_seance', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-orange-500 dark:border-white/10 dark:bg-[#18191e] dark:text-white">
                    <option value="Cours Magistral">Cours Magistral</option>
                    <option value="Travaux Pratiques (TP)">Travaux Pratiques (TP)</option>
                    <option value="Travaux Dirigés (TD)">Travaux Dirigés (TD)</option>
                    <option value="Atelier / Workshop">Atelier / Workshop</option>
                    <option value="Examen / Évaluation">Examen / Évaluation</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Salle / lieu</span>
                  <input value={formData.salle} onChange={(event) => updateField('salle', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-orange-500 dark:border-white/10 dark:bg-[#18191e] dark:text-white" />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Date</span>
                <input
                  required
                  type="date"
                  disabled={!formData.id_formation}
                  min={formatDateLocal(selectedModalFormation?.date_debut)}
                  max={formatDateLocal(selectedModalFormation?.date_fin)}
                  value={formData.date_seance}
                  onChange={(event) => updateField('date_seance', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#18191e] dark:text-white"
                />
                {selectedModalFormation && (
                  <span className="mt-1 block text-[10px] text-slate-400 dark:text-gray-400">
                    Du {new Date(`${formatDateLocal(selectedModalFormation.date_debut)}T00:00:00`).toLocaleDateString('fr-FR')} au {new Date(`${formatDateLocal(selectedModalFormation.date_fin)}T00:00:00`).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Heure début</span>
                  <input required type="time" value={formData.heure_debut} onChange={(event) => updateField('heure_debut', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-orange-500 dark:border-white/10 dark:bg-[#18191e] dark:text-white" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Heure fin</span>
                  <input required type="time" value={formData.heure_fin} onChange={(event) => updateField('heure_fin', event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-orange-500 dark:border-white/10 dark:bg-[#18191e] dark:text-white" />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Description / remarques (facultatif)</span>
                <textarea rows={2} value={formData.description} onChange={(event) => updateField('description', event.target.value)} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-1 focus:ring-orange-500 dark:border-white/10 dark:bg-[#18191e] dark:text-white" />
              </label>

              <button type="submit" disabled={saving} className="mt-2 w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? 'Enregistrement...' : editingSeance ? 'Enregistrer les modifications' : 'Programmer la séance'}
              </button>
            </form>
          </section>
        </div>
      )}

      {selectedSeanceDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm dark:bg-black/80">
          <section role="dialog" aria-modal="true" aria-labelledby="session-details-title" className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl dark:border-white/10 dark:bg-[#23252d] dark:text-gray-200">
            <button type="button" onClick={() => setSelectedSeanceDetails(null)} aria-label="Fermer" className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white">
              <X size={20} />
            </button>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-md border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400">
                {selectedSeanceDetails.type_seance || 'Séance'}
              </span>
              {selectedSeanceDetails.formation_titre && (
                <span className="max-w-[180px] truncate rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-white/5 dark:text-gray-300">
                  {selectedSeanceDetails.formation_titre}
                </span>
              )}
            </div>
            <h2 id="session-details-title" className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
              {selectedSeanceDetails.titre || selectedSeanceDetails.type_seance || 'Séance de cours'}
            </h2>
            <div className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-white/10 dark:bg-[#18191e] dark:text-gray-300">
              <div className="flex items-center gap-2.5">
                <Clock size={15} className="shrink-0 text-orange-500 dark:text-orange-400" />
                <span>{new Date(`${formatDateLocal(selectedSeanceDetails.date_seance)}T00:00:00`).toLocaleDateString('fr-FR')} ({selectedSeanceDetails.heure_debut?.slice(0, 5)} - {selectedSeanceDetails.heure_fin?.slice(0, 5)})</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin size={15} className="shrink-0 text-orange-500 dark:text-orange-400" />
                <span>Salle : <strong>{selectedSeanceDetails.salle || 'Non spécifiée'}</strong></span>
              </div>
              {selectedSeanceDetails.description && (
                <div className="border-t border-slate-200 pt-2 dark:border-white/10">
                  <p className="italic text-slate-500 dark:text-gray-400">{selectedSeanceDetails.description}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => openEdit(selectedSeanceDetails)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 py-2.5 text-xs font-bold text-orange-700 transition hover:bg-orange-500/20 dark:text-orange-400">
                <Pencil size={15} /> Modifier
              </button>
              <button type="button" onClick={() => handleDelete(selectedSeanceDetails)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-500/20 dark:text-red-400">
                <Trash2 size={15} /> Supprimer
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
