// frontend/src/pages/Profil.jsx
import { useEffect, useState } from 'react';
import API from '../services/api';

export default function Profil() {
  const [profile, setProfile] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    age: '',
    photo_profil: '',
    role: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    // Récupérer les informations du profil depuis le Backend
    API.get('/auth/me')
      .then((res) => {
        setProfile(res.data);
      })
      .catch((err) => {
        console.error("Erreur profil :", err);
        // Fallback localstorage si backend indisponible
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setProfile((prev) => ({ ...prev, ...storedUser }));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await API.put('/users/profile', profile);
      
      // Mettre à jour le LocalStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...storedUser, ...profile }));

      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Erreur de mise à jour' });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement de votre profil...</div>;

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center space-x-4 mb-6 border-b pb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-2xl border">
            {profile.photo_profil ? (
              <img src={profile.photo_profil} alt="Profil" className="w-full h-full rounded-full object-cover" />
            ) : (
              `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}`
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{profile.prenom} {profile.nom}</h1>
            <span className="inline-block mt-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {profile.role || 'UTILISATEUR'}
            </span>
          </div>
        </div>

        {message.text && (
          <div className={`p-4 mb-6 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nom</label>
              <input
                type="text"
                name="nom"
                value={profile.nom || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Prénom</label>
              <input
                type="text"
                name="prenom"
                value={profile.prenom || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email (Non modifiable)</label>
              <input
                type="email"
                disabled
                value={profile.email || ''}
                className="w-full border border-gray-200 bg-gray-50 text-gray-500 rounded-lg p-2.5 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Téléphone</label>
              <input
                type="text"
                name="telephone"
                value={profile.telephone || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Âge</label>
              <input
                type="number"
                name="age"
                value={profile.age || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">URL Photo de Profil</label>
              <input
                type="text"
                name="photo_profil"
                value={profile.photo_profil || ''}
                onChange={handleChange}
                placeholder="https://example.com/photo.jpg"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}