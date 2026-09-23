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
  Menu,
  X
} from 'lucide-react';

import heroLogo from '../assets/hero.png';

const BACKEND_URL = 'http://localhost:5000';

// Configuration dynamique des onglets par Rôle
const NAV_CONFIG = {
  visiteur: [
    { path: '/catalogue', label: 'Catalogue', icon: BookOpen },
  ],
  apprenant: [
    { path: '/apprenant/catalogue', label: 'Catalogue', icon: BookOpen },
    { path: '/apprenant/planning', label: 'Mon Planning', icon: Calendar },
    { path: '/apprenant/forum', label: 'Forum', icon: MessageSquare },
  ],
  admin: [
    { path: '/Admin/dashboard', label: 'Utilisateurs', icon: Users },
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
  return `${BACKEND_URL}/uploads/avatars/${avatar}`;
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

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-black transition-colors duration-300 dark:bg-black dark:text-white">
      {/* En-tête Navigation */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 shadow-sm backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-black/95">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Logo / Image d'en-tête */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative flex h-10 w-10 overflow-hidden rounded-xl bg-orange-500/10 p-1 border border-orange-500/20 shadow-sm transition group-hover:scale-105">
                <img 
                  src={heroLogo} 
                  alt="Logo" 
                  className="h-full w-full object-cover rounded-lg"
                  onError={(e) => {
                    // Fallback si l'image hero.png est momentanément inaccessible
                    e.target.style.display = 'none';
                    e.target.parentNode.innerText = 'E';
                    e.target.parentNode.className = 'flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl font-black text-black';
                  }}
                />
              </div>
              <span className="text-lg font-black tracking-tight text-black dark:text-white">
                Skill<span className="text-orange-500">Hub</span>
              </span>
            </Link>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                        : 'text-black/65 hover:bg-black/5 hover:text-orange-600 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-orange-400'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-black' : 'text-black/45 dark:text-white/45'} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Actions Droite */}
            <div className="flex items-center gap-2 sm:gap-3">
              
              {/* Bouton de Thème (Dark / Light) */}
              <button
                onClick={toggleDarkMode}
                aria-label="Changer de thème"
                className="relative flex h-9 w-16 items-center rounded-full bg-zinc-200 p-1 transition-colors duration-300 dark:bg-zinc-800"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 dark:bg-zinc-950 ${
                    darkMode ? 'translate-x-7' : 'translate-x-0'
                  }`}
                >
                  {darkMode ? (
                    <Moon size={14} className="text-orange-400" />
                  ) : (
                    <Sun size={14} className="text-amber-500" />
                  )}
                </div>
              </button>

              {/* Utilisateur Connecté / Non Connecté */}
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-black font-extrabold text-xs hover:bg-orange-600 transition shadow-lg shadow-orange-500/20"
                >
                  <LogIn size={16} />
                  <span className="hidden sm:inline">Se connecter</span>
                </Link>
              ) : (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-center rounded-xl p-1 transition hover:ring-2 hover:ring-orange-500/50 focus:outline-none"
                    title={`${user?.prenom || ''} ${user?.nom || ''}`}
                  >
                    {getAvatarSrc(user) ? (
                      <img
                        src={getAvatarSrc(user)}
                        alt="Profil"
                        className="h-9 w-9 rounded-xl object-cover ring-2 ring-orange-500/30"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-xs font-black text-orange-500 ring-2 ring-orange-500/40 dark:bg-zinc-900">
                        {initials || <User size={18} />}
                      </div>
                    )}
                  </button>

                  {/* Dropdown Profil */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
                      <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 mb-1">
                        <p className="text-xs font-bold text-black dark:text-white truncate">
                          {user?.prenom} {user?.nom}
                        </p>
                        <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider">
                          {user?.role || 'Utilisateur'}
                        </p>
                      </div>

                      <Link
                        to="/profil"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-black/70 hover:bg-orange-500/10 hover:text-orange-600 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-orange-400"
                      >
                        <User size={15} className="text-black/40 dark:text-white/40" />
                        Mon Profil
                      </Link>

                      <div className="border-t border-black/5 dark:border-white/5 my-1"></div>

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                      >
                        <LogOut size={15} />
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bouton Menu Mobile (Hamburger) */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-xl p-2 text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10 md:hidden"
                aria-label="Ouvrir le menu"
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>

            </div>
          </div>
        </div>

        {/* Menu Déroulant Mobile */}
        {isMobileMenuOpen && (
          <div className="border-t border-black/10 bg-white px-4 pb-4 pt-2 dark:border-white/10 dark:bg-black md:hidden">
            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-orange-500 text-black'
                        : 'text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10'
                    }`}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Contenu Principal */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}