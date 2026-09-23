import { useEffect, useState } from 'react';
import API from '../../services/api';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    mot_de_passe: '',
    telephone: '',
    role: 'FORMATEUR',
    specialite: '',
    fonction: ''
  });
  
  const [feedback, setFeedback] = useState({ type: '', message: '' });

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
    setFeedback({ type: '', message: '' });
    try {
      await API.post('/admin/users', formData);
      setFeedback({ type: 'success', message: 'Compte utilisateur créé avec succès !' });
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        mot_de_passe: '',
        telephone: '',
        role: 'FORMATEUR',
        specialite: '',
        fonction: ''
      });
      fetchUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Erreur lors de la création du compte.'
      });
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

  // Filtrage des utilisateurs selon le champ de recherche
  const filteredUsers = users.filter((u) => {
    const fullSearch = `${u.nom} ${u.prenom} ${u.email} ${u.role}`.toLowerCase();
    return fullSearch.includes(searchTerm.toLowerCase());
  });

  // Helper badges de statut
  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIF':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DESACTIVE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'SUSPENDU':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Helper badges de rôle
  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMINISTRATEUR':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'RESPONSABLE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Gestion des Utilisateurs
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gérez les accès, rôles et nouveaux comptes de votre plateforme.
            </p>
          </div>
        </div>

        {/* Cartes KPI / Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Comptes</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{users.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              👥
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comptes Actifs</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {users.filter(u => u.statut_compte === 'ACTIF').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inactifs / Suspendus</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {users.filter(u => u.statut_compte !== 'ACTIF').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              !
            </div>
          </div>
        </div>

        {/* Section Formulaire */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-semibold text-slate-900">Créer un nouveau compte</h2>
            <p className="text-xs text-slate-500 mt-0.5">Remplissez les informations obligatoires ci-dessous.</p>
          </div>

          <div className="p-6">
            {feedback.message && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
                feedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Dupont"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Jean"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="jean.dupont@exemple.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Mot de passe *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.mot_de_passe}
                    onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    placeholder="+261 34 00 000 00"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Rôle *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="FORMATEUR">Formateur</option>
                    <option value="RESPONSABLE">Responsable</option>
                    <option value="ADMINISTRATEUR">Administrateur</option>
                  </select>
                </div>
              </div>

              {/* Champ Spécialité pour Formateur */}
              {formData.role === 'FORMATEUR' && (
                <div className="pt-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Spécialité</label>
                  <input
                    type="text"
                    placeholder="ex: Développement Web, Intelligence Artificielle..."
                    value={formData.specialite}
                    onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              )}

              {/* Champ Fonction pour Responsable */}
              {formData.role === 'RESPONSABLE' && (
                <div className="pt-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Fonction</label>
                  <input
                    type="text"
                    placeholder="ex: Chef de département, Coordinateur..."
                    value={formData.fonction}
                    onChange={(e) => setFormData({ ...formData, fonction: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition shadow-sm hover:shadow active:scale-[0.99]"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Section Liste Utilisateurs */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Comptes enregistrés</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredUsers.length} utilisateur(s) trouvé(s)
              </p>
            </div>

            {/* Barre de recherche */}
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Chargement des comptes...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">Aucun utilisateur trouvé.</div>
          ) : (
            <>
              {/* Vue Desktop : Tableau */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Utilisateur</th>
                      <th className="p-4 font-semibold">Email</th>
                      <th className="p-4 font-semibold">Rôle</th>
                      <th className="p-4 font-semibold">Statut</th>
                      <th className="p-4 font-semibold">Mettre à jour statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredUsers.map((u) => (
                      <tr key={u.id_utilisateur} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 font-semibold flex items-center justify-center text-xs">
                              {u.prenom?.[0]}{u.nom?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{u.prenom} {u.nom}</p>
                              {u.telephone && <p className="text-xs text-slate-400">{u.telephone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">{u.email}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(u.statut_compte)}`}>
                            {u.statut_compte}
                          </span>
                        </td>
                        <td className="p-4">
                          <select
                            value={u.statut_compte}
                            onChange={(e) => handleStatusChange(u.id_utilisateur, e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
              </div>

              {/* Vue Mobile : Cartes individuelles */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <div key={u.id_utilisateur} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-semibold flex items-center justify-center text-xs">
                          {u.prenom?.[0]}{u.nom?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{u.prenom} {u.nom}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(u.statut_compte)}`}>
                        {u.statut_compte}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Statut :</span>
                        <select
                          value={u.statut_compte}
                          onChange={(e) => handleStatusChange(u.id_utilisateur, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1"
                        >
                          <option value="ACTIF">ACTIF</option>
                          <option value="DESACTIVE">DESACTIVE</option>
                          <option value="SUSPENDU">SUSPENDU</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}