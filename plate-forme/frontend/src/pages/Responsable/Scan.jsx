import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import API from '../../services/api';

export default function Scan() {
  const [seances, setSeances] = useState([]);
  const [selectedSeance, setSelectedSeance] = useState('');
  const [scanMessage, setScanMessage] = useState({ type: '', text: '' });
  
  // Ref pour bloquer les scans en boucle rapide (anti-rebond)
  const isProcessingRef = useRef(false);

  // Charger les séances disponibles (par exemple les séances du jour)
  useEffect(() => {
    API.get('/seances')
      .then((res) => setSeances(res.data))
      .catch((err) => console.error("Erreur chargement séances :", err));
  }, []);

  // Initialisation et gestion du scanner HTML5
  useEffect(() => {
    if (!selectedSeance) return;

    // Instancier le scanner dans la div #reader
    const scanner = new Html5QrcodeScanner("reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      facingMode: "environment" // Force la caméra arrière du smartphone
    }, false);

    const onScanSuccess = async (decodedText) => {
      // Éviter de traiter plusieurs fois le même scan d'affilée
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        const res = await API.post('/presences/scan', {
          id_seance: parseInt(selectedSeance),
          qr_data: decodedText
        });

        setScanMessage({
          type: 'success',
          text: `✅ ${res.data.message || 'Présence enregistrée !'}`
        });
      } catch (err) {
        setScanMessage({
          type: 'error',
          text: `❌ ${err.response?.data?.error || 'Erreur lors de la validation du scan'}`
        });
      } finally {
        // Pause de 2.5 secondes avant de réautoriser un autre scan
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 2500);
      }
    };

    scanner.render(onScanSuccess, (error) => {
      // Ignorer les erreurs de scan continu (quand aucun QR code n'est visible)
    });

    // Nettoyage au démontage ou au changement de séance
    return () => {
      scanner.clear().catch(error => console.error("Erreur arrêt scanner :", error));
    };
  }, [selectedSeance]);

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
        <h1 className="text-xl font-bold text-slate-800 mb-4">Émargement par QR Code</h1>

        {/* Sélection de la séance */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
            Sélectionner la séance du jour
          </label>
          <select
            value={selectedSeance}
            onChange={(e) => {
              setSelectedSeance(e.target.value);
              setScanMessage({ type: '', text: '' });
            }}
            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
          >
            <option value="">-- Choisir une séance --</option>
            {seances.map((s) => (
              <option key={s.id_seance} value={s.id_seance}>
                {s.titre || `Séance #${s.id_seance}`} - {s.date_seance} ({s.heure_debut} - {s.heure_fin})
              </option>
            ))}
          </select>
        </div>

        {/* Zone du scanner */}
        {selectedSeance ? (
          <div>
            <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-slate-200"></div>

            {/* Message d'état (Succès / Erreur) */}
            {scanMessage.text && (
              <div
                className={`mt-4 p-4 rounded-xl text-center text-sm font-semibold transition-all ${
                  scanMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {scanMessage.text}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
            Veuillez sélectionner une séance pour démarrer la caméra.
          </div>
        )}
      </div>
    </div>
  );
}