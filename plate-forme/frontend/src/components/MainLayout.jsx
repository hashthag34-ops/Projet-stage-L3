// frontend/src/components/MainLayout.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getAuthUser, logout as logoutService } from '../services/authService';
import { connectRealtime } from '../services/realtime';
import sitelogo from '../assets/logo.png';
import './MainLayout.css'; // Importation du CSS classique

const API_AVATARS = import.meta.env.VITE_URL;

const NAV_CONFIG = {
  visiteur: [
    { path: '/catalogue', label: 'Catalogue', icon: 'bi-compass' },
  ],
  apprenant: [
    { path: '/apprenant/catalogue', label: 'Catalogue', icon: 'bi-compass' },
    { path: '/apprenant/planning', label: 'Planning', icon: 'bi-calendar-week' },
    { path: '/apprenant/evaluations', label: 'Évaluations', icon: 'bi-check2-square' },
    { path: '/apprenant/historique', label: 'Historique', icon: 'bi-clock-history' },
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

  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className={`layout-container ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      
      {/* SIDEBAR DESKTOP */}
      {isAuthenticated && (
        <aside className={`desktop-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="sidebar-top">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="sidebar-brand-btn"
              title="Dérouler / Fermer le menu"
            >
              <div className="brand-logo-wrapper">
                <img src={sitelogo} alt="Logo" className="brand-logo" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
              {isExpanded && (
                <div className="brand-text">
                  <p className="brand-title">Orange Digital</p>
                  <p className="brand-subtitle">Center</p>
                </div>
              )}
            </button>

            <div className="sidebar-divider"></div>

            <nav className="sidebar-nav">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    title={!isExpanded ? link.label : ''}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    {isActive && <span className="active-indicator"></span>}
                    <i className={`${link.icon} nav-icon`}></i>
                    {isExpanded && <span className="nav-label">{link.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="sidebar-bottom" ref={desktopProfileRef}>
            <div className="sidebar-divider"></div>

            <button
              type="button"
              onClick={() => setIsDesktopProfileMenuOpen((open) => !open)}
              aria-expanded={isDesktopProfileMenuOpen}
              aria-label="Ouvrir le menu du compte"
              title="Compte et préférences"
              className={`profile-trigger-btn ${isExpanded ? 'expanded' : 'collapsed'}`}
            >
              {getAvatarSrc(user) ? (
                <img src={getAvatarSrc(user)} alt="Avatar" className="user-avatar" />
              ) : (
                <span className="user-initials">
                  {initials || <i className="bi bi-person" />}
                </span>
              )}
              {isExpanded && (
                <span className="user-info-text">
                  <span className="user-name">{user?.prenom} {user?.nom}</span>
                  <span className="user-role">{user?.role || 'Utilisateur'}</span>
                </span>
              )}
              {isExpanded && <i className={`bi bi-chevron-${isDesktopProfileMenuOpen ? 'down' : 'up'} chevron-icon`} />}
            </button>

            {isDesktopProfileMenuOpen && (
              <div className={`desktop-dropdown-menu ${isExpanded ? 'align-left' : 'align-right'}`}>
                <div className="dropdown-header">
                  <p className="dropdown-user-name">{user?.prenom} {user?.nom}</p>
                  <p className="dropdown-user-email">{user?.email}</p>
                </div>

                <Link
                  to="/profil"
                  onClick={() => setIsDesktopProfileMenuOpen(false)}
                  className="dropdown-item"
                >
                  <i className="bi bi-person dropdown-item-icon" />
                  <span className="dropdown-item-text">Mon profil</span>
                  <i className="bi bi-arrow-up-right dropdown-arrow" />
                </Link>

                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="dropdown-item"
                >
                  <i className={`bi ${darkMode ? 'bi-sun' : 'bi-moon-stars'} dropdown-item-icon orange-icon`} />
                  <span className="dropdown-item-text">Passer en mode {darkMode ? 'clair' : 'sombre'}</span>
                  <span className="theme-badge">{darkMode ? 'Dark' : 'Light'}</span>
                </button>

                <div className="dropdown-divider" />
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="dropdown-item logout-item"
                >
                  <i className="bi bi-box-arrow-right dropdown-item-icon" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* CONTENU PRINCIPAL */}
      <div className={`main-content-wrapper ${isAuthenticated ? 'authenticated' : ''}`}>
        <main className="main-scroll-area">
          <Outlet />
        </main>
      </div>

      {/* NAVBAR MOBILE / TABLETTE */}
      {isAuthenticated && (
        <div className="mobile-nav-container" ref={mobileMenuRef}>
          {isProfileMenuOpen && (
            <div className="mobile-dropdown-menu">
              <div className="dropdown-header">
                <p className="dropdown-user-name">{user?.prenom} {user?.nom}</p>
                <p className="dropdown-user-email">{user?.email}</p>
              </div>

              <Link 
                to="/profil" 
                onClick={() => setIsProfileMenuOpen(false)}
                className="dropdown-item"
              >
                <i className="bi bi-person dropdown-item-icon"></i> Mon Profil
              </Link>

              <button 
                onClick={toggleDarkMode} 
                className="dropdown-item space-between"
              >
                <span className="flex-center-gap">
                  <i className={`bi ${darkMode ? 'bi-moon-stars' : 'bi-sun'} dropdown-item-icon orange-icon`}></i> 
                  Mode {darkMode ? 'Sombre' : 'Clair'}
                </span>
                <span className={`theme-badge ${darkMode ? 'dark' : 'light'}`}>
                  {darkMode ? 'Dark' : 'Light'}
                </span>
              </button>

              <div className="dropdown-divider"></div>

              <button 
                onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} 
                className="dropdown-item logout-item"
              >
                <i className="bi bi-box-arrow-right dropdown-item-icon"></i> Déconnexion
              </button>
            </div>
          )}

          <nav className="mobile-dock">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsProfileMenuOpen(false)}
                  className={`mobile-dock-item ${isActive ? 'active' : ''}`}
                >
                  <i className={`${link.icon} mobile-icon ${isActive ? 'orange-text' : ''}`}></i>
                  {isActive && <span className="mobile-label">{link.label}</span>}
                </Link>
              );
            })}

            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`mobile-dock-item ${isProfileMenuOpen ? 'active' : ''}`}
            >
              {getAvatarSrc(user) ? (
                <img src={getAvatarSrc(user)} alt="Profil" className="mobile-avatar" />
              ) : (
                <i className="bi bi-person mobile-icon"></i>
              )}
              {isProfileMenuOpen && <span className="mobile-label">Profil</span>}
            </button>
          </nav>
        </div>
      )}

    </div>
  );
}