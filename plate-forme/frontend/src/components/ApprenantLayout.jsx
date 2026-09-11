// frontend/src/components/ApprenantLayout.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  User, 
  LogOut, 
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

const getAvatarSrc = (user) => {
  const avatar = user.photo_profil || user.photo;
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:')) return avatar;
  return `${BACKEND_URL}/uploads/avatars/${avatar}`;
};

export default function ApprenantLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Gestion du Mode Sombre (Persistance via localStorage + Détection système)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('theme');
    if (savedMode) {
      return savedMode === 'dark';
    }
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

  // Récupération des informations de l'apprenant connecté
  const user = JSON.parse(localStorage.getItem('user')) || {
    nom: 'Apprenant',
    prenom: 'Eleve',
    email: 'apprenant@plateforme.com',
    photo: null
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Fermer le menu déroulant lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermer le menu lors d'un changement de route
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location]);

  // Liens de navigation sans le lien direct "Profil"
  const navItems = [
    { label: 'Catalogue', path: '/apprenant/catalogue', icon: BookOpen },
    { label: 'Mon Planning', path: '/apprenant/planning', icon: Calendar },
    { label: 'Forum', path: '/apprenant/forum', icon: MessageSquare },
  ];

  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'A';

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-black transition-colors duration-300 dark:bg-black dark:text-white">
      {/* Navbar supérieure */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 shadow-sm backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-black/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Brand / Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl font-black text-black shadow-sm">
                A
              </div>
              <span className="text-lg font-bold tracking-tight">
                Espace <span className="text-orange-500">Apprenant</span>
              </span>
            </div>

            {/* Navigation principale */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                        : 'text-black/65 hover:bg-black/5 hover:text-orange-600 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-orange-400'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-black' : 'text-black/45 dark:text-white/45'} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Profil, Toggle Mode Sombre & Déconnexion */}
            <div className="flex items-center gap-2">
              {/* Bouton Toggle Light / Dark Mode */}
              <button
                onClick={toggleDarkMode}
                aria-label="Basculer le thème"
                className="rounded-xl p-2 text-black/60 transition hover:bg-black/5 hover:text-orange-600 focus:outline-none dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-orange-400"
              >
                {darkMode ? <Sun size={20} className="text-orange-500" /> : <Moon size={20} className="text-orange-600" />}
              </button>

              {/* Menu Profil avec Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 rounded-xl border border-transparent p-1.5 transition hover:border-black/10 hover:bg-black/5 focus:outline-none dark:hover:border-white/10 dark:hover:bg-white/10"
                >
                  {getAvatarSrc(user) ? (
                    <img
                      src={getAvatarSrc(user)}
                      alt="Profil"
                      className="w-9 h-9 rounded-lg object-cover ring-2 ring-orange-500"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-bold text-orange-500 shadow-sm ring-2 ring-orange-500/40 dark:bg-zinc-900">
                      {initials}
                    </div>
                  )}

                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold leading-tight">
                      {user.prenom} {user.nom}
                    </p>
                    <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      Apprenant
                    </p>
                  </div>

                  <ChevronDown size={16} className={`text-black/40 transition-transform duration-200 dark:text-white/40 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Menu Déroulant */}
                {isDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 animate-in slide-in-from-top-2 rounded-xl border border-black/10 bg-white py-2 shadow-xl duration-150 fade-in dark:border-white/10 dark:bg-zinc-950">
                    <div className="border-b border-black/10 px-4 py-2 dark:border-white/10 sm:hidden">
                      <p className="text-xs font-bold">{user.prenom} {user.nom}</p>
                      <p className="text-[10px] text-black/50 dark:text-white/50">{user.email}</p>
                    </div>

                    <Link
                      to="/apprenant/profil"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-black/70 transition hover:bg-orange-500/10 hover:text-orange-600 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-orange-400"
                    >
                      <User size={16} className="text-orange-500" />
                      Gestion du Profil
                    </Link>

                    <div className="my-1 border-t border-black/10 dark:border-white/10"></div>

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-black/70 transition hover:bg-orange-500/10 hover:text-orange-600 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-orange-400"
                    >
                      <LogOut size={16} className="text-orange-500" />
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Contenu dynamique des pages */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}