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
        navigate('/Responsable/GsFormation'); // pour le moment on va pas mettre dashboard pour les test
        console.log("Redirection fait");
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
    <div className="relative min-h-screen bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white flex flex-col justify-between">
      {/* Main Form Box */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 shadow-xl dark:border-white/10 dark:bg-zinc-950 transition-all">
          
          {/* Titre & Sous-titre */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight text-black dark:text-white">Bienvenue 👋</h1>
            <p className="text-sm text-black/60 dark:text-white/60 mt-2">
              Connectez-vous pour accéder à votre espace formation
            </p>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm font-medium text-orange-700 dark:text-orange-400">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Champ Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black/70 dark:text-white/70 mb-2">
                Adresse Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full rounded-xl border border-black/15 bg-black/[0.02] pl-10 pr-4 py-3 text-sm focus:border-orange-500 focus:bg-transparent focus:outline-none dark:border-white/15 dark:bg-white/[0.02] dark:focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {/* Champ Mot de passe */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black/70 dark:text-white/70 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-black/15 bg-black/[0.02] pl-10 pr-10 py-3 text-sm focus:border-orange-500 focus:bg-transparent focus:outline-none dark:border-white/15 dark:bg-white/[0.02] dark:focus:border-orange-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Bouton de Soumission */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Lien de bas de carte */}
          <div className="mt-8 border-t border-black/10 pt-6 text-center text-xs text-black/60 dark:border-white/10 dark:text-white/60">
            Pas encore inscrit ?{' '}
            <Link 
              to="/" 
              className="font-bold text-orange-600 hover:underline dark:text-orange-400"
            >
              Consulter nos formations
            </Link>
          </div>
        </div>
      </main>

      {/* Footer minimaliste */}
      <footer className="py-4 text-center text-xs text-black/40 dark:text-white/40 border-t border-black/5 dark:border-white/5">
        &copy; {new Date().getFullYear()} Forma. Tous droits réservés.
      </footer>
    </div>
  );
}