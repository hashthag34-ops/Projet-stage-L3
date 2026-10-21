import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getAuthUser, logout as logoutService } from '../services/authService';
import { connectRealtime } from '../services/realtime';
import sitelogo from '../assets/logo.png';

const API_AVATARS = import.meta.env.VITE_URL;

const NAV_CONFIG = {
  visiteur: [
    { path: '/catalogue', label: 'Catalogue', icon: 'bi-book' },
  ],
  apprenant: [
    { path: '/apprenant/catalogue', label: 'Catalogue', icon: 'bi-book' },
    { path: '/apprenant/planning', label: 'Planning', icon: 'bi-calendar-event' },
    { path: '/apprenant/evaluations', label: 'Évaluations', icon: 'bi-clipboard-check' },
    { path: '/apprenant/forum', label: 'Forum', icon: 'bi-chat-square-text' },
  ],
  admin: [
    { path: '/Admin/dashboard', label: 'Stats', icon: 'bi-activity' },
    { path: '/Admin/users', label: 'Utilisateurs', icon: 'bi-people' },
    { path: '/Admin/donnees-test', label: 'Données test', icon: 'bi-database-add' },
  ],
  administrateur: [
    { path: '/Admin/dashboard', label: 'Stats', icon: 'bi-activity' },
    { path: '/Admin/users', label: 'Utilisateurs', icon: 'bi-people' },
    { path: '/Admin/donnees-test', label: 'Données test', icon: 'bi-database-add' },
  ],
  responsable: [
    { path: '/Responsable/GsFormation', label: 'Formations', icon: 'bi-book' },
    { path: '/Responsable/Candidature', label: 'Candidatures', icon: 'bi-file-text' },
    { path: '/Responsable/Planning', label: 'Planning', icon: 'bi-calendar-event' },
    { path: '/Responsable/Scan', label: 'Scan', icon: 'bi-qr-code' },
    { path: '/Responsable/Catalogue', label: 'Catalogue', icon: 'bi-chat-square-text' },
  ],
  formateur: [
    { path: '/Formateur', label: 'Dashboard', icon: 'bi-speedometer2' },
    { path: '/Formateur/Planning', label: 'Planning', icon: 'bi-calendar-event' },
    { path: '/Formateur/Apprenants', label: 'Apprenants', icon: 'bi-mortarboard' },
    { path: '/Formateur/Evaluations', label: 'Évaluations', icon: 'bi-clipboard-check' },
    { path: '/Formateur/Forum', label: 'Forum', icon: 'bi-chat-square-text' },
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

  // Menu déroulant de profil (PC et Mobile)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  useEffect(() => {
    setUser(getAuthUser());
    setIsProfileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const socket = connectRealtime();
    return () => socket.disconnect();
  }, [user?.id_utilisateur]);

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
      if (
        profileMenuRef.current && !profileMenuRef.current.contains(event.target) &&
        mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
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
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f2f5] p-3 font-sans text-slate-800 transition-colors duration-300 dark:bg-[#0b0c10] dark:text-zinc-100">
      
      {/* ========================================================= */}
      {/* SIDEBAR DESKTOP (PC)                                      */}
      {/* ========================================================= */}
      {isAuthenticated && (
        <aside className={`hidden md:flex relative flex-col justify-between transition-all duration-300 py-6 px-3 my-1 rounded-[2.5rem] shadow-xl z-50 
          bg-white text-slate-800 border border-slate-200/60
          dark:bg-slate-950 dark:text-white dark:border-none
          ${isExpanded ? 'w-64' : 'w-20'}`}
        >
          {/* SECTION HAUTE : Logo cliquable */}
          <div className="flex flex-col gap-6">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-3 w-full focus:outline-none px-1"
              title="Dérouler / Fermer le menu"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white shadow-inner transition-colors">
                <img src={sitelogo} alt="Logo" className="h-6 w-6 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
              {isExpanded && (
                <span className="font-bold text-lg tracking-wide truncate capitalize text-slate-900 dark:text-zinc-100">
                  {user?.role || 'Admin'}
                </span>
              )}
            </button>

            {/* LIENS DE NAVIGATION PC */}
            <nav className="flex flex-col gap-2 mt-4">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-4 px-3.5 py-3 rounded-2xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-slate-900 text-white font-semibold shadow-md dark:bg-white dark:text-slate-900' 
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
                    }`}
                  >
                    <i className={`${link.icon} text-xl shrink-0 ${isActive ? 'text-orange-500' : ''}`}></i>
                    {isExpanded && <span className="text-sm truncate font-medium">{link.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* SECTION BASSE : Photo de profil & Pop-up Menu PC */}
          <div className="relative" ref={profileMenuRef}>
            {isProfileMenuOpen && (
              <div className="absolute bottom-16 left-0 w-60 rounded-2xl bg-white p-2 text-slate-800 shadow-2xl dark:bg-zinc-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 animate-fadeIn z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800 mb-1">
                  <p className="text-xs font-bold truncate">{user?.prenom} {user?.nom}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>

                <Link 
                  to="/profil" 
                  className="flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                >
                  <i className="bi bi-person text-base"></i> Mon Profil
                </Link>

                <button 
                  onClick={toggleDarkMode} 
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                >
                  <span className="flex items-center gap-3">
                    <i className={`bi ${darkMode ? 'bi-moon text-orange-400' : 'bi-sun text-amber-500'} text-base`}></i> 
                    Mode {darkMode ? 'Sombre' : 'Clair'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'}`}>
                    {darkMode ? 'Dark' : 'Light'}
                  </span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-zinc-800"></div>

                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                >
                  <i className="bi bi-box-arrow-right text-base"></i> Déconnexion
                </button>
              </div>
            )}

            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 w-full p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 transition focus:outline-none"
            >
              {getAvatarSrc(user) ? (
                <img src={getAvatarSrc(user)} alt="Profil" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-orange-500/50" />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white text-xs font-bold">
                  {initials || <i className="bi bi-person"></i>}
                </div>
              )}
              {isExpanded && (
                <div className="flex flex-col text-left truncate">
                  <span className="text-xs font-bold truncate text-slate-900 dark:text-white">{user?.prenom} {user?.nom}</span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 capitalize truncate">{user?.role}</span>
                </div>
              )}
            </button>
          </div>
        </aside>
      )}

      {/* CONTENU PRINCIPAL */}
      <div className="flex flex-1 flex-col overflow-hidden pb-20 md:pb-0">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ========================================================= */}
      {/* NAVBAR MOBILE / TABLETTE                                  */}
      {/* ========================================================= */}
      {isAuthenticated && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:hidden z-50 w-[92%] max-w-md" ref={mobileMenuRef}>
          
          {/* Menu déroulant Profil sur Mobile (avec le bouton Dark/Light inclus) */}
          {isProfileMenuOpen && (
            <div className="absolute bottom-20 right-0 w-60 rounded-3xl bg-white p-3 text-slate-800 shadow-2xl dark:bg-zinc-900 dark:text-zinc-100 border border-slate-200 dark:border-zinc-800 animate-fadeIn z-50">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800 mb-1">
                <p className="text-xs font-bold truncate">{user?.prenom} {user?.nom}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <Link 
                to="/profil" 
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <i className="bi bi-person text-base"></i> Mon Profil
              </Link>

              {/* Bouton Dark / Light Mode Mobile */}
              <button 
                onClick={toggleDarkMode} 
                className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-2xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <span className="flex items-center gap-3">
                  <i className={`bi ${darkMode ? 'bi-moon text-orange-400' : 'bi-sun text-amber-500'} text-base`}></i> 
                  Mode {darkMode ? 'Sombre' : 'Clair'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-200 text-slate-700'}`}>
                  {darkMode ? 'Dark' : 'Light'}
                </span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-zinc-800"></div>

              <button 
                onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} 
                className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-red-600 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/10 transition"
              >
                <i className="bi bi-box-arrow-right text-base"></i> Déconnexion
              </button>
            </div>
          )}

          {/* Capsule Flottante Arrondie Mobile */}
          <nav className="flex items-center justify-between bg-black text-white p-2 rounded-full shadow-2xl transition-colors duration-300 dark:bg-zinc-900 border border-white/10">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsProfileMenuOpen(false)}
                  className={`flex items-center gap-2 py-2.5 transition-all duration-300 rounded-full ${
                    isActive 
                      ? 'bg-zinc-800 text-white px-4 font-semibold shadow-inner dark:bg-zinc-800' 
                      : 'text-zinc-400 hover:text-white px-3'
                  }`}
                >
                  <i className={`${link.icon} text-lg ${isActive ? 'text-orange-400' : ''}`}></i>
                  {isActive && <span className="text-xs tracking-wide animate-fadeIn">{link.label}</span>}
                </Link>
              );
            })}

            {/* Onglet Profil sur Mobile */}
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex items-center gap-2 py-2.5 transition-all duration-300 rounded-full ${
                isProfileMenuOpen 
                  ? 'bg-zinc-800 text-white px-4 font-semibold' 
                  : 'text-zinc-400 hover:text-white px-3'
              }`}
            >
              {getAvatarSrc(user) ? (
                <img src={getAvatarSrc(user)} alt="Profil" className="h-6 w-6 rounded-full object-cover ring-1 ring-orange-500/50 shrink-0" />
              ) : (
                <i className="bi bi-person text-lg"></i>
              )}
              {isProfileMenuOpen && <span className="text-xs tracking-wide animate-fadeIn">Profil</span>}
            </button>
          </nav>
        </div>
      )}

    </div>
  );
}