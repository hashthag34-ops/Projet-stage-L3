// frontend/src/pages/Profil.jsx
import { useEffect, useState } from 'react';
import API from '../services/api';

const URL_AVATAR = import.meta.env.VITE_URL;

const getImageUrl = (value) => {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
  return `${URL_AVATAR}/uploads/avatars/${value}`;
};

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40';

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 dark:bg-zinc-950 py-2.5 pl-10 pr-3 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 outline-none focus:border-orange-500 transition-colors';

const disabledInputClass =
  'w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 dark:bg-zinc-950/40 py-2.5 pl-10 pr-3 text-xs text-slate-400 dark:border-zinc-800 dark:text-zinc-500 outline-none';

const labelClass = 'mb-1 block text-xs text-slate-600 dark:text-zinc-400';

const iconClass = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 text-xs';

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
  const [passwordMethod, setPasswordMethod] = useState('current');
  const [currentPassword, setCurrentPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [codeRequestLoading, setCodeRequestLoading] = useState(false);

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

  const requestPasswordCode = async () => {
    setMessage({ type: '', text: '' });
    setCodeRequestLoading(true);
    try {
      const response = await API.post('/auth/password/change/request-code');
      setMessage({ type: 'success', text: response.data.message });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Impossible d’envoyer le code de vérification.'
      });
    } finally {
      setCodeRequestLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (newPassword !== passwordConfirmation) {
      setMessage({ type: 'error', text: 'Les deux nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const payload = {
        new_password: newPassword,
        ...(passwordMethod === 'current'
          ? { current_password: currentPassword }
          : { code: verificationCode })
      };
      const response = await API.post('/auth/password/change', payload);
      setCurrentPassword('');
      setVerificationCode('');
      setNewPassword('');
      setPasswordConfirmation('');
      setMessage({ type: 'success', text: response.data.message });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Erreur lors du changement de mot de passe.'
      });
    } finally {
      setPasswordLoading(false);
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
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
          <i className="bi bi-arrow-repeat animate-spin text-orange-500 text-sm"></i>
          <span>Chargement de votre profil…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 font-sans text-slate-800 dark:text-zinc-100 sm:px-6">

      {/* Notification */}
      {message.text && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          className="fixed inset-x-4 top-4 z-50 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-96"
        >
          <div
            className={`flex items-start gap-2.5 rounded-2xl border bg-white dark:bg-zinc-900 p-3.5 shadow-lg text-xs ${
              message.type === 'success'
                ? 'border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300'
            }`}
          >
            {message.type === 'success' ? (
              <i className="bi bi-check-circle text-sm mt-0.5"></i>
            ) : (
              <i className="bi bi-exclamation-circle text-sm mt-0.5"></i>
            )}
            <p className="flex-1">{message.text}</p>
            <button
              type="button"
              aria-label="Fermer la notification"
              onClick={() => setMessage({ type: '', text: '' })}
              className={`rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 ${focusRing}`}
            >
              <i className="bi bi-x text-sm"></i>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">

        {/* En-tête / Carte d'identité du profil (Inspiré des maquettes PC & Mobile) */}
        <section className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between text-center sm:text-left">

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-orange-500/10 text-lg text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20">
                  {getAvatarSrc() ? (
                    <img src={getAvatarSrc()} alt="Photo de profil" className="h-full w-full object-cover" />
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
                  <span className="sr-only">Modifier la photo de profil</span>
                  <input id="profile-photo" type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
                </label>
              </div>

              {/* Identité */}
              <div className="min-w-0">
                <h1 className="truncate text-base text-slate-900 dark:text-white">
                  {profile.prenom} {profile.nom}
                </h1>
                <p className="mt-0.5 text-xs text-slate-400">{profile.email}</p>
                <div className="mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                  <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] text-orange-600 dark:text-orange-400">
                    <i className="bi bi-shield-check me-1"></i>
                    {(profile.role || 'Utilisateur').toLowerCase()}
                  </span>
                </div>
                {preview && (
                  <p className="mt-1 text-[11px] text-orange-600 dark:text-orange-400">
                    Nouvelle photo sélectionnée. Enregistrez pour la conserver.
                  </p>
                )}
              </div>
            </div>

            {/* Badge QR Action */}
            {profile.qr_code && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className={`flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-4 py-2.5 text-xs text-slate-700 dark:text-zinc-300 transition hover:border-orange-500 hover:text-orange-600 ${focusRing}`}
              >
                <i className="bi bi-qr-code text-sm"></i>
                Mon badge QR
              </button>
            )}
          </div>
        </section>

        {/* Formulaire des informations personnelles */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4"
        >
          <div>
            <h2 className="text-xs uppercase tracking-wider text-slate-400">Informations personnelles</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">Mettez à jour vos coordonnées et informations de compte.</p>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label htmlFor="prenom" className={labelClass}>Prénom</label>
              <div className="relative">
                <i className={`bi bi-person ${iconClass}`}></i>
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
                <i className={`bi bi-person ${iconClass}`}></i>
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
                Adresse e-mail <span className="text-slate-400">(non modifiable)</span>
              </label>
              <div className="relative">
                <i className={`bi bi-envelope ${iconClass}`}></i>
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
                <i className={`bi bi-telephone ${iconClass}`}></i>
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
                <i className={`bi bi-calendar ${iconClass}`}></i>
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

          <div className="flex border-t border-slate-100 dark:border-zinc-800 pt-4 sm:justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 px-5 py-2.5 text-xs text-white transition disabled:opacity-50 shadow-sm sm:w-auto ${focusRing}`}
            >
              {saving ? <i className="bi bi-arrow-repeat animate-spin text-sm"></i> : <i className="bi bi-save text-sm"></i>}
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4">
            <h2 className="text-xs uppercase tracking-wider text-slate-400">Sécurité</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Choisissez comment confirmer le changement de mot de passe.</p>
          </div>

          <div className="mb-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPasswordMethod('current')}
              aria-pressed={passwordMethod === 'current'}
              className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                passwordMethod === 'current'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300'
                  : 'border-slate-200 text-slate-600 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              Confirmer avec l’ancien mot de passe
            </button>
            <button
              type="button"
              onClick={() => setPasswordMethod('code')}
              aria-pressed={passwordMethod === 'code'}
              className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                passwordMethod === 'code'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300'
                  : 'border-slate-200 text-slate-600 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              Confirmer avec un code par e-mail
            </button>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordMethod === 'current' ? (
              <div>
                <label htmlFor="current-password" className={labelClass}>Ancien mot de passe</label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Un code à 8 chiffres sera envoyé à {profile.email}.
                </p>
                <button
                  type="button"
                  onClick={requestPasswordCode}
                  disabled={codeRequestLoading}
                  className="rounded-xl border border-orange-500/40 px-4 py-2.5 text-xs font-medium text-orange-700 transition hover:bg-orange-500/10 disabled:opacity-50 dark:text-orange-300"
                >
                  {codeRequestLoading ? 'Envoi en cours…' : 'Envoyer un code par e-mail'}
                </button>
                <div>
                  <label htmlFor="password-verification-code" className={labelClass}>Code de vérification</label>
                  <input
                    id="password-verification-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{8}"
                    maxLength={8}
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="new-password" className={labelClass}>Nouveau mot de passe</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
              <div>
                <label htmlFor="new-password-confirmation" className={labelClass}>Confirmer le nouveau mot de passe</label>
                <input
                  id="new-password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                />
              </div>
            </div>

            <div className="flex border-t border-slate-100 pt-4 sm:justify-end dark:border-zinc-800">
              <button
                type="submit"
                disabled={passwordLoading}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-2.5 text-xs text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50 sm:w-auto ${focusRing}`}
              >
                {passwordLoading ? 'Modification…' : 'Changer le mot de passe'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Modal badge QR */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowQrModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Badge d'accès"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-center shadow-2xl"
          >
            <button
              type="button"
              aria-label="Fermer"
              onClick={() => setShowQrModal(false)}
              className={`absolute right-3 top-3 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 ${focusRing}`}
            >
              <i className="bi bi-x text-base"></i>
            </button>

            <h3 className="text-sm text-slate-900 dark:text-white">Badge d'accès</h3>
            <p className="mt-0.5 text-xs text-slate-400">Présentez ce QR code pour confirmer votre présence.</p>

            <div className="mx-auto my-4 w-fit rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white p-3">
              <img
                src={profile.qr_code}
                alt="QR code du badge"
                className="h-40 w-40 object-contain"
              />
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-900 dark:text-white">
                {profile.prenom} {profile.nom}
              </p>
              <p className="break-all text-[11px] text-slate-400">{profile.email}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={profile.qr_code}
                download={`QR_Badge_${profile.prenom}_${profile.nom}.png`}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 py-2.5 text-xs text-slate-700 dark:text-zinc-300 transition hover:border-orange-500 hover:text-orange-600 ${focusRing}`}
              >
                <i className="bi bi-download"></i> Télécharger
              </a>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className={`flex-1 rounded-2xl bg-orange-500 hover:bg-orange-600 py-2.5 text-xs text-white transition ${focusRing}`}
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