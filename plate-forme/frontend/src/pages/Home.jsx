// frontend/src/pages/Home.jsx
import { useEffect, useState, Link } from 'react';
import API from '../serivces/api';

export default function Home() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFormations = async () => {
      try {
        const response = await API.get('/formations');
        setFormations(response.data);
      } catch (error) {
        console.error("Erreur lors du chargement des formations", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFormations();
  }, []);

  if (loading) {
    return <div className="p-8 text-center font-bold">Chargement du catalogue... ⏳</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Catalogue des Formations 📚</h1>
      <p className="text-gray-600 mb-8">Découvrez nos programmes disponibles et déposez votre candidature en ligne.</p>

      {formations.length === 0 ? (
        <p className="text-gray-500 font-medium">Aucune formation ouverte aux inscriptions pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formations.map((f) => (
            <div key={f.id_formation} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition">
              <img
                src={f.image_url || 'https://via.placeholder.com/400x200?text=Formation'}
                alt={f.titre}
                className="w-full h-48 object-cover"
              />
              <div className="p-5">
                <h2 className="text-xl font-bold text-gray-800 mb-2">{f.titre}</h2>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{f.description}</p>

                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <p>📅 <strong>Début :</strong> {new Date(f.date_debut).toLocaleDateString('fr-FR')}</p>
                  <p>⏳ <strong>Limite d'inscription :</strong> {new Date(f.date_limite_inscription).toLocaleDateString('fr-FR')}</p>
                  <p>👥 <strong>Capacité :</strong> {f.capacite_max} places</p>
                </div>

                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition" onClick={() => window.location.href = `/postuler/${f.id_formation}`}>
                  postuler
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}