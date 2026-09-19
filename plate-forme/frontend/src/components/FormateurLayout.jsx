import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ClipboardCheck, ChevronDown, Home, LogOut, MessageSquare, Moon, Sun, User, Users } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const BACKEND_URL = 'http://localhost:5000';

const getAvatarSrc = (user) => {
  const avatar = user.photo_profil || user.photo;
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:')) return avatar;
  return `${BACKEND_URL}/uploads/avatars/${avatar}`;
};

export default function FormateurLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const close = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const links = [
    { path: '/Formateur', label: 'Accueil', icon: Home, end: true },
    { path: '/Formateur/Planning', label: 'Mon planning', icon: CalendarDays },
    { path: '/Formateur/Apprenants', label: 'Mes apprenants', icon: Users },
    { path: '/Formateur/Evaluations', label: 'Évaluations', icon: ClipboardCheck },
    { path: '/Formateur/Forum', label: 'Messagerie', icon: MessageSquare },
    { path: '/Formateur/Profil', label: 'Mon profil', icon: User }
  ];

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'F';

  return (
    <div className="min-h-screen bg-white font-sans text-black transition-colors dark:bg-black dark:text-white">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/95">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/Formateur" className="flex shrink-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-lg font-black text-black">E</div>
            <span className="hidden text-lg font-bold tracking-tight sm:block">Espace <span className="text-orange-500">Formateur</span></span>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex">
            {links.slice(0, 5).map(({ path, label, icon: Icon, end }) => {
              const active = end ? location.pathname === path : location.pathname.startsWith(path);
              return <Link key={path} to={path} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? 'bg-orange-500 text-black' : 'text-black/65 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10'}`}><Icon size={17} />{label}</Link>;
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode((value) => !value)} className="rounded-xl p-2 text-black/60 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10" aria-label="Changer de thème">{darkMode ? <Sun size={19} /> : <Moon size={19} />}</button>
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setIsDropdownOpen((value) => !value)} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                {getAvatarSrc(user) ? <img src={getAvatarSrc(user)} alt="Profil" className="h-9 w-9 rounded-lg object-cover ring-2 ring-orange-500" /> : <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-bold text-orange-500 ring-2 ring-orange-500/40 dark:bg-zinc-900">{initials}</div>}
                <span className="hidden text-left sm:block"><strong className="block text-xs">{user.prenom} {user.nom}</strong><small className="text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400">Formateur</small></span>
                <ChevronDown size={15} />
              </button>
              {isDropdownOpen && <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-black/10 bg-white py-2 shadow-xl dark:border-white/10 dark:bg-zinc-950"><Link to="/Formateur/Profil" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-orange-500/10"><User size={16} /> Mon profil</Link><button onClick={logout} className="flex w-full items-center gap-2 border-t border-black/10 px-4 py-2.5 text-left text-sm hover:bg-orange-500/10 dark:border-white/10"><LogOut size={16} /> Déconnexion</button></div>}
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-black/5 px-4 py-2 xl:hidden dark:border-white/5 sm:px-6">
          {links.map(({ path, label, icon: Icon, end }) => { const active = end ? location.pathname === path : location.pathname.startsWith(path); return <Link key={path} to={path} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${active ? 'bg-orange-500 text-black' : 'text-black/60 dark:text-white/70'}`}><Icon size={15} />{label}</Link>; })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><Outlet /></main>
    </div>
  );
}