import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getAuthUser, logout as logoutService } from '../services/authService';
import { 
  BookOpen, 
  FileText, 
  Calendar, 
  QrCode, 
  MessageSquare, 
  User, 
  LogOut, 
  Sun,
  Moon,
  Users,
  LayoutDashboard,
  GraduationCap,
  ClipboardCheck,
  Activity,
  Bell,
  Search,
  Settings
} from 'lucide-react';
import sitelogo from '../assets/logo.png';

const API_AVATARS = import.meta.env.VITE_URL;

const NAV_CONFIG = {
  visiteur: [
    { path: '/catalogue', label: 'Catalogue', icon: BookOpen },
  ],
  apprenant: [
    { path: '/apprenant/catalogue', label: 'Catalogue', icon: BookOpen },
    { path: '/apprenant/planning', label: 'Mon Planning', icon: Calendar },
    { path: '/apprenant/evaluations', label: 'Évaluations', icon: ClipboardCheck },
    { path: '/apprenant/forum', label: 'Forum', icon: MessageSquare },
  ],
  admin: [
    { path: '/Admin/dashboard', label: 'Statistiques', icon: Activity },
    { path: '/Admin/users', label: 'Utilisateurs', icon: Users },
  ],
  administrateur: [
    { path: '/Admin/dashboard', label: 'Statistiques', icon: Activity },
    { path: '/Admin/users', label: 'Utilisateurs', icon: Users },
  ],
  responsable: [
    { path: '/Responsable/GsFormation', label: 'Formations', icon: BookOpen },
    { path: '/Responsable/Candidature', label: 'Candidatures', icon: FileText },
    { path: '/Responsable/Planning', label: 'Planning', icon: Calendar },
    { path: '/Responsable/Scan', label: 'Scan Presence', icon: QrCode },
    { path: '/Responsable/Catalogue', label: 'Catalogue', icon: MessageSquare },
  ],
  formateur: [
    { path: '/Formateur', label: 'Tableau de bord', icon: LayoutDashboard },
    { path: '/Formateur/Planning', label: 'Planning', icon: Calendar },
    { path: '/Formateur/Apprenants', label: 'Apprenants', icon: GraduationCap },
    { path: '/Formateur/Evaluations', label: 'Évaluations', icon: ClipboardCheck },
    { path: '/Formateur/Forum', label: 'Forum', icon: MessageSquare },
    { path: '/Formateur/Catalogue', label: 'Catalogue', icon: BookOpen },
  ]
};

const getAvatarSrc = (user) => {
  if (!user) return null;
  const avatar = user.photo_profil || user.photo;
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:')) return avatar;
  return `${API_AVATARS}/uploads/avatars/${avatar}`;
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(() => getAuthUser());
  const isAuthenticated = !!user;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setUser(getAuthUser());
    setIsDropdownOpen(false);
  }, [location]);

  // Mode Sombre / Clair
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('theme');
    if (savedMode) return savedMode === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userRole = user?.role?.toLowerCase() || 'visiteur';
  const navLinks = NAV_CONFIG[userRole] || NAV_CONFIG.visiteur;

  const handleLogout = () => {
    logoutService();
    setUser(null);
    navigate('/login');
  };

  const initials = user ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() : '';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f2f5] p-4 font-sans text-slate-800 transition-colors duration-300 dark:bg-[#0b0c10] dark:text-zinc-100">
      
      {/* SECTEUR GAUCHE : Affiché UNIQUEMENT si l'utilisateur est connecté */}
      {isAuthenticated && (
        <aside className="flex flex-col items-center gap-6 mr-4 shrink-0">
          
          {/* LOGO EN HAUT À GAUCHE */}
          <Link 
            to="/" 
            className="flex h-12 w-12 items-center justify-center"
          >
            <img src={sitelogo} alt="Logo" className="h-7 w-7 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
          </Link>

          {/* SIDEBAR GAUCHE */}
          <div className="flex flex-1 flex-col items-center justify-between rounded-full bg-white/80 py-3 px-2 shadow-sm backdrop-blur-md dark:bg-zinc-900/80">
            
            {/* Liens de navigation avec Tooltip au survol */}
            <nav className="flex flex-col items-center gap-3">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <div key={link.path} className="group relative flex items-center">
                    <Link
                      to={link.path}
                      className={`flex h-10 w-10 items-center justify-center rounded-bl-full rounded-tl-full rounded-tr-full transition-all duration-200 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
                          : 'text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-orange-500' : ''} />
                    </Link>

                    {/* Nom affiché uniquement au survol (Tooltip) */}
                    <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 dark:bg-zinc-100 dark:text-slate-900">
                      {link.label}
                    </span>
                  </div>
                );
              })}
            </nav>

            {/* Icone Paramètres en bas */}
            <div className="group relative flex items-center">
              <Link
                to="/profil"
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <Settings size={18} />
              </Link>
              <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 dark:bg-zinc-100 dark:text-slate-900">
                Paramètres
              </span>
            </div>

          </div>
        </aside>
      )}

      {/* ZONE PRINCIPALE DU CONTENU */}
      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* BARRE SUPÉRIEURE (Top Bar - Sans Background) */}
        <header className="flex h-14 shrink-0 items-center justify-between px-2">
          
          <div className="flex items-center gap-3">
            {/* Si déconnecté, afficher le logo dans le header pour garder l'identité visuelle */}
            {!isAuthenticated && (
              <Link to="/" className="flex items-center gap-2 mr-2">
                <img src={sitelogo} alt="Logo" className="h-7 w-7 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              </Link>
            )}

            {/* Recherche globale */}
            <div className="relative w-64 sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search users, queries, content..."
                className="w-full rounded-full bg-white/70 py-2 pl-9 pr-4 text-xs font-medium text-slate-800 outline-none backdrop-blur-sm transition focus:bg-white focus:ring-1 focus:ring-orange-500 dark:bg-zinc-900/70 dark:text-zinc-200 dark:focus:bg-zinc-900"
              />
            </div>
          </div>

          {/* Actions Droite (Dark mode, Notifs, Profil) */}
          <div className="flex items-center gap-3">
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {darkMode ? <Moon size={15} className="text-orange-400" /> : <Sun size={15} className="text-amber-500" />}
            </button>

            {/* Notifications */}
            <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm hover:bg-slate-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
              <Bell size={15} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-500"></span>
            </button>

            {/* Menu Utilisateur */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-full bg-white p-1.5 shadow-sm hover:opacity-90 dark:bg-zinc-900"
                >
                  {getAvatarSrc(user) ? (
                    <img src={getAvatarSrc(user)} alt="Profil" className="h-7 w-7 rounded-full object-cover ring-2 ring-orange-500/30" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                      {initials || <User size={14} />}
                    </div>
                  )}
                  <div className="hidden px-1 text-left sm:block">
                    <p className="text-xs leading-tight text-slate-900 dark:text-white">{user?.prenom} {user?.nom}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
                  </div>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                    <Link to="/profil" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                      <User size={15} /> Mon Profil
                    </Link>
                    <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                      <LogOut size={15} /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="rounded-full bg-orange-500 px-4 py-2 text-xs text-white shadow-sm hover:bg-orange-600">Se connecter</Link>
            )}

          </div>
        </header>

        {/* CONTENU DE LA PAGE */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

    </div>
  );
}