// frontend/src/pages/GsUsers.jsx
import { useEffect, useState } from 'react';
import API from '../../serivces/api';

export default function GsUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    mot_de_passe: '',
    role: 'FORMATEUR',
    specialite: '',
    fonction: ''
  });

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/users', formData);
      setShowModal(false);
      setFormData({ nom: '', prenom: '', email: '', mot_de_passe: '', role: 'FORMATEUR', specialite: '', fonction: '' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la création");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer cet utilisateur ?")) {
      try {
        await API.delete(`/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert("Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des Utilisateurs 🛠️</h1>
          <p className="text-gray-500 text-sm">Gestion des accès (Gs, Responsable, Formateur, Apprenant)</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition"
        >
          + Nouvel Utilisateur
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm font-semibold border-b">
                <th className="p-4">Nom & Prénom</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rôle</th>
                <th className="p-4">Détails</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {users.map((u) => (
                <tr key={u.id_utilisateur} className="hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-800">{u.nom} {u.prenom}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      u.role === 'ADMINISTRATEUR' ? 'bg-red-100 text-red-700' :
                      u.role === 'RESPONSABLE' ? 'bg-blue-100 text-blue-700' :
                      u.role === 'FORMATEUR' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'APPRENANT' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-xs">
                    {u.specialite && `Spécialité: ${u.specialite}`}
                    {u.fonction && `Fonction: ${u.fonction}`}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDelete(u.id_utilisateur)}
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

      {/* Modal Création */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Ajouter un Utilisateur</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="nom" placeholder="Nom" required value={formData.nom} onChange={handleChange} className="border p-2 rounded-lg text-sm w-full" />
                <input type="text" name="prenom" placeholder="Prénom" required value={formData.prenom} onChange={handleChange} className="border p-2 rounded-lg text-sm w-full" />
              </div>
              <input type="email" name="email" placeholder="Email" required value={formData.email} onChange={handleChange} className="border p-2 rounded-lg text-sm w-full" />
              <input type="password" name="mot_de_passe" placeholder="Mot de passe" required value={formData.mot_de_passe} onChange={handleChange} className="border p-2 rounded-lg text-sm w-full" />
              
              <select name="role" value={formData.role} onChange={handleChange} className="border p-2 rounded-lg text-sm w-full">
                <option value="FORMATEUR">FORMATEUR</option>
                <option value="RESPONSABLE">RESPONSABLE</option>
                <option value="APPRENANT">APPRENANT</option>
              </select>

              {formData.role === 'FORMATEUR' && (
                <input type="text" name="specialite" placeholder="Spécialité (ex: Web, Data...)" value={formData.specialite} onChange={handleChange} className="border p-2 rounded-lg text-sm w-full" />
              )}

              {formData.role === 'RESPONSABLE' && (
                <input type="text" name="fonction" placeholder="Fonction (ex: Chef de projet)" value={formData.fonction} onChange={handleChange} className="border p-2 rounded-lg text-sm w-full" />
              )}

              <div className="flex justify-end space-x-2 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}