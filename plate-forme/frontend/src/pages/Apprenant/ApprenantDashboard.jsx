// frontend/src/pages/Apprenant/ApprenantDashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

export default function ApprenantDashboard() {
  const [formations, setFormations] = useState([]);
  const [nextSeance, setNextSeance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [resFormations, resSeances] = await Promise.all([
          API.get('/apprenant/mes-formations'),
          API.get('/apprenant/seances')
        ]);

        setFormations(resFormations.data || []);
        
        // Trouver la prochaine séance à venir
        if (resSeances.data && resSeances.data.length > 0) {
          setNextSeance(resSeances.data[0]); // Supposant trié par date
        }
      } catch (err) {
        console.error("Erreur de chargement du dashboard :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Chargement de ton espace...</div>;

  return (
    <div className="space-y-6">
      {/* Mot de bienvenue */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Ravi de te revoir ! 👋</h1>
        <p className="text-blue-100 text-sm mt-1">
          Poursuis ton apprentissage et consulte ton emploi du temps de la semaine.
        </p>
      </div>

      {/* Cartes KPI / Métriques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Formations suivies</p>
            <p className="text-2xl font-bold text-gray-800">{formations.length}</p>
          </div>
          <span className="text-3xl">📖</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Prochaine séance</p>
            <p className="text-sm font-bold text-gray-800">
              {nextSeance ? nextSeance.titre : "Aucune séance"}
            </p>
          </div>
          <span className="text-3xl">⏳</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Assiduité</p>
            <p className="text-2xl font-bold text-green-600">95 %</p>
          </div>
          <span className="text-3xl">🎯</span>
        </div>
      </div>

      {/* Section Principale : Formations + Prochain cours */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Liste des formations inscrites */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="font-bold text-gray-800 text-lg">Mes Formations en cours</h2>
            <Link to="/apprenant/catalogue" className="text-xs text-blue-600 hover:underline font-medium">
              Voir le catalogue →
            </Link>
          </div>

          {formations.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">Tu n'es inscrit à aucune formation pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {formations.map((f) => (
                <div key={f.id_formation} className="p-4 rounded-xl border bg-gray-50 hover:bg-white hover:shadow-md transition space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-800">{f.titre}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">{f.description}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">
                      {f.statut || 'EN_COURS'}
                    </span>
                  </div>

                  {/* Barre de progression illustrative */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Progression</span>
                      <span>{f.progression || 40}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-300"
                        style={{ width: `${f.progression || 40}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prochaine séance détaillée */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h2 className="font-bold text-gray-800 text-lg">Prochain Cours</h2>
            <Link to="/apprenant/planning" className="text-xs text-blue-600 hover:underline font-medium">
              Planning complet
            </Link>
          </div>

          {nextSeance ? (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-3">
              <span className="text-xs bg-blue-200 text-blue-800 font-semibold px-2 py-0.5 rounded">
                {nextSeance.type_seance || 'Cours Pratique'}
              </span>
              <h3 className="font-bold text-gray-800 text-base">{nextSeance.titre}</h3>
              <p className="text-xs text-gray-600">{nextSeance.description}</p>
              
              <div className="space-y-1 text-xs text-gray-700 pt-2 border-t border-blue-100">
                <p>📆 <strong>Date :</strong> {new Date(nextSeance.date_seance).toLocaleDateString('fr-FR')}</p>
                <p>⏰ <strong>Horaire :</strong> {nextSeance.heure_debut} - {nextSeance.heure_fin}</p>
                <p>📍 <strong>Lieu :</strong> {nextSeance.salle || 'En ligne'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic py-4">Aucun cours prévu prochainement.</p>
          )}
        </div>

      </div>
    </div>
  );
}