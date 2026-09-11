import { useEffect, useState } from 'react';
import API from '../../services/api';

// --- COMPOSANT MODAL ASSIGNATION FORMATEURS ---
function FormateurAssignModal({ formation, onClose }) {
  const [assignedFormateurs, setAssignedFormateurs] = useState([]);
  const [allFormateurs, setAllFormateurs] = useState([]);
  const [selectedFormateur, setSelectedFormateur] = useState('');
  const [role, setRole] = useState('Formateur Principal');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!formation?.id_formation) return;
    try {
      setLoading(true);
      const [resAssigned, resAll] = await Promise.all([
        API.get(`/formations/${formation.id_formation}/formateurs`),
        API.get('/formations/formateurs/all')
      ]);
      setAssignedFormateurs(Array.isArray(resAssigned.data) ? resAssigned.data : []);
      setAllFormateurs(Array.isArray(resAll.data) ? resAll.data : []);
    } catch (err) {
      console.error("Erreur de chargement des formateurs :", err);
    } finally {
      setLoading(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
        
        {/* Header Modale */}
        <div className="flex items-start justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div>
            <h2 className="text-xl font-black">Gestion des intervenants</h2>
            <p className="mt-0.5 text-sm text-black/55 dark:text-white/55">
              Formation : <span className="font-semibold text-orange-600 dark:text-orange-400">{formation?.titre}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-lg p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-orange-600 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-orange-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Liste des formateurs attribués */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-black/45 dark:text-white/45">Formateurs actuellement assignés</h3>
          {loading ? (
            <div className="py-4 text-center text-sm text-black/45 dark:text-white/45">Chargement...</div>
          ) : assignedFormateurs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/15 bg-black/[0.03] p-4 text-center dark:border-white/15 dark:bg-white/[0.04]">
              <p className="text-sm text-black/55 dark:text-white/55">Aucun formateur affecté pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {assignedFormateurs.map((f) => (
                <div key={f.id_formateur} className="flex items-center justify-between rounded-xl border border-black/10 bg-black/[0.03] p-3 transition-colors hover:bg-orange-500/[0.05] dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/15 text-xs font-semibold text-orange-700 dark:text-orange-400">
                      {f.prenom?.[0]}{f.nom?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{f.nom} {f.prenom}</p>
                      <span className="mt-0.5 inline-block rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                        {f.role_formateur || 'Intervenant'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(f.id_formateur)}
                    className="rounded-lg p-1.5 text-black/40 transition-colors hover:bg-orange-500/10 hover:text-orange-600 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-orange-400"
                    title="Retirer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulaire d'assignation */}
        <form onSubmit={handleAssign} className="space-y-4 border-t border-black/10 pt-4 dark:border-white/10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-black/45 dark:text-white/45">Assigner un nouvel intervenant</h3>
          
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Sélectionner un formateur</label>
              <select 
                value={selectedFormateur} 
                onChange={(e) => setSelectedFormateur(e.target.value)}
                className="w-full rounded-xl border border-black/15 bg-black/[0.03] p-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-white/20 dark:bg-white/[0.04] dark:text-white dark:focus:bg-black"
                required
              >
                <option value="">-- Choisir dans la liste --</option>
                {allFormateurs.map((f) => (
                  <option key={f.id_formateur} value={f.id_formateur}>
                    {f.nom} {f.prenom} ({f.specialite || 'Général'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Rôle attribué</label>
              <input 
                type="text" 
                placeholder="Ex: Formateur Principal, Intervenant..." 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-black shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Affecter à la formation</span>
          </button>
        </form>

      </div>
    </div>
  );
}

// --- COMPOSANT PRINCIPAL ---
export default function ResponsableFormations() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedFormationForFormateurs, setSelectedFormationForFormateurs] = useState(null);

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    image_url: '',
    date_debut: '',
    date_fin: '',
    date_limite_inscription: '',
    capacite_max: 20,
    statut: 'BROUILLON'
  });

  const fetchFormations = async () => {
    try {
      const res = await API.get('/formations');
      setFormations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormations();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      titre: '',
      description: '',
      image_url: '',
      date_debut: '',
      date_fin: '',
      date_limite_inscription: '',
      capacite_max: 20,
      statut: 'BROUILLON'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (f) => {
    setEditingId(f.id_formation);
    setFormData({
      titre: f.titre,
      description: f.description,
      image_url: f.image_url || '',
      date_debut: f.date_debut ? f.date_debut.split('T')[0] : '',
      date_fin: f.date_fin ? f.date_fin.split('T')[0] : '',
      date_limite_inscription: f.date_limite_inscription ? f.date_limite_inscription.split('T')[0] : '',
      capacite_max: f.capacite_max,
      statut: f.statut
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/formations/${editingId}`, formData);
      } else {
        await API.post('/formations', formData);
      }
      setShowModal(false);
      fetchFormations();
    } catch (err) {
      alert("Erreur lors de l'enregistrement de la formation");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Es-tu sûr de vouloir supprimer cette formation ?")) {
      try {
        await API.delete(`/formations/${id}`);
        fetchFormations();
      } catch (err) {
        alert("Erreur lors de la suppression");
      }
    }
  };

  const getBadgeStyle = (statut) => {
    switch (statut) {
      case 'OUVERTE':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/40';
      case 'EN_COURS':
        return 'bg-black/5 text-black border-black/15 dark:bg-white/10 dark:text-white dark:border-white/20';
      case 'BROUILLON':
        return 'bg-white text-black border-black/15 dark:bg-black dark:text-white dark:border-white/20';
      case 'TERMINEE':
        return 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white';
      default:
        return 'bg-black/5 text-black/60 border-black/10 dark:bg-white/5 dark:text-white/60 dark:border-white/10';
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-8 bg-white px-4 py-8 text-black transition-colors duration-300 dark:bg-black dark:text-white sm:px-6 lg:px-8">
      
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-5 dark:border-white/10 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Espace responsable</p>
          <h1 className="text-3xl font-black tracking-tight">Gestion des formations</h1>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Planifiez, administrez et affectez les formateurs à vos programmes d'apprentissage.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center space-x-2 rounded-xl bg-orange-500 px-4 py-2.5 font-bold text-black shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-400 hover:shadow-xl"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Nouvelle Formation</span>
        </button>
      </div>

      {/* Table Card */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
        </div>
      ) : formations.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
          <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-base font-semibold">Aucune formation créée</h3>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">Commencez par ajouter votre première formation au catalogue.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_12px_35px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_12px_35px_rgba(0,0,0,0.35)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/10 bg-black/[0.03] text-xs font-semibold uppercase tracking-wider text-black/50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50">
                  <th className="py-3.5 px-6">Formation</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4">Période</th>
                  <th className="py-3.5 px-4">Capacité</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 text-sm dark:divide-white/10">
                {formations.map((f) => (
                  <tr key={f.id_formation} className="transition-colors hover:bg-orange-500/[0.04]">
                    <td className="py-4 px-6">
                      <div className="font-semibold">{f.titre}</div>
                      {f.description && (
                        <div className="mt-0.5 line-clamp-1 max-w-xs text-xs text-black/45 dark:text-white/45">
                          {f.description}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyle(f.statut)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75"></span>
                        {f.statut}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-black/65 dark:text-white/65">
                      {new Date(f.date_debut).toLocaleDateString('fr-FR')} 
                      <span className="mx-1 text-orange-500">➔</span> 
                      {new Date(f.date_fin).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-black/60 dark:text-white/60">
                      <span className="font-semibold">{f.capacite_max}</span> places
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => setSelectedFormationForFormateurs(f)}
                          className="inline-flex items-center space-x-1 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-500/20 dark:text-orange-400"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Formateurs</span>
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(f)} 
                          className="rounded-lg p-1.5 text-black/45 transition-colors hover:bg-black/5 hover:text-orange-600 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-orange-400"
                          title="Modifier"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(f.id_formation)} 
                          className="rounded-lg p-1.5 text-black/45 transition-colors hover:bg-black/5 hover:text-orange-600 dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-orange-400"
                          title="Supprimer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION & ÉDITION FORMATION */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
            
            <div className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
              <h2 className="text-xl font-black">
                {editingId ? "Modifier la Formation" : "Nouvelle Formation"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-black/40 hover:bg-black/5 hover:text-orange-600 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-orange-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Titre de la formation</label>
                <input 
                  type="text" 
                  name="titre" 
                  required 
                  value={formData.titre} 
                  onChange={handleChange}
                  placeholder="Ex: Devenir Développeur Full-Stack"
                  className="w-full rounded-xl border border-black/15 bg-black/[0.03] p-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-white/20 dark:bg-white/[0.04] dark:text-white dark:focus:bg-black" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Description</label>
                <textarea 
                  name="description" 
                  required 
                  rows="3"
                  value={formData.description} 
                  onChange={handleChange}
                  placeholder="Présentation générale des objectifs..."
                  className="w-full resize-none rounded-xl border border-black/15 bg-black/[0.03] p-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-white/20 dark:bg-white/[0.04] dark:text-white dark:focus:bg-black" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Date de début</label>
                  <input 
                    type="date" 
                    name="date_debut" 
                    required 
                    value={formData.date_debut} 
                    onChange={handleChange}
                    className="w-full rounded-xl border border-black/15 bg-black/[0.03] p-2.5 text-sm outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-white/20 dark:bg-white/[0.04] dark:text-white dark:focus:bg-black" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Date de fin</label>
                  <input 
                    type="date" 
                    name="date_fin" 
                    required 
                    value={formData.date_fin} 
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Limite candidature</label>
                  <input 
                    type="date" 
                    name="date_limite_inscription" 
                    required 
                    value={formData.date_limite_inscription} 
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Capacité Max</label>
                  <input 
                    type="number" 
                    name="capacite_max" 
                    required 
                    value={formData.capacite_max} 
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Statut</label>
                  <select 
                    name="statut" 
                    value={formData.statut} 
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="BROUILLON">BROUILLON</option>
                    <option value="OUVERTE">OUVERTE</option>
                    <option value="EN_COURS">EN_COURS</option>
                    <option value="TERMINEE">TERMINEE</option>
                    <option value="ARCHIVEE">ARCHIVEE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">URL de l'image</label>
                  <input 
                    type="text" 
                    name="image_url" 
                    value={formData.image_url} 
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl p-2.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 border-t border-black/10 pt-4 dark:border-white/10">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-black/15 px-4 py-2 text-sm font-semibold text-black/65 transition-colors hover:border-orange-500 hover:text-orange-600 dark:border-white/20 dark:text-white/65 dark:hover:text-orange-400"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black shadow-sm shadow-orange-500/20 transition-all hover:bg-orange-400"
                >
                  {editingId ? "Mettre à jour" : "Créer la formation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GESTION DES FORMATEURS */}
      {selectedFormationForFormateurs && (
        <FormateurAssignModal 
          formation={selectedFormationForFormateurs}
          onClose={() => setSelectedFormationForFormateurs(null)}
        />
      )}
    </div>
  );
}