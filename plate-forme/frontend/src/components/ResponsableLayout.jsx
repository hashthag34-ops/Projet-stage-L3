// frontend/src/components/ResponsableLayout.jsx
import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  FileText, 
  Calendar, 
  QrCode, 
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

export default function ResponsableLayout() {
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

  // Récupération de l'utilisateur
  const user = JSON.parse(localStorage.getItem('user')) || {
    nom: 'Responsable',
    prenom: 'Admin',
    email: 'responsable@plateforme.com',
    photo: null
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Fermer le menu si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fermer le menu lors du changement de route
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location]);

  const navLinks = [
    { path: '/Responsable/GsFormation', label: 'Formations', icon: BookOpen },
    { path: '/Responsable/Candidature', label: 'Candidatures', icon: FileText },
    { path: '/Responsable/Planning', label: 'Planning', icon: Calendar },
    { path: '/Responsable/Scan', label: 'Scan Presence', icon: QrCode },
    { path: '/Responsable/Catalogue', label: 'Catalogue', icon: MessageSquare },
  ];

  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'R';

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-black transition-colors duration-300 dark:bg-black dark:text-white">
      {/* Navbar supérieure */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 shadow-sm backdrop-blur transition-colors duration-300 dark:border-white/10 dark:bg-black/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Brand / Logo */}
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl font-black text-black shadow-sm">
                E
              </div>
              <span className="text-lg font-bold tracking-tight">
                Espace <span className="text-orange-500">Responsable</span>
              </span>
            </div>

            {/* Navigation principale */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20'
                        : 'text-black/65 hover:bg-black/5 hover:text-orange-600 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-orange-400'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-black' : 'text-black/45 dark:text-white/45'} />
                    {link.label}
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
                {darkMode ? <Sun size={20} className="text-orange-400" /> : <Moon size={20} className="text-zinc-700" />}
              </button>

              {/* Menu Profil avec Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition focus:outline-none border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
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
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                      {user.prenom} {user.nom}
                    </p>
                    <p className="text-[10px] font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      Responsable
                    </p>
                  </div>

                  <ChevronDown size={16} className={`text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Menu Déroulant */}
                {isDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 animate-in slide-in-from-top-2 rounded-xl border border-black/10 bg-white py-2 shadow-xl duration-150 fade-in dark:border-white/10 dark:bg-zinc-950">
                    <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 sm:hidden">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">{user.prenom} {user.nom}</p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{user.email}</p>
                    </div>

                    <Link
                      to="/Responsable/Profil"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-black/70 transition hover:bg-orange-500/10 hover:text-orange-600 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-orange-400"
                    >
                      <User size={16} className="text-zinc-400" />
                      Gestion du Profil
                    </Link>

                    <div className="border-t border-zinc-100 dark:border-zinc-800 my-1"></div>

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
      <main className="flex-1 py-8 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}