// frontend/src/pages/ResponsableFormations.jsx
import { useEffect, useState } from 'react';
import API from '../../serivces/api'; // 1. Import du service API
import FormateurAssignModal from '../../components/FormateurAssignModal'; // 1. Import du composant

export default function ResponsableFormations() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // 2. État pour la formation sélectionnée pour l'affectation des formateurs
  const [selectedFormationForFormateurs, setSelectedFormationForFormateurs] = useState(null);

  // Formulaire state
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    image_url: '',
    date_debut: '',
    date_fin: '',
    date_limite_inscription: '',
    capacite_max: 20,
    statut: 'BROUILLON'
  });

  const fetchFormations = async () => {
    try {
      const res = await API.get('/formations');
      setFormations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormations();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      titre: '',
      description: '',
      image_url: '',
      date_debut: '',
      date_fin: '',
      date_limite_inscription: '',
      capacite_max: 20,
      statut: 'BROUILLON'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (f) => {
    setEditingId(f.id_formation);
    setFormData({
      titre: f.titre,
      description: f.description,
      image_url: f.image_url || '',
      date_debut: f.date_debut ? f.date_debut.split('T')[0] : '',
      date_fin: f.date_fin ? f.date_fin.split('T')[0] : '',
      date_limite_inscription: f.date_limite_inscription ? f.date_limite_inscription.split('T')[0] : '',
      capacite_max: f.capacite_max,
      statut: f.statut
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/formations/${editingId}`, formData);
      } else {
        await API.post('/formations', formData);
      }
      setShowModal(false);
      fetchFormations();
    } catch (err) {
      alert("Erreur lors de l'enregistrement de la formation");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Es-tu sûr de vouloir supprimer cette formation ?")) {
      try {
        await API.delete(`/formations/${id}`);
        fetchFormations();
      } catch (err) {
        alert("Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Formations 🧑‍💼</h1>
          <p className="text-gray-500 text-sm">Créez, modifiez et gérez les statuts des formations.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition"
        >
          + Nouvelle Formation
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm font-semibold border-b">
                <th className="p-4">Titre</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Période</th>
                <th className="p-4">Capacité</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {formations.map((f) => (
                <tr key={f.id_formation} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-800">{f.titre}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      f.statut === 'OUVERTE' ? 'bg-green-100 text-green-700' :
                      f.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700' :
                      f.statut === 'BROUILLON' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {f.statut}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">
                    {new Date(f.date_debut).toLocaleDateString('fr-FR')} ➔ {new Date(f.date_fin).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-4 text-gray-600">{f.capacite_max} max</td>
                  <td className="p-4 text-right space-x-3">
                    {/* 3. Bouton pour ouvrir la modal des formateurs */}
                    <button 
                      onClick={() => setSelectedFormationForFormateurs(f)}
                      className="text-purple-600 hover:underline font-medium"
                    >
                      👨‍🏫 Formateurs
                    </button>
                    <button 
                      onClick={() => handleOpenEdit(f)} 
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Éditer
                    </button>
                    <button 
                      onClick={() => handleDelete(f.id_formation)} 
                      className="text-red-600 hover:underline font-medium"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Popup Formulaire Création & Édition Formation */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800">
              {editingId ? "Modifier la Formation" : "Créer une Formation"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input 
                  type="text" 
                  name="titre" 
                  required 
                  value={formData.titre} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  name="description" 
                  required 
                  rows="3"
                  value={formData.description} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                  <input 
                    type="date" 
                    name="date_debut" 
                    required 
                    value={formData.date_debut} 
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                  <input 
                    type="date" 
                    name="date_fin" 
                    required 
                    value={formData.date_fin} 
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date limite candidature</label>
                  <input 
                    type="date" 
                    name="date_limite_inscription" 
                    required 
                    value={formData.date_limite_inscription} 
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacité max</label>
                  <input 
                    type="number" 
                    name="capacite_max" 
                    required 
                    value={formData.capacite_max} 
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select 
                    name="statut" 
                    value={formData.statut} 
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                  >
                    <option value="BROUILLON">BROUILLON</option>
                    <option value="OUVERTE">OUVERTE</option>
                    <option value="EN_COURS">EN_COURS</option>
                    <option value="TERMINEE">TERMINEE</option>
                    <option value="ARCHIVEE">ARCHIVEE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optionnel)</label>
                  <input 
                    type="text" 
                    name="image_url" 
                    value={formData.image_url} 
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  {editingId ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Rendu de la Modal d'affectation des formateurs */}
      {selectedFormationForFormateurs && (
        <FormateurAssignModal 
          formation={selectedFormationForFormateurs}
          onClose={() => setSelectedFormationForFormateurs(null)}
        />
      )}
    </div>
  );
}