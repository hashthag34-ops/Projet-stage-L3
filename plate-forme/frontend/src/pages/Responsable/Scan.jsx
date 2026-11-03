// frontend/src/pages/Responsable/Scan.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  QrCode, 
  RefreshCw, 
  XCircle,
  UserCheck,
  Search
} from 'lucide-react';
import API from '../../services/api';

const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';
const cardClass = 'rounded-3xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900';

const toLocalDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function Scan() {
  const [seances, setSeances] = useState([]);
  const [selectedSeance, setSelectedSeance] = useState(null);
  const [attendanceMode, setAttendanceMode] = useState('scan');
  const [learners, setLearners] = useState([]);
  const [manualSelected, setManualSelected] = useState([]);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [scanMessage, setScanMessage] = useState({ type: '', text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const processingRef = useRef(false);
  const today = toLocalDate(new Date());

  const loadSeances = async () => {
    setLoading(true);
    try {
      const response = await API.get('/responsable/seances');
      const allSeances = Array.isArray(response.data) ? response.data : [];
      
      // Tri : 1. Aujourd'hui en premier, 2. Séances futures les plus proches, 3. Séances passées
      const ordered = [...allSeances].sort((a, b) => {
        const dateA = toLocalDate(a.date_seance);
        const dateB = toLocalDate(b.date_seance);

        if (dateA === today && dateB !== today) return -1;
        if (dateA !== today && dateB === today) return 1;

        if (dateA >= today && dateB >= today) {
          return dateA.localeCompare(dateB) || String(a.heure_debut).localeCompare(String(b.heure_debut));
        }
        
        return dateB.localeCompare(dateA) || String(b.heure_debut).localeCompare(String(a.heure_debut));
      });
      
      setSeances(ordered);
    } catch (error) {
      setScanMessage({ type: 'error', text: error.response?.data?.message || 'Impossible de charger les séances.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSeances(); }, []);

  const loadAttendance = async (idSeance) => {
    setAttendanceLoading(true);
    try {
      const response = await API.get(`/presences/seances/${idSeance}/apprenants`);
      const data = response.data && Array.isArray(response.data.apprenants) ? response.data : { closed: false, apprenants: response.data };
      const allLearners = Array.isArray(data.apprenants) ? data.apprenants : [];
      setLearners(allLearners);
      setClosed(Boolean(data.closed));
      setManualSelected([]);
    } catch (error) {
      setScanMessage({ type: 'error', text: error.response?.data?.error || 'Impossible de charger les présences.' });
    } finally {
      setAttendanceLoading(false);
    }
  };

  const openSeance = async (seance) => {
    setSelectedSeance(seance);
    setAttendanceMode('scan');
    setScanMessage({ type: '', text: '' });
    await loadAttendance(seance.id_seance);
  };

  useEffect(() => {
    if (!selectedSeance || closed || attendanceMode !== 'scan') return undefined;
    
    const scanner = new Html5QrcodeScanner(
      'reader', 
      { fps: 10, qrbox: { width: 220, height: 220 }, facingMode: 'environment' }, 
      false
    );

    scanner.render(async (decodedText) => {
      if (processingRef.current) return;
      processingRef.current = true;
      try {
        const response = await API.post('/presences/scan', { id_seance: selectedSeance.id_seance, qr_data: decodedText });
        setScanMessage({ type: 'success', text: response.data.message });
        await loadAttendance(selectedSeance.id_seance);
      } catch (error) {
        setScanMessage({ type: 'error', text: error.response?.data?.error || 'QR Code invalide.' });
      } finally {
        setTimeout(() => { processingRef.current = false; }, 1800);
      }
    }, () => {});

    return () => { scanner.clear().catch(() => {}); };
  }, [selectedSeance, closed, attendanceMode]);

  const saveManual = async () => {
    try {
      await API.post('/presences/manuel', { id_seance: selectedSeance.id_seance, id_apprenants: manualSelected });
      setScanMessage({ type: 'success', text: 'Présences manuelles enregistrées.' });
      await loadAttendance(selectedSeance.id_seance);
    } catch (error) {
      setScanMessage({ type: 'error', text: error.response?.data?.error || 'Impossible d’enregistrer les présences.' });
    }
  };

  const closeAttendance = async () => {
    if (!window.confirm('Terminer le pointage ? Tous les apprenants restants seront marqués absents.')) return;
    setClosing(true);
    try {
      await API.post(`/presences/seances/${selectedSeance.id_seance}/cloturer`);
      setClosed(true);
      setScanMessage({ type: 'success', text: 'Pointage clôturé avec succès.' });
      await loadAttendance(selectedSeance.id_seance);
    } catch (error) {
      setScanMessage({ type: 'error', text: error.response?.data?.error || 'Impossible de clôturer le pointage.' });
    } finally {
      setClosing(false);
    }
  };

  const updateClosedStatus = async (idApprenant, statut) => {
    try {
      await API.patch(`/presences/seances/${selectedSeance.id_seance}/apprenants/${idApprenant}`, { statut });
      setLearners((current) => current.map((learner) => learner.id_apprenant === idApprenant ? { ...learner, statut_presence: statut } : learner));
    } catch (error) {
      setScanMessage({ type: 'error', text: error.response?.data?.error || 'Impossible de modifier la présence.' });
    }
  };

  const formatDate = (value) => new Date(value).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  
  const pendingLearners = learners.filter((learner) => !['PRESENT', 'ABSENT'].includes(learner.statut_presence));
  
  const filteredLearners = pendingLearners.filter((l) => 
    `${l.prenom} ${l.nom} ${l.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:px-6 sm:py-6">
      {/* Styles d'injection pour personnaliser l'outil de scan html5-qrcode */}
      <style>{`
        #reader { border: none !important; width: 100% !important; }
        #reader video { border-radius: 1rem !important; object-fit: cover !important; }
        #reader button { 
          background-color: #f97316 !important; 
          color: #09090b !important; 
          border: none !important; 
          border-radius: 1rem !important; 
          padding: 10px 20px !important; 
          font-weight: 800 !important; 
          font-size: 12px !important;
          cursor: pointer !important; 
          margin-top: 10px !important;
          transition: opacity 0.2s !important;
        }
        #reader button:hover { opacity: 0.9 !important; }
        #reader img[alt="Info icon"] { display: none !important; }
        #reader__dashboard_section_csr span { display: none !important; }
        #reader__dashboard_section_csr a { display: none !important; }
        #reader__status_span { display: none !important; }
        #reader__header_message { display: none !important; }
      `}</style>

      {scanMessage.text && (
        <div className={`flex items-center justify-between rounded-2xl p-4 text-xs font-semibold ${scanMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' : scanMessage.type === 'error' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20' : 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20'}`}>
          <div className="flex items-center gap-2.5">
            {scanMessage.type === 'success' ? <CheckCircle2 size={18} /> : scanMessage.type === 'error' ? <XCircle size={18} /> : <AlertCircle size={18} />}
            <span>{scanMessage.text}</span>
          </div>
          <button className="rounded-lg p-1 opacity-70 hover:opacity-100" onClick={() => setScanMessage({ type: '', text: '' })}>
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* VUE 1 : GRILLE DES SÉANCES */}
      {!selectedSeance ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-orange-500" />
              <h2 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                Séances disponibles ({seances.length})
              </h2>
            </div>
          </div>

          {loading ? (
            <div className={`${cardClass} p-12 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400`}>
              Chargement des séances...
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {seances.map((seance) => {
                const dateISO = toLocalDate(seance.date_seance);
                const isToday = dateISO === today;
                const isFuture = dateISO > today;

                return (
                  <button 
                    key={seance.id_seance} 
                    type="button" 
                    onClick={() => openSeance(seance)}
                    className={`${cardClass} group flex flex-col justify-between p-5 text-left transition hover:border-orange-500 hover:shadow-md dark:hover:border-orange-500 cursor-pointer relative overflow-hidden`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">
                          {seance.type_seance || 'Séance'}
                        </span>
                        {isToday ? (
                          <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-black text-zinc-950 animate-pulse">
                            Aujourd’hui
                          </span>
                        ) : isFuture ? (
                          <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                            À venir
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <h3 className="text-sm font-black text-zinc-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition truncate">
                          {seance.titre || `Séance #${seance.id_seance}`}
                        </h3>
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {seance.formation_titre}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800 pt-3.5 flex flex-col gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-orange-500 shrink-0" />
                        <span>{formatDate(seance.date_seance)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-orange-500 shrink-0" />
                          <span>{seance.heure_debut?.slice(0, 5)} - {seance.heure_fin?.slice(0, 5)}</span>
                        </div>
                        {seance.salle && (
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate max-w-[90px]">{seance.salle}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {!seances.length && (
                <div className={`${cardClass} col-span-full p-12 text-center text-xs text-zinc-500`}>
                  Aucune séance programmée.
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* VUE 2 : ÉMARGEMENT & SCAN D'UNE SÉANCE SÉLECTIONNÉE */
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button 
              type="button" 
              onClick={() => setSelectedSeance(null)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition hover:border-orange-500"
            >
              <ArrowLeft size={16} />
              <span>Retour aux séances</span>
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Pointage en cours
            </span>
          </div>

          <div className={`${cardClass} p-5 space-y-6`}>
            {/* Informations de la séance en haut */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4">
              <div>
                <span className="rounded-lg bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">
                  {selectedSeance.type_seance || 'Séance'}
                </span>
                <h2 className="text-base font-black text-zinc-900 dark:text-white mt-1.5">
                  {selectedSeance.titre || selectedSeance.formation_titre}
                </h2>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {selectedSeance.formation_titre}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-orange-500" /> {formatDate(selectedSeance.date_seance)}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} className="text-orange-500" /> {selectedSeance.heure_debut?.slice(0, 5)} - {selectedSeance.heure_fin?.slice(0, 5)}</span>
                {selectedSeance.salle && <span className="flex items-center gap-1.5"><MapPin size={14} className="text-orange-500" /> {selectedSeance.salle}</span>}
              </div>
            </div>

            {closed ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400">Présences clôturées</h3>
                  <span className="text-xs font-bold text-zinc-500">{learners.length} apprenants</span>
                </div>
                <div className="max-h-96 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 divide-y divide-zinc-200 dark:divide-zinc-800">
                  {learners.map((learner) => (
                    <div key={learner.id_apprenant} className="flex items-center justify-between gap-3 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/60">
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">{learner.prenom} {learner.nom}</p>
                        <p className="text-[11px] text-zinc-400">{learner.email}</p>
                      </div>
                      <select 
                        value={learner.statut_presence || 'ABSENT'} 
                        onChange={(event) => updateClosedStatus(learner.id_apprenant, event.target.value)}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        <option value="PRESENT">Présent</option>
                        <option value="ABSENT">Absent</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sélecteur de mode Scan vs Manuel */}
                <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <button 
                    type="button" 
                    onClick={() => setAttendanceMode('scan')} 
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold transition cursor-pointer ${attendanceMode === 'scan' ? 'bg-orange-500 text-zinc-950 shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                  >
                    <QrCode size={16} />
                    <span>Scan QR Code</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setAttendanceMode('manual')} 
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold transition cursor-pointer ${attendanceMode === 'manual' ? 'bg-orange-500 text-zinc-950 shadow-xs' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
                  >
                    <UserCheck size={16} />
                    <span>Présence manuelle</span>
                  </button>
                </div>

                {/* MODE SCAN QR CODE */}
                {attendanceMode === 'scan' ? (
                  <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-orange-500/30 bg-zinc-50/50 p-6 dark:bg-zinc-900/30">
                    <div className="w-full max-w-sm">
                      <div id="reader" />
                    </div>
                  </div>
                ) : (
                  /* MODE PRÉSENCE MANUELLE */
                  <div className="space-y-4">
                    <div className="relative">
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="text"
                        placeholder="Rechercher un apprenant..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${inputClass} pl-10`}
                      />
                    </div>

                    <div className="max-h-80 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 divide-y divide-zinc-200 dark:divide-zinc-800">
                      {attendanceLoading ? (
                        <p className="p-8 text-center text-xs text-zinc-500">Chargement...</p>
                      ) : filteredLearners.map((learner) => (
                        <label key={learner.id_apprenant} className="flex cursor-pointer items-center gap-3 p-4 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/60">
                          <input 
                            type="checkbox" 
                            checked={manualSelected.includes(learner.id_apprenant)} 
                            onChange={() => setManualSelected((current) => current.includes(learner.id_apprenant) ? current.filter((id) => id !== learner.id_apprenant) : [...current, learner.id_apprenant])} 
                            className="h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500 dark:border-zinc-700"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-xs font-bold text-zinc-900 dark:text-white">{learner.prenom} {learner.nom}</p>
                            <p className="truncate text-[11px] text-zinc-400">{learner.email}</p>
                          </div>
                        </label>
                      ))}
                      {!filteredLearners.length && !attendanceLoading && (
                        <p className="p-8 text-center text-xs text-zinc-500">Aucun apprenant à pointer.</p>
                      )}
                    </div>
                    
                    <button 
                      type="button" 
                      className="w-full rounded-2xl bg-orange-500 py-3.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 disabled:opacity-50 cursor-pointer" 
                      disabled={!manualSelected.length} 
                      onClick={saveManual}
                    >
                      Enregistrer les présences sélectionnées ({manualSelected.length})
                    </button>
                  </div>
                )}

                <button 
                  type="button" 
                  className="w-full rounded-2xl bg-zinc-900 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 cursor-pointer" 
                  disabled={closing} 
                  onClick={closeAttendance}
                >
                  {closing ? 'Clôture en cours...' : 'Terminer le pointage'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}