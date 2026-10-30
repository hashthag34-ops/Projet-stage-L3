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
import '../css/GsUsers.css'; // Importation du CSS classique

const BACKEND_URL = import.meta.env.VITE_URL;

const getAvatarSrc = (user) => {
  if (!user) return null;
  const avatar = user.photo_profil || user.photo;
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:')) return avatar;
  return `${BACKEND_URL}/uploads/avatars/${avatar}`;
};

function UserAvatar({ user, large = false }) {
  const avatar = getAvatarSrc(user);
  const sizeClass = large ? 'avatar-large' : 'avatar-small';

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`Profil de ${user.prenom || ''} ${user.nom || ''}`}
        className={`user-avatar-img ${sizeClass}`}
      />
    );
  }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  return (
    <div className={`user-avatar-initials ${sizeClass}`}>
      {initials || 'U'}
    </div>
  );
}

const getRoleBadgeClass = (role) => {
  switch (role?.toUpperCase()) {
    case 'APPRENANT':
      return 'role-badge-apprenant';
    case 'ADMINISTRATEUR':
    case 'ADMIN':
      return 'role-badge-admin';
    case 'RESPONSABLE':
      return 'role-badge-responsable';
    case 'FORMATEUR':
      return 'role-badge-formateur';
    default:
      return 'role-badge-default';
  }
};

const getStatusBadgeClass = (status) => {
  switch (status?.toUpperCase()) {
    case 'ACTIF':
      return 'status-actif';
    case 'SUSPENDU':
      return 'status-suspendu';
    case 'DESACTIVE':
    default:
      return 'status-desactive';
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
  const [mobileIndex, setMobileIndex] = useState(0);
  const presenceByUser = useRef(new Map());

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    role: 'FORMATEUR',
  });

  const [isClosing, setIsClosing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCloseDrawer = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedUser(null);
      setIsClosing(false);
    }, 500);
  };

  useEffect(() => {
    if (selectedUser) {
      requestAnimationFrame(() => setIsOpen(true));
    }
  }, [selectedUser]);

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
      const { nom, prenom, email, role } = formData;
      const response = await API.post('/admin/users', { nom, prenom, email, role });
      alert(response.data.message);
      setShowCreate(false);
      setFormData({ nom: '', prenom: '', email: '', role: 'FORMATEUR' });
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

  const handleDeleteUser = async () => {
    if (!selectedUser || isDeletingUser) return;
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
            body { font-family: Arial, sans-serif; color: #18181b; margin: 24px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { color: #52525b; font-size: 12px; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d4d4d8; padding: 8px; text-align: left; }
            th { background: #f4f4f5; }
            @media print { body { margin: 12mm; } tr { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <h1>Liste des utilisateurs</h1>
          <p>${filteredUsers.length} utilisateur(s) — ordre : ${escapeHtml(
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
    <div className="gs-users-container">

      {/* Header */}
      <header className="gs-users-header">
        <div>
          <div className="gs-badge">
            <Sparkles size={13} /> Administration Système
          </div>
          <h1 className="gs-title">Gestion des Membres</h1>
        </div>

        <button
          onClick={() => setShowStatsModal(!showStatsModal)}
          className="gs-btn-secondary"
        >
          <BarChart3 size={15} />
          <span>{showStatsModal ? 'Masquer Statistiques' : 'Afficher Statistiques'}</span>
          <ChevronDown size={14} className={`chevron-transition ${showStatsModal ? 'rotate' : ''}`} />
        </button>
      </header>

      {/* STATISTIQUES MODAL */}
      {showStatsModal && (
        <div className="stats-modal-card">
          <div className="stats-modal-header">
            <h2>Aperçu analytique des utilisateurs</h2>
            <button onClick={() => setShowStatsModal(false)} className="icon-close-btn">
              <X size={16} />
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-box-title">Comptes et candidatures ces 6 derniers mois</span>
              <div className="stat-legend">
                <span className="legend-item"><span className="dot-black" />Comptes créés</span>
                <span className="legend-item"><span className="dot-orange" />Candidatures envoyées</span>
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyCreationChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="userActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#18181b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="applicationActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                    <Area
                      type="monotone"
                      dataKey="comptes"
                      name="Comptes créés"
                      stroke="#18181b"
                      strokeWidth={2}
                      fill="url(#userActivity)"
                    />
                    <Area
                      type="monotone"
                      dataKey="candidatures"
                      name="Candidatures envoyées"
                      stroke="#f97316"
                      strokeWidth={2}
                      fill="url(#applicationActivity)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="stat-box">
              <span className="stat-box-title">Répartition des rôles</span>
              <div className="chart-wrapper" style={{ marginTop: '24px' }}>
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
      <div className="gs-controls-bar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon" />
          <input
            value={search ?? ''}
            onChange={(e) => { setSearch(e.target.value); setMobileIndex(0); }}
            placeholder="Rechercher par nom, email ou rôle..."
            className="gs-input pl-10"
          />
        </div>
        <div className="sort-select-wrapper">
          <select
            value={sort ?? 'recent'}
            onChange={(e) => setSort(e.target.value)}
            className="gs-input cursor-pointer appearance-none pr-8"
          >
            <option value="recent">Tri : Récent</option>
            <option value="name">Tri : Nom A-Z</option>
            <option value="role">Tri : Rôle</option>
          </select>
          <ArrowUpDown size={13} className="sort-icon-select" />
        </div>
        <div className="action-buttons-group">
          <button
            type="button"
            onClick={handlePrintUsers}
            disabled={loading || filteredUsers.length === 0}
            className="gs-btn-secondary"
          >
            <Printer size={14} />
            Imprimer
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading || filteredUsers.length === 0}
            className="gs-btn-secondary"
          >
            <FileSpreadsheet size={14} />
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      {loading ? (
        <div className="loading-state">Chargement des membres...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">Aucun utilisateur trouvé.</div>
      ) : (
        <div className="table-responsive-container">
          <table className="gs-table">
            <thead>
              <tr>
                <th className="px-4 py-2">Utilisateur</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Rôle</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2">Présence</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id_utilisateur}
                  onClick={() => setSelectedUser(user)}
                  className="gs-table-row"
                >
                  <td className="td-cell cell-left">
                    <div className="user-cell-flex">
                      <UserAvatar user={user} />
                      <div>
                        <p className="user-name-text">{user.prenom} {user.nom}</p>
                        <p className="user-id-text">ID #{user.id_utilisateur}</p>
                      </div>
                    </div>
                  </td>

                  <td className="td-cell cell-email">
                    {user.email}
                  </td>

                  <td className="td-cell">
                    <span className={`badge-role ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>

                  <td className="td-cell" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={user.statut_compte ?? 'ACTIF'}
                      onChange={(e) => handleStatusChange(user.id_utilisateur, e.target.value)}
                      className={`status-select ${getStatusBadgeClass(user.statut_compte)}`}
                    >
                      <option value="ACTIF">ACTIF</option>
                      <option value="DESACTIVE">DÉSACTIVÉ</option>
                      <option value="SUSPENDU">SUSPENDU</option>
                    </select>
                  </td>

                  <td className="td-cell">
                    <div className="presence-wrapper">
                      <span className={`presence-dot ${user.is_online ? 'online' : 'offline'}`} />
                      <span className={user.is_online ? 'presence-text-online' : 'presence-text-offline'}>
                        {user.is_online ? 'En ligne' : 'Hors ligne'}
                      </span>
                    </div>
                    <p className="presence-subdate">
                      {user.is_online
                        ? `Connecté depuis ${formatPresenceDate(user.date_derniere_connexion)}`
                        : `Dernière déconnexion ${formatPresenceDate(user.date_derniere_deconnexion)}`}
                    </p>
                  </td>

                  <td className="td-cell cell-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="icon-action-btn"
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
        className="fab-btn"
        title="Créer un utilisateur"
      >
        <UserPlus size={20} />
      </button>

      {/* PANNEAU LATÉRAL DE DÉTAILS / ÉDITION */}
      {selectedUser && (
        <div
          className={`drawer-backdrop ${isClosing ? 'fade-out' : 'fade-in'}`}
          onClick={handleCloseDrawer}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`drawer-panel ${isClosing ? 'slide-out-right' : 'slide-in-right'}`}
          >
            <div className="drawer-header">
              <span className="drawer-subtitle">Détails de l'utilisateur</span>
              <button onClick={handleCloseDrawer} className="icon-close-btn">
                <X size={16} />
              </button>
            </div>

            <div className="drawer-profile-section">
              <UserAvatar user={selectedUser} large />
              <div>
                <h3 className="drawer-user-title">
                  {selectedUser.prenom} {selectedUser.nom}
                </h3>
                <p className="drawer-user-email">{selectedUser.email}</p>
                <div className="drawer-badges-flex">
                  <span className={`badge-role ${getRoleBadgeClass(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                  <span className={`badge-status ${getStatusBadgeClass(selectedUser.statut_compte)}`}>
                    {selectedUser.statut_compte}
                  </span>
                </div>
              </div>
            </div>

            <div className="drawer-info-list">
              <span className="section-title">Informations de contact</span>

              <div className="info-card">
                <p className="info-card-label">Téléphone</p>
                <p className="info-card-value">
                  {selectedUser.telephone || 'Non renseigné'}
                </p>
              </div>

              <div className="info-card">
                <p className="info-card-label">Présence</p>
                <p className={`info-card-value font-medium ${selectedUser.is_online ? 'presence-text-online' : ''}`}>
                  {selectedUser.is_online ? 'En ligne' : 'Hors ligne'}
                </p>
                <p className="info-card-subtext">
                  Dernière connexion : {formatPresenceDate(selectedUser.date_derniere_connexion)}
                </p>
                <p className="info-card-subtext">
                  Dernière déconnexion : {formatPresenceDate(selectedUser.date_derniere_deconnexion)}
                </p>
              </div>

              {selectedUser.specialite && (
                <div className="info-card">
                  <p className="info-card-label">Spécialité</p>
                  <p className="info-card-value">{selectedUser.specialite}</p>
                </div>
              )}

              {selectedUser.fonction && (
                <div className="info-card">
                  <p className="info-card-label">Fonction</p>
                  <p className="info-card-value">{selectedUser.fonction}</p>
                </div>
              )}

              {selectedUser.role === 'APPRENANT' && (
                <div className="info-card">
                  <p className="info-card-label">Formation attribuée</p>
                  <p className="info-card-value">{selectedUser.formation_titre || 'Aucune formation'}</p>
                </div>
              )}
            </div>

            <div className="drawer-footer-actions">
              <span className="section-title">Mettre à jour l'accès</span>

              <div className="status-select-container">
                <span className="status-select-label">Statut du Compte</span>
                <select
                  value={selectedUser.statut_compte ?? 'ACTIF'}
                  onChange={(e) => handleStatusChange(selectedUser.id_utilisateur, e.target.value)}
                  className="status-dropdown-drawer"
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
                className="gs-btn-danger"
              >
                <Trash2 size={14} />
                {isDeletingUser ? 'Suppression...' : 'Supprimer cet utilisateur'}
              </button>

              <button
                onClick={handleCloseDrawer}
                className="gs-btn-dark-full"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création de Compte */}
      {showCreate && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Créer un nouveau membre</h3>
              <button onClick={() => setShowCreate(false)} className="icon-close-btn">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid-2">
                <input name="nom" placeholder="Nom" required value={formData.nom ?? ''} onChange={handleChange} className="gs-input" />
                <input name="prenom" placeholder="Prénom" required value={formData.prenom ?? ''} onChange={handleChange} className="gs-input" />
              </div>

              <input type="email" name="email" placeholder="Adresse email" required value={formData.email ?? ''} onChange={handleChange} className="gs-input" />

              <select name="role" value={formData.role ?? 'FORMATEUR'} onChange={handleChange} className="gs-input">
                <option value="FORMATEUR">Formateur</option>
                <option value="RESPONSABLE">Responsable</option>
                <option value="ADMINISTRATEUR">Administrateur</option>
              </select>
              <p className="modal-hint">
                Un lien sécurisé sera envoyé à cette adresse pour vérifier l’e-mail et configurer le compte.
              </p>

              <button
                type="submit"
                className="gs-btn-dark-full"
              >
                Créer et envoyer l’invitation
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}