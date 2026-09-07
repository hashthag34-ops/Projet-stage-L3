// frontend/src/components/FormateurAssignModal.jsx
import { useEffect, useState } from 'react';
import API from '../services/api';

export default function FormateurAssignModal({ formation, onClose }) {
  const [assignedFormateurs, setAssignedFormateurs] = useState([]);
  const [allFormateurs, setAllFormateurs] = useState([]);
  const [selectedFormateur, setSelectedFormateur] = useState('');
  const [role, setRole] = useState('Formateur Principal');

  const loadData = async () => {
    if (!formation?.id_formation) return;
    try {
      const [resAssigned, resAll] = await Promise.all([
        API.get(`/formations/${formation.id_formation}/formateurs`),
        API.get('/formations/formateurs/all')
      ]);
      setAssignedFormateurs(Array.isArray(resAssigned.data) ? resAssigned.data : []);
      setAllFormateurs(Array.isArray(resAll.data) ? resAll.data : []);
    } catch (err) {
      console.error("Erreur de chargement des formateurs :", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [formation]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedFormateur) return;

    try {
      await API.post(`/formations/${formation.id_formation}/formateurs`, {
        id_formateur: selectedFormateur,
        role_formateur: role
      });
      setSelectedFormateur('');
      loadData();
    } catch (err) {
      alert("Erreur lors de l'affectation");
    }
  };

  const handleRemove = async (idFormateur) => {
    try {
      await API.delete(`/formations/${formation.id_formation}/formateurs/${idFormateur}`);
      loadData();
    } catch (err) {
      alert("Erreur lors du retrait");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-bold text-gray-800">
            Formateurs : <span className="text-blue-600">{formation?.titre}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Formateurs affectés :</h3>
          {assignedFormateurs.length === 0 ? (
            <p className="text-xs text-gray-500 italic">Aucun formateur affecté pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {assignedFormateurs.map((f) => (
                <li key={f.id_formateur} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{f.nom} {f.prenom}</p>
                    <p className="text-xs text-gray-500">{f.role_formateur || 'Intervenant'}</p>
                  </div>
                  <button 
                    onClick={() => handleRemove(f.id_formateur)}
                    className="text-xs text-red-600 hover:underline font-medium"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleAssign} className="border-t pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Affecter un nouveau formateur :</h3>
          
          <div>
            <select 
              value={selectedFormateur} 
              onChange={(e) => setSelectedFormateur(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm bg-white"
              required
            >
              <option value="">-- Sélectionner un formateur --</option>
              {allFormateurs.map((f) => (
                <option key={f.id_formateur} value={f.id_formateur}>
                  {f.nom} {f.prenom} ({f.specialite || 'Général'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <input 
              type="text" 
              placeholder="Rôle (ex: Formateur Principal, Intervenant...)" 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition"
          >
            Affecter à la formation
          </button>
        </form>
      </div>
    </div>
  );
}