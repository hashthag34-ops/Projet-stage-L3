// frontend/src/pages/Responsable/Candidature.jsx
import { useEffect, useState } from 'react';
import API from '../../services/api';

export default function Candidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCandidatures = async () => {
    try {
      const res = await API.get('/responsable/candidatures');
      setCandidatures(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatures();
  }, []);

  const handleAccept = async (id_inscription) => {
    if (!window.confirm("Valider cette candidature et créer le compte Apprenant ?")) return;

    try {
      await API.post(`/responsable/candidatures/${id_inscription}/valider`);
      alert("Candidature validée ! L'apprenant a reçu un email de confirmation.");
      fetchCandidatures();
    } catch (err) {
      alert("Erreur lors de la validation.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Gestion des Candidatures 📑</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-gray-600 text-sm">
              <tr>
                <th className="p-4">Candidat</th>
                <th className="p-4">Formation</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {candidatures.map((c) => (
                <tr key={c.id_inscription}>
                  <td className="p-4 font-medium">{c.prenom} {c.nom} ({c.email})</td>
                  <td className="p-4">{c.formation_titre}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      c.statut === 'ACCEPTEE' ? 'bg-green-100 text-green-700' :
                      c.statut === 'EN_ATTENTE' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {c.statut}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {c.statut === 'EN_ATTENTE' && (
                      <button 
                        onClick={() => handleAccept(c.id_inscription)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                      >
                        Accepter & Créer Compte
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}