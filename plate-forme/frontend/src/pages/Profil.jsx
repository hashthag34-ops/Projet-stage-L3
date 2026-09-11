import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import API from '../services/api'; // Ajuste selon le port de ton backend
const BACKEND_URL = 'http://localhost:5000'; // URL du backend

const getImageUrl = (value) => {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) return value;
  return `${BACKEND_URL}/uploads/avatars/${value}`;
};

export default function Profil() {
  const [profile, setProfile] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    age: '',
    photo_profil: '',
    qr_code: '', // Contient la DataURL envoyée par le backend
    role: ''
  });
  
  // État pour stocker le fichier image sélectionné
  const [selectedFile, setSelectedFile] = useState(null);
  // État pour la prévisualisation instantanée de l'image
  const [preview, setPreview] = useState(null);

  // État pour la gestion du Modal QR Code
  const [showQrModal, setShowQrModal] = useState(false);

  const [loading, setLoading] = useState(true);
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

  // Gestion de la sélection du fichier image
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file)); // Prévisualisation locale avant envoi
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      // Utilisation de FormData pour envoyer du texte + un fichier binaire
      const formData = new FormData();
      formData.append('nom', profile.nom || '');
      formData.append('prenom', profile.prenom || '');
      formData.append('telephone', profile.telephone || '');
      formData.append('age', profile.age || '');

      if (selectedFile) {
        formData.append('avatar', selectedFile); // Nom du champ attendu par Multer
      }

      // Envoi vers le backend
      const res = await API.put('/users/profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Mettre à jour l'état du profil avec le nouveau nom d'image renvoyé par le backend
      const updatedProfile = { 
        ...profile, 
        ...res.data.user,
        photo_profil: res.data.photo_profil || profile.photo_profil 
      };
      
      setProfile(updatedProfile);
      setPreview(null); // Réinitialiser la prévisualisation

      // Mettre à jour le LocalStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updatedProfile }));

      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur de mise à jour' });
    }
  };

  // Construction de l'URL absolue pour afficher l'avatar
  const getAvatarSrc = () => {
    if (preview) return preview; // En cours de sélection
    if (profile.photo_profil) return getImageUrl(profile.photo_profil);
    return null;
  };

  if (loading) return <div className="p-8 text-center text-black/50 dark:text-white/50">Chargement de votre profil...</div>;

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_12px_35px_rgba(0,0,0,0.35)] sm:p-8">
        
        {/* En-tête avec Avatar et Bouton QR Code */}
        <div className="mb-6 flex items-center justify-between border-b border-black/10 pb-6 dark:border-white/10">
          <div className="flex items-center space-x-4">
            <div className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-orange-500 bg-orange-500/10 text-2xl font-bold text-orange-600 dark:text-orange-400">
              {getAvatarSrc() ? (
                <img src={getAvatarSrc()} alt="Profil" className="w-full h-full object-cover" />
              ) : (
                `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}`
              )}
              <label
                htmlFor="profile-photo"
                title="Modifier la photo de profil"
                className="absolute bottom-1 right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg bg-orange-500 text-black shadow-lg ring-2 ring-white transition hover:bg-orange-400 dark:ring-black"
              >
                <Pencil size={13} strokeWidth={2.5} />
                <input id="profile-photo" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight">{profile.prenom} {profile.nom}</h1>
              <span className="mt-1 inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-400">
                {profile.role || 'UTILISATEUR'}
              </span>
            </div>
          </div>

          {/* Bouton d'affichage du Badge QR Code (Affiché seulement si le QR code existe) */}
          {profile.qr_code && (
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="flex items-center space-x-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-black shadow-md transition hover:bg-orange-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Mon Badge QR Code</span>
            </button>
          )}
        </div>

        {message.text && (
          <div className={`mb-6 rounded-xl border p-4 text-sm ${
            message.type === 'success' ? 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'border-black/20 bg-black/5 text-black/70 dark:border-white/20 dark:bg-white/5 dark:text-white/70'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">Nom</label>
              <input
                type="text"
                name="nom"
                value={profile.nom || ''}
                onChange={handleChange}
                className="w-full rounded-xl border border-black/15 bg-transparent p-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">Prénom</label>
              <input
                type="text"
                name="prenom"
                value={profile.prenom || ''}
                onChange={handleChange}
                className="w-full rounded-xl border border-black/15 bg-transparent p-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">Email (Non modifiable)</label>
              <input
                type="email"
                disabled
                value={profile.email || ''}
                className="w-full cursor-not-allowed rounded-xl border border-black/10 bg-black/5 p-2.5 text-sm text-black/40 dark:border-white/10 dark:bg-white/5 dark:text-white/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">Téléphone</label>
              <input
                type="text"
                name="telephone"
                value={profile.telephone || ''}
                onChange={handleChange}
                className="w-full rounded-xl border border-black/15 bg-transparent p-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-black/60 dark:text-white/60">Âge</label>
              <input
                type="number"
                name="age"
                value={profile.age || ''}
                onChange={handleChange}
                className="w-full rounded-xl border border-black/15 bg-transparent p-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/20"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      {/* MODAL BADGE QR CODE */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-zinc-950">
            
            {/* Bouton de fermeture */}
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-black/40 transition hover:bg-black/5 hover:text-orange-600 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-orange-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Titre & Description */}
            <h2 className="mb-1 text-xl font-bold">Badge de Présence</h2>
            <p className="mb-4 text-xs text-black/50 dark:text-white/50">Présentez ce QR Code au responsable de séance pour émarger.</p>

            {/* Affichage de la DataURL directement comme image */}
            <div className="mb-4 inline-block rounded-xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <img 
                src={profile.qr_code} 
                alt="Badge QR Code" 
                className="w-48 h-48 mx-auto"
              />
            </div>

            {/* Informations sous le QR Code */}
            <p className="text-sm font-semibold">{profile.prenom} {profile.nom}</p>
            <p className="text-xs text-black/40 dark:text-white/40">{profile.email}</p>

            {/* Bouton Fermer */}
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-6 w-full rounded-xl bg-orange-500 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}