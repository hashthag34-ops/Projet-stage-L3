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

const URL_AVATAR = import.meta.env.VITE_URLTEST_AVATAR;

const getImageUrl = (value) => {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
  return `${URL_AVATAR}/uploads/avatars/${value}`;
};

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600';

const disabledInputClass =
  'w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-500';

const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-zinc-300';

const iconClass = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500';

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
        console.error('Erreur profil :', err);
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
      setSelectedFile(null);

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
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-zinc-400">
          <LoaderCircle size={20} className="animate-spin text-orange-500" />
          <span>Chargement de votre profil…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 font-sans text-slate-900 sm:px-6 dark:text-zinc-100">

      {/* Notification */}
      {message.text && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className="fixed inset-x-4 top-4 z-50 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-96"
        >
          <div
            className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg dark:bg-zinc-900 ${
              message.type === 'success'
                ? 'border-emerald-200 dark:border-emerald-500/30'
                : 'border-red-200 dark:border-red-500/30'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <p className="flex-1 text-sm text-slate-700 dark:text-zinc-200">{message.text}</p>
            <button
              type="button"
              aria-label="Fermer la notification"
              onClick={() => setMessage({ type: '', text: '' })}
              className={`rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${focusRing}`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-5">

        {/* Carte identité */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-orange-50 text-2xl font-semibold text-orange-600 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/30">
                  {getAvatarSrc() ? (
                    <img src={getAvatarSrc()} alt="Photo de profil" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <label
                  htmlFor="profile-photo"
                  title="Modifier la photo"
                  className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-orange-500 text-white ring-2 ring-white transition hover:bg-orange-600 focus-within:ring-orange-300 dark:text-slate-950 dark:ring-zinc-900 dark:hover:bg-orange-400"
                >
                  <Pencil size={13} />
                  <span className="sr-only">Modifier la photo de profil</span>
                  <input id="profile-photo" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                </label>
              </div>

              {/* Identité */}
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  {profile.prenom} {profile.nom}
                </h1>
                <p className="mt-0.5 break-all text-sm text-slate-500 dark:text-zinc-400">{profile.email}</p>
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium capitalize text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20">
                  <ShieldCheck size={12} />
                  {(profile.role || 'Utilisateur').toLowerCase()}
                </span>
                {preview && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">
                    Nouvelle photo sélectionnée. Enregistrez pour la conserver.
                  </p>
                )}
              </div>
            </div>

            {/* Badge QR */}
            {profile.qr_code && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-orange-400 hover:text-orange-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-orange-500 dark:hover:text-orange-400 sm:w-auto ${focusRing}`}
              >
                <QrCode size={16} />
                Mon badge QR
              </button>
            )}
          </div>
        </section>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Informations personnelles</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-zinc-400">
            Mettez à jour vos coordonnées.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">

            <div>
              <label htmlFor="prenom" className={labelClass}>Prénom</label>
              <div className="relative">
                <User size={16} className={iconClass} />
                <input
                  id="prenom"
                  type="text"
                  name="prenom"
                  autoComplete="given-name"
                  value={profile.prenom || ''}
                  onChange={handleChange}
                  placeholder="Jean"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="nom" className={labelClass}>Nom</label>
              <div className="relative">
                <User size={16} className={iconClass} />
                <input
                  id="nom"
                  type="text"
                  name="nom"
                  autoComplete="family-name"
                  value={profile.nom || ''}
                  onChange={handleChange}
                  placeholder="Dupont"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className={labelClass}>
                Adresse e-mail
                <span className="ml-1.5 font-normal text-slate-400 dark:text-zinc-500">(non modifiable)</span>
              </label>
              <div className="relative">
                <Mail size={16} className={iconClass} />
                <input
                  id="email"
                  type="email"
                  disabled
                  value={profile.email || ''}
                  className={disabledInputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="telephone" className={labelClass}>Téléphone</label>
              <div className="relative">
                <Phone size={16} className={iconClass} />
                <input
                  id="telephone"
                  type="tel"
                  name="telephone"
                  autoComplete="tel"
                  value={profile.telephone || ''}
                  onChange={handleChange}
                  placeholder="+33 6 12 34 56 78"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="age" className={labelClass}>Âge</label>
              <div className="relative">
                <Calendar size={16} className={iconClass} />
                <input
                  id="age"
                  type="number"
                  name="age"
                  inputMode="numeric"
                  min="0"
                  value={profile.age || ''}
                  onChange={handleChange}
                  placeholder="25"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex border-t border-slate-100 pt-5 dark:border-zinc-800 sm:justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 active:scale-[0.99] disabled:opacity-60 dark:text-slate-950 dark:hover:bg-orange-400 sm:w-auto ${focusRing}`}
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal badge QR */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setShowQrModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Badge d'accès"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setShowQrModal(false)}
              className={`absolute right-3 top-3 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 ${focusRing}`}
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Badge d'accès</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
              Présentez ce QR code pour confirmer votre présence.
            </p>

            <div className="mx-auto my-5 w-fit rounded-xl border border-slate-200 bg-white p-3 dark:border-zinc-700">
              <img
                src={profile.qr_code}
                alt="QR code du badge"
                className="h-44 w-44 object-contain sm:h-48 sm:w-48"
              />
            </div>

            <div className="mb-5">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {profile.prenom} {profile.nom}
              </p>
              <p className="break-all text-xs text-slate-500 dark:text-zinc-400">{profile.email}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={profile.qr_code}
                download={`QR_Badge_${profile.prenom}_${profile.nom}.png`}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:border-orange-400 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-orange-500 dark:hover:text-orange-400 ${focusRing}`}
              >
                <Download size={15} /> Télécharger
              </a>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className={`flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
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