// frontend/src/pages/Apprenant/ApprenantPlanning.jsx
import { useEffect, useState } from 'react';
import API from '../../services/api';

export default function ApprenantPlanning() {
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/apprenant/seances')
      .then((res) => setSeances(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mon Planning 📅</h1>
          <p className="text-sm text-gray-500">Retrouvez toutes vos séances de cours programmées.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Chargement du planning...</div>
      ) : seances.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-xl border border-gray-100 text-gray-500">
          Aucune séance programmée dans ton emploi du temps.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {seances.map((s) => (
            <div key={s.id_seance} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                    {s.type_seance || 'Cours'}
                  </span>
                </div>
                <h2 className="text-base font-bold text-gray-800 mt-2">{s.titre}</h2>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t text-xs text-gray-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span>📆 {new Date(s.date_seance).toLocaleDateString('fr-FR')}</span>
                  <span>⏰ {s.heure_debut} - {s.heure_fin}</span>
                </div>
                <div className="text-right font-medium text-blue-600">
                  📍 {s.salle || 'En ligne'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}