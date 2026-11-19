// frontend/src/pages/GsUsers.jsx
import { useEffect, useState, useMemo, useRef } from 'react';
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
  CheckCircle2,
  Printer,
  FileSpreadsheet
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
import { getRealtimeSocket } from '../../services/realtime';

const BACKEND_URL = import.meta.env.VITE_URL;

const inputClass = 'w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 text-xs font-semibold text-zinc-800 outline-none transition-all placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500 dark:focus:bg-zinc-900';
const cardClass = 'rounded-3xl border border-zinc-200/80 bg-white shadow-xs transition-all dark:border-zinc-800/80 dark:bg-zinc-900/70';

const getAvatarSrc = (user) => {
  if (!user) return null;
  const avatar = user.photo_profil || user.photo;
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:')) return avatar;
  return `${BACKEND_URL}/uploads/avatars/${avatar}`;
};

function UserAvatar({ user, large = false }) {
  const avatar = getAvatarSrc(user);
  const sizeClass = large ? 'h-16 w-16 text-lg' : 'h-10 w-10 text-xs';

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`Profil de ${user.prenom || ''} ${user.nom || ''}`}
        className={`rounded-2xl object-cover ring-2 ring-zinc-100 dark:ring-zinc-800 ${large ? 'h-16 w-16' : 'h-10 w-10'}`}
      />
    );
  }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-orange-500/10 font-bold text-orange-600 dark:text-orange-400 ${sizeClass}`}>
      {initials || 'U'}
    </div>
  );
}

// Rôles : Uniquement déclinaisons de Blanc, Noir et Orange
const getRoleBadgeClass = (role) => {
  switch (role?.toUpperCase()) {
    case 'RESPONSABLE':
    case 'ADMINISTRATEUR':
    case 'ADMIN':
      return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
    case 'APPRENANT':
    case 'FORMATEUR':
    default:
      return 'bg-zinc-100 text-zinc-800 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700';
  }
};

// Statuts : Uniquement déclinaisons de Blanc, Noir et Orange
const getStatusBadgeClass = (status) => {
  switch (status?.toUpperCase()) {
    case 'ACTIF':
      return 'bg-orange-500/10 text-orange-600 border border-orange-500/20 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50';
    case 'SUSPENDU':
      return 'bg-zinc-100 text-zinc-700 border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    case 'DESACTIVE':
    default:
      return 'bg-zinc-200 text-zinc-900 border border-zinc-400 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700';
  }
};

const formatPresenceDate = (value) => {
  if (!value) return 'Jamais';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Inconnue'
    : date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function GsUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [monthlyActivity, setMonthlyActivity] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const presenceByUser = useRef(new Map());

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    mot_de_passe: '',
    role: 'FORMATEUR',
  });

  const [isClosing, setIsClosing] = useState(false);

  const handleCloseDrawer = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedUser(null);
      setIsClosing(false);
    }, 300);
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get('/admin/users');
      const nextUsers = Array.isArray(res.data) ? res.data : [];
      setUsers((currentUsers) => {
        const currentPresence = new Map(currentUsers.map((user) => [user.id_utilisateur, user.is_online]));
        return nextUsers.map((user) => ({
          ...user,
          ...presenceByUser.current.get(user.id_utilisateur),
          is_online: presenceByUser.current.get(user.id_utilisateur)?.is_online
            ?? currentPresence.get(user.id_utilisateur)
            ?? false
        }));
      });
      setSelectedUser((currentUser) => {
        if (!currentUser) return currentUser;
        const latestUser = nextUsers.find((user) => user.id_utilisateur === currentUser.id_utilisateur);
        if (!latestUser) return currentUser;
        const presence = presenceByUser.current.get(currentUser.id_utilisateur);
        return {
          ...latestUser,
          ...presence,
          is_online: presence?.is_online ?? currentUser.is_online ?? false
        };
      });
    } catch (err) {
      console.error('Erreur de chargement des utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyActivity = async () => {
    try {
      const response = await API.get('/admin/user-activity');
      setMonthlyActivity(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Erreur de chargement de l’activité mensuelle :', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMonthlyActivity();
  }, []);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const handlePresence = (presence) => {
      presenceByUser.current.set(presence.id_utilisateur, {
        ...presenceByUser.current.get(presence.id_utilisateur),
        ...presence
      });
      setUsers((currentUsers) => currentUsers.map((user) => (
        user.id_utilisateur === presence.id_utilisateur
          ? { ...user, ...presence }
          : user
      )));
      setSelectedUser((currentUser) => (
        currentUser?.id_utilisateur === presence.id_utilisateur
          ? { ...currentUser, ...presence }
          : currentUser
      ));
    };
    const handlePresenceSnapshot = (presenceList) => {
      const onlineIds = new Set(presenceList.map((presence) => presence.id_utilisateur));
      presenceByUser.current.forEach((presence, id) => {
        presenceByUser.current.set(id, { ...presence, is_online: onlineIds.has(id) });
      });
      onlineIds.forEach((id) => {
        presenceByUser.current.set(id, {
          ...presenceByUser.current.get(id),
          id_utilisateur: id,
          is_online: true
        });
      });
      setUsers((currentUsers) => currentUsers.map((user) => ({
        ...user,
        ...presenceByUser.current.get(user.id_utilisateur),
        is_online: onlineIds.has(user.id_utilisateur)
      })));
      setSelectedUser((currentUser) => (
        currentUser
          ? { ...currentUser, is_online: onlineIds.has(currentUser.id_utilisateur) }
          : currentUser
      ));
    };
    const handleUsersChanged = () => {
      fetchUsers();
      fetchMonthlyActivity();
    };
    const handleApplicationsChanged = () => fetchMonthlyActivity();

    socket.on('user:presence', handlePresence);
    socket.on('users:presence', handlePresenceSnapshot);
    socket.on('users:changed', handleUsersChanged);
    socket.on('candidatures:changed', handleApplicationsChanged);
    if (socket.connected) socket.emit('users:presence:request');
    return () => {
      socket.off('user:presence', handlePresence);
      socket.off('users:presence', handlePresenceSnapshot);
      socket.off('users:changed', handleUsersChanged);
      socket.off('candidatures:changed', handleApplicationsChanged);
    };
  }, []);

  const handleChange = (e) => setFormData((current) => ({ ...current, [e.target.name]: e.target.value ?? '' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { nom, prenom, email, telephone, mot_de_passe, role } = formData;
      const response = await API.post('/admin/users', {
        nom,
        prenom,
        email,
        telephone,
        mot_de_passe,
        role,
      });
      alert(response.data.message);
      setShowCreate(false);
      setFormData({ nom: '', prenom: '', email: '', telephone: '', mot_de_passe: '', role: 'FORMATEUR' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la création du compte');
    }
  };

  const handleStatusChange = async (id, statut_compte) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (Number(id) === Number(currentUser.id_utilisateur)) {
      alert('Vous ne pouvez pas modifier le statut de votre propre compte.');
      return;
    }
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

  const handleDeleteUser = async () => {
    if (!selectedUser || isDeletingUser) return;
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (Number(selectedUser.id_utilisateur) === Number(currentUser.id_utilisateur)) {
      alert('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    const userName = `${selectedUser.prenom || ''} ${selectedUser.nom || ''}`.trim();
    if (!window.confirm(`Voulez-vous vraiment supprimer le compte de ${userName} ? Cette action est irréversible.`)) {
      return;
    }

    setIsDeletingUser(true);
    try {
      await API.delete(`/admin/users/${selectedUser.id_utilisateur}`);
      setUsers((currentUsers) => currentUsers.filter(
        (user) => user.id_utilisateur !== selectedUser.id_utilisateur
      ));
      presenceByUser.current.delete(selectedUser.id_utilisateur);
      fetchMonthlyActivity();
      handleCloseDrawer();
      alert('Utilisateur supprimé avec succès.');
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression de l’utilisateur.');
    } finally {
      setIsDeletingUser(false);
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

  const monthlyCreationChartData = useMemo(() => {
    const currentMonth = new Date();
    const firstMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 5, 1);
    const months = Array.from({ length: 6 }, (_, index) => (
      new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1)
    ));
    const activityByMonth = new Map(monthlyActivity.map((item) => [item.mois, item]));

    return months.map((month) => {
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      const activity = activityByMonth.get(key);
      return {
        name: month.toLocaleDateString('fr-FR', { month: 'short' }),
        comptes: Number(activity?.comptes || 0),
        candidatures: Number(activity?.candidatures || 0)
      };
    });
  }, [monthlyActivity]);

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  const getUserExportRows = () => filteredUsers.map((user) => [
    `${user.prenom || ''} ${user.nom || ''}`.trim(),
    user.email || '',
    user.role || 'UTILISATEUR',
    user.statut_compte || 'ACTIF',
    user.is_online ? 'En ligne' : 'Hors ligne'
  ]);

  const handleExportExcel = () => {
    const headers = ['Utilisateur', 'Email', 'Rôle', 'Statut', 'Présence'];
    const escapeCsv = (value) => {
      const text = String(value ?? '');
      const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };
    const csv = [headers, ...getUserExportRows()]
      .map((row) => row.map(escapeCsv).join(';'))
      .join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  const handlePrintUsers = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Autorisez l'ouverture de la fenêtre d'impression pour continuer.");
      return;
    }

    const headers = ['Utilisateur', 'Email', 'Rôle', 'Statut', 'Présence'];
    const tableRows = getUserExportRows().map((row) => (
      `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`
    )).join('');

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Liste des utilisateurs</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #09090b; margin: 32px; }
            h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
            p { color: #71717a; font-size: 13px; margin: 0 0 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #e4e4e7; padding: 10px; text-align: left; }
            th { background: #18181b; color: #ffffff; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
            tr:nth-child(even) { background: #fafafa; }
            @media print { body { margin: 15mm; } tr { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <h1>Liste des utilisateurs</h1>
          <p>${filteredUsers.length} utilisateur(s) — tri : ${escapeHtml(
            sort === 'name' ? 'Nom A-Z' : sort === 'role' ? 'Rôle' : 'Récent'
          )}</p>
          <table>
            <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-8 px-4 py-8 pb-32 font-sans text-zinc-900 dark:text-zinc-100 sm:px-8">

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <Sparkles size={13} strokeWidth={2} /> Administration Système
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">Gestion des Membres</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Gérez les accès utilisateurs, contrôlez les statuts et suivez l'activité du système.</p>
        </div>

        <button
          onClick={() => setShowStatsModal(!showStatsModal)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <BarChart3 size={15} strokeWidth={1.75} />
          <span>{showStatsModal ? 'Masquer Statistiques' : 'Afficher Statistiques'}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${showStatsModal ? 'rotate-180' : ''}`} />
        </button>
      </header>

      {/* STATISTIQUES MODAL */}
      {showStatsModal && (
        <div className={`${cardClass} overflow-hidden p-6 transition-all duration-300 space-y-6`}>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Aperçu analytique des utilisateurs</h2>
            <button onClick={() => setShowStatsModal(false)} className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Activité des 6 derniers mois</span>
              <div className="mt-3 flex flex-wrap gap-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-white" />Comptes créés</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" />Candidatures reçues</span>
              </div>
              <div className="mt-4 h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyCreationChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="userActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="applicationActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#71717a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#71717a" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', color: '#fff', fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey="comptes"
                      name="Comptes créés"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      fill="url(#userActivity)"
                    />
                    <Area
                      type="monotone"
                      dataKey="candidatures"
                      name="Candidatures reçues"
                      stroke="#71717a"
                      strokeWidth={2.5}
                      fill="url(#applicationActivity)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 dark:border-zinc-800/80 dark:bg-zinc-900/50">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Répartition par rôles</span>
              <div className="mt-6 h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#71717a" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', color: '#fff', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recherche et Filtres */}
      <div className={`${cardClass} p-5`}>
        <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search ?? ''}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email ou rôle..."
              className={`${inputClass} pl-11`}
            />
          </div>
          <div className="relative">
            <select
              value={sort ?? 'recent'}
              onChange={(e) => setSort(e.target.value)}
              className={`${inputClass} cursor-pointer appearance-none pr-10`}
            >
              <option value="recent">Tri : Plus récents</option>
              <option value="name">Tri : Nom A-Z</option>
              <option value="role">Tri : Rôle</option>
            </select>
            <ArrowUpDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrintUsers}
              disabled={loading || filteredUsers.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-40"
            >
              <Printer size={16} strokeWidth={1.75} />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loading || filteredUsers.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-40"
            >
              <FileSpreadsheet size={16} strokeWidth={1.75} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      {loading ? (
        <div className="flex h-96 items-center justify-center text-sm font-medium text-zinc-400">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            Chargement des membres…
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className={`${cardClass} py-16 text-center text-sm text-zinc-500 dark:text-zinc-400`}>Aucun utilisateur ne correspond à votre recherche.</div>
      ) : (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead className="border-b border-zinc-200/80 bg-zinc-50/50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-6 py-4">Utilisateur</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rôle</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Présence</th>
                  <th className="px-6 py-4 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id_utilisateur}
                    onClick={() => setSelectedUser(user)}
                    className="cursor-pointer transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">{user.prenom} {user.nom}</p>
                          <p className="text-[11px] text-zinc-400">ID #{user.id_utilisateur}</p>
                        </div>
                      </div>
                    </td>

                    {/* COLONNE EMAIL ADAPTATIVE AVEC TRONCATURE ET TOOLTIP */}
                    <td className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">
                      <span 
                        className="block max-w-[160px] sm:max-w-[200px] md:max-w-[240px] truncate" 
                        title={user.email}
                      >
                        {user.email}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase ${getRoleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={user.statut_compte ?? 'ACTIF'}
                        onChange={(e) => handleStatusChange(user.id_utilisateur, e.target.value)}
                        className={`rounded-xl px-3 py-1 text-xs font-semibold outline-none cursor-pointer ${getStatusBadgeClass(user.statut_compte)}`}
                      >
                        <option value="ACTIF">ACTIF</option>
                        <option value="DESACTIVE">DÉSACTIVÉ</option>
                        <option value="SUSPENDU">SUSPENDU</option>
                      </select>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${user.is_online ? 'bg-orange-500 animate-pulse' : 'bg-zinc-400'}`} />
                        <span className={`font-semibold ${user.is_online ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-500'}`}>
                          {user.is_online ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {user.is_online
                          ? `Connecté depuis ${formatPresenceDate(user.date_derniere_connexion)}`
                          : `Déconnexion : ${formatPresenceDate(user.date_derniere_deconnexion)}`}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      >
                        <Info size={18} strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BOUTON FLOTTANT CRÉER UN UTILISATEUR */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-xl shadow-orange-500/30 transition-all hover:scale-105 active:scale-95"
        title="Créer un utilisateur"
      >
        <UserPlus size={22} strokeWidth={2} />
      </button>

      {/* PANNEAU LATÉRAL DE DÉTAILS AVEC ANIMATION PAR LA DROITE */}
      {selectedUser && (
        <div
          className={`fixed inset-0 z-50 flex justify-end bg-zinc-950/60 backdrop-blur-xs transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={handleCloseDrawer}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white p-6 shadow-2xl transition-transform duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-900 ${isClosing ? 'translate-x-full' : 'translate-x-0'}`}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Fiche Membre</span>
              <button onClick={handleCloseDrawer} className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div className="my-6 flex items-center gap-4">
              <UserAvatar user={selectedUser} large />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white truncate">
                  {selectedUser.prenom} {selectedUser.nom}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate" title={selectedUser.email}>{selectedUser.email}</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase ${getRoleBadgeClass(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                  <span className={`inline-flex rounded-full px-3 py-0.5 text-[10px] font-semibold uppercase ${getStatusBadgeClass(selectedUser.statut_compte)}`}>
                    {selectedUser.statut_compte}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Informations détaillées</span>

              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-800/40">
                <p className="text-[10px] font-bold uppercase text-zinc-400">Téléphone</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedUser.telephone || 'Non renseigné'}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-800/40">
                <p className="text-[10px] font-bold uppercase text-zinc-400">État de présence</p>
                <p className={`mt-1 text-sm font-semibold ${selectedUser.is_online ? 'text-orange-600 dark:text-orange-400' : 'text-zinc-500'}`}>
                  {selectedUser.is_online ? 'Actuellement en ligne' : 'Hors ligne'}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  Connexion : {formatPresenceDate(selectedUser.date_derniere_connexion)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Déconnexion : {formatPresenceDate(selectedUser.date_derniere_deconnexion)}
                </p>
              </div>

              {selectedUser.specialite && (
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-800/40">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">Spécialité</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{selectedUser.specialite}</p>
                </div>
              )}

              {selectedUser.fonction && (
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-800/40">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">Fonction</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{selectedUser.fonction}</p>
                </div>
              )}

              {selectedUser.role === 'APPRENANT' && (
                <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-800/40">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">Candidatures liées</p>
                  {Array.isArray(selectedUser.candidatures) && selectedUser.candidatures.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {selectedUser.candidatures.map((candidature) => (
                        <div key={candidature.id_inscription} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{candidature.formation_titre || 'Formation inconnue'}</p>
                          <p className="mt-1 text-[11px] text-zinc-400">
                            {candidature.statut || 'Sans statut'}{candidature.date_inscription
                              ? ` - ${new Date(candidature.date_inscription).toLocaleDateString('fr-FR')}`
                              : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500">Aucune candidature enregistrée</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800 space-y-3">
              <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400">Modifier l'accès</span>

              <div className="flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-800/40">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Statut du Compte</span>
                <select
                  value={selectedUser.statut_compte ?? 'ACTIF'}
                  onChange={(e) => handleStatusChange(selectedUser.id_utilisateur, e.target.value)}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="ACTIF">ACTIF</option>
                  <option value="DESACTIVE">DÉSACTIVÉ</option>
                  <option value="SUSPENDU">SUSPENDU</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeletingUser}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-100 py-3 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <Trash2 size={16} strokeWidth={1.75} />
                {isDeletingUser ? 'Suppression...' : 'Supprimer cet utilisateur'}
              </button>

              <button
                onClick={handleCloseDrawer}
                className="w-full rounded-xl bg-zinc-900 py-3 text-xs font-bold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création de Compte */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm">
          <div className={`${cardClass} w-full max-w-md p-6 sm:p-8 space-y-4`}>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Créer un membre</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input name="nom" placeholder="Nom" required value={formData.nom ?? ''} onChange={handleChange} className={inputClass} />
                <input name="prenom" placeholder="Prénom" required value={formData.prenom ?? ''} onChange={handleChange} className={inputClass} />
              </div>

              <input type="email" name="email" placeholder="Adresse e-mail" required value={formData.email ?? ''} onChange={handleChange} className={inputClass} />
              <input name="telephone" placeholder="Numéro de téléphone" value={formData.telephone ?? ''} onChange={handleChange} className={inputClass} />

              {formData.role === 'ADMINISTRATEUR' && (
                <input
                  type="password"
                  name="mot_de_passe"
                  placeholder="Mot de passe (8 car. min)"
                  minLength={8}
                  required
                  value={formData.mot_de_passe ?? ''}
                  onChange={handleChange}
                  className={inputClass}
                />
              )}

              <select name="role" value={formData.role ?? 'FORMATEUR'} onChange={handleChange} className={inputClass}>
                <option value="FORMATEUR">Formateur</option>
                <option value="RESPONSABLE">Responsable</option>
                <option value="ADMINISTRATEUR">Administrateur</option>
              </select>
              
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {formData.role === 'ADMINISTRATEUR'
                  ? 'Le compte administrateur sera créé immédiatement avec son mot de passe.'
                  : 'Un e-mail d’invitation sécurisé sera transmis au destinataire.'}
              </p>

              <button
                type="submit"
                className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 mt-2"
              >
                {formData.role === 'ADMINISTRATEUR' ? 'Créer l’administrateur' : 'Envoyer l’invitation'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}