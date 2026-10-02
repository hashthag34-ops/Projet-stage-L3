// frontend/src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Mail, Lock, Eye, EyeOff, Sun, Moon, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import API from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

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
    <div className="relative min-h-screen bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white flex flex-col justify-between overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Import de la police Plus Jakarta Sans */}
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}
      </style>

      {/* Halo d'ambiance en arrière-plan pour un effet de fusion */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl dark:bg-orange-500/15" />

      {/* Section Principale (Formulaire Fusionné) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          
          {/* Titre & Sous-titre */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-black dark:text-white">
              Bienvenue
            </h1>
            <p className="text-xs font-medium text-black/50 dark:text-white/50">
              Connectez-vous pour accéder à votre espace formation
            </p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl bg-orange-500/10 p-3.5 text-xs font-semibold text-orange-700 dark:text-orange-400 backdrop-blur-sm border border-orange-500/20">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire sans conteneur rigide */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Champ Email */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 ml-1">
                Adresse Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full rounded-2xl bg-black/5 dark:bg-white/5 pl-11 pr-4 py-3.5 text-sm font-medium focus:bg-black/[0.08] dark:focus:bg-white/10 focus:outline-none ring-2 ring-transparent focus:ring-orange-500/50 transition-all placeholder:text-black/30 dark:placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 ml-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl bg-black/5 dark:bg-white/5 pl-11 pr-11 py-3.5 text-sm font-medium focus:bg-black/[0.08] dark:focus:bg-white/10 focus:outline-none ring-2 ring-transparent focus:ring-orange-500/50 transition-all placeholder:text-black/30 dark:placeholder:text-white/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black/30 hover:text-black dark:text-white/30 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={loading}
              className="pt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-sm font-bold text-black shadow-lg shadow-orange-500/25 hover:bg-orange-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Connexion en cours...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Lien de redirection */}
          <div className="pt-2 text-center text-xs font-medium text-black/50 dark:text-white/50">
            Pas encore inscrit ?{' '}
            <Link 
              to="/" 
              className="font-bold text-orange-500 hover:underline"
            >
              Consulter nos formations
            </Link>
          </div>
        </div>
      </main>

      {/* Footer minimaliste sans bordure supérieure */}
      <footer className="relative z-10 py-6 text-center text-xs text-black/30 dark:text-white/30 font-medium">
        &copy; {new Date().getFullYear()} Forma. Tous droits réservés.
      </footer>
    </div>
  );
}