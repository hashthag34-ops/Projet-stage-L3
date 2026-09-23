// frontend/src/pages/SetupAccount.jsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Camera, 
  CheckCircle2, 
  User, 
  Lock, 
  AtSign, 
  Eye, 
  EyeOff, 
  LoaderCircle, 
  AlertCircle, 
  X 
} from 'lucide-react';
import API from '../services/api';

const inputClass = 'w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-orange-500 dark:focus:bg-zinc-900 dark:focus:ring-orange-500/15';

const labelClass = 'block mb-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300';

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
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
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('username', username);
      formData.append('mot_de_passe', password);
      if (selectedFile) formData.append('avatar', selectedFile);

      await API.post('/auth/setup-account', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Notification de succès élégante
      setToast({
        type: 'success',
        text: 'Votre compte a été configuré avec succès ! Redirection vers la page de connexion...'
      });

      // Redirection après 2 secondes
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
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 text-zinc-900 transition-colors duration-300 dark:bg-black dark:text-zinc-100">
      
      {/* Toast Notification Flottante */}
      {toast.text && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-xl backdrop-blur-md text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {toast.text}
            </div>
            <button 
              onClick={() => setToast({ type: '', text: '' })} 
              className="rounded-lg p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Conteneur de carte principal */}
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-200/50 dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-none">
        
        {/* En-tête */}
        <div className="border-b border-zinc-100 bg-zinc-50/50 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/30 sm:p-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
            Dernière étape
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Configurez votre compte
          </h1>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Personnalisez votre profil et sécurisez votre accès à la plateforme.
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
          
          {/* Avatar / Photo de profil */}
          <div className="flex items-center gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <div className="relative shrink-0">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-orange-500/30 bg-orange-500/10 text-xl font-black text-orange-600 ring-4 ring-orange-500/5 dark:text-orange-400">
                {preview ? (
                  <img src={preview} alt="Aperçu du profil" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              
              <label 
                htmlFor="profile-photo" 
                title="Modifier la photo" 
                className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-orange-500 text-black shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                <Camera size={15} />
                <input id="profile-photo" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Photo de profil</p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Format PNG ou JPG recommandé.</p>
              
              {email && (
                <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-orange-600 dark:text-orange-400 truncate">
                  <AtSign size={12} className="shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Champ : Nom d'utilisateur */}
          <div>
            <label className={labelClass}>Nom d'utilisateur *</label>
            <div className="relative">
              <User size={17} className="absolute left-3.5 top-3.5 text-zinc-400" />
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
              <Lock size={17} className="absolute left-3.5 top-3.5 text-zinc-400" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-10`} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Affichage des erreurs */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-800 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Bouton de validation */}
          <button 
            type="submit" 
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black shadow-lg shadow-orange-500/25 transition-all duration-200 hover:bg-orange-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            {loading ? 'Configuration...' : 'Finaliser mon inscription'}
          </button>

        </form>
      </div>
    </div>
  );
}