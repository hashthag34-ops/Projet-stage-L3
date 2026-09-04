// frontend/src/pages/Responsable/Candidature.jsx
import { useEffect, useState } from 'react';
import API from '../../serivces/api';

export default function Candidatures() {
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInscriptions = async () => {
    try {
      const res = await API.get('/inscriptions');
      setInscriptions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInscriptions();
  }, []);

  const handleDecision = async (id, statut) => {
    const motif = statut === 'REFUSEE' ? prompt("Motif du refus (optionnel) :") : null;
    try {
      await API.put(`/inscriptions/${id}/decision`, { statut, motif_decision: motif });
      fetchInscriptions();
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Validation des Candidatures 📋</h1>

      {loading ? <p>Chargement...</p> : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-4">Candidat</th>
                <th className="p-4">Formation</th>
                <th className="p-4">Motivation</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inscriptions.map((item) => (
                <tr key={item.id_inscription} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-semibold">{item.nom} {item.prenom}</p>
                    <p className="text-xs text-gray-500">{item.email}</p>
                  </td>
                  <td className="p-4 text-gray-700">{item.formation_titre}</td>
                  <td className="p-4 text-xs text-gray-600 max-w-xs truncate">{item.motivation}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      item.statut === 'ACCEPTEE' ? 'bg-green-100 text-green-700' :
                      item.statut === 'REFUSEE' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.statut}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {item.statut === 'EN_ATTENTE' && (
                      <>
                        <button onClick={() => handleDecision(item.id_inscription, 'ACCEPTEE')} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700">
                          Accepter
                        </button>
                        <button onClick={() => handleDecision(item.id_inscription, 'REFUSEE')} className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700">
                          Refuser
                        </button>
                      </>
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