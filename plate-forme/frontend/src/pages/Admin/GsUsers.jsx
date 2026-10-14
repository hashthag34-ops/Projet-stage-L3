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
  ArrowUpDown,
  UserCheck,
  UserX,
  ShieldAlert,
  BarChart3,
  ChevronDown,
  Edit2,
  CheckCircle2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import API from '../../services/api';

const BACKEND_URL = import.meta.env.VITE_URL;

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40';

const inputClass = `w-full rounded-2xl bg-zinc-100/80 p-3 text-xs font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-800 dark:focus:ring-zinc-600 ${focusRing}`;

const getAvatarSrc = (user) => {
  if (!user) return null;
  const avatar = user.photo_profil || user.photo;
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:')) return avatar;
  return `${BACKEND_URL}/uploads/avatars/${avatar}`;
};

function UserAvatar({ user, large = false }) {
  const avatar = getAvatarSrc(user);
  const sizeClass = large ? 'h-16 w-16 text-base' : 'h-9 w-9 text-xs';

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`Profil de ${user.prenom || ''} ${user.nom || ''}`}
        className={`${large ? 'h-16 w-16' : 'h-9 w-9'} rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800`}
      />
    );
  }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  return (
    <div className={`flex items-center justify-center font-medium rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 ${sizeClass}`}>
      {initials || 'U'}
    </div>
  );
}

const getRoleBadgeClass = (role) => {
  switch (role?.toUpperCase()) {
    case 'APPRENANT':
      return 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    case 'ADMINISTRATEUR':
    case 'ADMIN':
      return 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium';
    case 'RESPONSABLE':
      return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200';
    case 'FORMATEUR':
      return 'bg-zinc-100 text-zinc-800 border border-zinc-300 dark:bg-zinc-800/80 dark:text-zinc-200 dark:border-zinc-700';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
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
      return 'text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
  }
};



export default function GsUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
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
  // 1. Ajouter l'état de fermeture
  const [isClosing, setIsClosing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 2. Fonction de fermeture avec délai temporisé
  const handleCloseDrawer = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedUser(null);
      setIsClosing(false);
    }, 500); // Doit correspondre aux 500ms de l'animation
  };
  useEffect(() => {
    if (selectedUser) {
      // Petit délai pour laisser le temps au composant de se monter dans le DOM
      requestAnimationFrame(() => setIsOpen(true));
    }
  }, [selectedUser]);

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

  const handleChange = (e) => setFormData((current) => ({ ...current, [e.target.name]: e.target.value ?? '' }));

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
      if (selectedUser && selectedUser.id_utilisateur === id) {
        setSelectedUser({ ...selectedUser, statut_compte });
      }
      fetchUsers();
    } catch (err) {
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) =>
        `${user.nom || ''} ${user.prenom || ''} ${user.email || ''} ${user.role || ''}`
          .toLowerCase()
          .includes((search || '').toLowerCase())
      )
      .sort((a, b) => {
        if (sort === 'name') return `${a.nom || ''}${a.prenom || ''}`.localeCompare(`${b.nom || ''}${b.prenom || ''}`);
        if (sort === 'role') return (a.role || '').localeCompare(b.role || '');
        return b.id_utilisateur - a.id_utilisateur;
      });
  }, [users, search, sort]);

  const currentUser = filteredUsers[mobileIndex];

  // Métriques
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(u => u.statut_compte === 'ACTIF').length;
  const suspendedUsersCount = users.filter(u => u.statut_compte === 'SUSPENDU').length;
  const disabledUsersCount = users.filter(u => u.statut_compte === 'DESACTIVE').length;

  // Données statistiques pour Recharts
  const roleChartData = useMemo(() => {
    const counts = { APPRENANT: 0, FORMATEUR: 0, RESPONSABLE: 0, ADMINISTRATEUR: 0 };
    users.forEach(u => {
      const r = u.role?.toUpperCase();
      if (counts[r] !== undefined) counts[r]++;
    });
    return [
      { name: 'Apprenants', count: counts.APPRENANT },
      { name: 'Formateurs', count: counts.FORMATEUR },
      { name: 'Responsables', count: counts.RESPONSABLE },
      { name: 'Admins', count: counts.ADMINISTRATEUR },
    ];
  }, [users]);

  const activityChartData = [
    { name: 'Lun', actifs: Math.round(activeUsersCount * 0.7) },
    { name: 'Mar', actifs: Math.round(activeUsersCount * 0.85) },
    { name: 'Mer', actifs: Math.round(activeUsersCount * 0.9) },
    { name: 'Jeu', actifs: Math.round(activeUsersCount * 0.8) },
    { name: 'Ven', actifs: activeUsersCount },
    { name: 'Sam', actifs: Math.round(activeUsersCount * 0.4) },
    { name: 'Dim', actifs: Math.round(activeUsersCount * 0.3) },
  ];

  return (
    <div className="relative min-h-screen space-y-6 font-sans text-zinc-800 transition-colors duration-300 dark:text-zinc-100 p-2 sm:p-4">

      {/* Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            <Sparkles size={13} /> Administration Système
          </div>
          <h1 className="mt-1 text-2xl font-normal tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Gestion des Membres
          </h1>
        </div>

        {/* Action Toggle Statistiques Modal */}
        <button
          onClick={() => setShowStatsModal(!showStatsModal)}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-medium text-zinc-700 shadow-sm border border-zinc-200 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <BarChart3 size={15} />
          <span>{showStatsModal ? 'Masquer Statistiques' : 'Afficher Statistiques'}</span>
          <ChevronDown size={14} className={`transition-transform duration-300 ${showStatsModal ? 'rotate-180' : ''}`} />
        </button>
      </header>

      {/* STATISTIQUES MODAL AVEC ANIMATION DEPUIS LE HAUT */}
      {showStatsModal && (
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl transition-all duration-500 animate-in slide-in-from-top-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-white">Aperçu analytique des utilisateurs</h2>
            <button onClick={() => setShowStatsModal(false)} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Graphique 1 : Activité récente (AreaChart) */}
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/40">
              <span className="text-xs font-normal text-zinc-500">Comptes actifs cette semaine</span>
              <div className="mt-4 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="userActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="actifs" stroke="#18181b" strokeWidth={2} fill="url(#userActivity)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graphique 2 : Répartition par rôle (BarChart) */}
            <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800/40">
              <span className="text-xs font-normal text-zinc-500">Répartition des rôles</span>
              <div className="mt-4 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                    <Bar dataKey="count" fill="#3f3f46" radius={[6, 6, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Recherche et Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search ?? ''}
            onChange={(e) => { setSearch(e.target.value); setMobileIndex(0); }}
            placeholder="Rechercher par nom, email ou rôle..."
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="relative sm:w-48">
          <select
            value={sort ?? 'recent'}
            onChange={(e) => setSort(e.target.value)}
            className={`${inputClass} cursor-pointer appearance-none pr-8`}
          >
            <option value="recent">Tri : Récent</option>
            <option value="name">Tri : Nom A-Z</option>
            <option value="role">Tri : Rôle</option>
          </select>
          <ArrowUpDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-400">Chargement des membres...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-200 p-12 text-center text-xs text-zinc-400 dark:border-zinc-800">
          Aucun utilisateur trouvé.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-separate border-spacing-y-2">
            <thead className="text-[10px] uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id_utilisateur}
                  onClick={() => setSelectedUser(user)}
                  className="group cursor-pointer transition-all"
                >
                  <td className="p-3 bg-white rounded-l-2xl dark:bg-zinc-900 group-hover:bg-zinc-100/80 dark:group-hover:bg-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div>
                        <p className="font-normal text-zinc-900 dark:text-white">{user.prenom} {user.nom}</p>
                        <p className="text-[10px] text-zinc-400">ID #{user.id_utilisateur}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 bg-white dark:bg-zinc-900 font-normal text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-100/80 dark:group-hover:bg-zinc-800/50">
                    {user.email}
                  </td>

                  <td className="p-3 bg-white dark:bg-zinc-900 group-hover:bg-zinc-100/80 dark:group-hover:bg-zinc-800/50">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>

                  <td className="p-3 bg-white dark:bg-zinc-900 group-hover:bg-zinc-100/80 dark:group-hover:bg-zinc-800/50" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={user.statut_compte ?? 'ACTIF'}
                      onChange={(e) => handleStatusChange(user.id_utilisateur, e.target.value)}
                      className={`cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-normal ${getStatusBadgeClass(user.statut_compte)}`}
                    >
                      <option value="ACTIF">ACTIF</option>
                      <option value="DESACTIVE">DÉSACTIVÉ</option>
                      <option value="SUSPENDU">SUSPENDU</option>
                    </select>
                  </td>

                  <td className="p-3 bg-white rounded-r-2xl text-right dark:bg-zinc-900 group-hover:bg-zinc-100/80 dark:group-hover:bg-zinc-800/50" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <Info size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BOUTON FLOTTANT CRÉER UN UTILISATEUR (FAB) */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl transition-transform hover:scale-105 active:scale-95 dark:bg-white dark:text-zinc-900"
        title="Créer un utilisateur"
      >
        <UserPlus size={20} />
      </button>

      {/* PANNEAU LATÉRAL DE DÉTAILS / ÉDITION */}
      {selectedUser && (
        <div
          className={`fixed inset-0 z-50 flex justify-end bg-zinc-950/40 backdrop-blur-xs transition-opacity duration-500 ease-out ${isClosing ? 'opacity-0' : 'opacity-100'
            }`}
          onClick={handleCloseDrawer}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] dark:bg-zinc-900 ${isClosing
              ? 'translate-x-full' // Sortie vers la droite avec amorti
              : 'translate-x-0 animate-in slide-in-from-right' // Entrée
              }`}
          >
            {/* Header Drawer */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <span className="text-xs font-normal text-zinc-400">Détails de l'utilisateur</span>
              <button onClick={handleCloseDrawer} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            {/* Profil Utilisateur */}
            <div className="my-6 flex items-center gap-4">
              <UserAvatar user={selectedUser} large />
              <div>
                <h3 className="text-base font-medium text-zinc-900 dark:text-white">
                  {selectedUser.prenom} {selectedUser.nom}
                </h3>
                <p className="text-xs text-zinc-400">{selectedUser.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${getRoleBadgeClass(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${getStatusBadgeClass(selectedUser.statut_compte)}`}>
                    {selectedUser.statut_compte}
                  </span>
                </div>
              </div>
            </div>

            {/* Informations de contact & Détails */}
            <div className="space-y-3">
              <span className="text-[11px] font-normal text-zinc-400">Informations de contact</span>

              <div className="rounded-2xl bg-zinc-50 p-3.5 dark:bg-zinc-800/50">
                <p className="text-[10px] text-zinc-400">Téléphone</p>
                <p className="mt-0.5 text-xs font-normal text-zinc-800 dark:text-zinc-200">
                  {selectedUser.telephone || 'Non renseigné'}
                </p>
              </div>

              {selectedUser.specialite && (
                <div className="rounded-2xl bg-zinc-50 p-3.5 dark:bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-400">Spécialité</p>
                  <p className="mt-0.5 text-xs font-normal text-zinc-800 dark:text-zinc-200">
                    {selectedUser.specialite}
                  </p>
                </div>
              )}

              {selectedUser.fonction && (
                <div className="rounded-2xl bg-zinc-50 p-3.5 dark:bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-400">Fonction</p>
                  <p className="mt-0.5 text-xs font-normal text-zinc-800 dark:text-zinc-200">
                    {selectedUser.fonction}
                  </p>
                </div>
              )}

              {selectedUser.role === 'APPRENANT' && (
                <div className="rounded-2xl bg-zinc-50 p-3.5 dark:bg-zinc-800/50">
                  <p className="text-[10px] text-zinc-400">Formation attribuée</p>
                  <p className="mt-0.5 text-xs font-normal text-zinc-800 dark:text-zinc-200">
                    {selectedUser.formation_titre || 'Aucune formation'}
                  </p>
                </div>
              )}
            </div>

            {/* Actions / Fermeture */}
            <div className="mt-8 space-y-4 border-t border-zinc-100 pt-6 dark:border-zinc-800">
              <span className="text-[11px] font-normal text-zinc-400">Mettre à jour l'accès</span>

              <div className="flex items-center justify-between rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="text-xs font-normal text-zinc-700 dark:text-zinc-300">Statut du Compte</span>
                <select
                  value={selectedUser.statut_compte ?? 'ACTIF'}
                  onChange={(e) => handleStatusChange(selectedUser.id_utilisateur, e.target.value)}
                  className="rounded-xl bg-zinc-100 px-3 py-1 text-xs outline-none dark:bg-zinc-800"
                >
                  <option value="ACTIF">ACTIF</option>
                  <option value="DESACTIVE">DÉSACTIVÉ</option>
                  <option value="SUSPENDU">SUSPENDU</option>
                </select>
              </div>

              <button
                onClick={handleCloseDrawer}
                className="mt-6 w-full rounded-2xl bg-zinc-900 py-3 text-xs font-normal text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création de Compte */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-sm font-normal text-zinc-900 dark:text-white">Créer un nouveau membre</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input name="nom" placeholder="Nom" required value={formData.nom ?? ''} onChange={handleChange} className={inputClass} />
                <input name="prenom" placeholder="Prénom" required value={formData.prenom ?? ''} onChange={handleChange} className={inputClass} />
              </div>

              <input type="email" name="email" placeholder="Adresse email" required value={formData.email ?? ''} onChange={handleChange} className={inputClass} />
              <input type="password" name="mot_de_passe" placeholder="Mot de passe" required value={formData.mot_de_passe ?? ''} onChange={handleChange} className={inputClass} />

              <select name="role" value={formData.role ?? 'FORMATEUR'} onChange={handleChange} className={inputClass}>
                <option value="FORMATEUR">Formateur</option>
                <option value="RESPONSABLE">Responsable</option>
                <option value="ADMINISTRATEUR">Administrateur</option>
              </select>

              {formData.role === 'FORMATEUR' && (
                <input name="specialite" placeholder="Spécialité (ex: React, Python)" value={formData.specialite ?? ''} onChange={handleChange} className={inputClass} />
              )}

              {formData.role === 'RESPONSABLE' && (
                <input name="fonction" placeholder="Fonction" value={formData.fonction ?? ''} onChange={handleChange} className={inputClass} />
              )}

              <button
                type="submit"
                className="mt-2 w-full rounded-2xl bg-zinc-900 py-3 text-xs font-normal text-white shadow-md transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
              >
                Créer l'utilisateur
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}