// frontend/src/pages/SetupAccount.jsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function SetupAccount() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/auth/setup-account', {
        email,
        username,
        mot_de_passe: password,
        photo_profil: photoUrl,
      });
      alert("Votre compte a été configuré ! Vous pouvez maintenant vous connecter.");
      navigate('/login');
    } catch (err) {
      alert("Erreur lors de la configuration du compte.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md max-w-md w-full space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Configuration de votre Compte 🚀</h2>
        <p className="text-xs text-gray-500">Compte associé à : <strong>{email}</strong></p>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
          <input 
            type="text" 
            required 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded-lg p-2.5 text-sm" 
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Créer un mot de passe</label>
          <input 
            type="password" 
            required 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg p-2.5 text-sm" 
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Photo de profil (URL optionnelle)</label>
          <input 
            type="text" 
            value={photoUrl} 
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full border rounded-lg p-2.5 text-sm" 
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg text-sm hover:bg-blue-700 transition"
        >
          Finaliser mon inscription
        </button>
      </form>
    </div>
  );
}