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
  LogIn,
  Sun,
  Moon,
  Users,
  LayoutDashboard,
  GraduationCap,
  ClipboardCheck,
  Activity,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import sitelogo from '../assets/logo.png';

const API_AVATARS = import.meta.env.VITE_URLTEST_AVATAR;

// Configuration dynamique des onglets par Rôle
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Synchronise l'état au changement de route
  useEffect(() => {
    setUser(getAuthUser());
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  }, [location]);

  // Gestion du Mode Sombre / Clair
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

  // Fermeture des menus au clic extérieur
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

  const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-black dark:text-zinc-100">
      
      {/* En-tête Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            
            {/* Logo */}
            <Link to="/" className={`flex items-center gap-3 rounded-xl transition-opacity hover:opacity-90 ${focusRing}`}>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden">
                <img 
                  src={sitelogo} 
                  alt="Logo" 
                  className="h-7 w-7 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentNode.innerText = 'ODC';
                    e.target.parentNode.className = 'flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-xs font-black text-white dark:text-slate-950';
                  }}
                />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Orange Digital Center <span className="text-orange-600 dark:text-orange-400">Club</span>
              </span>
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-1 rounded-2xl  bg-slate-100/50 p-1 dark:border-zinc-800/60 dark:bg-zinc-800/40">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${focusRing} ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-950'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={15} className={isActive ? 'text-orange-500' : 'opacity-70'} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Actions Droite */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Toggle Dark / Light Mode */}
              <button
                onClick={toggleDarkMode}
                aria-label="Changer de thème"
                className={`relative flex h-8 w-14 items-center rounded-full bg-slate-200/80 p-1 transition-colors duration-300 dark:bg-zinc-800 ${focusRing}`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 dark:bg-zinc-900 ${
                    darkMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  {darkMode ? (
                    <Moon size={13} className="text-orange-400" />
                  ) : (
                    <Sun size={13} className="text-amber-500" />
                  )}
                </div>
              </button>

              {/* Utilisateur Connecté / Non Connecté */}
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className={`inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
                >
                  <LogIn size={15} />
                  <span className="hidden sm:inline">Se connecter</span>
                </Link>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex items-center gap-2 rounded-full p-0.5 transition hover:opacity-90 ${focusRing}`}
                    title={`${user?.prenom || ''} ${user?.nom || ''}`}
                  >
                    {getAvatarSrc(user) ? (
                      <img
                        src={getAvatarSrc(user)}
                        alt="Profil"
                        className="h-9 w-9 rounded-full object-cover ring-2 ring-orange-500/30"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 ring-2 ring-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400">
                        {initials || <User size={16} />}
                      </div>
                    )}
                    <ChevronDown size={14} className="hidden text-slate-400 sm:block dark:text-zinc-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="mb-2 border-b border-slate-100 px-3 py-2.5 dark:border-zinc-800">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                          {user?.prenom} {user?.nom}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-orange-600 uppercase tracking-wider dark:text-orange-400">
                          {user?.role || 'Utilisateur'}
                        </p>
                      </div>

                      <Link
                        to="/profil"
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 ${focusRing}`}
                      >
                        <User size={15} className="text-slate-400 dark:text-zinc-500" />
                        Mon Profil
                      </Link>

                      <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                      <button
                        onClick={handleLogout}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 ${focusRing}`}
                      >
                        <LogOut size={15} />
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bouton Menu Mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`rounded-xl border border-slate-200/80 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 md:hidden ${focusRing}`}
                aria-label="Ouvrir le menu"
              >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

            </div>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMobileMenuOpen && (
          <div className="border-t border-slate-200/80 bg-white/95 px-4 pb-4 pt-3 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white dark:text-slate-950'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Contenu Principal */}
      <main className="mx-auto w-full max-w-6xl flex-1">
        <Outlet />
      </main>
    </div>
  );
}