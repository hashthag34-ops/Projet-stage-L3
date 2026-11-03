// frontend/src/components/FormateurAssignModal.jsx
import { useEffect, useState } from 'react';
import { X, UserCheck, UserPlus, Trash2, Shield, User } from 'lucide-react';
import API from '../services/api';

const inputClass = 'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-500';

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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-6"
      >
        {/* En-tête du modal */}
        <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">Gestion pédagogique</p>
            <h2 id="modal-title" className="mt-1 text-base font-bold text-zinc-900 dark:text-white">
              Formateurs : <span className="text-orange-600 dark:text-orange-400">{formation?.titre}</span>
            </h2>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Fermer"
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Liste des formateurs affectés */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <UserCheck size={15} className="text-orange-500" /> Formateurs affectés
          </h3>
          {assignedFormateurs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
              Aucun formateur affecté pour le moment.
            </div>
          ) : (
            <ul className="space-y-2">
              {assignedFormateurs.map((f) => (
                <li key={f.id_formateur} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold">
                      <User size={15} />
                    </span>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{f.nom} {f.prenom}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{f.role_formateur || 'Intervenant'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(f.id_formateur)}
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition"
                    title="Retirer le formateur"
                  >
                    <Trash2 size={14} /> Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulaire d'affectation */}
        <form onSubmit={handleAssign} className="space-y-4 border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <UserPlus size={15} className="text-orange-500" /> Affecter un nouveau formateur
          </h3>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="select-formateur" className="sr-only">Sélectionner un formateur</label>
              <select 
                id="select-formateur"
                value={selectedFormateur} 
                onChange={(e) => setSelectedFormateur(e.target.value)}
                className={inputClass}
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
              <label htmlFor="role-formateur" className="sr-only">Rôle du formateur</label>
              <input 
                id="role-formateur"
                type="text" 
                placeholder="Rôle (ex: Formateur Principal, Intervenant...)" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full rounded-xl bg-orange-500 py-3 text-xs font-black text-zinc-950 transition hover:bg-orange-400 shadow-md shadow-orange-500/20"
          >
            Affecter à la formation
          </button>
        </form>
      </div>
    </div>
  );
}