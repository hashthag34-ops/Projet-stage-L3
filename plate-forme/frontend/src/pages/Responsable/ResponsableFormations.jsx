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

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40';

const inputClass = `w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-orange-500 dark:focus:bg-zinc-900 ${focusRing}`;

const getStatusBadgeClass = (statut) => {
  switch (statut?.toUpperCase()) {
    case 'OUVERTE':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
    case 'EN_COURS':
      return 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
    case 'BROUILLON':
      return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    case 'TERMINEE':
      return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700';
    case 'ARCHIVEE':
    default:
      return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
  }
};

// --- COMPOSANT MODAL DETAILS FORMATION ---
function FormationDetailsModal({ formation, onClose }) {
  if (!formation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        
        {/* Bannière Image */}
        <div className="relative h-48 w-full bg-slate-100 dark:bg-zinc-800">
          {formation.image_url ? (
            <img 
              src={getFormationImageUrl(formation.image_url)}
              alt={formation.titre} 
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              onLoad={(e) => { e.currentTarget.style.display = ''; }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-zinc-500">
              <ImageIcon size={48} strokeWidth={1.5} />
            </div>
          )}
          <button 
            onClick={onClose}
            className={`absolute right-3 top-3 rounded-xl bg-zinc-950/60 p-1.5 text-white backdrop-blur-md transition hover:bg-zinc-950/80 ${focusRing}`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps du contenu */}
        <div className="space-y-5 p-6">
          <div>
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${getStatusBadgeClass(formation.statut)}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
              {formation.statut}
            </span>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formation.titre}
            </h2>
          </div>

          <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
            {formation.description || "Aucune description fournie."}
          </p>

          {/* Grille d'infos */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-800/30">
              <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Période</span>
              <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-zinc-200">
                {formation.date_debut ? new Date(formation.date_debut).toLocaleDateString('fr-FR') : '-'} ➔ {formation.date_fin ? new Date(formation.date_fin).toLocaleDateString('fr-FR') : '-'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-800/30">
              <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Limite d'inscription</span>
              <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-zinc-200">
                {formation.date_limite_inscription ? new Date(formation.date_limite_inscription).toLocaleDateString('fr-FR') : 'Non spécifiée'}
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Capacité d'accueil</span>
                <span className="rounded-lg bg-zinc-200/60 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:bg-zinc-700 dark:text-zinc-200">
                  {formation.capacite_max || 0} places max
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={`w-full rounded-2xl bg-zinc-900 py-3 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white ${focusRing}`}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Gestion des intervenants</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
              Formation : <span className="font-semibold text-slate-900 dark:text-white">{formation?.titre}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className={`rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 ${focusRing}`}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Formateurs actuellement assignés
          </h3>
          {loading ? (
            <div className="py-4 text-center text-xs text-slate-400 dark:text-zinc-500">Chargement...</div>
          ) : assignedFormateurs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-xs text-slate-500 dark:text-zinc-400">Aucun formateur affecté pour le moment.</p>
            </div>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {assignedFormateurs.map((f) => (
                <div key={f.id_formateur} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                      {f.prenom?.[0]}{f.nom?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{f.nom} {f.prenom}</p>
                      <span className="mt-0.5 inline-block rounded bg-zinc-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                        {f.role_formateur || 'Intervenant'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(f.id_formateur)}
                    className={`rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${focusRing}`}
                    title="Retirer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleAssign} className="space-y-3 border-t border-slate-100 pt-4 dark:border-zinc-800">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Assigner un nouvel intervenant
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Sélectionner un formateur</label>
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
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Rôle attribué</label>
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
            className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white ${focusRing}`}
          >
            <UserPlus size={15} />
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
    if (imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setEditingId(f.id_formation);
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
        await API.put(`/formations/${editingId}`, payload);
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
    <div className="space-y-8 font-sans text-slate-900 dark:text-zinc-100 p-2 sm:p-4">
      
      {/* En-tête */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
            <Sparkles size={14} className="text-orange-500" />
            <span>Espace responsable</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Gestion des formations
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            Planifiez, administrez et affectez les formateurs à vos programmes d'apprentissage.
          </p>
        </div>

        <button 
          onClick={handleOpenCreate} 
          className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white ${focusRing}`}
        >
          <Plus size={16} />
          <span>Nouvelle formation</span>
        </button>
      </header>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 font-sans">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-bold text-slate-400">Total Formations</span>
          <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{formations.length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-bold text-slate-400">Ouvertes</span>
          <p className="mt-2 text-xl font-black text-emerald-600">{formations.filter(f => f.statut === 'OUVERTE').length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-bold text-slate-400">En Cours</span>
          <p className="mt-2 text-xl font-black text-blue-600">{formations.filter(f => f.statut === 'EN_COURS').length}</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs font-bold text-slate-400">Brouillons</span>
          <p className="mt-2 text-xl font-black text-amber-600">{formations.filter(f => f.statut === 'BROUILLON').length}</p>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3.5 text-slate-400 dark:text-zinc-500" />
          <input 
            value={searchTerm || ''} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Rechercher par titre, description ou statut..." 
            className={`${inputClass} pl-10`} 
          />
        </div>
        <div className="relative sm:w-56">
          <select 
            value={sort || 'recent'} 
            onChange={(e) => setSort(e.target.value)} 
            className={`${inputClass} cursor-pointer appearance-none pr-8`}
          >
            <option value="recent">Tri : Plus récentes</option>
            <option value="title">Tri : Titre A-Z</option>
            <option value="status">Tri : Par statut</option>
          </select>
          <ArrowUpDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-slate-400 dark:text-zinc-500" />
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500">Chargement des formations...</p>
        </div>
      ) : filteredFormations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <GraduationCap size={32} className="text-slate-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-zinc-300">Aucune formation trouvée</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">Ajustez vos mots clés de recherche ou ajoutez un nouveau programme.</p>
        </div>
      ) : (
        <>
          {/* Vue Desktop (Tableau complet) */}
          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500">
                  <tr>
                    <th className="p-4 pl-5">Formation</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Période</th>
                    <th className="p-4">Capacité</th>
                    <th className="p-4 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {filteredFormations.map((f) => (
                    <tr 
                      key={f.id_formation} 
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                    >
                      <td className="p-4 pl-5">
                        <div className="flex items-center gap-3">
                          {f.image_url ? (
                            <img 
                              src={getFormationImageUrl(f.image_url)}
                              alt="" 
                              className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-zinc-700" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              onLoad={(e) => { e.currentTarget.style.display = ''; }}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 font-bold text-slate-700 dark:text-zinc-300">
                              <GraduationCap size={18} />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{f.titre}</p>
                            {f.description && (
                              <p className="mt-0.5 max-w-xs truncate text-[11px] text-slate-400 dark:text-zinc-500">
                                {f.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${getStatusBadgeClass(f.statut)}`}>
                          {f.statut}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                        {f.date_debut ? new Date(f.date_debut).toLocaleDateString('fr-FR') : '-'} 
                        <span className="mx-1 text-slate-400">➔</span> 
                        {f.date_fin ? new Date(f.date_fin).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="p-4 whitespace-nowrap font-medium text-slate-600 dark:text-zinc-400">
                        <span className="font-bold text-slate-900 dark:text-white">{f.capacite_max}</span> places
                      </td>
                      <td className="p-4 pr-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setSelectedFormationForDetails(f)}
                            className={`rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${focusRing}`}
                            title="Fiche détaillée"
                          >
                            <Info size={16} />
                          </button>

                          <button 
                            onClick={() => setSelectedFormationForFormateurs(f)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 ${focusRing}`}
                          >
                            <Users size={13} />
                            <span>Formateurs</span>
                          </button>

                          <button 
                            onClick={() => handleOpenEdit(f)} 
                            className={`rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 ${focusRing}`}
                            title="Modifier"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button 
                            onClick={() => handleDelete(f.id_formation)} 
                            className={`rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 ${focusRing}`}
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue Mobile & Tablette en Grille Compacte (2 ou 3 cartes par ligne) */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {filteredFormations.map((f) => (
              <div 
                key={f.id_formation}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[9px] font-bold ${getStatusBadgeClass(f.statut)}`}>
                      {f.statut}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{f.capacite_max} max</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {f.image_url ? (
                      <img 
                        src={getFormationImageUrl(f.image_url)}
                        alt="" 
                        className="h-9 w-9 rounded-xl object-cover shrink-0" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        onLoad={(e) => { e.currentTarget.style.display = ''; }}
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 font-bold text-slate-700 dark:text-zinc-300 shrink-0">
                        <GraduationCap size={16} />
                      </div>
                    )}
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                      {f.titre}
                    </h3>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-1 mb-3">
                    {f.description || 'Aucune description'}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-2.5 dark:border-zinc-800 flex items-center justify-between gap-1">
                  <button 
                    onClick={() => setSelectedFormationForDetails(f)} 
                    className={`flex-1 rounded-xl bg-slate-100 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 ${focusRing}`}
                  >
                    Détails
                  </button>
                  <button 
                    onClick={() => setSelectedFormationForFormateurs(f)} 
                    className={`rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ${focusRing}`}
                    title="Formateurs"
                  >
                    <Users size={14} />
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(f)} 
                    className={`rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 ${focusRing}`}
                    title="Modifier"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(f.id_formation)} 
                    className={`rounded-xl border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-rose-400 ${focusRing}`}
                    title="Supprimer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingId ? "Modifier la formation" : "Nouvelle formation"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className={`rounded-xl p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 ${focusRing}`}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Titre de la formation</label>
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
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Description</label>
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
              <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Image de couverture</label>
                  <div className="flex space-x-1 rounded-xl bg-slate-200/60 p-0.5 dark:bg-zinc-800">
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
                      className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${imageInputType === 'url' ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-700 dark:text-white' : 'text-slate-500 dark:text-zinc-400'}`}
                    >
                      <LinkIcon size={12} />
                      <span>URL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputType('file')}
                      className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${imageInputType === 'file' ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-700 dark:text-white' : 'text-slate-500 dark:text-zinc-400'}`}
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
                    className="w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-300 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-200" 
                  />
                )}

                {imagePreviewUrl || formData.image_url ? (
                  <div className="relative mt-2 h-24 w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
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
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Date de début</label>
                  <input 
                    type="date" 
                    name="date_debut" 
                    required 
                    value={formData.date_debut ?? ''} 
                    onChange={handleChange}
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Date de fin</label>
                  <input 
                    type="date" 
                    name="date_fin" 
                    required 
                    value={formData.date_fin ?? ''} 
                    onChange={handleChange}
                    className={inputClass} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Limite candidature</label>
                  <input 
                    type="date" 
                    name="date_limite_inscription" 
                    required 
                    value={formData.date_limite_inscription ?? ''} 
                    onChange={handleChange}
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Capacité Max</label>
                  <input 
                    type="number" 
                    name="capacite_max" 
                    required 
                    value={formData.capacite_max ?? 20} 
                    onChange={handleChange}
                    className={inputClass} 
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Statut</label>
                <select 
                  name="statut" 
                  value={formData.statut ?? 'BROUILLON'} 
                  onChange={handleChange}
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
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white ${focusRing}`}
              >
                {uploadingImage && <RefreshCw size={14} className="animate-spin" />}
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