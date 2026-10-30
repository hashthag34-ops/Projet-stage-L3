// frontend/src/pages/Responsable/Scan.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import API from '../../services/api';
import '../css/ResponsableScan.css'; // Importation du CSS classique

export default function Scan() {
  const [seances, setSeances] = useState([]);
  const [todaysSeances, setTodaysSeances] = useState([]);
  const [selectedSeance, setSelectedSeance] = useState('');
  const [showAllSeances, setShowAllSeances] = useState(false);
  const [scanMessage, setScanMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [attendanceMode, setAttendanceMode] = useState('scan');
  const [manualLearners, setManualLearners] = useState([]);
  const [manualSelected, setManualSelected] = useState([]);
  const [manualLoading, setManualLoading] = useState(false);

  // Ref pour bloquer les scans en boucle rapide (anti-rebond)
  const isProcessingRef = useRef(false);

  // Helper pour formater la date au format YYYY-MM-DD en local
  const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayISO = formatDateLocal(new Date());

  // Charger les séances et filtrer celles du jour
  useEffect(() => {
    const fetchSeances = async () => {
      setLoading(true);
      try {
        const res = await API.get('/responsable/seances');
        const data = Array.isArray(res.data) ? res.data : [];
        setSeances(data);

        // Filtrer les séances prévues aujourd'hui
        const duJour = data.filter(s => s.date_seance && formatDateLocal(s.date_seance) === todayISO);
        setTodaysSeances(duJour);

        // Si des séances existent aujourd'hui, en sélectionner une par défaut
        if (duJour.length > 0) {
          setSelectedSeance(String(duJour[0].id_seance));
        } else if (data.length > 0) {
          setShowAllSeances(true);
        }
      } catch (err) {
        console.error("Erreur chargement séances :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSeances();
  }, [todayISO]);

  // Initialisation et gestion du scanner HTML5
  useEffect(() => {
    if (!selectedSeance) return;

    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 240, height: 240 },
      facingMode: "environment" // Force la caméra arrière
    }, false);

    const onScanSuccess = async (decodedText) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        const res = await API.post('/presences/scan', {
          id_seance: parseInt(selectedSeance, 10),
          qr_data: decodedText
        });

        setScanMessage({
          type: 'success',
          text: res.data.message || 'Présence enregistrée avec succès !'
        });
      } catch (err) {
        setScanMessage({
          type: 'error',
          text: err.response?.data?.error || 'Erreur lors de la validation du QR code.'
        });
      } finally {
        // Pause de 2.5 secondes avant de réautoriser un autre scan
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2500);
      }
    };

    scanner.render(onScanSuccess, () => {
      // Ignorer les erreurs de balayage continu
    });

    return () => {
      scanner.clear().catch(error => console.error("Erreur arrêt scanner :", error));
    };
  }, [selectedSeance]);

  useEffect(() => {
    if (!selectedSeance) {
      setManualLearners([]);
      setManualSelected([]);
      return;
    }
    const fetchLearners = async () => {
      setManualLoading(true);
      try {
        const res = await API.get(`/presences/seances/${selectedSeance}/apprenants`);
        const learners = Array.isArray(res.data) ? res.data : [];
        setManualLearners(learners);
        setManualSelected(learners.filter((learner) => learner.statut_presence === 'PRESENT').map((learner) => learner.id_apprenant));
      } catch (err) {
        setScanMessage({ type: 'error', text: err.response?.data?.error || 'Impossible de charger la liste des apprenants.' });
      } finally {
        setManualLoading(false);
      }
    };
    fetchLearners();
  }, [selectedSeance]);

  const toggleManualLearner = (idApprenant) => {
    setManualSelected((current) => current.includes(idApprenant)
      ? current.filter((id) => id !== idApprenant)
      : [...current, idApprenant]);
  };

  const saveManualAttendance = async () => {
    try {
      const res = await API.post('/presences/manuel', {
        id_seance: Number(selectedSeance),
        id_apprenants: manualSelected
      });
      setScanMessage({ type: 'success', text: res.data.message });
    } catch (err) {
      setScanMessage({ type: 'error', text: err.response?.data?.error || 'Impossible d’enregistrer les présences.' });
    }
  };

  const activeSeanceDetails = seances.find(s => String(s.id_seance) === String(selectedSeance));
  const displayList = showAllSeances ? seances : todaysSeances;

  return (
    <div className="fs-container">
      
      {/* Styles d'injection pour le scanner Html5Qrcode natif */}
      <style>{`
        #reader button {
          background-color: #f97316 !important;
          color: #18181b !important;
          font-weight: 800 !important;
          border: none !important;
          border-radius: 12px !important;
          padding: 8px 16px !important;
          margin-top: 8px !important;
          cursor: pointer !important;
        }
        #reader img[alt="Info icon"] { display: none !important; }
        #reader__scan_region { background: transparent !important; }
      `}</style>

      {/* En-tête */}
      <div className="fs-header-card">
        <div className="fs-header-icon-wrap">
          <QrCode size={26} />
        </div>
        <div>
          <h1 className="fs-title">Émargement par QR Code</h1>
          <p className="fs-subtitle">Scannez le badge étudiant pour valider la présence</p>
        </div>
      </div>

      <div className="fs-main-panel">
        
        {/* Sélecteur de Séance */}
        <div className="fs-select-group">
          <div className="fs-select-header">
            <label className="fs-label flex items-center gap-1.5">
              <Calendar size={14} className="text-orange-500" />
              Séance rattachée
            </label>
            {todaysSeances.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllSeances(!showAllSeances)}
                className="fs-filter-toggle"
              >
                {showAllSeances ? "Filtrer sur aujourd'hui" : "Voir toutes les séances"}
              </button>
            )}
          </div>

          {loading ? (
            <div className="fs-loading-box">
              Chargement des séances...
            </div>
          ) : (
            <select
              value={selectedSeance}
              onChange={(e) => {
                setSelectedSeance(e.target.value);
                setScanMessage({ type: '', text: '' });
              }}
              className="fs-select"
            >
              <option value="">-- Sélectionner une séance --</option>
              {displayList.map((s) => {
                const dateFormatted = new Date(s.date_seance).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                return (
                  <option key={s.id_seance} value={s.id_seance}>
                    {s.titre || `${s.type_seance || 'Séance'} #${s.id_seance}`} ({dateFormatted} • {s.heure_debut?.substring(0, 5)} - {s.heure_fin?.substring(0, 5)})
                  </option>
                );
              })}
            </select>
          )}

          {/* Indication si aucune séance le jour même */}
          {!loading && todaysSeances.length === 0 && !showAllSeances && (
            <div className="fs-warning-banner">
              <AlertCircle size={15} className="shrink-0" />
              <span>Aucune séance n'est programmée pour aujourd'hui.</span>
              <button
                onClick={() => setShowAllSeances(true)}
                className="fs-warning-action"
              >
                Afficher tout
              </button>
            </div>
          )}
        </div>

        {/* Détails de la séance sélectionnée */}
        {activeSeanceDetails && (
          <div className="fs-details-banner">
            <div className="fs-details-left">
              <span className="fs-details-badge">
                {activeSeanceDetails.type_seance || 'Séance'}
              </span>
              <span className="fs-details-name" title={activeSeanceDetails.formation_titre || activeSeanceDetails.titre}>
                {activeSeanceDetails.formation_titre || activeSeanceDetails.titre}
              </span>
            </div>
            <div className="fs-details-right">
              <div className="fs-details-meta">
                <Clock size={13} className="text-orange-500" />
                <span>{activeSeanceDetails.heure_debut?.substring(0, 5)} - {activeSeanceDetails.heure_fin?.substring(0, 5)}</span>
              </div>
              {activeSeanceDetails.salle && (
                <div className="fs-details-meta">
                  <MapPin size={13} className="text-orange-500" />
                  <span>{activeSeanceDetails.salle}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode d'émargement */}
        {selectedSeance && (
          <div className="fs-mode-tabs">
            <button type="button" onClick={() => setAttendanceMode('scan')} className={`fs-tab-btn ${attendanceMode === 'scan' ? 'active' : ''}`}>Scanner QR</button>
            <button type="button" onClick={() => setAttendanceMode('manual')} className={`fs-tab-btn ${attendanceMode === 'manual' ? 'active' : ''}`}>Présence manuelle</button>
          </div>
        )}

        {/* Zone Scanner ou liste manuelle */}
        {selectedSeance ? (
          attendanceMode === 'manual' ? (
            <div className="fs-manual-container">
              <div className="fs-manual-scroll">
                {manualLoading ? (
                  <p className="fs-manual-loading">Chargement de la liste...</p>
                ) : manualLearners.length === 0 ? (
                  <p className="fs-manual-loading">Aucun apprenant accepté pour cette séance.</p>
                ) : manualLearners.map((learner) => (
                  <label key={learner.id_apprenant} className="fs-learner-row">
                    <input type="checkbox" checked={manualSelected.includes(learner.id_apprenant)} onChange={() => toggleManualLearner(learner.id_apprenant)} className="fs-checkbox" />
                    <span className="fs-learner-name">{learner.prenom} {learner.nom}</span>
                    <span className="fs-learner-mail">{learner.email}</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={saveManualAttendance} disabled={manualLoading || manualLearners.length === 0} className="fs-submit-btn">Enregistrer les présences cochées</button>
            </div>
          ) : (
          <div className="fs-scanner-space">
            <div className="fs-reader-box">
              <div id="reader" className="w-full overflow-hidden"></div>
            </div>

            {/* Notification de Scan */}
            {scanMessage.text && (
              <div
                className={`fs-scan-alert ${scanMessage.type === 'success' ? 'success' : 'error'}`}
              >
                <div className="fs-alert-content">
                  {scanMessage.type === 'success' ? (
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle size={20} className="shrink-0 text-rose-500" />
                  )}
                  <span>{scanMessage.text}</span>
                </div>
                <button
                  onClick={() => setScanMessage({ type: '', text: '' })}
                  className="fs-alert-close"
                  title="Effacer le message"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            )}
          </div>
          )
        ) : (
          <div className="fs-placeholder-state">
            <QrCode size={40} className="mb-2 stroke-1 text-orange-500 opacity-60" />
            <p className="fs-placeholder-text">Sélectionnez une séance ci-dessus pour lancer la caméra</p>
          </div>
        )}
      </div>
    </div>
  );
}