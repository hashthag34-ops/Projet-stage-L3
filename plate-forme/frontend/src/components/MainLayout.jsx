// frontend/src/components/MainLayout.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { getAuthUser, logout as logoutService } from '../services/authService';
import { connectRealtime } from '../services/realtime';
import API from '../services/api';
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
    { path: '/Responsable/Forum', label: 'Forum', icon: 'bi-chat-left-text' },
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
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewNote, setReviewNote] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const mobileMenuRef = useRef(null);
  const desktopProfileRef = useRef(null);

  useEffect(() => {
    setUser(getAuthUser());
    setIsProfileMenuOpen(false);
    setIsDesktopProfileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const socket = connectRealtime();
    const handleAccountDisabled = () => {
      logoutService();
      navigate('/login', { replace: true, state: { message: 'Votre compte a été désactivé ou suspendu.' } });
    };
    socket.on('account:disabled', handleAccountDisabled);
    return () => {
      socket.off('account:disabled', handleAccountDisabled);
      socket.disconnect();
    };
  }, [user?.id_utilisateur, navigate]);

  const currentPendingReview = pendingReviews[0] || null;

  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'APPRENANT') {
      setPendingReviews([]);
      return;
    }

    API.get('/formations/avis-en-attente')
      .then((response) => {
        setPendingReviews(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        setPendingReviews([]);
      });
  }, [user?.id_utilisateur, user?.role]);

  const submitMandatoryReview = async (event) => {
    event.preventDefault();
    if (!currentPendingReview || !reviewComment.trim()) return;

    setReviewSubmitting(true);
    setReviewError('');
    try {
      await API.post(`/formations/${currentPendingReview.id_formation}/avis`, {
        note: reviewNote,
        commentaire: reviewComment.trim(),
      });
      setPendingReviews((reviews) =>
        reviews.filter((review) => review.id_formation !== currentPendingReview.id_formation)
      );
      setReviewNote(5);
      setReviewComment('');
    } catch (error) {
      setReviewError(error.response?.data?.message || "Impossible de publier votre avis.");
    } finally {
      setReviewSubmitting(false);
    }
  };

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
    <div className={`flex h-dvh w-full overflow-hidden bg-zinc-100 p-2.5 text-zinc-900 md:p-0 dark:bg-zinc-950 dark:text-zinc-100 ${darkMode ? 'dark' : ''}`}>
      {currentPendingReview && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mandatory-review-title"
        >
          <form
            onSubmit={submitMandatoryReview}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 shadow-2xl dark:bg-zinc-900"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
              <i className="bi bi-star-fill"></i>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Avis obligatoire
            </p>
            <h2 id="mandatory-review-title" className="mt-1 text-lg text-slate-900 dark:text-white">
              Votre formation est terminée
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              Partagez votre avis sur « {currentPendingReview.titre} » pour continuer sur la plateforme.
            </p>

            <div className="mt-5">
              <span className="mb-2 block text-xs text-slate-700 dark:text-zinc-300">Votre note</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewNote(star)}
                    aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                    className="text-2xl"
                  >
                    <i className={`bi ${reviewNote >= star ? 'bi-star-fill text-amber-400' : 'bi-star text-slate-300 dark:text-zinc-700'}`}></i>
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 block text-xs text-slate-700 dark:text-zinc-300">
              Votre commentaire
              <textarea
                required
                minLength={1}
                maxLength={2000}
                rows={4}
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="Qu’avez-vous pensé de cette formation ?"
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </label>

            {reviewError && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 p-2 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                {reviewError}
              </p>
            )}

            <button
              type="submit"
              disabled={reviewSubmitting || !reviewComment.trim()}
              className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 text-xs text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reviewSubmitting ? 'Publication...' : 'Publier mon avis et continuer'}
            </button>
          </form>
        </div>
      )}
      
      {/* SIDEBAR DESKTOP */}
      {isAuthenticated && (
        <aside className={`hidden md:my-1 md:flex md:h-[calc(100%-0.5rem)] md:flex-col md:justify-between md:rounded-l-none md:rounded-r-[20px] md:border-y md:border-r md:border-l-0 md:border-zinc-200 md:bg-white md:p-2 md:shadow-[0_4px_20px_rgba(0,0,0,0.05)] md:transition-[width] md:duration-300 dark:md:border-zinc-800 dark:md:bg-zinc-900 ${isExpanded ? 'md:w-60' : 'md:w-[72px]'}`}>
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-1.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Dérouler / Fermer le menu"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl">
                <img src={sitelogo} alt="Logo" className="h-9 w-9 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
              {isExpanded && (
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">Orange Digital</p>
                  <p className="text-xs text-orange-500">Center</p>
                </div>
              )}
            </button>

            <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800"></div>

            <nav className="flex flex-col gap-1.5">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    title={!isExpanded ? link.label : ''}
                    className={`relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${isExpanded ? '' : 'justify-center'} ${isActive ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'}`}
                  >
                    {isActive && <span className="absolute right-0 h-5 w-1 rounded-l-full bg-orange-500"></span>}
                    <i className={`${link.icon} text-lg`}></i>
                    {isExpanded && <span className="truncate font-medium">{link.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="relative" ref={desktopProfileRef}>
            <div className="mb-2 h-px w-full bg-zinc-200 dark:bg-zinc-800"></div>

            <button
              type="button"
              onClick={() => setIsDesktopProfileMenuOpen((open) => !open)}
              aria-expanded={isDesktopProfileMenuOpen}
              aria-label="Ouvrir le menu du compte"
              title="Compte et préférences"
              className={`flex w-full items-center rounded-xl p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${isExpanded ? 'gap-3 text-left' : 'justify-center'}`}
            >
              {getAvatarSrc(user) ? (
                <img src={getAvatarSrc(user)} alt="Avatar" className="size-9 shrink-0 rounded-full object-cover ring-2 ring-orange-100 dark:ring-orange-500/20" />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
                  {initials || <i className="bi bi-person" />}
                </span>
              )}
              {isExpanded && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-zinc-900 dark:text-white">{user?.prenom} {user?.nom}</span>
                  <span className="block truncate text-[10px] capitalize text-zinc-500 dark:text-zinc-400">{user?.role || 'Utilisateur'}</span>
                </span>
              )}
              {isExpanded && <i className={`bi bi-chevron-${isDesktopProfileMenuOpen ? 'down' : 'up'} text-xs text-zinc-400`} />}
            </button>

            {isDesktopProfileMenuOpen && (
              <div className={`absolute bottom-14 z-[70] w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 ${isExpanded ? 'left-0' : 'left-14'}`}>
                <div className="border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{user?.prenom} {user?.nom}</p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</p>
                </div>

                <Link
                  to="/profil"
                  onClick={() => setIsDesktopProfileMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <i className="bi bi-person text-base text-zinc-400" />
                  <span className="flex-1">Mon profil</span>
                  <i className="bi bi-arrow-up-right text-xs text-zinc-400" />
                </Link>

                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <i className={`bi ${darkMode ? 'bi-sun' : 'bi-moon-stars'} text-base text-orange-500`} />
                  <span className="flex-1">Passer en mode {darkMode ? 'clair' : 'sombre'}</span>
                  <span className="rounded-md bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">{darkMode ? 'Dark' : 'Light'}</span>
                </button>

                <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <i className="bi bi-box-arrow-right text-base" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* CONTENU PRINCIPAL */}
      <div className={`min-w-0 flex-1 overflow-hidden rounded-none sm:rounded-[18px] ${isAuthenticated ? 'pb-[76px] md:pb-0' : ''}`}>
        <main className="h-full w-full overflow-y-auto overflow-x-hidden bg-zinc-50 dark:bg-zinc-950">
          <Outlet />
        </main>
      </div>

      {/* NAVBAR MOBILE / TABLETTE */}
      {isAuthenticated && (
        <div className="fixed inset-x-0 bottom-0 z-[60] p-2 md:hidden" ref={mobileMenuRef}>
          {isProfileMenuOpen && (
            <div className="absolute bottom-[76px] right-3 left-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
              <div className="border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{user?.prenom} {user?.nom}</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</p>
              </div>

              <Link 
                to="/profil" 
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <i className="bi bi-person text-base text-zinc-400"></i> Mon Profil
              </Link>

              <button 
                onClick={toggleDarkMode} 
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <span className="flex items-center gap-3">
                  <i className={`bi ${darkMode ? 'bi-moon-stars' : 'bi-sun'} text-base text-orange-500`}></i> 
                  Mode {darkMode ? 'Sombre' : 'Clair'}
                </span>
                <span className="rounded-md bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
                  {darkMode ? 'Dark' : 'Light'}
                </span>
              </button>

              <div className="my-1 h-px bg-zinc-100 dark:bg-zinc-800"></div>

              <button 
                onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }} 
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
              >
                <i className="bi bi-box-arrow-right text-base"></i> Déconnexion
              </button>
            </div>
          )}

          <nav className="mx-auto flex h-16 max-w-lg items-center justify-around rounded-2xl border border-zinc-200 bg-white px-1 shadow-[0_8px_30px_rgba(0,0,0,0.16)] dark:border-zinc-700 dark:bg-zinc-900">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsProfileMenuOpen(false)}
                  className={`flex h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition ${isActive ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : 'text-zinc-400'}`}
                >
                  <i className={`${link.icon} text-lg`}></i>
                  {isActive && <span className="max-w-14 truncate text-[9px] font-semibold">{link.label}</span>}
                </Link>
              );
            })}

            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className={`flex h-12 min-w-12 flex-col items-center justify-center rounded-xl px-2 transition ${isProfileMenuOpen ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : 'text-zinc-400'}`}
            >
              {getAvatarSrc(user) ? (
                <img src={getAvatarSrc(user)} alt="Profil" className="size-6 rounded-full object-cover" />
              ) : (
                <i className="bi bi-person text-lg"></i>
              )}
              {isProfileMenuOpen && <span className="mt-0.5 text-[9px] font-semibold">Profil</span>}
            </button>
          </nav>
        </div>
      )}

    </div>
  );
}