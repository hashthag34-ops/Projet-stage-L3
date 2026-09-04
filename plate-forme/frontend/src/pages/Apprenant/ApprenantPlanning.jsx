// frontend/src/pages/apprenant/ApprenantPlanning.jsx
import { useEffect, useState } from 'react';
import API from '../../services/api';

export default function ApprenantPlanning() {
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Appel API pour récupérer l'emploi du temps de l'apprenant
    API.get('/apprenant/seances')
      .then((res) => setSeances(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mon Planning 📅</h1>
      {loading ? (
        <p>Chargement du planning...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {seances.map((s) => (
            <div key={s.id_seance} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                {s.type_seance || 'Cours'}
              </span>
              <h2 className="text-lg font-bold text-gray-800 mt-2">{s.titre}</h2>
              <p className="text-sm text-gray-500 mt-1">{s.description}</p>
              <div className="mt-4 pt-3 border-t text-xs text-gray-600 flex justify-between">
                <span>📆 {new Date(s.date_seance).toLocaleDateString()}</span>
                <span>⏰ {s.heure_debut} - {s.heure_fin}</span>
                <span>📍 {s.salle || 'En ligne'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}