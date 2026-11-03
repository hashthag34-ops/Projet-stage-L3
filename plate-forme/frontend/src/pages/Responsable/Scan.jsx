import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { AlertCircle, Calendar, CheckCircle2, Clock, MapPin, QrCode, RefreshCw, XCircle } from 'lucide-react';
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
  const processingRef = useRef(false);
  const today = toLocalDate(new Date());

  const loadSeances = async () => {
    setLoading(true);
    try {
      const response = await API.get('/responsable/seances');
      const ordered = [...(Array.isArray(response.data) ? response.data : [])].sort((a, b) => {
        if (toLocalDate(a.date_seance) === today && toLocalDate(b.date_seance) !== today) return -1;
        if (toLocalDate(a.date_seance) !== today && toLocalDate(b.date_seance) === today) return 1;
        return String(b.date_seance).localeCompare(String(a.date_seance)) || String(a.heure_debut).localeCompare(String(b.heure_debut));
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
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 240, height: 240 }, facingMode: 'environment' }, false);
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

  const formatDate = (value) => new Date(value).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
  const pendingLearners = learners.filter((learner) => !['PRESENT', 'ABSENT'].includes(learner.statut_presence));

  return (
    <div className="mx-auto min-h-screen max-w-2xl space-y-6 px-3 py-6 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:px-6">
      <style>{`#reader button { background:#f97316!important;color:#09090b!important;border:0!important;border-radius:12px!important;padding:8px 16px!important;font-weight:800!important;cursor:pointer!important; } #reader img[alt="Info icon"]{display:none!important}`}</style>
      
      {/* En-tête */}
      <div className={`${cardClass} flex items-center gap-4 p-5 sm:p-6`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-zinc-950 shadow-md shadow-orange-500/20">
          <QrCode size={26} />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white sm:text-xl">Gestion des présences</h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Sélectionnez une séance pour effectuer ou consulter l’émargement</p>
        </div>
      </div>

      {!selectedSeance ? (
        <div className={`${cardClass} p-5 sm:p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <Calendar size={15} /> Toutes les séances
            </label>
          </div>
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
              Chargement des séances...
            </div>
          ) : (
            <div className="grid gap-3">
              {seances.map((seance) => (
                <button 
                  key={seance.id_seance} 
                  type="button" 
                  className="group grid w-full grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-left text-zinc-900 transition hover:border-orange-500 hover:bg-white dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:hover:border-orange-500" 
                  onClick={() => openSeance(seance)}
                >
                  <span className="flex flex-col gap-1 min-w-0">
                    <strong className="truncate text-xs font-bold text-zinc-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">{seance.titre || `Séance #${seance.id_seance}`}</strong>
                    <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{seance.formation_titre}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
                    {toLocalDate(seance.date_seance) === today && <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[10px] font-black text-zinc-950">Aujourd’hui</span>}
                    <span>{formatDate(seance.date_seance)}</span>
                    <span className="flex items-center gap-1 font-semibold"><Clock size={12} /> {seance.heure_debut?.slice(0, 5)} - {seance.heure_fin?.slice(0, 5)}</span>
                  </span>
                  <span className="text-lg font-black text-orange-500">›</span>
                </button>
              ))}
              {!seances.length && <p className="p-8 text-center text-xs text-zinc-500">Aucune séance programmée.</p>}
            </div>
          )}
        </div>
      ) : (
        <div className={`${cardClass} space-y-5 p-5 sm:p-6`}>
          <button 
            type="button" 
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 transition hover:underline dark:text-orange-400" 
            onClick={() => setSelectedSeance(null)}
          >
            ← Retour aux séances
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-orange-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-orange-600 dark:text-orange-400">{selectedSeance.type_seance || 'Séance'}</span>
              <strong className="text-xs font-bold text-zinc-900 dark:text-white">{selectedSeance.titre || selectedSeance.formation_titre}</strong>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1"><Calendar size={13} /> {formatDate(selectedSeance.date_seance)}</span>
              <span className="flex items-center gap-1"><Clock size={13} /> {selectedSeance.heure_debut?.slice(0, 5)} - {selectedSeance.heure_fin?.slice(0, 5)}</span>
              {selectedSeance.salle && <span className="flex items-center gap-1"><MapPin size={13} /> {selectedSeance.salle}</span>}
            </div>
          </div>

          {closed ? (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Présences clôturées</h2>
              <div className="max-h-80 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40 divide-y divide-zinc-200 dark:divide-zinc-800">
                {learners.map((learner) => (
                  <div key={learner.id_apprenant} className="flex items-center justify-between gap-3 p-3.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/60">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{learner.prenom} {learner.nom}</span>
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
            <>
              <div className="grid grid-cols-2 gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-800/40">
                <button 
                  type="button" 
                  onClick={() => setAttendanceMode('scan')} 
                  className={`rounded-xl py-2 text-xs font-bold transition ${attendanceMode === 'scan' ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  Scan QR
                </button>
                <button 
                  type="button" 
                  onClick={() => setAttendanceMode('manual')} 
                  className={`rounded-xl py-2 text-xs font-bold transition ${attendanceMode === 'manual' ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                >
                  Présence manuelle
                </button>
              </div>

              {attendanceMode === 'scan' ? (
                <div className="overflow-hidden rounded-2xl border-2 border-dashed border-orange-500/40 bg-zinc-50 p-2 dark:bg-zinc-800/40">
                  <div id="reader" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-80 overflow-y-auto rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/40 divide-y divide-zinc-200 dark:divide-zinc-800">
                    {attendanceLoading ? (
                      <p className="p-8 text-center text-xs text-zinc-500">Chargement...</p>
                    ) : pendingLearners.map((learner) => (
                      <label key={learner.id_apprenant} className="flex cursor-pointer items-center gap-3 p-3.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800/60">
                        <input 
                          type="checkbox" 
                          checked={manualSelected.includes(learner.id_apprenant)} 
                          onChange={() => setManualSelected((current) => current.includes(learner.id_apprenant) ? current.filter((id) => id !== learner.id_apprenant) : [...current, learner.id_apprenant])} 
                          className="h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500 dark:border-zinc-700"
                        />
                        <span className="flex-1 truncate text-xs font-bold text-zinc-900 dark:text-white">{learner.prenom} {learner.nom}</span>
                        <span className="max-w-[140px] truncate text-[11px] text-zinc-500 dark:text-zinc-400">{learner.email}</span>
                      </label>
                    ))}
                    {!pendingLearners.length && !attendanceLoading && <p className="p-8 text-center text-xs text-zinc-500">Tous les apprenants ont été marqués présents.</p>}
                  </div>
                  <button 
                    type="button" 
                    className="w-full rounded-2xl bg-orange-500 py-3 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 disabled:opacity-50" 
                    disabled={!manualSelected.length} 
                    onClick={saveManual}
                  >
                    Enregistrer les présences sélectionnées
                  </button>
                </div>
              )}

              <button 
                type="button" 
                className="w-full rounded-2xl bg-zinc-900 py-3 text-xs font-black text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700" 
                disabled={closing} 
                onClick={closeAttendance}
              >
                {closing ? 'Clôture...' : 'Terminer le pointage'}
              </button>
            </>
          )}

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
        </div>
      )}
    </div>
  );
}