import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { AlertCircle, Calendar, CheckCircle2, Clock, MapPin, QrCode, RefreshCw, XCircle } from 'lucide-react';
import API from '../../services/api';
import '../css/ResponsableScan.css';

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
    <div className="fs-container">
      <style>{`#reader button { background:#f97316!important;color:#18181b!important;border:0!important;border-radius:12px!important;padding:8px 16px!important } #reader img[alt="Info icon"]{display:none!important}`}</style>
      <div className="fs-header-card">
        <div className="fs-header-icon-wrap"><QrCode size={26} /></div>
        <div><h1 className="fs-title">Gestion des présences</h1><p className="fs-subtitle">Sélectionnez une séance pour effectuer ou consulter l’émargement</p></div>
      </div>

      {!selectedSeance ? (
        <div className="fs-main-panel">
          <div className="fs-select-header"><label className="fs-label"><Calendar size={14} /> Toutes les séances</label></div>
          {loading ? <div className="fs-loading-box">Chargement des séances...</div> : (
            <div className="fs-seance-list">
              {seances.map((seance) => (
                <button key={seance.id_seance} type="button" className="fs-seance-card" onClick={() => openSeance(seance)}>
                  <span className="fs-seance-main">
                    <strong>{seance.titre || `Séance #${seance.id_seance}`}</strong>
                    <small>{seance.formation_titre}</small>
                  </span>
                  <span className="fs-seance-meta">
                    {toLocalDate(seance.date_seance) === today && <span className="fs-today-badge">Aujourd’hui</span>}
                    <span>{formatDate(seance.date_seance)}</span>
                    <span><Clock size={13} /> {seance.heure_debut?.slice(0, 5)} - {seance.heure_fin?.slice(0, 5)}</span>
                  </span>
                  <span className="fs-seance-arrow">›</span>
                </button>
              ))}
              {!seances.length && <p className="fs-manual-loading">Aucune séance programmée.</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="fs-main-panel">
          <button type="button" className="fs-filter-toggle" onClick={() => setSelectedSeance(null)}>← Retour aux séances</button>
          <div className="fs-details-banner">
            <div><span className="fs-details-badge">{selectedSeance.type_seance || 'Séance'}</span><strong>{selectedSeance.titre || selectedSeance.formation_titre}</strong></div>
            <div className="fs-details-right"><span><Calendar size={13} /> {formatDate(selectedSeance.date_seance)}</span><span><Clock size={13} /> {selectedSeance.heure_debut?.slice(0, 5)} - {selectedSeance.heure_fin?.slice(0, 5)}</span>{selectedSeance.salle && <span><MapPin size={13} /> {selectedSeance.salle}</span>}</div>
          </div>

          {closed ? (
            <div className="fs-manual-container">
              <h2 className="fs-label">Présences clôturées</h2>
              <div className="fs-manual-scroll">
                {learners.map((learner) => (
                  <div key={learner.id_apprenant} className="fs-learner-row fs-closed-row">
                    <span className="fs-learner-name">{learner.prenom} {learner.nom}</span>
                    <select value={learner.statut_presence || 'ABSENT'} onChange={(event) => updateClosedStatus(learner.id_apprenant, event.target.value)}>
                      <option value="PRESENT">Présent</option>
                      <option value="ABSENT">Absent</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="fs-mode-tabs">
                <button type="button" onClick={() => setAttendanceMode('scan')} className={`fs-tab-btn ${attendanceMode === 'scan' ? 'active' : ''}`}>Scan QR</button>
                <button type="button" onClick={() => setAttendanceMode('manual')} className={`fs-tab-btn ${attendanceMode === 'manual' ? 'active' : ''}`}>Présence manuelle</button>
              </div>
              {attendanceMode === 'scan' ? (
                <div className="fs-scanner-space"><div className="fs-reader-box"><div id="reader" /></div></div>
              ) : (
                <div className="fs-manual-container">
                  <div className="fs-manual-scroll">
                    {attendanceLoading ? <p className="fs-manual-loading">Chargement...</p> : pendingLearners.map((learner) => (
                      <label key={learner.id_apprenant} className="fs-learner-row">
                        <input type="checkbox" checked={manualSelected.includes(learner.id_apprenant)} onChange={() => setManualSelected((current) => current.includes(learner.id_apprenant) ? current.filter((id) => id !== learner.id_apprenant) : [...current, learner.id_apprenant])} />
                        <span className="fs-learner-name">{learner.prenom} {learner.nom}</span>
                        <span className="fs-learner-mail">{learner.email}</span>
                      </label>
                    ))}
                    {!pendingLearners.length && !attendanceLoading && <p className="fs-manual-loading">Tous les apprenants ont été marqués présents.</p>}
                  </div>
                  <button type="button" className="fs-submit-btn" disabled={!manualSelected.length} onClick={saveManual}>Enregistrer les présences sélectionnées</button>
                </div>
              )}
              <button type="button" className="fs-submit-btn fs-close-attendance" disabled={closing} onClick={closeAttendance}>
                {closing ? 'Clôture...' : 'Terminer le pointage'}
              </button>
            </>
          )}

          {scanMessage.text && <div className={`fs-scan-alert ${scanMessage.type}`}><div className="fs-alert-content">{scanMessage.type === 'success' ? <CheckCircle2 size={20} /> : scanMessage.type === 'error' ? <XCircle size={20} /> : <AlertCircle size={20} />}<span>{scanMessage.text}</span></div><button className="fs-alert-close" onClick={() => setScanMessage({ type: '', text: '' })}><RefreshCw size={15} /></button></div>}
        </div>
      )}
    </div>
  );
}
