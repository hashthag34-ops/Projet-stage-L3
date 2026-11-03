// frontend/src/pages/Responsable/ResponsableFormations.jsx
import { useEffect, useState, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  Info, 
  Plus, 
  Search, 
  Trash2, 
  UserPlus, 
  X, 
  Users, 
  Sparkles, 
  Edit3, 
  Image as ImageIcon, 
  Upload, 
  Link as LinkIcon, 
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';
import API, { getFormationImageUrl } from '../../services/api';

const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';
const cardClass = 'rounded-3xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900';

const getStatusBadgeClass = (statut) => {
  switch (statut?.toUpperCase()) {
    case 'OUVERTE':
      return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400';
    case 'EN_COURS':
      return 'bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400';
    case 'BROUILLON':
      return 'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400';
    case 'TERMINEE':
      return 'bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';
    case 'ARCHIVEE':
    default:
      return 'bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-400';
  }
};

// --- COMPOSANT MODAL DETAILS FORMATION ---
function FormationDetailsModal({ formation, onClose }) {
  if (!formation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs" onClick={onClose}>
      <div className={`${cardClass} w-full max-w-lg overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        
        {/* Bannière Image */}
        <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-800">
          {formation.image_url ? (
            <img 
              src={getFormationImageUrl(formation.image_url)}
              alt={formation.titre} 
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              onLoad={(e) => { e.currentTarget.style.display = ''; }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
              <ImageIcon size={48} strokeWidth={1.5} />
            </div>
          )}
          <button 
            onClick={onClose}
            className="absolute right-3 top-3 rounded-xl bg-black/60 p-1.5 text-white backdrop-blur-md transition hover:bg-black/80"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps du contenu */}
        <div className="space-y-4 p-5 sm:p-6">
          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-extrabold uppercase ${getStatusBadgeClass(formation.statut)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              {formation.statut}
            </span>
            <h2 className="mt-2 text-lg font-black text-zinc-900 dark:text-white sm:text-xl">
              {formation.titre}
            </h2>
          </div>

          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {formation.description || "Aucune description fournie."}
          </p>

          {/* Grille d'infos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/50">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Période</span>
              <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {formation.date_debut ? new Date(formation.date_debut).toLocaleDateString('fr-FR') : '-'} ➔ {formation.date_fin ? new Date(formation.date_fin).toLocaleDateString('fr-FR') : '-'}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/50">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Limite inscription</span>
              <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {formation.date_limite_inscription ? new Date(formation.date_limite_inscription).toLocaleDateString('fr-FR') : 'Non spécifiée'}
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Capacité d'accueil</span>
                <span className="rounded-xl bg-zinc-200/60 px-2.5 py-1 text-xs font-black text-zinc-900 dark:bg-zinc-700 dark:text-white">
                  {formation.capacite_max || 0} places max
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full rounded-2xl bg-orange-500 py-3 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs" onClick={onClose}>
      <div className={`${cardClass} w-full max-w-lg overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-start justify-between border-b border-zinc-100 p-5 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-white">Gestion des intervenants</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Formation : <span className="font-bold text-zinc-800 dark:text-zinc-200">{formation?.titre}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
            Formateurs actuellement assignés
          </h3>
          {loading ? (
            <div className="py-4 text-center text-xs text-zinc-500">Chargement...</div>
          ) : assignedFormateurs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-800/40">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Aucun formateur affecté pour le moment.</p>
            </div>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {assignedFormateurs.map((f) => (
                <div key={f.id_formateur} className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-xs font-black text-orange-600 dark:text-orange-400">
                      {f.prenom?.[0]}{f.nom?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">{f.nom} {f.prenom}</p>
                      <span className="mt-0.5 inline-block rounded-md bg-zinc-200/60 px-2 py-0.5 text-[10px] font-extrabold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                        {f.role_formateur || 'Intervenant'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(f.id_formateur)}
                    className="rounded-xl p-2 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Retirer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleAssign} className="border-t border-zinc-100 p-5 dark:border-zinc-800">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
            Assigner un nouvel intervenant
          </h3>
          
          <div className="space-y-3 mb-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Sélectionner un formateur</label>
              <select 
                value={selectedFormateur || ''} 
                onChange={(e) => setSelectedFormateur(e.target.value)}
                className={inputClass}
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
              <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Rôle attribué</label>
              <input 
                type="text" 
                placeholder="Ex: Formateur Principal, Intervenant..." 
                value={role || ''}
                onChange={(e) => setRole(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400"
          >
            <UserPlus size={16} />
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
  const [selectedFormationForDetails, setSelectedFormationForDetails] = useState(null);

  // Recherche & Gestion Image
  const [searchTerm, setSearchTerm] = useState('');
  const [sort, setSort] = useState('recent');
  const [imageInputType, setImageInputType] = useState('url');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingStatus, setEditingStatus] = useState('BROUILLON');

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
      setFormations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erreur fetchFormations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormations();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value ?? '' });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleOpenCreate = () => {
    if (imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setEditingId(null);
    setEditingStatus('BROUILLON');
    setSelectedFile(null);
    setImagePreviewUrl('');
    setImageInputType('url');
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
    if (f.statut === 'ARCHIVEE') {
      window.alert('Une formation archivée ne peut plus être modifiée.');
      return;
    }
    if (imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setEditingId(f.id_formation);
    setEditingStatus(f.statut ?? 'BROUILLON');
    setSelectedFile(null);
    setImagePreviewUrl('');
    setImageInputType('url');
    setFormData({
      titre: f.titre ?? '',
      description: f.description ?? '',
      image_url: f.image_url ?? '',
      date_debut: f.date_debut ? f.date_debut.split('T')[0] : '',
      date_fin: f.date_fin ? f.date_fin.split('T')[0] : '',
      date_limite_inscription: f.date_limite_inscription ? f.date_limite_inscription.split('T')[0] : '',
      capacite_max: f.capacite_max ?? 20,
      statut: f.statut ?? 'BROUILLON'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadingImage(true);

    try {
      let finalImageUrl = formData.image_url;

      if (imageInputType === 'file' && selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', selectedFile);

        const uploadRes = await API.post('/formations/upload', uploadFormData);
        finalImageUrl = uploadRes.data?.url;
        if (!finalImageUrl) {
          throw new Error("L'API n'a pas renvoyé l'URL de l'image téléversée.");
        }
      }

      const payload = { ...formData, image_url: finalImageUrl };

      if (editingId) {
        try {
          await API.put(`/formations/${editingId}`, payload);
        } catch (requestError) {
          if (requestError.response?.status === 409 && requestError.response?.data?.code === 'SESSIONS_OUT_OF_RANGE') {
            const confirmed = window.confirm(
              `${requestError.response.data.message}\n\nVoulez-vous supprimer ces séances incompatibles et enregistrer les modifications ?`
            );
            if (!confirmed) throw requestError;
            await API.put(`/formations/${editingId}`, { ...payload, confirm_delete_sessions: true });
          } else {
            throw requestError;
          }
        }
      } else {
        await API.post('/formations', payload);
      }

      setShowModal(false);
      if (imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl('');
      setSelectedFile(null);
      fetchFormations();
    } catch (err) {
      console.error("Erreur handleSubmit:", err);
      alert(err.response?.data?.message || "Erreur lors du téléversement ou de l'enregistrement de la formation");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (formation) => {
    const hasUsefulData = formation.statut !== 'BROUILLON';
    const confirmation = hasUsefulData
      ? `La formation « ${formation.titre} » contient potentiellement des données utiles. Confirmer son archivage ?`
      : `Supprimer définitivement la formation vierge « ${formation.titre} » ?`;
    if (!window.confirm(confirmation)) return;

    try {
      const res = await API.delete(`/formations/${formation.id_formation}`);
      alert(res.data.message);
      await fetchFormations();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la suppression ou de l’archivage");
    }
  };

  const filteredFormations = useMemo(() => {
    return formations
      .filter((f) => {
        const term = searchTerm.toLowerCase();
        return (
          f.titre?.toLowerCase().includes(term) ||
          f.description?.toLowerCase().includes(term) ||
          f.statut?.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        if (sort === 'title') return a.titre.localeCompare(b.titre);
        if (sort === 'status') return a.statut.localeCompare(b.statut);
        return b.id_formation - a.id_formation;
      });
  }, [formations, searchTerm, sort]);

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-6 px-3 py-6 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:px-6">
      
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            <Sparkles size={15} />
            <span>Espace responsable</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Gestion des formations
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Planifiez, administrez et affectez les formateurs à vos programmes d'apprentissage.
          </p>
        </div>

        <button 
          onClick={handleOpenCreate} 
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400"
        >
          <Plus size={16} />
          <span>Nouvelle formation</span>
        </button>
      </header>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={`${cardClass} p-4`}>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Total Formations</span>
          <p className="mt-1 text-2xl font-black text-zinc-900 dark:text-white">{formations.length}</p>
        </div>

        <div className={`${cardClass} p-4`}>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Ouvertes</span>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{formations.filter(f => f.statut === 'OUVERTE').length}</p>
        </div>

        <div className={`${cardClass} p-4`}>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">En Cours</span>
          <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{formations.filter(f => f.statut === 'EN_COURS').length}</p>
        </div>

        <div className={`${cardClass} p-4`}>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Brouillons</span>
          <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{formations.filter(f => f.statut === 'BROUILLON').length}</p>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className={`${cardClass} p-4 sm:p-5`}>
        <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              value={searchTerm || ''} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Rechercher par titre, description ou statut..." 
              className={`${inputClass} w-full pl-10`} 
            />
          </div>
          <div className="relative">
            <select 
              value={sort || 'recent'} 
              onChange={(e) => setSort(e.target.value)} 
              className={`${inputClass} cursor-pointer appearance-none pr-8`}
            >
              <option value="recent">Tri : Plus récentes</option>
              <option value="title">Tri : Titre A-Z</option>
              <option value="status">Tri : Par statut</option>
            </select>
            <ArrowUpDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className={`${cardClass} flex h-64 items-center justify-center p-10 text-center text-xs font-semibold text-zinc-500`}>
          Chargement des formations...
        </div>
      ) : filteredFormations.length === 0 ? (
        <div className={`${cardClass} flex flex-col items-center justify-center border-dashed p-12 text-center`}>
          <GraduationCap size={36} className="text-zinc-400" />
          <p className="mt-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">Aucune formation trouvée</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Ajustez vos mots clés de recherche ou ajoutez un nouveau programme.</p>
        </div>
      ) : (
        <>
          {/* Vue Desktop (Tableau complet) */}
          <div className={`${cardClass} hidden overflow-hidden md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-100 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-400">
                  <tr>
                    <th className="p-4 pl-5">Formation</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Période</th>
                    <th className="p-4">Capacité</th>
                    <th className="p-4 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredFormations.map((f) => (
                    <tr key={f.id_formation} className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                      <td className="p-4 pl-5">
                        <div className="flex items-center gap-3">
                          {f.image_url ? (
                            <img 
                              src={getFormationImageUrl(f.image_url)}
                              alt="" 
                              className="h-10 w-10 rounded-2xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              onLoad={(e) => { e.currentTarget.style.display = ''; }}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              <GraduationCap size={18} />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">{f.titre}</p>
                            {f.description && (
                              <p className="mt-0.5 max-w-xs truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                {f.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${getStatusBadgeClass(f.statut)}`}>
                          {f.statut}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {f.date_debut ? new Date(f.date_debut).toLocaleDateString('fr-FR') : '-'} 
                        <span className="mx-1 text-zinc-400">➔</span> 
                        {f.date_fin ? new Date(f.date_fin).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="p-4 whitespace-nowrap font-medium text-zinc-600 dark:text-zinc-400">
                        <span className="font-bold text-zinc-900 dark:text-white">{f.capacite_max}</span> places
                      </td>
                      <td className="p-4 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setSelectedFormationForDetails(f)}
                            className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            title="Fiche détaillée"
                          >
                            <Info size={16} />
                          </button>

                          <button 
                            onClick={() => setSelectedFormationForFormateurs(f)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            <Users size={14} />
                            <span>Formateurs</span>
                          </button>

                          <button 
                            onClick={() => handleOpenEdit(f)} 
                            className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                            title="Modifier"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button 
                            onClick={() => handleDelete(f)} 
                            className="rounded-xl p-2 text-zinc-400 transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                            title="Supprimer ou archiver"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue Mobile & Tablette en Grille Compacte */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {filteredFormations.map((f) => (
              <div 
                key={f.id_formation}
                className={`${cardClass} flex flex-col justify-between p-4`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase ${getStatusBadgeClass(f.statut)}`}>
                      {f.statut}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400">{f.capacite_max} max</span>
                  </div>

                  <div className="flex items-center gap-2.5 mb-2">
                    {f.image_url ? (
                      <img 
                        src={getFormationImageUrl(f.image_url)}
                        alt="" 
                        className="h-9 w-9 rounded-xl object-cover shrink-0" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        onLoad={(e) => { e.currentTarget.style.display = ''; }}
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                        <GraduationCap size={16} />
                      </div>
                    )}
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white line-clamp-2">
                      {f.titre}
                    </h3>
                  </div>

                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-3">
                    {f.description || 'Aucune description'}
                  </p>
                </div>

                <div className="border-t border-zinc-100 pt-2.5 dark:border-zinc-800 flex items-center justify-between gap-1">
                  <button 
                    onClick={() => setSelectedFormationForDetails(f)} 
                    className="flex-1 rounded-xl bg-zinc-100 py-1.5 text-[10px] font-bold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    Détails
                  </button>
                  <button 
                    onClick={() => setSelectedFormationForFormateurs(f)} 
                    className="rounded-xl border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    title="Formateurs"
                  >
                    <Users size={14} />
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(f)} 
                    className="rounded-xl border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    title="Modifier"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(f)} 
                    className="rounded-xl border border-zinc-200 p-1.5 text-rose-600 hover:bg-rose-500/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-rose-400"
                    title="Supprimer ou archiver"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Création & Édition Formation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs" onClick={() => setShowModal(false)}>
          <div className={`${cardClass} max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6`} onClick={(e) => e.stopPropagation()}>
            
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-black text-zinc-900 dark:text-white">
                {editingId ? "Modifier la formation" : "Nouvelle formation"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Titre de la formation</label>
                <input 
                  type="text" 
                  name="titre" 
                  required 
                  value={formData.titre ?? ''} 
                  onChange={handleChange}
                  placeholder="Ex: Devenir Développeur Full-Stack"
                  className={inputClass} 
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Description</label>
                <textarea 
                  name="description" 
                  required 
                  rows="3"
                  value={formData.description ?? ''} 
                  onChange={handleChange}
                  placeholder="Présentation générale des objectifs..."
                  className={`${inputClass} resize-none`} 
                />
              </div>

              {/* Section Image (Fichier ou URL) */}
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800/80 dark:bg-zinc-800/40">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Image de couverture</label>
                  <div className="flex gap-1 rounded-xl bg-zinc-200/70 p-1 dark:bg-zinc-700">
                    <button
                      type="button"
                      onClick={() => {
                        if (imagePreviewUrl.startsWith('blob:')) {
                          URL.revokeObjectURL(imagePreviewUrl);
                        }
                        setSelectedFile(null);
                        setImagePreviewUrl('');
                        setImageInputType('url');
                      }}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${imageInputType === 'url' ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                    >
                      <LinkIcon size={12} />
                      <span>URL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputType('file')}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${imageInputType === 'file' ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                    >
                      <Upload size={12} />
                      <span>Fichier</span>
                    </button>
                  </div>
                </div>

                {imageInputType === 'url' ? (
                  <input 
                    type="url" 
                    name="image_url" 
                    value={formData.image_url ?? ''} 
                    onChange={handleChange}
                    placeholder="https://images.unsplash.com/photo-..."
                    className={inputClass} 
                  />
                ) : (
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-zinc-500 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-zinc-700 hover:file:bg-zinc-300 dark:text-zinc-400 dark:file:bg-zinc-700 dark:file:text-zinc-200" 
                  />
                )}

                {imagePreviewUrl || formData.image_url ? (
                  <div className="relative mt-2.5 h-24 w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <img
                      src={getFormationImageUrl(imagePreviewUrl || formData.image_url)}
                      alt="Aperçu"
                      className="h-full w-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      onLoad={(e) => { e.currentTarget.style.display = ''; }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Date de début</label>
                  <input 
                    type="date" 
                    name="date_debut" 
                    required 
                    value={formData.date_debut ?? ''} 
                    onChange={handleChange}
                    disabled={editingId && !['BROUILLON', 'OUVERTE'].includes(editingStatus)}
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Date de fin</label>
                  <input 
                    type="date" 
                    name="date_fin" 
                    required 
                    value={formData.date_fin ?? ''} 
                    onChange={handleChange}
                    disabled={editingId && ['TERMINEE', 'ARCHIVEE'].includes(editingStatus)}
                    className={inputClass} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Limite candidature</label>
                  <input 
                    type="date" 
                    name="date_limite_inscription" 
                    required 
                    value={formData.date_limite_inscription ?? ''} 
                    onChange={handleChange}
                    disabled={editingId && !['BROUILLON', 'OUVERTE'].includes(editingStatus)}
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Capacité Max</label>
                  <input 
                    type="number" 
                    name="capacite_max" 
                    required 
                    value={formData.capacite_max ?? 20} 
                    onChange={handleChange}
                    disabled={editingId && !['BROUILLON', 'OUVERTE'].includes(editingStatus)}
                    className={inputClass} 
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-zinc-600 dark:text-zinc-300">Statut</label>
                <select 
                  name="statut" 
                  value={formData.statut ?? 'BROUILLON'} 
                  onChange={handleChange}
                  disabled={editingId && !['BROUILLON', 'OUVERTE'].includes(editingStatus)}
                  className={inputClass}
                >
                  <option value="BROUILLON">BROUILLON</option>
                  <option value="OUVERTE">OUVERTE</option>
                  <option value="EN_COURS">EN_COURS</option>
                  <option value="TERMINEE">TERMINEE</option>
                  <option value="ARCHIVEE">ARCHIVEE</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={uploadingImage}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 disabled:opacity-50"
              >
                {uploadingImage && <RefreshCw size={15} className="animate-spin" />}
                <span>{uploadingImage ? "Téléversement..." : editingId ? "Mettre à jour" : "Créer la formation"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fiche Détaillée */}
      <FormationDetailsModal 
        formation={selectedFormationForDetails}
        onClose={() => setSelectedFormationForDetails(null)}
      />

      {/* Modal Gestion des Formateurs */}
      {selectedFormationForFormateurs && (
        <FormateurAssignModal 
          formation={selectedFormationForFormateurs}
          onClose={() => setSelectedFormationForFormateurs(null)}
        />
      )}
    </div>
  );
}