// frontend/src/pages/Profil.jsx
import { useEffect, useState } from 'react';
import { 
  Pencil, 
  QrCode, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Save, 
  LoaderCircle, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download 
} from 'lucide-react';
import API from '../services/api';

const BACKEND_URL = 'http://localhost:5000';

const getImageUrl = (value) => {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
  return `${BACKEND_URL}/uploads/avatars/${value}`;
};

const inputClass = 'w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-3 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-orange-500 dark:focus:bg-zinc-900 dark:focus:ring-orange-500/15';

const disabledInputClass = 'w-full cursor-not-allowed rounded-xl border border-zinc-200/60 bg-zinc-100/70 py-3 pl-10 pr-4 text-sm text-zinc-500 dark:border-zinc-800/60 dark:bg-zinc-900/30 dark:text-zinc-500';

const labelClass = 'block mb-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300';

export default function Profil() {
  const [profile, setProfile] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    age: '',
    photo_profil: '',
    qr_code: '',
    role: ''
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    API.get('/auth/me')
      .then((res) => {
        setProfile(res.data);
      })
      .catch((err) => {
        console.error("Erreur profil :", err);
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setProfile((prev) => ({ ...prev, ...storedUser }));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('nom', profile.nom || '');
      formData.append('prenom', profile.prenom || '');
      formData.append('telephone', profile.telephone || '');
      formData.append('age', profile.age || '');

      if (selectedFile) {
        formData.append('avatar', selectedFile);
      }

      const res = await API.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedProfile = { 
        ...profile, 
        ...res.data.user,
        photo_profil: res.data.photo_profil || profile.photo_profil 
      };
      
      setProfile(updatedProfile);
      setPreview(null);

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updatedProfile }));

      setMessage({ type: 'success', text: 'Votre profil a été mis à jour avec succès !' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de la mise à jour' });
    } finally {
      setSaving(false);
    }
  };

  const getAvatarSrc = () => {
    if (preview) return preview;
    if (profile.photo_profil) return getImageUrl(profile.photo_profil);
    return null;
  };

  const initials = `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}`.toUpperCase() || 'U';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm font-semibold text-zinc-500">
          <LoaderCircle size={22} className="animate-spin text-orange-500" />
          <span>Chargement de votre profil...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      
      {/* Toast Notification */}
      {message.text && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md ${
            message.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200'
              : 'border-rose-500/20 bg-rose-500/10 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <div className="flex-1 text-sm font-medium leading-relaxed">{message.text}</div>
            <button 
              onClick={() => setMessage({ type: '', text: '' })} 
              className="rounded-lg p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Carte d'en-tête de profil */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-none sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          
          <div className="flex items-center gap-5">
            {/* Avatar & Édition */}
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-orange-500/30 bg-orange-500/10 text-2xl font-black text-orange-600 ring-4 ring-orange-500/10 dark:text-orange-400">
                {getAvatarSrc() ? (
                  <img src={getAvatarSrc()} alt="Profil" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <label
                htmlFor="profile-photo"
                title="Modifier la photo"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-orange-500 text-black shadow-md transition-transform hover:scale-105 active:scale-95"
              >
                <Pencil size={14} />
                <input id="profile-photo" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            {/* Informations principales */}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                {profile.prenom} {profile.nom}
              </h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{profile.email}</p>
              
              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-0.5 text-xs font-bold text-orange-600 dark:text-orange-400">
                  <ShieldCheck size={13} />
                  {(profile.role || 'UTILISATEUR').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Bouton QR Code */}
          {profile.qr_code && (
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-xs font-bold text-white shadow-lg transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-orange-500 dark:text-black dark:hover:bg-orange-400"
            >
              <QrCode size={16} />
              <span>Mon Badge QR</span>
            </button>
          )}

        </div>
      </div>

      {/* Formulaire d'édition */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/40 dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-none sm:p-8">
          
          <h2 className="mb-6 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Informations personnelles
          </h2>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            
            {/* Prénom */}
            <div>
              <label className={labelClass}>Prénom</label>
              <div className="relative">
                <User size={17} className="absolute left-3.5 top-3.5 text-zinc-400" />
                <input
                  type="text"
                  name="prenom"
                  value={profile.prenom || ''}
                  onChange={handleChange}
                  placeholder="Jean"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Nom */}
            <div>
              <label className={labelClass}>Nom</label>
              <div className="relative">
                <User size={17} className="absolute left-3.5 top-3.5 text-zinc-400" />
                <input
                  type="text"
                  name="nom"
                  value={profile.nom || ''}
                  onChange={handleChange}
                  placeholder="Dupont"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email (Lecture seule) */}
            <div>
              <label className={labelClass}>Adresse Email (non modifiable)</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-3.5 text-zinc-400 dark:text-zinc-600" />
                <input
                  type="email"
                  disabled
                  value={profile.email || ''}
                  className={disabledInputClass}
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label className={labelClass}>Téléphone</label>
              <div className="relative">
                <Phone size={17} className="absolute left-3.5 top-3.5 text-zinc-400" />
                <input
                  type="text"
                  name="telephone"
                  value={profile.telephone || ''}
                  onChange={handleChange}
                  placeholder="+33 6 12 34 56 78"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Âge */}
            <div>
              <label className={labelClass}>Âge</label>
              <div className="relative">
                <Calendar size={17} className="absolute left-3.5 top-3.5 text-zinc-400" />
                <input
                  type="number"
                  name="age"
                  value={profile.age || ''}
                  onChange={handleChange}
                  placeholder="25"
                  className={inputClass}
                />
              </div>
            </div>

          </div>

          {/* Bouton de soumission */}
          <div className="mt-8 flex justify-end border-t border-zinc-100 pt-6 dark:border-zinc-800/80">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
            </button>
          </div>

        </div>
      </form>

      {/* MODAL BADGE QR CODE */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 text-center shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            >
              <X size={18} />
            </button>

            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
              <QrCode size={24} />
            </div>

            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Badge d'Accès</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Présentez ce QR code pour confirmer votre présence.
            </p>

            <div className="my-6 inline-block rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <img 
                src={profile.qr_code} 
                alt="Badge QR Code" 
                className="h-48 w-48 mx-auto rounded-lg object-contain"
              />
            </div>

            <div className="mb-6">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{profile.prenom} {profile.nom}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{profile.email}</p>
            </div>

            <div className="flex gap-2">
              <a
                href={profile.qr_code}
                download={`QR_Badge_${profile.prenom}_${profile.nom}.png`}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <Download size={15} /> Télécharger
              </a>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex-1 rounded-xl bg-orange-500 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}