import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import API from '../../services/api';

export default function Scan() {
  const [seances, setSeances] = useState([]);
  const [todaysSeances, setTodaysSeances] = useState([]);
  const [selectedSeance, setSelectedSeance] = useState('');
  const [showAllSeances, setShowAllSeances] = useState(false);
  const [scanMessage, setScanMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);

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
        const res = await API.get('/seances');
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

  const activeSeanceDetails = seances.find(s => String(s.id_seance) === String(selectedSeance));
  const displayList = showAllSeances ? seances : todaysSeances;

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white px-4 py-8 text-black transition-colors duration-300 dark:bg-black dark:text-white sm:px-6">
      
      {/* Masquer visuellement le bouton natif inutilisé de Html5Qrcode */}
      <style>{`
        #reader button {
          background-color: #f97316 !important;
          color: #000 !important;
          font-weight: 700 !important;
          border: none !important;
          border-radius: 0.75rem !important;
          padding: 0.5rem 1rem !important;
          margin-top: 0.5rem !important;
          cursor: pointer !important;
        }
        #reader img[alt="Info icon"] { display: none !important; }
        #reader__scan_region { background: transparent !important; }
      `}</style>

      {/* En-tête */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-black/10 bg-black/[0.03] p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="rounded-xl bg-orange-500 p-3 text-black shadow-lg shadow-orange-500/20 shrink-0">
          <QrCode size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Émargement par QR Code</h1>
          <p className="text-xs text-black/55 dark:text-white/55">Scannez le badge étudiant pour valider la présence</p>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-zinc-950">
        
        {/* Sélecteur de Séance */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-black/70 dark:text-white/70 flex items-center gap-1.5">
              <Calendar size={14} className="text-orange-500" />
              Séance rattachée
            </label>
            {todaysSeances.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllSeances(!showAllSeances)}
                className="text-[11px] font-semibold text-orange-600 hover:underline dark:text-orange-400"
              >
                {showAllSeances ? "Filtrer sur aujourd'hui" : "Voir toutes les séances"}
              </button>
            )}
          </div>

          {loading ? (
            <div className="rounded-xl border border-black/10 p-3 text-center text-xs text-black/40 dark:border-white/10 dark:text-white/40">
              Chargement des séances...
            </div>
          ) : (
            <select
              value={selectedSeance}
              onChange={(e) => {
                setSelectedSeance(e.target.value);
                setScanMessage({ type: '', text: '' });
              }}
              className="w-full rounded-xl border border-black/15 bg-black/[0.02] p-3 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/20 dark:bg-white/[0.05] dark:text-white"
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
            <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-xs text-orange-700 dark:text-orange-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>Aucune séance n'est programmée pour aujourd'hui.</span>
              <button
                onClick={() => setShowAllSeances(true)}
                className="ml-auto font-bold underline shrink-0"
              >
                Afficher tout
              </button>
            </div>
          )}
        </div>

        {/* Détails de la séance sélectionnée */}
        {activeSeanceDetails && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-black/[0.03] p-3.5 text-xs dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-orange-500/20 px-2 py-0.5 font-bold text-orange-700 dark:text-orange-400">
                {activeSeanceDetails.type_seance || 'Séance'}
              </span>
              <span className="font-bold text-black/80 dark:text-white/80 truncate max-w-[200px]">
                {activeSeanceDetails.formation_titre || activeSeanceDetails.titre}
              </span>
            </div>
            <div className="flex items-center gap-3 text-black/60 dark:text-white/60">
              <div className="flex items-center gap-1">
                <Clock size={13} className="text-orange-500" />
                <span>{activeSeanceDetails.heure_debut?.substring(0, 5)} - {activeSeanceDetails.heure_fin?.substring(0, 5)}</span>
              </div>
              {activeSeanceDetails.salle && (
                <div className="flex items-center gap-1">
                  <MapPin size={13} className="text-orange-500" />
                  <span>{activeSeanceDetails.salle}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zone Scanner */}
        {selectedSeance ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border-2 border-dashed border-orange-500/40 bg-black/5 p-2 dark:bg-white/5">
              <div id="reader" className="w-full overflow-hidden rounded-xl"></div>
            </div>

            {/* Notification de Scan */}
            {scanMessage.text && (
              <div
                className={`flex items-center justify-between rounded-xl border p-4 text-sm font-semibold transition-all ${
                  scanMessage.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {scanMessage.type === 'success' ? (
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle size={20} className="shrink-0 text-rose-500" />
                  )}
                  <span>{scanMessage.text}</span>
                </div>
                <button
                  onClick={() => setScanMessage({ type: '', text: '' })}
                  className="p-1 hover:opacity-75 transition"
                  title="Effacer le message"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/15 bg-black/[0.02] py-12 text-center text-black/40 dark:border-white/15 dark:bg-white/[0.02] dark:text-white/40">
            <QrCode size={40} className="mb-2 stroke-1 text-black/30 dark:text-white/30" />
            <p className="text-sm font-medium">Sélectionnez une séance ci-dessus pour lancer la caméra</p>
          </div>
        )}
      </div>
    </div>
  );
}