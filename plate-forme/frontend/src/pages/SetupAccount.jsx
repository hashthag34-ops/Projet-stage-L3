// frontend/src/pages/SetupAccount.jsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2 } from 'lucide-react';
import API from '../services/api';

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
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
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('username', username);
      formData.append('mot_de_passe', password);
      if (selectedFile) formData.append('avatar', selectedFile);

      await API.post('/auth/setup-account', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("Votre compte a été configuré ! Vous pouvez maintenant vous connecter.");
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de la configuration du compte.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-black transition-colors duration-300 dark:bg-black dark:text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-lg overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_55px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_18px_55px_rgba(0,0,0,0.4)]">
        <div className="border-b border-black/10 bg-black/[0.03] p-6 dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Dernière étape</p>
          <h2 className="text-2xl font-black tracking-tight">Configurez votre compte</h2>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Personnalisez votre profil et sécurisez votre accès à la plateforme.</p>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-5 rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-5 dark:bg-orange-500/10">
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-orange-500 bg-orange-500/15 text-2xl font-black text-orange-700 dark:text-orange-400">
                {preview ? <img src={preview} alt="Aperçu du profil" className="h-full w-full object-cover" /> : initials}
              </div>
              <label htmlFor="profile-photo" title="Modifier la photo de profil" className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-orange-500 text-black shadow-lg transition hover:bg-orange-400"><Camera size={17} /><input id="profile-photo" type="file" accept="image/*" onChange={handleFileChange} className="hidden" /></label>
            </div>
            <div><p className="font-bold">Votre profil</p><p className="mt-1 text-xs leading-5 text-black/55 dark:text-white/55">Ajoutez une photo pour identifier rapidement votre espace.</p><p className="mt-2 text-xs font-semibold text-orange-700 dark:text-orange-400">Compte associé à : {email}</p></div>
          </div>

          <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60">Nom d'utilisateur</label>
          <input 
            type="text" 
            required 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-black/15 bg-black/[0.03] p-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/20 dark:bg-white/[0.04]" 
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60">Créer un mot de passe</label>
          <input 
            type="password" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-black/15 bg-black/[0.03] p-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/20 dark:bg-white/[0.04]" 
          />
        </div>

        {error && <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-700 dark:text-orange-400">{error}</div>}

        <button 
          type="submit" 
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
        >
          <CheckCircle2 size={17} /> Finaliser mon inscription
        </button>
        </div>
      </form>
    </div>
  );
}