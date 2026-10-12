// frontend/src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import API from '../services/api';
import bglogin from '../assets/bglogin.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Synchronisation du mode sombre avec le reste de l'application
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await API.post('/auth/login', { email, mot_de_passe: motDePasse });

      // Stockage de la session
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      const role = res.data.user.role;

      // Redirection dynamique selon le rôle
      if (role === 'APPRENANT') {
        navigate('/apprenant/catalogue');
      } else if (role === 'RESPONSABLE') {
        navigate('/Responsable/GsFormation');
      } else if (role === 'FORMATEUR') {
        navigate('/Formateur');
      } else if (role === 'ADMINISTRATEUR') {
        navigate('/Admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative w-full min-h-screen  flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat font-['Plus_Jakarta_Sans',sans-serif]"
      style={{ backgroundImage: `url(${bglogin})` }}
    >
      {/* Importation de la police */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}
      </style>

      {/* Superposition / Overlay adaptatif pour lisibilité (Sombre/Clair) */}
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] dark:bg-black/60 transition-colors duration-300" />

      {/* Carte de Connexion Flottante */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/40 bg-white/80 p-8 shadow-2xl backdrop-blur-xl transition-all dark:border-zinc-800/80 dark:bg-zinc-950/80 sm:p-10">
        
        {/* En-tête de la Carte */}
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Connexion
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            Veuillez saisir vos identifiants pour accéder à votre compte
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Champ Email */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 ml-1">
              Adresse Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 py-3.5 pl-11 pr-4 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-orange-500 dark:focus:bg-zinc-900"
              />
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                Mot de passe
              </label>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 py-3.5 pl-11 pr-11 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-orange-500 dark:focus:bg-zinc-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Bouton de Soumission */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 dark:text-slate-950 dark:hover:bg-orange-400"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Connexion...</span>
              </>
            ) : (
              <>
                <span>Se connecter</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Lien de redirection secondaire */}
        <div className="mt-8 text-center text-xs font-semibold text-slate-500 dark:text-zinc-400">
          Nouveau sur la plateforme ?{' '}
          <Link 
            to="/" 
            className="font-bold text-orange-600 hover:underline dark:text-orange-400"
          >
            Découvrir le catalogue
          </Link>
        </div>

      </div>
    </div>
  );
}