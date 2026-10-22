// frontend/src/pages/SetupAccount.jsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../services/api';

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40';

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 dark:bg-zinc-950 py-2.5 pl-10 pr-10 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 outline-none focus:border-orange-500 transition-colors';

const labelClass = 'mb-1 block text-xs text-slate-600 dark:text-zinc-400';

const iconClass = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 text-xs';

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ type: '', text: '' });

  const initials = (username || 'A').slice(0, 2).toUpperCase();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email && !token) {
      setError('Le lien de configuration est invalide ou incomplet.');
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      if (token) {
        formData.append('token', token);
      } else {
        formData.append('email', email);
      }
      formData.append('username', username);
      formData.append('mot_de_passe', password);
      if (selectedFile) formData.append('avatar', selectedFile);

      await API.post('/auth/setup-account', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setToast({
        type: 'success',
        text: 'Votre compte a été configuré avec succès ! Redirection vers la page de connexion...'
      });

      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la configuration de votre compte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12 font-sans text-slate-800 transition-colors duration-300 dark:bg-black dark:text-zinc-100">
      
      {/* Toast Notification Flottante */}
      {toast.text && (
        <div className="fixed inset-x-4 top-4 z-50 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-96">
          <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-zinc-900 p-3.5 shadow-lg text-xs text-emerald-700 dark:text-emerald-300">
            <i className="bi bi-check-circle text-sm mt-0.5"></i>
            <p className="flex-1">{toast.text}</p>
            <button 
              type="button"
              onClick={() => setToast({ type: '', text: '' })} 
              className={`rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 ${focusRing}`}
            >
              <i className="bi bi-x text-sm"></i>
            </button>
          </div>
        </div>
      )}

      {/* Conteneur de carte principal */}
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        
        {/* En-tête */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/30 sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
            Dernière étape
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Configurez votre compte
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
            {token
              ? 'Vérifiez votre adresse e-mail en finalisant la configuration de votre compte.'
              : 'Personnalisez votre profil et sécurisez votre accès à la plateforme.'}
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6 sm:p-8">
          
          {/* Avatar / Photo de profil (Design identique à Profil.jsx) */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 p-4">
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-orange-500/10 text-lg text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20">
                {preview ? (
                  <img src={preview} alt="Aperçu du profil" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              
              <label 
                htmlFor="profile-photo" 
                title="Modifier la photo" 
                className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-orange-500 text-white shadow transition hover:bg-orange-600"
              >
                <i className="bi bi-pencil text-[10px]"></i>
                <input id="profile-photo" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
              </label>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-zinc-100">Photo de profil</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Format PNG ou JPG recommandé.</p>
              
              {email && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-orange-600 dark:text-orange-400 truncate">
                  <i className="bi bi-envelope shrink-0"></i>
                  <span className="truncate">{email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Champ : Nom d'utilisateur */}
          <div>
            <label className={labelClass}>Nom d'utilisateur *</label>
            <div className="relative">
              <i className={`bi bi-person ${iconClass}`}></i>
              <input 
                type="text" 
                required 
                placeholder="ex: alex_dev"
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass} 
              />
            </div>
          </div>

          {/* Champ : Mot de passe */}
          <div>
            <label className={labelClass}>Créer un mot de passe *</label>
            <div className="relative">
              <i className={`bi bi-lock ${iconClass}`}></i>
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-xs`}></i>
              </button>
            </div>
          </div>

          {/* Affichage des erreurs */}
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3.5 text-xs text-orange-700 dark:text-orange-300">
              <i className="bi bi-exclamation-circle text-sm mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Boutón de validation */}
          <button 
            type="submit" 
            disabled={loading}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-xs text-white transition disabled:opacity-50 shadow-sm ${focusRing}`}
          >
            {loading ? (
              <i className="bi bi-arrow-repeat animate-spin text-sm"></i>
            ) : (
              <i className="bi bi-check2-circle text-sm"></i>
            )}
            {loading ? 'Configuration...' : 'Finaliser mon inscription'}
          </button>

        </form>
      </div>
    </div>
  );
}