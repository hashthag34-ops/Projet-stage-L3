import { useEffect, useState, useMemo } from 'react';
import { 
  BriefcaseBusiness, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  Info, 
  Mail, 
  Phone, 
  Search, 
  ShieldCheck, 
  Trash2, 
  UserPlus, 
  X,
  Users,
  Sparkles,
  UserCheck,
  UserX,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';
import API from '../../services/api';

const BACKEND_URL = import.meta.env.VITE_URLTEST_AVATAR;

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40';

const inputClass = `w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-orange-500 dark:focus:bg-zinc-900 ${focusRing}`;

const getAvatarSrc = (user) => {
  if (!user) return null;
  const avatar = user.photo_profil || user.photo;
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:')) return avatar;
  return `${BACKEND_URL}/uploads/avatars/${avatar}`;
};

function UserAvatar({ user, large = false }) {
  const avatar = getAvatarSrc(user);
  const sizeClass = large ? 'h-20 w-20 rounded-2xl text-xl' : 'h-10 w-10 rounded-xl text-xs';
  
  if (avatar) {
    return (
      <img 
        src={avatar} 
        alt={`Profil de ${user.prenom} ${user.nom}`} 
        className={`${large ? 'h-20 w-20 rounded-2xl' : 'h-10 w-10 rounded-xl'} object-cover ring-2 ring-orange-500/30`} 
      />
    );
  }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  return (
    <div className={`flex items-center justify-center font-bold bg-orange-100 text-orange-700 ring-2 ring-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 ${sizeClass}`}>
      {initials || 'U'}
    </div>
  );
}

const getRoleBadgeClass = (role) => {
  switch (role?.toUpperCase()) {
    case 'APPRENANT':
      return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    case 'ADMINISTRATEUR':
    case 'ADMIN':
      return 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
    case 'RESPONSABLE':
      return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    case 'FORMATEUR':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
  }
};

const getStatusBadgeClass = (status) => {
  switch (status?.toUpperCase()) {
    case 'ACTIF':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    case 'SUSPENDU':
      return 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    case 'DESACTIVE':
    default:
      return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
  }
};

export default function GsUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [mobileIndex, setMobileIndex] = useState(0);
  
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
      const res = await API.get('/admin/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erreur de chargement des utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => setFormData((current) => ({ ...current, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/admin/users', formData);
      setShowCreate(false);
      setFormData({ nom: '', prenom: '', email: '', mot_de_passe: '', role: 'FORMATEUR', specialite: '', fonction: '' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la création du compte');
    }
  };

  const handleStatusChange = async (id, statut_compte) => {
    try {
      await API.patch(`/admin/users/${id}/status`, { statut_compte });
      fetchUsers();
    } catch (err) {
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => 
        `${user.nom} ${user.prenom} ${user.email} ${user.role}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .sort((a, b) => {
        if (sort === 'name') return `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`);
        if (sort === 'role') return a.role.localeCompare(b.role);
        return b.id_utilisateur - a.id_utilisateur;
      });
  }, [users, search, sort]);

  const currentUser = filteredUsers[mobileIndex];

  return (
    <div className="space-y-8 font-sans text-slate-900 dark:text-zinc-100">
      
      {/* En-tête */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <Sparkles size={14} />
            <span>Administration</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Gestion des comptes
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
            Recherchez, filtrez et gérez tous les accès à la plateforme ODC.
          </p>
        </div>

        <button 
          onClick={() => setShowCreate(true)} 
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
        >
          <UserPlus size={16} />
          <span>Nouveau compte</span>
        </button>
      </header>

      {/* Filtres & Recherche */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400 dark:text-zinc-500" />
          <input 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setMobileIndex(0); }} 
            placeholder="Rechercher par nom, email ou rôle..." 
            className={`${inputClass} pl-10`} 
          />
        </div>
        <div className="relative sm:w-56">
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)} 
            className={`${inputClass} cursor-pointer appearance-none pr-8`}
          >
            <option value="recent">Tri : Plus récents</option>
            <option value="name">Tri : Nom A-Z</option>
            <option value="role">Tri : Par rôle</option>
          </select>
          <ArrowUpDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-slate-400 dark:text-zinc-500" />
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500">Chargement des comptes...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <Users size={32} className="text-slate-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-zinc-300">Aucun compte trouvé</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">Essayez de modifier vos critères de recherche.</p>
        </div>
      ) : (
        <>
          {/* Vue Desktop : Tableau */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-zinc-800/80 dark:bg-zinc-800/30 dark:text-zinc-500">
                  <tr>
                    <th className="p-4">Utilisateur</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Rôle</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-center">Info</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id_utilisateur} 
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{user.prenom} {user.nom}</p>
                            <p className="text-[11px] text-slate-400 dark:text-zinc-500">ID: #{user.id_utilisateur}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-slate-600 dark:text-zinc-400">{user.email}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${getRoleBadgeClass(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <select 
                          value={user.statut_compte} 
                          onChange={(e) => handleStatusChange(user.id_utilisateur, e.target.value)} 
                          className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] font-bold transition focus:outline-none ${getStatusBadgeClass(user.statut_compte)}`}
                        >
                          <option value="ACTIF" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">ACTIF</option>
                          <option value="DESACTIVE" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">DÉSACTIVÉ</option>
                          <option value="SUSPENDU" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">SUSPENDU</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => setSelectedUser(user)} 
                          title="Voir le profil" 
                          className={`rounded-xl p-2 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-500 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 ${focusRing}`}
                        >
                          <Info size={17} />
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleStatusChange(user.id_utilisateur, 'DESACTIVE')} 
                          title="Désactiver le compte" 
                          className={`rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${focusRing}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue Mobile : Fiche Carrousel */}
          <div className="md:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
                <button 
                  onClick={() => setMobileIndex((index) => Math.max(0, index - 1))} 
                  disabled={mobileIndex === 0} 
                  className={`rounded-xl border border-slate-200 p-2 text-slate-600 disabled:opacity-30 dark:border-zinc-800 dark:text-zinc-400 ${focusRing}`}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Profil {mobileIndex + 1} / {filteredUsers.length}
                </span>
                <button 
                  onClick={() => setMobileIndex((index) => Math.min(filteredUsers.length - 1, index + 1))} 
                  disabled={mobileIndex === filteredUsers.length - 1} 
                  className={`rounded-xl border border-slate-200 p-2 text-slate-600 disabled:opacity-30 dark:border-zinc-800 dark:text-zinc-400 ${focusRing}`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {currentUser && (
                <div>
                  <div className="flex flex-col items-center text-center">
                    <UserAvatar user={currentUser} large />
                    <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                      {currentUser.prenom} {currentUser.nom}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{currentUser.email}</p>
                    <span className={`mt-3 rounded-lg px-2.5 py-1 text-[11px] font-bold ${getRoleBadgeClass(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                      <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Téléphone</span>
                      <strong className="mt-0.5 block truncate text-slate-700 dark:text-zinc-300">
                        {currentUser.telephone || 'Non renseigné'}
                      </strong>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                      <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Statut</span>
                      <strong className="mt-0.5 block text-slate-700 dark:text-zinc-300">
                        {currentUser.statut_compte}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedUser(currentUser)} 
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 active:scale-[0.98] dark:text-slate-950 ${focusRing}`}
                    >
                      <Info size={15} />
                      <span>Détails du profil</span>
                    </button>
                    <select 
                      value={currentUser.statut_compte} 
                      onChange={(e) => handleStatusChange(currentUser.id_utilisateur, e.target.value)} 
                      className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition focus:outline-none ${getStatusBadgeClass(currentUser.statut_compte)}`}
                    >
                      <option value="ACTIF" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">ACTIF</option>
                      <option value="DESACTIVE" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">DÉSACTIVÉ</option>
                      <option value="SUSPENDU" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">SUSPENDU</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Création de Compte */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Créer un nouveau compte</h2>
              <button 
                onClick={() => setShowCreate(false)}
                className={`rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 ${focusRing}`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input 
                  name="nom" 
                  placeholder="Nom" 
                  required 
                  value={formData.nom} 
                  onChange={handleChange} 
                  className={inputClass} 
                />
                <input 
                  name="prenom" 
                  placeholder="Prénom" 
                  required 
                  value={formData.prenom} 
                  onChange={handleChange} 
                  className={inputClass} 
                />
              </div>

              <input 
                type="email" 
                name="email" 
                placeholder="Adresse email" 
                required 
                value={formData.email} 
                onChange={handleChange} 
                className={inputClass} 
              />

              <input 
                type="password" 
                name="mot_de_passe" 
                placeholder="Mot de passe" 
                required 
                value={formData.mot_de_passe} 
                onChange={handleChange} 
                className={inputClass} 
              />

              <select 
                name="role" 
                value={formData.role} 
                onChange={handleChange} 
                className={inputClass}
              >
                <option value="FORMATEUR">Formateur</option>
                <option value="RESPONSABLE">Responsable</option>
                <option value="ADMINISTRATEUR">Administrateur</option>
              </select>

              {formData.role === 'FORMATEUR' && (
                <input 
                  name="specialite" 
                  placeholder="Spécialité (ex: React, DevOps...)" 
                  value={formData.specialite} 
                  onChange={handleChange} 
                  className={inputClass} 
                />
              )}

              {formData.role === 'RESPONSABLE' && (
                <input 
                  name="fonction" 
                  placeholder="Fonction" 
                  value={formData.fonction} 
                  onChange={handleChange} 
                  className={inputClass} 
                />
              )}

              <button 
                type="submit"
                className={`mt-2 w-full rounded-xl bg-orange-500 py-3 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
              >
                Créer le compte
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détails Profil */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-5 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <UserAvatar user={selectedUser} large />
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedUser.prenom} {selectedUser.nom}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{selectedUser.email}</p>
                  <span className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${getRoleBadgeClass(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)} 
                className={`rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 ${focusRing}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Informations générales
                </h3>
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-300">
                  <p className="flex items-center gap-2">
                    <Phone size={15} className="text-orange-500" />
                    <span>{selectedUser.telephone || 'Téléphone non renseigné'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail size={15} className="text-orange-500" />
                    <span>{selectedUser.email}</span>
                  </p>
                  {selectedUser.specialite && (
                    <p className="flex items-center gap-2">
                      <BriefcaseBusiness size={15} className="text-orange-500" />
                      <span>Spécialité : {selectedUser.specialite}</span>
                    </p>
                  )}
                  {selectedUser.fonction && (
                    <p className="flex items-center gap-2">
                      <ShieldCheck size={15} className="text-orange-500" />
                      <span>Fonction : {selectedUser.fonction}</span>
                    </p>
                  )}
                </div>
              </div>

              {selectedUser.role === 'APPRENANT' && (
                <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-zinc-800 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Dernière candidature
                  </h3>
                  <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedUser.formation_titre || 'Formation non renseignée'}
                    </p>
                    <div>
                      <strong className="block text-[11px] text-slate-400 dark:text-zinc-500">Motivation :</strong>
                      <p className="mt-0.5 line-clamp-3">{selectedUser.motivation || 'Non renseignée'}</p>
                    </div>
                    <div>
                      <strong className="block text-[11px] text-slate-400 dark:text-zinc-500">Objectif :</strong>
                      <p className="mt-0.5 line-clamp-2">{selectedUser.objectif || 'Non renseigné'}</p>
                    </div>
                    <p className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                      <GraduationCap size={15} className="text-orange-500" />
                      <span>{selectedUser.niveau_etude || 'Niveau non renseigné'}{selectedUser.filiere ? ` · ${selectedUser.filiere}` : ''}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}