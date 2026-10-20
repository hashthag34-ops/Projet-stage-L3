// frontend/src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      const role = res.data.user.role;

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
    <div className="relative w-full min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0b0c10] font-sans transition-colors duration-300">
      
      {/* Carte de Connexion Style Maquette */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-10 shadow-sm text-slate-800 dark:text-zinc-100 transition-all">
        
        {/* En-tête */}
        <div className="text-center space-y-1 mb-6">
          <h1 className="text-2xl text-slate-900 dark:text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-400 dark:text-zinc-400">
            Welcome Back , Please enter Your details
          </p>
        </div>

        {/* Onglets (Sign In / Mot de passe oublié) */}
        <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl mb-6 border border-slate-200/50 dark:border-zinc-800">
          <button 
            type="button" 
            className="flex-1 py-2 text-xs text-slate-900 dark:text-white bg-white dark:bg-zinc-900 rounded-xl shadow-sm transition"
          >
            Sign In
          </button>
          <Link 
            to="/mot-de-passe-oublie" 
            className="flex-1 py-2 text-xs text-center text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition"
          >
            Mot de passe oublié
          </Link>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-700 dark:text-orange-400">
            <i className="bi bi-exclamation-circle text-sm shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Champ Email */}
          <div className="relative flex items-center rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3.5 py-2.5 focus-within:border-orange-500 transition">
            <div className="pr-3 border-r border-slate-200 dark:border-zinc-800 text-slate-400">
              <i className="bi bi-envelope text-sm"></i>
            </div>
            <div className="flex-1 pl-3">
              <label className="block text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre.email@exemple.com"
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
              />
            </div>
            {email && (
              <i className="bi bi-check-circle-fill text-emerald-500 text-sm pl-2"></i>
            )}
          </div>

          {/* Champ Mot de passe */}
          <div className="relative flex items-center rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3.5 py-2.5 focus-within:border-orange-500 transition">
            <div className="pr-3 border-r border-slate-200 dark:border-zinc-800 text-slate-400">
              <i className="bi bi-lock text-sm"></i>
            </div>
            <div className="flex-1 pl-3">
              <label className="block text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition pl-2"
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-sm`}></i>
            </button>
          </div>

          {/* Bouton de Soumission */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-2xl bg-orange-500 hover:bg-orange-600 py-3 text-xs text-white shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin text-sm"></i>
                <span>Connexion...</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>
        </form>

        {/* Lien vers le catalogue en bas du bouton */}
        <div className="mt-6 text-center text-xs text-slate-400 dark:text-zinc-500">
          Envie d'explorer ?{' '}
          <Link to="/" className="text-orange-600 dark:text-orange-400 hover:underline">
            Voir le catalogue
          </Link>
        </div>

      </div>
    </div>
  );
}