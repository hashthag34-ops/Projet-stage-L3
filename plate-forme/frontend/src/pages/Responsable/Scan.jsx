import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { AlertCircle, Calendar, CheckCircle2, Clock, MapPin, QrCode, RefreshCw, XCircle } from 'lucide-react';
import API from '../../services/api';
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
    <div className="fs-container [margin:0_auto] [min-height:100vh] [max-width:680px] [background-color:var(--fs-bg)] [padding:16px_12px_48px_12px] [color:var(--fs-text)] [font-family:inherit] [box-sizing:border-box] [transition:background-color_0.3s_ease,_color_0.3s_ease]">
      <style>{`#reader button { background:#f97316!important;color:#18181b!important;border:0!important;border-radius:12px!important;padding:8px 16px!important } #reader img[alt="Info icon"]{display:none!important}`}</style>
      <div className="fs-header-card [margin-bottom:20px] [display:flex] [align-items:center] [gap:14px] [border-radius:20px] [border:1px_solid_var(--fs-border)] [background-color:var(--fs-panel)] [padding:20px] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box]">
        <div className="fs-header-icon-wrap [display:flex] [height:48px] [width:48px] [flex-shrink:0] [align-items:center] [justify-content:center] [border-radius:16px] [background-color:var(--orange-primary)] [color:\#18181b] [box-shadow:0_4px_12px_rgba(249,_115,_22,_0.3)]"><QrCode size={26} /></div>
        <div><h1 className="fs-title [margin:0] [font-size:18px] [font-weight:900] [letter-spacing:-0.025em] [color:var(--fs-text)]">Gestion des présences</h1><p className="fs-subtitle [margin:4px_0_0_0] [font-size:11px] [color:var(--fs-muted)]">Sélectionnez une séance pour effectuer ou consulter l’émargement</p></div>
      </div>

      {!selectedSeance ? (
        <div className="fs-main-panel [border-radius:24px] [border:1px_solid_var(--fs-border)] [background-color:var(--fs-panel)] [padding:20px] [box-shadow:0_10px_30px_var(--shadow-color)] [box-sizing:border-box]">
          <div className="fs-select-header [display:flex] [align-items:center] [justify-content:space-between] [margin-bottom:8px]"><label className="fs-label [font-size:11px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fs-muted)]"><Calendar size={14} /> Toutes les séances</label></div>
          {loading ? <div className="fs-loading-box [border-radius:14px] [border:1px_solid_var(--fs-border)] [padding:12px] [text-align:center] [font-size:12px] [color:var(--fs-muted)] [background-color:var(--fs-subbox)]">Chargement des séances...</div> : (
            <div className="fs-seance-list [display:grid] [gap:10px]">
              {seances.map((seance) => (
                <button key={seance.id_seance} type="button" className="fs-seance-card [width:100%] [display:grid] [grid-template-columns:minmax(0,_1fr)_auto_18px] [align-items:center] [gap:12px] [border:1px_solid_var(--fs-border)] [border-radius:14px] [background:var(--fs-subbox)] [padding:14px] [color:var(--fs-text)] [text-align:left] [cursor:pointer] [&:hover]:[border-color:var(--orange-primary)]" onClick={() => openSeance(seance)}>
                  <span className="fs-seance-main [display:flex] [flex-direction:column] [gap:3px]">
                    <strong>{seance.titre || `Séance #${seance.id_seance}`}</strong>
                    <small>{seance.formation_titre}</small>
                  </span>
                  <span className="fs-seance-meta [display:flex] [flex-direction:column] [gap:3px] [color:var(--fs-muted)] [font-size:11px]">
                    {toLocalDate(seance.date_seance) === today && <span className="fs-today-badge [width:fit-content] [border-radius:999px] [background:var(--orange-primary)] [padding:2px_8px] [color:\#18181b] [font-weight:800]">Aujourd’hui</span>}
                    <span>{formatDate(seance.date_seance)}</span>
                    <span><Clock size={13} /> {seance.heure_debut?.slice(0, 5)} - {seance.heure_fin?.slice(0, 5)}</span>
                  </span>
                  <span className="fs-seance-arrow [font-size:28px] [color:var(--orange-primary)]">›</span>
                </button>
              ))}
              {!seances.length && <p className="fs-manual-loading [padding:32px] [text-align:center] [font-size:12px] [color:var(--fs-muted)]">Aucune séance programmée.</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="fs-main-panel [border-radius:24px] [border:1px_solid_var(--fs-border)] [background-color:var(--fs-panel)] [padding:20px] [box-shadow:0_10px_30px_var(--shadow-color)] [box-sizing:border-box]">
          <button type="button" className="fs-filter-toggle [font-size:11px] [font-weight:700] [color:var(--orange-primary)] [background:none] [border:none] [cursor:pointer] [&:hover]:[text-decoration:underline]" onClick={() => setSelectedSeance(null)}>← Retour aux séances</button>
          <div className="fs-details-banner [margin-bottom:20px] [display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:space-between] [gap:12px] [border-radius:16px] [border:1px_solid_var(--fs-border)] [background-color:var(--fs-subbox)] [padding:14px_16px] [box-sizing:border-box]">
            <div><span className="fs-details-badge [border-radius:6px] [background-color:var(--orange-bg-light)] [padding:2px_8px] [font-size:10px] [font-weight:800] [color:var(--orange-primary)] [flex-shrink:0]">{selectedSeance.type_seance || 'Séance'}</span><strong>{selectedSeance.titre || selectedSeance.formation_titre}</strong></div>
            <div className="fs-details-right [display:flex] [align-items:center] [gap:12px] [font-size:11px] [color:var(--fs-muted)] [flex-shrink:0]"><span><Calendar size={13} /> {formatDate(selectedSeance.date_seance)}</span><span><Clock size={13} /> {selectedSeance.heure_debut?.slice(0, 5)} - {selectedSeance.heure_fin?.slice(0, 5)}</span>{selectedSeance.salle && <span><MapPin size={13} /> {selectedSeance.salle}</span>}</div>
          </div>

          {closed ? (
            <div className="fs-manual-container [display:flex] [flex-direction:column] [gap:12px]">
              <h2 className="fs-label [font-size:11px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--fs-muted)]">Présences clôturées</h2>
              <div className="fs-manual-scroll [max-height:320px] [overflow-y:auto] [border-radius:16px] [border:1px_solid_var(--fs-border)] [background-color:var(--fs-subbox)]">
                {learners.map((learner) => (
                  <div key={learner.id_apprenant} className="fs-learner-row [display:flex] [cursor:pointer] [align-items:center] [gap:12px] [border-bottom:1px_solid_var(--fs-border)] [padding:12px_16px] [transition:background-color_0.2s] [box-sizing:border-box] [&:hover]:[background-color:var(--fs-hover)] fs-closed-row [justify-content:space-between]">
                    <span className="fs-learner-name [min-width:0] [flex:1] [font-size:12px] [font-weight:700] [color:var(--fs-text)]">{learner.prenom} {learner.nom}</span>
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
              <div className="fs-mode-tabs [margin-bottom:16px] [display:grid] [grid-template-columns:repeat(2,_1fr)] [gap:4px] [border-radius:14px] [background-color:var(--fs-subbox)] [padding:4px] [border:1px_solid_var(--fs-border)]">
                <button type="button" onClick={() => setAttendanceMode('scan')} className={`fs-tab-btn ${attendanceMode === 'scan' ? 'active' : ''}`}>Scan QR</button>
                <button type="button" onClick={() => setAttendanceMode('manual')} className={`fs-tab-btn ${attendanceMode === 'manual' ? 'active' : ''}`}>Présence manuelle</button>
              </div>
              {attendanceMode === 'scan' ? (
                <div className="fs-scanner-space [display:flex] [flex-direction:column] [gap:16px]"><div className="fs-reader-box [overflow:hidden] [border-radius:20px] [border:2px_dashed_rgba(249,_115,_22,_0.4)] [background-color:var(--fs-subbox)] [padding:8px] [box-sizing:border-box]"><div id="reader" /></div></div>
              ) : (
                <div className="fs-manual-container [display:flex] [flex-direction:column] [gap:12px]">
                  <div className="fs-manual-scroll [max-height:320px] [overflow-y:auto] [border-radius:16px] [border:1px_solid_var(--fs-border)] [background-color:var(--fs-subbox)]">
                    {attendanceLoading ? <p className="fs-manual-loading [padding:32px] [text-align:center] [font-size:12px] [color:var(--fs-muted)]">Chargement...</p> : pendingLearners.map((learner) => (
                      <label key={learner.id_apprenant} className="fs-learner-row [display:flex] [cursor:pointer] [align-items:center] [gap:12px] [border-bottom:1px_solid_var(--fs-border)] [padding:12px_16px] [transition:background-color_0.2s] [box-sizing:border-box] [&:hover]:[background-color:var(--fs-hover)]">
                        <input type="checkbox" checked={manualSelected.includes(learner.id_apprenant)} onChange={() => setManualSelected((current) => current.includes(learner.id_apprenant) ? current.filter((id) => id !== learner.id_apprenant) : [...current, learner.id_apprenant])} />
                        <span className="fs-learner-name [min-width:0] [flex:1] [font-size:12px] [font-weight:700] [color:var(--fs-text)]">{learner.prenom} {learner.nom}</span>
                        <span className="fs-learner-mail [font-size:11px] [color:var(--fs-muted)] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis] [max-width:150px]">{learner.email}</span>
                      </label>
                    ))}
                    {!pendingLearners.length && !attendanceLoading && <p className="fs-manual-loading [padding:32px] [text-align:center] [font-size:12px] [color:var(--fs-muted)]">Tous les apprenants ont été marqués présents.</p>}
                  </div>
                  <button type="button" className="fs-submit-btn [width:100%] [border-radius:14px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:12px] [font-size:12px] [font-weight:900] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s]" disabled={!manualSelected.length} onClick={saveManual}>Enregistrer les présences sélectionnées</button>
                </div>
              )}
              <button type="button" className="fs-submit-btn [width:100%] [border-radius:14px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:12px] [font-size:12px] [font-weight:900] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] fs-close-attendance [margin-top:16px]" disabled={closing} onClick={closeAttendance}>
                {closing ? 'Clôture...' : 'Terminer le pointage'}
              </button>
            </>
          )}

          {scanMessage.text && <div className={`fs-scan-alert ${scanMessage.type}`}><div className="fs-alert-content [display:flex] [align-items:center] [gap:10px] [min-width:0]">{scanMessage.type === 'success' ? <CheckCircle2 size={20} /> : scanMessage.type === 'error' ? <XCircle size={20} /> : <AlertCircle size={20} />}<span>{scanMessage.text}</span></div><button className="fs-alert-close [background:none] [border:none] [cursor:pointer] [color:inherit] [opacity:0.7] [padding:4px] [&:hover]:[opacity:1]" onClick={() => setScanMessage({ type: '', text: '' })}><RefreshCw size={15} /></button></div>}
        </div>
      )}
    </div>
  );
}
