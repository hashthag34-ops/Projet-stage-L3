// frontend/src/pages/Postuler.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function Postuler() {
  const { id_formation } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', telephone: '', age: '', genre: 'Homme',
    niveau_etude: '', situation_professionnelle: '', etablissement: '', filiere: '',
    motivation: '', objectif: '', projet_apres_formation: '', source_information: '',
    a_deja_suivi_formation: false, formation_precedente: '', conditions_acceptees: false
  });

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/candidats/postuler', { ...formData, id_formation });
      alert("Candidature envoyée avec succès !");
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de l'envoi");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Formulaire de Candidature 📝</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
        
        <h2 className="font-semibold text-lg text-blue-600 border-b pb-2">Informations Personnelles</h2>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="nom" placeholder="Nom" required value={formData.nom} onChange={handleChange} className="border p-2 rounded" />
          <input type="text" name="prenom" placeholder="Prénom" required value={formData.prenom} onChange={handleChange} className="border p-2 rounded" />
          <input type="email" name="email" placeholder="Email" required value={formData.email} onChange={handleChange} className="border p-2 rounded" />
          <input type="text" name="telephone" placeholder="Téléphone" value={formData.telephone} onChange={handleChange} className="border p-2 rounded" />
          <input type="number" name="age" placeholder="Âge" value={formData.age} onChange={handleChange} className="border p-2 rounded" />
          <select name="genre" value={formData.genre} onChange={handleChange} className="border p-2 rounded">
            <option value="Homme">Homme</option>
            <option value="Femme">Femme</option>
          </select>
        </div>

        <h2 className="font-semibold text-lg text-blue-600 border-b pb-2 pt-4">Parcours & Situation</h2>
        <div className="grid grid-cols-2 gap-4">
          <input type="text" name="niveau_etude" placeholder="Niveau d'étude" value={formData.niveau_etude} onChange={handleChange} className="border p-2 rounded" />
          <input type="text" name="situation_professionnelle" placeholder="Situation Pro (ex: Etudiant, Employé)" value={formData.situation_professionnelle} onChange={handleChange} className="border p-2 rounded" />
          <input type="text" name="etablissement" placeholder="Établissement / Université" value={formData.etablissement} onChange={handleChange} className="border p-2 rounded" />
          <input type="text" name="filiere" placeholder="Filière" value={formData.filiere} onChange={handleChange} className="border p-2 rounded" />
        </div>

        <h2 className="font-semibold text-lg text-blue-600 border-b pb-2 pt-4">Motivations & Objectifs</h2>
        <textarea name="motivation" placeholder="Quelles sont vos motivations ?" required value={formData.motivation} onChange={handleChange} className="border p-2 rounded w-full" rows="3" />
        <textarea name="objectif" placeholder="Vos objectifs pour cette formation ?" value={formData.objectif} onChange={handleChange} className="border p-2 rounded w-full" rows="2" />

        <div className="flex items-center space-x-2 pt-2">
          <input type="checkbox" name="conditions_acceptees" required checked={formData.conditions_acceptees} onChange={handleChange} id="cond" />
          <label htmlFor="cond" className="text-sm">J'accepte les conditions d'inscription.</label>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700">
          Soumettre ma candidature
        </button>
      </form>
    </div>
  );
}