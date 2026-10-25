// frontend/src/components/MainLayout.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getAuthUser, logout as logoutService } from '../services/authService';
import { connectRealtime } from '../services/realtime';
import sitelogo from '../assets/logo.png';

const API_AVATARS = import.meta.env.VITE_URL;

const NAV_CONFIG = {
  visiteur: [
    { path: '/catalogue', label: 'Catalogue', icon: 'bi-compass' },
  ],
  apprenant: [
    { path: '/apprenant/catalogue', label: 'Catalogue', icon: 'bi-compass' },
    { path: '/apprenant/planning', label: 'Planning', icon: 'bi-calendar-week' },
    { path: '/apprenant/evaluations', label: 'Évaluations', icon: 'bi-check2-square' },
    { path: '/apprenant/forum', label: 'Forum', icon: 'bi-chat-left-text' },
  ],
  admin: [
    { path: '/Admin/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2' },
    { path: '/Admin/users', label: 'Utilisateurs', icon: 'bi-people' },
    { path: '/Admin/certifications', label: 'Certifications', icon: 'bi-patch-check' },
    { path: '/Admin/donnees-test', label: 'Données test', icon: 'bi-database' },
  ],
  administrateur: [
    { path: '/Admin/dashboard', label: 'Dashboard', icon: 'bi-grid-1x2' },
    { path: '/Admin/users', label: 'Utilisateurs', icon: 'bi-people' },
    { path: '/Admin/certifications', label: 'Certifications', icon: 'bi-patch-check' },
    { path: '/Admin/donnees-test', label: 'Données test', icon: 'bi-database' },
  ],
  responsable: [
    { path: '/Responsable/GsFormation', label: 'Formations', icon: 'bi-layers' },
    { path: '/Responsable/Candidature', label: 'Candidatures', icon: 'bi-file-earmark-person' },
    { path: '/Responsable/Planning', label: 'Planning', icon: 'bi-calendar-week' },
    { path: '/Responsable/Scan', label: 'Scan', icon: 'bi-qr-code-scan' },
    { path: '/Responsable/Certification', label: 'Certification', icon: 'bi-patch-check' },
    { path: '/Responsable/Catalogue', label: 'Catalogue', icon: 'bi-compass' },
  ],
  formateur: [
    { path: '/Formateur', label: 'Dashboard', icon: 'bi-grid-1x2' },
    { path: '/Formateur/Planning', label: 'Planning', icon: 'bi-calendar-week' },
    { path: '/Formateur/Apprenants', label: 'Apprenants', icon: 'bi-mortarboard' },
    { path: '/Formateur/Evaluations', label: 'Évaluations', icon: 'bi-check2-square' },
    { path: '/Formateur/Forum', label: 'Forum', icon: 'bi-chat-left-text' },
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

  // État PC pour dérouler/fermer la sidebar
  const [isExpanded, setIsExpanded] = useState(false);

  // Menus de profil séparés pour le desktop et le mobile/tablette.
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDesktopProfileMenuOpen, setIsDesktopProfileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);
  const desktopProfileRef = useRef(null);

  useEffect(() => {
    setUser(getAuthUser());
    setIsProfileMenuOpen(false);
    setIsDesktopProfileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const socket = connectRealtime();
    return () => socket.disconnect();
  }, [user?.id_utilisateur]);

  // Mode Sombre / Clair (Palette Zinc / Blanc / Noir)
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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (desktopProfileRef.current && !desktopProfileRef.current.contains(event.target)) {
        setIsDesktopProfileMenuOpen(false);
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
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 p-2 sm:p-3 font-sans text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      
      {/* ========================================================= */}
      {/* SIDEBAR DESKTOP (PC) - Inspirée des images (N&B + Orange) */}
      {/* ========================================================= */}
      {isAuthenticated && (
        <aside className={`hidden md:flex font-sans relative flex-col justify-between transition-all duration-300 py-4 px-2 my-1 rounded-3xl shadow-sm z-50 
          bg-white text-zinc-900 border border-zinc-200
          dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800/80
          ${isExpanded ? 'w-60' : 'w-16'}`}
        >
          {/* HAUT : Logo & Navigation */}
          <div className="flex flex-col gap-4">
            
            {/* Header / Logo */}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-3 w-full focus:outline-none px-1 py-1 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
              title="Dérouler / Fermer le menu"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl  text-white dark:text-zinc-900">
                <img src={sitelogo} alt="Logo" className="h-7 w-7 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
              {isExpanded && (
                <div className="text-left font-bold text-xs tracking-tight truncate uppercase">
                  <p className="leading-none text-orange-500">Orange Digital</p>
                  <p className="leading-tight text-zinc-800 dark:text-zinc-200">Center</p>
                </div>
              )}
            </button>

            <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1"></div>

            {/* Navigation principale */}
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    title={!isExpanded ? link.label : ''}
                    className={`relative flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-all duration-200 group ${
                      isActive 
                        ? 'text-orange-500 font-medium' 
                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                    }`}
                  >
                    {/* Indicateur orange à gauche en mode actif (Inspiré de layout.webp) */}
                    {isActive && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-orange-500 rounded-r-full"></span>
                    )}
                    <i className={`${link.icon} text-lg shrink-0 ${isActive ? 'text-orange-500 dark:text-orange-600' : ''}`}></i>
                    {isExpanded && <span className="text-xs truncate font-medium">{link.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* BAS : avatar ouvrant le menu profil, thème et déconnexion */}
          <div className="relative flex flex-col gap-1" ref={desktopProfileRef}>
            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800/80" />

            <button
              type="button"
              onClick={() => setIsDesktopProfileMenuOpen((open) => !open)}
              aria-expanded={isDesktopProfileMenuOpen}
              aria-label="Ouvrir le menu du compte"
              title="Compte et préférences"
              className={`flex w-full items-center gap-3 rounded-2xl border border-transparent p-2 text-left transition hover:border-orange-200 hover:bg-orange-50/70 dark:hover:border-orange-500/20 dark:hover:bg-zinc-800/80 ${isExpanded ? 'justify-start' : 'justify-center'}`}
            >
              {getAvatarSrc(user) ? (
                <img src={getAvatarSrc(user)} alt="Avatar du profil" className="h-9 w-9 shrink-0 rounded-xl object-cover ring-2 ring-orange-500/30" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-xs font-bold text-white">
                  {initials || <i className="bi bi-person" />}
                </span>
              )}
              {isExpanded && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">{user?.prenom} {user?.nom}</span>
                  <span className="block truncate text-[10px] capitalize text-zinc-500 dark:text-zinc-400">{user?.role || 'Utilisateur'}</span>
                </span>
              )}
              {isExpanded && <i className={`bi bi-chevron-${isDesktopProfileMenuOpen ? 'down' : 'up'} text-xs text-zinc-400`} />}
            </button>

            {isDesktopProfileMenuOpen && (
              <div className={`absolute bottom-full z-[60] mb-2 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 ${isExpanded ? 'left-0' : 'left-14'}`}>
                <div className="border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">{user?.prenom} {user?.nom}</p>
                  <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{user?.email}</p>
                </div>

                <Link
                  to="/profil"
                  onClick={() => setIsDesktopProfileMenuOpen(false)}
                  className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <i className="bi bi-person text-base text-zinc-500" />
                  <span className="flex-1">Mon profil</span>
                  <i className="bi bi-arrow-up-right text-[10px] text-zinc-400" />
                </Link>

                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <i className={`bi ${darkMode ? 'bi-sun' : 'bi-moon-stars'} text-base text-orange-500`} />
                  <span className="flex-1">Passer en mode {darkMode ? 'clair' : 'sombre'}</span>
                  <span className="rounded-md bg-zinc-100 px-1.5 py-1 text-[9px] font-bold uppercase text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">{darkMode ? 'Dark' : 'Light'}</span>
                </button>

                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <i className="bi bi-box-arrow-right text-base" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* CONTENU PRINCIPAL - Ajustement conditionnel de la marge basse */}
      <div className={`flex flex-1 flex-col overflow-hidden ${isAuthenticated ? 'pb-24 md:pb-0' : 'pb-0'}`}>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ========================================================= */}
      {/* NAVBAR MOBILE / TABLETTE (Non modifiée, reste identique)  */}
      {/* ========================================================= */}
      {isAuthenticated && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:hidden z-50 w-[92%] max-w-sm" ref={mobileMenuRef}>
          
          {/* Menu déroulant Profil sur Mobile */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-16 right-0 w-56 rounded-3xl bg-white p-2.5 text-slate-800 shadow-xl dark:bg-zinc-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-150 z-50">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800 mb-1">
                <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{user?.prenom} {user?.nom}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <Link 
                to="/profil" 
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <i className="bi bi-person text-sm"></i> Mon Profil
              </Link>

              <button 
                onClick={toggleDarkMode} 
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <span className="flex items-center gap-2.5">
                  <i className={`bi ${darkMode ? 'bi-moon-stars text-orange-400' : 'bi-sun text-amber-500'} text-sm`}></i> 
                  Mode {darkMode ? 'Sombre' : 'Clair'}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'}`}>
                  {darkMode ? 'Dark' : 'Light'}
                </span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-zinc-800"></div>

              <button 
                onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} 
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
              >
                <i className="bi bi-box-arrow-right text-sm"></i> Déconnexion
              </button>
            </div>
          )}

          {/* Capsule Flottante Mobile (Fond Zinc Moderne) */}
          <nav className="flex items-center justify-between bg-zinc-900/90 text-zinc-100 p-1.5 rounded-full shadow-xl backdrop-blur-md dark:bg-zinc-900/95 border border-zinc-800/80">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsProfileMenuOpen(false)}
                  className={`flex items-center gap-2 py-2 transition-all duration-200 rounded-full ${
                    isActive 
                      ? 'bg-zinc-800 text-white px-3.5 font-semibold shadow-inner' 
                      : 'text-zinc-400 hover:text-white px-2.5'
                  }`}
                >
                  <i className={`${link.icon} text-base ${isActive ? 'text-orange-400' : ''}`}></i>
                  {isActive && <span className="text-xs font-medium tracking-tight">{link.label}</span>}
                </Link>
              );
            })}

            {/* Onglet Profil sur Mobile */}
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex items-center gap-2 py-2 transition-all duration-200 rounded-full ${
                isProfileMenuOpen 
                  ? 'bg-zinc-800 text-white px-3.5 font-semibold' 
                  : 'text-zinc-400 hover:text-white px-2.5'
              }`}
            >
              {getAvatarSrc(user) ? (
                <img src={getAvatarSrc(user)} alt="Profil" className="h-5 w-5 rounded-full object-cover ring-1 ring-orange-500/50 shrink-0" />
              ) : (
                <i className="bi bi-person text-base"></i>
              )}
              {isProfileMenuOpen && <span className="text-xs font-medium tracking-tight">Profil</span>}
            </button>
          </nav>
        </div>
      )}

    </div>
  );
}