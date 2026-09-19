import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, Moon, ShieldCheck, Sun, User, Users } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';
const getAvatarSrc = (user) => {
  const avatar = user.photo_profil || user.photo;
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:')) return avatar;
  return `${BACKEND_URL}/uploads/avatars/${avatar}`;
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'A';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const close = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); };
  const links = [{ path: '/Admin/dashboard', label: 'Comptes utilisateurs', icon: Users }];

  return <div className="flex min-h-screen flex-col bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white">
    <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-black shadow-sm"><ShieldCheck size={21} /></div><span className="text-lg font-bold tracking-tight">Espace <span className="text-orange-500">Administrateur</span></span></div>
        <nav className="hidden items-center gap-1 md:flex">{links.map(({ path, label, icon: Icon }) => <Link key={path} to={path} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${location.pathname === path ? 'bg-orange-500 text-black shadow-md shadow-orange-500/20' : 'text-black/65 hover:bg-black/5 hover:text-orange-600 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-orange-400'}`}><Icon size={18} />{label}</Link>)}</nav>
        <div className="flex items-center gap-2"><button onClick={() => setDarkMode((value) => !value)} title={darkMode ? 'Mode clair' : 'Mode sombre'} aria-label="Basculer le thème" className="rounded-xl p-2 text-orange-600 transition hover:bg-black/5 dark:text-orange-400 dark:hover:bg-white/10">{darkMode ? <Sun size={19} /> : <Moon size={19} />}</button><div className="relative" ref={dropdownRef}><button onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 transition hover:border-black/10 hover:bg-black/5 dark:hover:border-white/10 dark:hover:bg-white/10">{getAvatarSrc(user) ? <img src={getAvatarSrc(user)} alt="Profil administrateur" className="h-9 w-9 rounded-lg object-cover ring-2 ring-orange-500" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-sm font-bold text-orange-500 ring-2 ring-orange-500/40 dark:bg-zinc-900">{initials}</span>}<span className="hidden text-left sm:block"><strong className="block text-xs">{user.prenom} {user.nom}</strong><small className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Administrateur</small></span><ChevronDown size={15} className={open ? 'rotate-180' : ''} /></button>{open && <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-black/10 bg-white py-2 shadow-xl dark:border-white/10 dark:bg-zinc-950"><Link to="/Admin/dashboard" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400"><LayoutDashboard size={16} /> Gestion des comptes</Link><Link to="/Admin/Profil" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400"><User size={16} /> Gestion du profil</Link><button onClick={logout} className="flex w-full items-center gap-2 border-t border-black/10 px-4 py-2.5 text-left text-sm font-semibold hover:bg-orange-500/10 hover:text-orange-600 dark:border-white/10 dark:hover:text-orange-400"><LogOut size={16} /> Déconnexion</button></div>}</div></div>
      </div>
    </header>
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8"><Outlet /></main>
  </div>;
}