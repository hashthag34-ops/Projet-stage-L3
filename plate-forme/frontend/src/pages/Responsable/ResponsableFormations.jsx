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
  UserCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Archive,
  ArrowUpDown
} from 'lucide-react';
import API from '../../services/api';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        
        {/* Bannière Image */}
        <div className="relative h-48 w-full bg-slate-100 dark:bg-zinc-800">
          {formation.image_url ? (
            <img 
              src={formation.image_url} 
              alt={formation.titre} 
              className="h-full w-full object-cover"
              onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-zinc-500">
              <ImageIcon size={48} strokeWidth={1.5} />
            </div>
          )}
          <button 
            onClick={onClose}
            className={`absolute right-3 top-3 rounded-xl bg-slate-950/60 p-1.5 text-white backdrop-blur-md transition hover:bg-slate-950/80 ${focusRing}`}
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
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-800/30">
              <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Période</span>
              <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-zinc-200">
                {new Date(formation.date_debut).toLocaleDateString('fr-FR')} ➔ {new Date(formation.date_fin).toLocaleDateString('fr-FR')}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-zinc-800/60 dark:bg-zinc-800/30">
              <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Limite d'inscription</span>
              <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-zinc-200">
                {formation.date_limite_inscription ? new Date(formation.date_limite_inscription).toLocaleDateString('fr-FR') : 'Non spécifiée'}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-orange-500/20 bg-orange-500/10 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-700 dark:text-orange-400">Capacité d'accueil</span>
                <span className="rounded-lg bg-orange-500/20 px-2.5 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-300">
                  {formation.capacite_max} places max
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className={`w-full rounded-xl bg-orange-500 py-3 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Gestion des intervenants</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
              Formation : <span className="font-semibold text-orange-600 dark:text-orange-400">{formation?.titre}</span>
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
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-xs text-slate-500 dark:text-zinc-400">Aucun formateur affecté pour le moment.</p>
            </div>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {assignedFormateurs.map((f) => (
                <div key={f.id_formateur} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                      {f.prenom?.[0]}{f.nom?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{f.nom} {f.prenom}</p>
                      <span className="mt-0.5 inline-block rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
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
                value={selectedFormateur} 
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
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
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
  const [mobileIndex, setMobileIndex] = useState(0);
  const [imageInputType, setImageInputType] = useState('url'); // 'url' ou 'file'
  const [selectedFile, setSelectedFile] = useState(null);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const localPreviewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, image_url: localPreviewUrl }));
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setSelectedFile(null);
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
    setEditingId(f.id_formation);
    setSelectedFile(null);
    setImageInputType('url');
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
    setUploadingImage(true);

    try {
      let finalImageUrl = formData.image_url;

      if (imageInputType === 'file' && selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', selectedFile);

        const uploadRes = await API.post('/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data.url;
      }

      const payload = { ...formData, image_url: finalImageUrl };

      if (editingId) {
        await API.put(`/formations/${editingId}`, payload);
      } else {
        await API.post('/formations', payload);
      }

      setShowModal(false);
      fetchFormations();
    } catch (err) {
      alert("Erreur lors de l'enregistrement de la formation");
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

  // Filtrage et tri
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

  const currentFormation = filteredFormations[mobileIndex];

  return (
    <div className="space-y-8 font-sans text-slate-900 dark:text-zinc-100">
      
      {/* En-tête */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <Sparkles size={14} />
            <span>Espace responsable</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Gestion des formations
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
            Planifiez, administrez et affectez les formateurs à vos programmes d'apprentissage.
          </p>
        </div>

        <button 
          onClick={handleOpenCreate} 
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
        >
          <Plus size={16} />
          <span>Nouvelle formation</span>
        </button>
      </header>

      {/* Filtres & Recherche */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400 dark:text-zinc-500" />
          <input 
            value={searchTerm} 
            onChange={(e) => { setSearchTerm(e.target.value); setMobileIndex(0); }} 
            placeholder="Rechercher par titre, description ou statut..." 
            className={`${inputClass} pl-10`} 
          />
        </div>
        <div className="relative sm:w-56">
          <select 
            value={sort} 
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
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500">Chargement des formations...</p>
        </div>
      ) : filteredFormations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/60">
          <GraduationCap size={32} className="text-slate-300 dark:text-zinc-600" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-zinc-300">Aucune formation trouvée</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">Ajustez vos mots clés de recherche ou ajoutez un nouveau programme.</p>
        </div>
      ) : (
        <>
          {/* Vue Desktop : Tableau */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200/80 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-zinc-800/80 dark:bg-zinc-800/30 dark:text-zinc-500">
                  <tr>
                    <th className="p-4">Formation</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Période</th>
                    <th className="p-4">Capacité</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {filteredFormations.map((f) => (
                    <tr 
                      key={f.id_formation} 
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {f.image_url ? (
                            <img 
                              src={f.image_url} 
                              alt="" 
                              className="h-10 w-10 rounded-xl object-cover ring-2 ring-orange-500/20" 
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
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
                        {new Date(f.date_debut).toLocaleDateString('fr-FR')} 
                        <span className="mx-1 text-orange-500">➔</span> 
                        {new Date(f.date_fin).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-4 whitespace-nowrap font-medium text-slate-600 dark:text-zinc-400">
                        <span className="font-bold text-slate-900 dark:text-white">{f.capacite_max}</span> places
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Info */}
                          <button 
                            onClick={() => setSelectedFormationForDetails(f)}
                            className={`rounded-xl p-2 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-500 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 ${focusRing}`}
                            title="Fiche détaillée"
                          >
                            <Info size={17} />
                          </button>

                          {/* Assignation Formateurs */}
                          <button 
                            onClick={() => setSelectedFormationForFormateurs(f)}
                            className={`inline-flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-50 px-2.5 py-1.5 text-[11px] font-bold text-orange-700 transition hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 ${focusRing}`}
                          >
                            <Users size={14} />
                            <span>Formateurs</span>
                          </button>

                          {/* Édition */}
                          <button 
                            onClick={() => handleOpenEdit(f)} 
                            className={`rounded-xl p-2 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-500 dark:hover:bg-orange-500/10 dark:hover:text-orange-400 ${focusRing}`}
                            title="Modifier"
                          >
                            <Edit3 size={16} />
                          </button>

                          {/* Suppression */}
                          <button 
                            onClick={() => handleDelete(f.id_formation)} 
                            className={`rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 ${focusRing}`}
                            title="Supprimer"
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

          {/* Vue Mobile : Fiche Carrousel */}
          <div className="md:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-zinc-800">
                <button 
                  onClick={() => setMobileIndex((index) => Math.max(0, index - 1))} 
                  disabled={mobileIndex === 0} 
                  className={`rounded-xl border border-slate-200 p-2 text-slate-600 disabled:opacity-30 dark:border-zinc-800 dark:text-zinc-400 ${focusRing}`}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Programme {mobileIndex + 1} / {filteredFormations.length}
                </span>
                <button 
                  onClick={() => setMobileIndex((index) => Math.min(filteredFormations.length - 1, index + 1))} 
                  disabled={mobileIndex === filteredFormations.length - 1} 
                  className={`rounded-xl border border-slate-200 p-2 text-slate-600 disabled:opacity-30 dark:border-zinc-800 dark:text-zinc-400 ${focusRing}`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {currentFormation && (
                <div>
                  <div className="flex flex-col items-center text-center">
                    {currentFormation.image_url ? (
                      <img 
                        src={currentFormation.image_url} 
                        alt="" 
                        className="h-20 w-20 rounded-2xl object-cover ring-2 ring-orange-500/30" 
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                        <GraduationCap size={32} />
                      </div>
                    )}
                    <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                      {currentFormation.titre}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-zinc-400">
                      {currentFormation.description || 'Aucune description'}
                    </p>
                    <span className={`mt-3 rounded-lg px-2.5 py-1 text-[11px] font-bold ${getStatusBadgeClass(currentFormation.statut)}`}>
                      {currentFormation.statut}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                      <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Période</span>
                      <strong className="mt-0.5 block truncate text-slate-700 dark:text-zinc-300">
                        {new Date(currentFormation.date_debut).toLocaleDateString('fr-FR')} ➔ {new Date(currentFormation.date_fin).toLocaleDateString('fr-FR')}
                      </strong>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                      <span className="block text-[10px] font-semibold text-slate-400 dark:text-zinc-500">Capacité</span>
                      <strong className="mt-0.5 block text-slate-700 dark:text-zinc-300">
                        {currentFormation.capacite_max} places
                      </strong>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => setSelectedFormationForDetails(currentFormation)} 
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 active:scale-[0.98] dark:text-slate-950 ${focusRing}`}
                    >
                      <Info size={15} />
                      <span>Détails</span>
                    </button>

                    <button 
                      onClick={() => setSelectedFormationForFormateurs(currentFormation)} 
                      className={`flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-50 px-3 py-2.5 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 ${focusRing}`}
                    >
                      <Users size={15} />
                      <span>Formateurs</span>
                    </button>

                    <button 
                      onClick={() => handleOpenEdit(currentFormation)} 
                      className={`rounded-xl border border-slate-200 p-2.5 text-slate-600 dark:border-zinc-800 dark:text-zinc-400 ${focusRing}`}
                    >
                      <Edit3 size={15} />
                    </button>

                    <button 
                      onClick={() => handleDelete(currentFormation.id_formation)} 
                      className={`rounded-xl border border-slate-200 p-2.5 text-red-600 dark:border-zinc-800 dark:text-red-400 ${focusRing}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Création & Édition Formation */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            
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
                  value={formData.titre} 
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
                  value={formData.description} 
                  onChange={handleChange}
                  placeholder="Présentation générale des objectifs..."
                  className={`${inputClass} resize-none`} 
                />
              </div>

              {/* Section Image (Fichier ou URL) */}
              <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-zinc-800/60 dark:bg-zinc-800/30">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Image de couverture</label>
                  <div className="flex space-x-1 rounded-lg bg-slate-200/60 p-0.5 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => setImageInputType('url')}
                      className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold transition ${imageInputType === 'url' ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-slate-500 dark:text-zinc-400'}`}
                    >
                      <LinkIcon size={12} />
                      <span>URL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputType('file')}
                      className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold transition ${imageInputType === 'file' ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-700 dark:text-white' : 'text-slate-500 dark:text-zinc-400'}`}
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
                    value={formData.image_url} 
                    onChange={handleChange}
                    placeholder="https://images.unsplash.com/photo-..."
                    className={inputClass} 
                  />
                ) : (
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-orange-700 hover:file:bg-orange-100 dark:text-zinc-400 dark:file:bg-orange-500/10 dark:file:text-orange-400" 
                  />
                )}

                {formData.image_url && (
                  <div className="relative mt-2 h-24 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800">
                    <img src={formData.image_url} alt="Aperçu" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Date de début</label>
                  <input 
                    type="date" 
                    name="date_debut" 
                    required 
                    value={formData.date_debut} 
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
                    value={formData.date_fin} 
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
                    value={formData.date_limite_inscription} 
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
                    value={formData.capacite_max} 
                    onChange={handleChange}
                    className={inputClass} 
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-zinc-300">Statut</label>
                <select 
                  name="statut" 
                  value={formData.statut} 
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
                className={`mt-2 w-full rounded-xl bg-orange-500 py-3 text-xs font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
              >
                {uploadingImage ? "Téléversement..." : editingId ? "Mettre à jour" : "Créer la formation"}
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