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


const getStatusBadgeClass = (statut) => {
  switch (statut?.toUpperCase()) {
    case 'OUVERTE':
      return 'badge-ouverte';
    case 'EN_COURS':
      return 'badge-en-cours';
    case 'BROUILLON':
      return 'badge-brouillon';
    case 'TERMINEE':
      return 'badge-terminee';
    case 'ARCHIVEE':
    default:
      return 'badge-archivee';
  }
};

// --- COMPOSANT MODAL DETAILS FORMATION ---
function FormationDetailsModal({ formation, onClose }) {
  if (!formation) return null;

  return (
    <div className="rf-modal-backdrop [position:fixed] [inset:0] [z-index:50] [display:flex] [align-items:center] [justify-content:center] [background-color:rgba(0,_0,_0,_0.7)] [backdrop-filter:blur(4px)] [padding:16px] [box-sizing:border-box]" onClick={onClose}>
      <div className="rf-modal-card [width:100%] [max-width:480px] [border-radius:24px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)] [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.5)] [overflow:hidden] [box-sizing:border-box]" onClick={(e) => e.stopPropagation()}>
        
        {/* Bannière Image */}
        <div className="rf-modal-banner [position:relative] [height:180px] [width:100%] [background-color:var(--rf-subbox)]">
          {formation.image_url ? (
            <img 
              src={getFormationImageUrl(formation.image_url)}
              alt={formation.titre} 
              className="rf-modal-banner-img [height:100%] [width:100%] [object-fit:cover]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              onLoad={(e) => { e.currentTarget.style.display = ''; }}
            />
          ) : (
            <div className="rf-modal-banner-placeholder [display:flex] [height:100%] [width:100%] [align-items:center] [justify-content:center] [color:var(--rf-muted)]">
              <ImageIcon size={48} strokeWidth={1.5} />
            </div>
          )}
          <button 
            onClick={onClose}
            className="rf-modal-close-abs [position:absolute] [right:12px] [top:12px] [border-radius:12px] [background-color:rgba(0,_0,_0,_0.6)] [padding:6px] [color:\#ffffff] [border:none] [cursor:pointer] [backdrop-filter:blur(4px)]"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps du contenu */}
        <div className="rf-modal-body [padding:20px] [display:flex] [flex-direction:column] [gap:16px] [box-sizing:border-box]">
          <div>
            <span className={`rf-status-badge ${getStatusBadgeClass(formation.statut)}`}>
              <span className="rf-status-dot [height:6px] [width:6px] [border-radius:50%] [background-color:currentColor]"></span>
              {formation.statut}
            </span>
            <h2 className="rf-modal-title [margin:6px_0_0_0] [font-size:18px] [font-weight:900] [color:var(--rf-text)]">
              {formation.titre}
            </h2>
          </div>

          <p className="rf-modal-desc [margin:0] [font-size:12px] [color:var(--rf-muted)] [line-height:1.5]">
            {formation.description || "Aucune description fournie."}
          </p>

          {/* Grille d'infos */}
          <div className="rf-modal-info-grid [display:grid] [grid-template-columns:repeat(2,_1fr)] [gap:12px]">
            <div className="rf-info-box [border-radius:16px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px]">
              <span className="rf-info-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [color:var(--rf-muted)]">Période</span>
              <p className="rf-info-value [margin:4px_0_0_0] [font-size:12px] [font-weight:800] [color:var(--rf-text)]">
                {formation.date_debut ? new Date(formation.date_debut).toLocaleDateString('fr-FR') : '-'} ➔ {formation.date_fin ? new Date(formation.date_fin).toLocaleDateString('fr-FR') : '-'}
              </p>
            </div>

            <div className="rf-info-box [border-radius:16px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px]">
              <span className="rf-info-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [color:var(--rf-muted)]">Limite d'inscription</span>
              <p className="rf-info-value [margin:4px_0_0_0] [font-size:12px] [font-weight:800] [color:var(--rf-text)]">
                {formation.date_limite_inscription ? new Date(formation.date_limite_inscription).toLocaleDateString('fr-FR') : 'Non spécifiée'}
              </p>
            </div>

            <div className="rf-info-box [border-radius:16px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px] full">
              <div className="rf-capacity-row [display:flex] [align-items:center] [justify-content:space-between]">
                <span className="rf-info-label [display:block] [font-size:10px] [font-weight:800] [text-transform:uppercase] [color:var(--rf-muted)]">Capacité d'accueil</span>
                <span className="rf-capacity-badge [border-radius:8px] [background-color:var(--rf-hover)] [padding:4px_10px] [font-size:11px] [font-weight:800] [color:var(--rf-text)]">
                  {formation.capacite_max || 0} places max
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="rf-submit-btn [width:100%] [border-radius:14px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:12px] [font-size:12px] [font-weight:900] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [box-sizing:border-box] [&:hover]:[opacity:0.9]"
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
    <div className="rf-modal-backdrop [position:fixed] [inset:0] [z-index:50] [display:flex] [align-items:center] [justify-content:center] [background-color:rgba(0,_0,_0,_0.7)] [backdrop-filter:blur(4px)] [padding:16px] [box-sizing:border-box]" onClick={onClose}>
      <div className="rf-modal-card [width:100%] [max-width:480px] [border-radius:24px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)] [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.5)] [overflow:hidden] [box-sizing:border-box] max-w-lg" onClick={(e) => e.stopPropagation()}>
        
        <div className="rf-modal-header [display:flex] [align-items:flex-start] [justify-content:space-between] [border-bottom:1px_solid_var(--rf-border)] [padding:20px] [box-sizing:border-box]">
          <div>
            <h2 className="rf-modal-heading [margin:0] [font-size:16px] [font-weight:900] [color:var(--rf-text)]">Gestion des intervenants</h2>
            <p className="rf-modal-subheading [margin:4px_0_0_0] [font-size:11px] [color:var(--rf-muted)]">
              Formation : <span className="highlight">{formation?.titre}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="rf-modal-close-btn [border-radius:10px] [padding:6px] [background:none] [border:none] [cursor:pointer] [color:var(--rf-muted)] [&:hover]:[color:var(--rf-text)] [&:hover]:[background-color:var(--rf-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rf-section-space [padding:16px_20px_0_20px]">
          <h3 className="rf-section-title [margin:0_0_10px_0] [font-size:11px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--rf-muted)]">
            Formateurs actuellement assignés
          </h3>
          {loading ? (
            <div className="rf-loading-text [padding:16px] [text-align:center] [font-size:12px] [color:var(--rf-muted)]">Chargement...</div>
          ) : assignedFormateurs.length === 0 ? (
            <div className="rf-empty-box [border-radius:16px] [border:1px_dashed_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:16px] [text-align:center]">
              <p className="rf-empty-text [padding:16px] [text-align:center] [font-size:12px] [color:var(--rf-muted)]">Aucun formateur affecté pour le moment.</p>
            </div>
          ) : (
            <div className="rf-assigned-list [max-height:180px] [overflow-y:auto] [display:flex] [flex-direction:column] [gap:8px] [padding-right:4px]">
              {assignedFormateurs.map((f) => (
                <div key={f.id_formateur} className="rf-assigned-item [display:flex] [align-items:center] [justify-content:space-between] [border-radius:16px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px]">
                  <div className="rf-assigned-left [display:flex] [align-items:center] [gap:12px]">
                    <div className="rf-avatar-initials [display:flex] [height:32px] [width:32px] [align-items:center] [justify-content:center] [border-radius:10px] [background-color:var(--rf-border)] [font-size:11px] [font-weight:900] [color:var(--rf-text)]">
                      {f.prenom?.[0]}{f.nom?.[0]}
                    </div>
                    <div>
                      <p className="rf-assigned-name [margin:0] [font-size:12px] [font-weight:800] [color:var(--rf-text)]">{f.nom} {f.prenom}</p>
                      <span className="rf-role-tag [display:inline-block] [margin-top:2px] [border-radius:6px] [background-color:var(--rf-hover)] [padding:2px_6px] [font-size:10px] [font-weight:700] [color:var(--rf-muted)]">
                        {f.role_formateur || 'Intervenant'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(f.id_formateur)}
                    className="rf-remove-btn [border-radius:10px] [padding:6px] [background:none] [border:none] [cursor:pointer] [color:var(--rf-muted)] [transition:color_0.2s] [&:hover]:[color:\#e11d48]"
                    title="Retirer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleAssign} className="rf-assign-form [border-top:1px_solid_var(--rf-border)] [margin-top:16px] [padding:16px_20px_20px_20px] [box-sizing:border-box]">
          <h3 className="rf-section-title [margin:0_0_10px_0] [font-size:11px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--rf-muted)]">
            Assigner un nouvel intervenant
          </h3>
          
          <div className="rf-form-fields [display:flex] [flex-direction:column] [gap:12px] [margin-bottom:16px]">
            <div>
              <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px]">Sélectionner un formateur</label>
              <select 
                value={selectedFormateur || ''} 
                onChange={(e) => setSelectedFormateur(e.target.value)}
                className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
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
              <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px]">Rôle attribué</label>
              <input 
                type="text" 
                placeholder="Ex: Formateur Principal, Intervenant..." 
                value={role || ''}
                onChange={(e) => setRole(e.target.value)}
                className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="rf-submit-btn [width:100%] [border-radius:14px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:12px] [font-size:12px] [font-weight:900] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [box-sizing:border-box] [&:hover]:[opacity:0.9] icon"
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
    <div className="rf-container [margin:0_auto] [min-height:100vh] [max-width:1280px] [background-color:var(--rf-bg)] [padding:12px_12px_48px_12px] [color:var(--rf-text)] [font-family:inherit] [box-sizing:border-box] [transition:background-color_0.3s_ease,_color_0.3s_ease]">
      
      {/* En-tête */}
      <header className="rf-header [display:flex] [flex-direction:column] [gap:16px] [margin-bottom:24px]">
        <div>
          <div className="rf-header-tag [display:flex] [align-items:center] [gap:8px] [font-size:11px] [font-weight:700] [color:var(--rf-muted)]">
            <Sparkles size={14} className="text-orange-500" />
            <span>Espace responsable</span>
          </div>
          <h1 className="rf-title [margin:6px_0_0_0] [font-size:24px] [font-weight:900] [letter-spacing:-0.025em] [color:var(--rf-text)]">
            Gestion des formations
          </h1>
          <p className="rf-subtitle [margin:4px_0_0_0] [font-size:12px] [color:var(--rf-muted)]">
            Planifiez, administrez et affectez les formateurs à vos programmes d'apprentissage.
          </p>
        </div>

        <button 
          onClick={handleOpenCreate} 
          className="rf-create-btn [display:inline-flex] [align-items:center] [justify-content:center] [gap:8px] [border-radius:16px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:10px_18px] [font-size:12px] [font-weight:800] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [box-sizing:border-box] [&:hover]:[opacity:0.9]"
        >
          <Plus size={16} />
          <span>Nouvelle formation</span>
        </button>
      </header>

      {/* Cartes KPI */}
      <div className="rf-kpi-grid [display:grid] [grid-template-columns:repeat(2,_1fr)] [gap:12px] [margin-bottom:24px]">
        <div className="rf-kpi-card [border-radius:24px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)] [padding:16px] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box]">
          <span className="rf-kpi-label [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [text-transform:uppercase] [letter-spacing:0.05em]">Total Formations</span>
          <p className="rf-kpi-value [margin:8px_0_0_0] [font-size:22px] [font-weight:900] [color:var(--rf-text)]">{formations.length}</p>
        </div>

        <div className="rf-kpi-card [border-radius:24px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)] [padding:16px] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box]">
          <span className="rf-kpi-label [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [text-transform:uppercase] [letter-spacing:0.05em]">Ouvertes</span>
          <p className="rf-kpi-value [margin:8px_0_0_0] [font-size:22px] [font-weight:900] [color:var(--rf-text)] ouverte">{formations.filter(f => f.statut === 'OUVERTE').length}</p>
        </div>

        <div className="rf-kpi-card [border-radius:24px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)] [padding:16px] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box]">
          <span className="rf-kpi-label [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [text-transform:uppercase] [letter-spacing:0.05em]">En Cours</span>
          <p className="rf-kpi-value [margin:8px_0_0_0] [font-size:22px] [font-weight:900] [color:var(--rf-text)] encours">{formations.filter(f => f.statut === 'EN_COURS').length}</p>
        </div>

        <div className="rf-kpi-card [border-radius:24px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)] [padding:16px] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box]">
          <span className="rf-kpi-label [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [text-transform:uppercase] [letter-spacing:0.05em]">Brouillons</span>
          <p className="rf-kpi-value [margin:8px_0_0_0] [font-size:22px] [font-weight:900] [color:var(--rf-text)] brouillon">{formations.filter(f => f.statut === 'BROUILLON').length}</p>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="rf-filters-bar [display:flex] [flex-direction:column] [gap:12px] [margin-bottom:24px]">
        <div className="rf-search-wrapper [position:relative] [flex:1]">
          <Search size={15} className="rf-search-icon [position:absolute] [left:14px] [top:50%] [transform:translateY(-50%)] [color:var(--rf-muted)]" />
          <input 
            value={searchTerm || ''} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Rechercher par titre, description ou statut..." 
            className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] pl-10" 
          />
        </div>
        <div className="rf-sort-wrapper [position:relative] [width:100%]">
          <select 
            value={sort || 'recent'} 
            onChange={(e) => setSort(e.target.value)} 
            className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] cursor-pointer appearance-none pr-8"
          >
            <option value="recent">Tri : Plus récentes</option>
            <option value="title">Tri : Titre A-Z</option>
            <option value="status">Tri : Par statut</option>
          </select>
          <ArrowUpDown size={14} className="rf-sort-icon [pointer-events:none] [position:absolute] [right:14px] [top:50%] [transform:translateY(-50%)] [color:var(--rf-muted)]" />
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="rf-loading-panel [display:flex] [height:250px] [align-items:center] [justify-content:center] [border-radius:24px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)]">
          <p className="rf-loading-label [font-size:12px] [font-weight:600] [color:var(--rf-muted)]">Chargement des formations...</p>
        </div>
      ) : filteredFormations.length === 0 ? (
        <div className="rf-empty-panel [display:flex] [flex-direction:column] [align-items:center] [justify-content:center] [border-radius:24px] [border:2px_dashed_var(--rf-border)] [background-color:var(--rf-panel)] [padding:48px_24px] [text-align:center] [box-sizing:border-box]">
          <GraduationCap size={32} className="text-slate-300 dark:text-zinc-600" />
          <p className="rf-empty-title [margin:12px_0_4px_0] [font-size:14px] [font-weight:800] [color:var(--rf-text)]">Aucune formation trouvée</p>
          <p className="rf-empty-desc [margin:0] [font-size:12px] [color:var(--rf-muted)]">Ajustez vos mots clés de recherche ou ajoutez un nouveau programme.</p>
        </div>
      ) : (
        <>
          {/* Vue Desktop (Tableau complet) */}
          <div className="rf-desktop-table-container [display:none] [border-radius:24px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)] [box-shadow:0_1px_3px_var(--shadow-color)] [overflow:hidden]">
            <div className="overflow-x-auto">
              <table className="rf-table [width:100%] [text-align:left] [font-size:12px] [border-collapse:collapse]">
                <thead>
                  <tr>
                    <th className="pl-5">Formation</th>
                    <th>Statut</th>
                    <th>Période</th>
                    <th>Capacité</th>
                    <th className="pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFormations.map((f) => (
                    <tr key={f.id_formation} className="rf-tr [transition:background-color_0.2s] [border-bottom:1px_solid_var(--rf-border)] [&:hover]:[background-color:var(--rf-hover)]">
                      <td className="pl-5">
                        <div className="rf-td-title-group [display:flex] [align-items:center] [gap:12px]">
                          {f.image_url ? (
                            <img 
                              src={getFormationImageUrl(f.image_url)}
                              alt="" 
                              className="rf-td-img [height:40px] [width:40px] [border-radius:12px] [object-fit:cover] [border:1px_solid_var(--rf-border)] [flex-shrink:0]" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              onLoad={(e) => { e.currentTarget.style.display = ''; }}
                            />
                          ) : (
                            <div className="rf-td-icon [display:flex] [height:40px] [width:40px] [align-items:center] [justify-content:center] [border-radius:12px] [background-color:var(--rf-subbox)] [font-weight:800] [color:var(--rf-text)] [flex-shrink:0]">
                              <GraduationCap size={18} />
                            </div>
                          )}
                          <div>
                            <p className="rf-td-name [margin:0] [font-weight:800] [color:var(--rf-text)]">{f.titre}</p>
                            {f.description && (
                              <p className="rf-td-desc [margin:2px_0_0_0] [max-width:240px] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis] [font-size:11px] [color:var(--rf-muted)]">
                                {f.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={`rf-table-status-badge ${getStatusBadgeClass(f.statut)}`}>
                          {f.statut}
                        </span>
                      </td>
                      <td className="whitespace-nowrap rf-td-date [font-size:11px] [font-weight:700] [color:var(--rf-text)]">
                        {f.date_debut ? new Date(f.date_debut).toLocaleDateString('fr-FR') : '-'} 
                        <span className="separator">➔</span> 
                        {f.date_fin ? new Date(f.date_fin).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="whitespace-nowrap rf-td-capacity [font-weight:600] [color:var(--rf-muted)]">
                        <span className="bold">{f.capacite_max}</span> places
                      </td>
                      <td className="pr-5 text-right whitespace-nowrap">
                        <div className="rf-actions-group [display:flex] [align-items:center] [justify-content:flex-end] [gap:6px]">
                          <button 
                            onClick={() => setSelectedFormationForDetails(f)}
                            className="rf-action-icon-btn [border-radius:10px] [padding:8px] [background:none] [border:none] [cursor:pointer] [color:var(--rf-muted)] [transition:background-color_0.2s,_color_0.2s] [&:hover]:[background-color:var(--rf-hover)] [&:hover]:[color:var(--rf-text)]"
                            title="Fiche détaillée"
                          >
                            <Info size={16} />
                          </button>

                          <button 
                            onClick={() => setSelectedFormationForFormateurs(f)}
                            className="rf-action-pill-btn [display:inline-flex] [align-items:center] [gap:6px] [border-radius:10px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:6px_10px] [font-size:11px] [font-weight:800] [color:var(--rf-text)] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:var(--rf-hover)]"
                          >
                            <Users size={13} />
                            <span>Formateurs</span>
                          </button>

                          <button 
                            onClick={() => handleOpenEdit(f)} 
                            className="rf-action-icon-btn [border-radius:10px] [padding:8px] [background:none] [border:none] [cursor:pointer] [color:var(--rf-muted)] [transition:background-color_0.2s,_color_0.2s] [&:hover]:[background-color:var(--rf-hover)] [&:hover]:[color:var(--rf-text)]"
                            title="Modifier"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button 
                            onClick={() => handleDelete(f)} 
                            className="rf-action-icon-btn [border-radius:10px] [padding:8px] [background:none] [border:none] [cursor:pointer] [color:var(--rf-muted)] [transition:background-color_0.2s,_color_0.2s] [&:hover]:[background-color:var(--rf-hover)] [&:hover]:[color:var(--rf-text)] danger"
                            title="Supprimer ou archiver"
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

          {/* Vue Mobile & Tablette en Grille Compacte */}
          <div className="rf-mobile-grid [display:grid] [grid-template-columns:repeat(2,_1fr)] [gap:12px]">
            {filteredFormations.map((f) => (
              <div key={f.id_formation} className="rf-mobile-card [display:flex] [flex-direction:column] [justify-content:space-between] [border-radius:20px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)] [padding:14px] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box]">
                <div>
                  <div className="rf-mobile-card-top [display:flex] [align-items:center] [justify-content:space-between] [margin-bottom:8px]">
                    <span className={`rf-status-badge ${getStatusBadgeClass(f.statut)}`}>
                      {f.statut}
                    </span>
                    <span className="rf-mobile-capacity [font-size:10px] [font-weight:700] [color:var(--rf-muted)]">{f.capacite_max} max</span>
                  </div>

                  <div className="rf-mobile-title-group [display:flex] [align-items:center] [gap:8px] [margin-bottom:8px]">
                    {f.image_url ? (
                      <img 
                        src={getFormationImageUrl(f.image_url)}
                        alt="" 
                        className="rf-mobile-img [height:36px] [width:36px] [border-radius:10px] [object-fit:cover] [flex-shrink:0] [border:1px_solid_var(--rf-border)]" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        onLoad={(e) => { e.currentTarget.style.display = ''; }}
                      />
                    ) : (
                      <div className="rf-mobile-icon [display:flex] [height:36px] [width:36px] [align-items:center] [justify-content:center] [border-radius:10px] [background-color:var(--rf-subbox)] [font-weight:800] [color:var(--rf-text)] [flex-shrink:0]">
                        <GraduationCap size={16} />
                      </div>
                    )}
                    <h3 className="rf-mobile-name [margin:0] [font-size:12px] [font-weight:800] [color:var(--rf-text)] [display:-webkit-box] [-webkit-line-clamp:2] [line-clamp:2] [-webkit-box-orient:vertical] [overflow:hidden]">
                      {f.titre}
                    </h3>
                  </div>

                  <p className="rf-mobile-description [margin:0_0_12px_0] [font-size:10px] [color:var(--rf-muted)] [display:-webkit-box] [-webkit-line-clamp:1] [line-clamp:1] [-webkit-box-orient:vertical] [overflow:hidden]">
                    {f.description || 'Aucune description'}
                  </p>
                </div>

                <div className="rf-mobile-footer [border-top:1px_solid_var(--rf-border)] [padding-top:8px] [display:flex] [align-items:center] [justify-content:space-between] [gap:4px]">
                  <button 
                    onClick={() => setSelectedFormationForDetails(f)} 
                    className="rf-mobile-details-btn [flex:1] [border-radius:10px] [background-color:var(--rf-subbox)] [padding:6px_0] [font-size:10px] [font-weight:800] [color:var(--rf-text)] [border:none] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:var(--rf-hover)]"
                  >
                    Détails
                  </button>
                  <button 
                    onClick={() => setSelectedFormationForFormateurs(f)} 
                    className="rf-mobile-icon-action [border-radius:10px] [border:1px_solid_var(--rf-border)] [padding:6px] [background-color:var(--rf-subbox)] [color:var(--rf-text)] [cursor:pointer] [display:flex] [align-items:center] [justify-content:center]"
                    title="Formateurs"
                  >
                    <Users size={14} />
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(f)} 
                    className="rf-mobile-icon-action [border-radius:10px] [border:1px_solid_var(--rf-border)] [padding:6px] [background-color:var(--rf-subbox)] [color:var(--rf-text)] [cursor:pointer] [display:flex] [align-items:center] [justify-content:center]"
                    title="Modifier"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(f)} 
                    className="rf-mobile-icon-action [border-radius:10px] [border:1px_solid_var(--rf-border)] [padding:6px] [background-color:var(--rf-subbox)] [color:var(--rf-text)] [cursor:pointer] [display:flex] [align-items:center] [justify-content:center] danger"
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
        <div className="rf-modal-backdrop [position:fixed] [inset:0] [z-index:50] [display:flex] [align-items:center] [justify-content:center] [background-color:rgba(0,_0,_0,_0.7)] [backdrop-filter:blur(4px)] [padding:16px] [box-sizing:border-box]" onClick={() => setShowModal(false)}>
          <div className="rf-modal-card [width:100%] [max-width:480px] [border-radius:24px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-panel)] [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.5)] [overflow:hidden] [box-sizing:border-box] max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            
            <div className="rf-modal-header [display:flex] [align-items:flex-start] [justify-content:space-between] [border-bottom:1px_solid_var(--rf-border)] [padding:20px] [box-sizing:border-box]">
              <h2 className="rf-modal-heading [margin:0] [font-size:16px] [font-weight:900] [color:var(--rf-text)]">
                {editingId ? "Modifier la formation" : "Nouvelle formation"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="rf-modal-close-btn [border-radius:10px] [padding:6px] [background:none] [border:none] [cursor:pointer] [color:var(--rf-muted)] [&:hover]:[color:var(--rf-text)] [&:hover]:[background-color:var(--rf-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="rf-form-space [padding:20px] [display:flex] [flex-direction:column] [gap:12px] [box-sizing:border-box]">
              <div>
                <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px]">Titre de la formation</label>
                <input 
                  type="text" 
                  name="titre" 
                  required 
                  value={formData.titre ?? ''} 
                  onChange={handleChange}
                  placeholder="Ex: Devenir Développeur Full-Stack"
                  className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" 
                />
              </div>

              <div>
                <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px]">Description</label>
                <textarea 
                  name="description" 
                  required 
                  rows="3"
                  value={formData.description ?? ''} 
                  onChange={handleChange}
                  placeholder="Présentation générale des objectifs..."
                  className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] resize-none" 
                />
              </div>

              {/* Section Image (Fichier ou URL) */}
              <div className="rf-image-section [border-radius:16px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px]">
                <div className="rf-image-header [display:flex] [align-items:center] [justify-content:space-between] [margin-bottom:8px]">
                  <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px] mb-0">Image de couverture</label>
                  <div className="rf-toggle-tabs [display:flex] [gap:4px] [border-radius:10px] [background-color:var(--rf-border)] [padding:2px]">
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
                      className={`rf-toggle-tab ${imageInputType === 'url' ? 'active' : ''}`}
                    >
                      <LinkIcon size={12} />
                      <span>URL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputType('file')}
                      className={`rf-toggle-tab ${imageInputType === 'file' ? 'active' : ''}`}
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
                    className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" 
                  />
                ) : (
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="rf-file-input [width:100%] [font-size:11px] [color:var(--rf-muted)]" 
                  />
                )}

                {imagePreviewUrl || formData.image_url ? (
                  <div className="rf-preview-box [margin-top:8px] [height:96px] [width:100%] [overflow:hidden] [border-radius:12px] [border:1px_solid_var(--rf-border)]">
                    <img
                      src={getFormationImageUrl(imagePreviewUrl || formData.image_url)}
                      alt="Aperçu"
                      className="rf-preview-img [height:100%] [width:100%] [object-fit:cover]"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      onLoad={(e) => { e.currentTarget.style.display = ''; }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="rf-form-grid-2 [display:grid] [grid-template-columns:1fr] [gap:12px]">
                <div>
                  <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px]">Date de début</label>
                  <input 
                    type="date" 
                    name="date_debut" 
                    required 
                    value={formData.date_debut ?? ''} 
                    onChange={handleChange}
                    disabled={editingId && !['BROUILLON', 'OUVERTE'].includes(editingStatus)}
                    className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" 
                  />
                </div>
                <div>
                  <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px]">Date de fin</label>
                  <input 
                    type="date" 
                    name="date_fin" 
                    required 
                    value={formData.date_fin ?? ''} 
                    onChange={handleChange}
                    disabled={editingId && ['TERMINEE', 'ARCHIVEE'].includes(editingStatus)}
                    className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" 
                  />
                </div>
              </div>

              <div className="rf-form-grid-2 [display:grid] [grid-template-columns:1fr] [gap:12px]">
                <div>
                  <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px]">Limite candidature</label>
                  <input 
                    type="date" 
                    name="date_limite_inscription" 
                    required 
                    value={formData.date_limite_inscription ?? ''} 
                    onChange={handleChange}
                    disabled={editingId && !['BROUILLON', 'OUVERTE'].includes(editingStatus)}
                    className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" 
                  />
                </div>
                <div>
                  <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px]">Capacité Max</label>
                  <input 
                    type="number" 
                    name="capacite_max" 
                    required 
                    value={formData.capacite_max ?? 20} 
                    onChange={handleChange}
                    disabled={editingId && !['BROUILLON', 'OUVERTE'].includes(editingStatus)}
                    className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" 
                  />
                </div>
              </div>

              <div>
                <label className="rf-field-label [display:block] [font-size:11px] [font-weight:700] [color:var(--rf-muted)] [margin-bottom:4px]">Statut</label>
                <select 
                  name="statut" 
                  value={formData.statut ?? 'BROUILLON'} 
                  onChange={handleChange}
                  disabled={editingId && !['BROUILLON', 'OUVERTE'].includes(editingStatus)}
                  className="rf-input [width:100%] [border-radius:14px] [border:1px_solid_var(--rf-border)] [background-color:var(--rf-subbox)] [padding:12px_14px] [font-size:12px] [font-weight:600] [color:var(--rf-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
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
                className="rf-submit-btn [width:100%] [border-radius:14px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:12px] [font-size:12px] [font-weight:900] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [box-sizing:border-box] [&:hover]:[opacity:0.9] icon mt-2"
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