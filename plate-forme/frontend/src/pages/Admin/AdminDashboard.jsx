// frontend/src/pages/admin/AdminDashboard.jsx
import { useEffect, useState } from 'react';
import API from '../../services/api';
import GsUsers from './GsUsers';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', mot_de_passe: '', telephone: '', role: 'FORMATEUR', specialite: '', fonction: ''
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const res = await API.get('/admin/users');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await API.post('/admin/users', formData);
      setMessage('Compte créé avec succès !');
      setFormData({ nom: '', prenom: '', email: '', mot_de_passe: '', telephone: '', role: 'FORMATEUR', specialite: '', fonction: '' });
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erreur de création');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await API.patch(`/admin/users/${id}/status`, { statut_compte: newStatus });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Gestion des Comptes Utilisateurs ⚙️</h1>
      <Link to='/Admin/GsUsers'>Vers</Link>

      {/* Formulaire d'ajout */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Ajouter un nouveau compte</h2>
        {message && <p className="mb-4 text-sm font-medium text-blue-600">{message}</p>}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text" placeholder="Nom" required
            value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            className="border p-2.5 rounded-lg text-sm"
          />
          <input
            type="text" placeholder="Prénom" required
            value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
            className="border p-2.5 rounded-lg text-sm"
          />
          <input
            type="email" placeholder="Email" required
            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="border p-2.5 rounded-lg text-sm"
          />
          <input
            type="password" placeholder="Mot de passe" required
            value={formData.mot_de_passe} onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
            className="border p-2.5 rounded-lg text-sm"
          />
          <input
            type="text" placeholder="Téléphone"
            value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
            className="border p-2.5 rounded-lg text-sm"
          />
          <select
            value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="border p-2.5 rounded-lg text-sm bg-white"
          >
            <option value="FORMATEUR">Formateur</option>
            <option value="RESPONSABLE">Responsable</option>
            <option value="ADMINISTRATEUR">Administrateur</option>
          </select>

          {formData.role === 'FORMATEUR' && (
            <input
              type="text" placeholder="Spécialité"
              value={formData.specialite} onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
              className="border p-2.5 rounded-lg text-sm md:col-span-3"
            />
          )}

          {formData.role === 'RESPONSABLE' && (
            <input
              type="text" placeholder="Fonction"
              value={formData.fonction} onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
              className="border p-2.5 rounded-lg text-sm md:col-span-3"
            />
          )}

          <button type="submit" className="md:col-span-3 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition">
            Créer le compte
          </button>
        </form>
      </div>

      {/* Liste des comptes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <h2 className="text-lg font-semibold p-6 border-b">Comptes enregistrés</h2>
        {loading ? (
          <p className="p-6 text-gray-500">Chargement...</p>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600">
                <th className="p-4">Utilisateur</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rôle</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id_utilisateur} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{u.prenom} {u.nom}</td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs font-semibold">{u.role}</span></td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      u.statut_compte === 'ACTIF' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {u.statut_compte}
                    </span>
                  </td>
                  <td className="p-4">
                    <select
                      value={u.statut_compte}
                      onChange={(e) => handleStatusChange(u.id_utilisateur, e.target.value)}
                      className="border text-xs rounded p-1"
                    >
                      <option value="ACTIF">ACTIF</option>
                      <option value="DESACTIVE">DESACTIVE</option>
                      <option value="SUSPENDU">SUSPENDU</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}