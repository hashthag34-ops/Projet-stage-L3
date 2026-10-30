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
import '../css/ResponsableFormations.css'; // Importation du CSS classique

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
    <div className="rf-modal-backdrop" onClick={onClose}>
      <div className="rf-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Bannière Image */}
        <div className="rf-modal-banner">
          {formation.image_url ? (
            <img 
              src={getFormationImageUrl(formation.image_url)}
              alt={formation.titre} 
              className="rf-modal-banner-img"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              onLoad={(e) => { e.currentTarget.style.display = ''; }}
            />
          ) : (
            <div className="rf-modal-banner-placeholder">
              <ImageIcon size={48} strokeWidth={1.5} />
            </div>
          )}
          <button 
            onClick={onClose}
            className="rf-modal-close-abs"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps du contenu */}
        <div className="rf-modal-body">
          <div>
            <span className={`rf-status-badge ${getStatusBadgeClass(formation.statut)}`}>
              <span className="rf-status-dot"></span>
              {formation.statut}
            </span>
            <h2 className="rf-modal-title">
              {formation.titre}
            </h2>
          </div>

          <p className="rf-modal-desc">
            {formation.description || "Aucune description fournie."}
          </p>

          {/* Grille d'infos */}
          <div className="rf-modal-info-grid">
            <div className="rf-info-box">
              <span className="rf-info-label">Période</span>
              <p className="rf-info-value">
                {formation.date_debut ? new Date(formation.date_debut).toLocaleDateString('fr-FR') : '-'} ➔ {formation.date_fin ? new Date(formation.date_fin).toLocaleDateString('fr-FR') : '-'}
              </p>
            </div>

            <div className="rf-info-box">
              <span className="rf-info-label">Limite d'inscription</span>
              <p className="rf-info-value">
                {formation.date_limite_inscription ? new Date(formation.date_limite_inscription).toLocaleDateString('fr-FR') : 'Non spécifiée'}
              </p>
            </div>

            <div className="rf-info-box full">
              <div className="rf-capacity-row">
                <span className="rf-info-label">Capacité d'accueil</span>
                <span className="rf-capacity-badge">
                  {formation.capacite_max || 0} places max
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="rf-submit-btn"
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
    <div className="rf-modal-backdrop" onClick={onClose}>
      <div className="rf-modal-card max-w-lg" onClick={(e) => e.stopPropagation()}>
        
        <div className="rf-modal-header">
          <div>
            <h2 className="rf-modal-heading">Gestion des intervenants</h2>
            <p className="rf-modal-subheading">
              Formation : <span className="highlight">{formation?.titre}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="rf-modal-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rf-section-space">
          <h3 className="rf-section-title">
            Formateurs actuellement assignés
          </h3>
          {loading ? (
            <div className="rf-loading-text">Chargement...</div>
          ) : assignedFormateurs.length === 0 ? (
            <div className="rf-empty-box">
              <p className="rf-empty-text">Aucun formateur affecté pour le moment.</p>
            </div>
          ) : (
            <div className="rf-assigned-list">
              {assignedFormateurs.map((f) => (
                <div key={f.id_formateur} className="rf-assigned-item">
                  <div className="rf-assigned-left">
                    <div className="rf-avatar-initials">
                      {f.prenom?.[0]}{f.nom?.[0]}
                    </div>
                    <div>
                      <p className="rf-assigned-name">{f.nom} {f.prenom}</p>
                      <span className="rf-role-tag">
                        {f.role_formateur || 'Intervenant'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemove(f.id_formateur)}
                    className="rf-remove-btn"
                    title="Retirer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleAssign} className="rf-assign-form">
          <h3 className="rf-section-title">
            Assigner un nouvel intervenant
          </h3>
          
          <div className="rf-form-fields">
            <div>
              <label className="rf-field-label">Sélectionner un formateur</label>
              <select 
                value={selectedFormateur || ''} 
                onChange={(e) => setSelectedFormateur(e.target.value)}
                className="rf-input"
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
              <label className="rf-field-label">Rôle attribué</label>
              <input 
                type="text" 
                placeholder="Ex: Formateur Principal, Intervenant..." 
                value={role || ''}
                onChange={(e) => setRole(e.target.value)}
                className="rf-input"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="rf-submit-btn icon"
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
    <div className="rf-container">
      
      {/* En-tête */}
      <header className="rf-header">
        <div>
          <div className="rf-header-tag">
            <Sparkles size={14} className="text-orange-500" />
            <span>Espace responsable</span>
          </div>
          <h1 className="rf-title">
            Gestion des formations
          </h1>
          <p className="rf-subtitle">
            Planifiez, administrez et affectez les formateurs à vos programmes d'apprentissage.
          </p>
        </div>

        <button 
          onClick={handleOpenCreate} 
          className="rf-create-btn"
        >
          <Plus size={16} />
          <span>Nouvelle formation</span>
        </button>
      </header>

      {/* Cartes KPI */}
      <div className="rf-kpi-grid">
        <div className="rf-kpi-card">
          <span className="rf-kpi-label">Total Formations</span>
          <p className="rf-kpi-value">{formations.length}</p>
        </div>

        <div className="rf-kpi-card">
          <span className="rf-kpi-label">Ouvertes</span>
          <p className="rf-kpi-value ouverte">{formations.filter(f => f.statut === 'OUVERTE').length}</p>
        </div>

        <div className="rf-kpi-card">
          <span className="rf-kpi-label">En Cours</span>
          <p className="rf-kpi-value encours">{formations.filter(f => f.statut === 'EN_COURS').length}</p>
        </div>

        <div className="rf-kpi-card">
          <span className="rf-kpi-label">Brouillons</span>
          <p className="rf-kpi-value brouillon">{formations.filter(f => f.statut === 'BROUILLON').length}</p>
        </div>
      </div>

      {/* Filtres & Recherche */}
      <div className="rf-filters-bar">
        <div className="rf-search-wrapper">
          <Search size={15} className="rf-search-icon" />
          <input 
            value={searchTerm || ''} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Rechercher par titre, description ou statut..." 
            className="rf-input pl-10" 
          />
        </div>
        <div className="rf-sort-wrapper">
          <select 
            value={sort || 'recent'} 
            onChange={(e) => setSort(e.target.value)} 
            className="rf-input cursor-pointer appearance-none pr-8"
          >
            <option value="recent">Tri : Plus récentes</option>
            <option value="title">Tri : Titre A-Z</option>
            <option value="status">Tri : Par statut</option>
          </select>
          <ArrowUpDown size={14} className="rf-sort-icon" />
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="rf-loading-panel">
          <p className="rf-loading-label">Chargement des formations...</p>
        </div>
      ) : filteredFormations.length === 0 ? (
        <div className="rf-empty-panel">
          <GraduationCap size={32} className="text-slate-300 dark:text-zinc-600" />
          <p className="rf-empty-title">Aucune formation trouvée</p>
          <p className="rf-empty-desc">Ajustez vos mots clés de recherche ou ajoutez un nouveau programme.</p>
        </div>
      ) : (
        <>
          {/* Vue Desktop (Tableau complet) */}
          <div className="rf-desktop-table-container">
            <div className="overflow-x-auto">
              <table className="rf-table">
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
                    <tr key={f.id_formation} className="rf-tr">
                      <td className="pl-5">
                        <div className="rf-td-title-group">
                          {f.image_url ? (
                            <img 
                              src={getFormationImageUrl(f.image_url)}
                              alt="" 
                              className="rf-td-img" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              onLoad={(e) => { e.currentTarget.style.display = ''; }}
                            />
                          ) : (
                            <div className="rf-td-icon">
                              <GraduationCap size={18} />
                            </div>
                          )}
                          <div>
                            <p className="rf-td-name">{f.titre}</p>
                            {f.description && (
                              <p className="rf-td-desc">
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
                      <td className="whitespace-nowrap rf-td-date">
                        {f.date_debut ? new Date(f.date_debut).toLocaleDateString('fr-FR') : '-'} 
                        <span className="separator">➔</span> 
                        {f.date_fin ? new Date(f.date_fin).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="whitespace-nowrap rf-td-capacity">
                        <span className="bold">{f.capacite_max}</span> places
                      </td>
                      <td className="pr-5 text-right whitespace-nowrap">
                        <div className="rf-actions-group">
                          <button 
                            onClick={() => setSelectedFormationForDetails(f)}
                            className="rf-action-icon-btn"
                            title="Fiche détaillée"
                          >
                            <Info size={16} />
                          </button>

                          <button 
                            onClick={() => setSelectedFormationForFormateurs(f)}
                            className="rf-action-pill-btn"
                          >
                            <Users size={13} />
                            <span>Formateurs</span>
                          </button>

                          <button 
                            onClick={() => handleOpenEdit(f)} 
                            className="rf-action-icon-btn"
                            title="Modifier"
                          >
                            <Edit3 size={15} />
                          </button>

                          <button 
                            onClick={() => handleDelete(f)} 
                            className="rf-action-icon-btn danger"
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
          <div className="rf-mobile-grid">
            {filteredFormations.map((f) => (
              <div key={f.id_formation} className="rf-mobile-card">
                <div>
                  <div className="rf-mobile-card-top">
                    <span className={`rf-status-badge ${getStatusBadgeClass(f.statut)}`}>
                      {f.statut}
                    </span>
                    <span className="rf-mobile-capacity">{f.capacite_max} max</span>
                  </div>

                  <div className="rf-mobile-title-group">
                    {f.image_url ? (
                      <img 
                        src={getFormationImageUrl(f.image_url)}
                        alt="" 
                        className="rf-mobile-img" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        onLoad={(e) => { e.currentTarget.style.display = ''; }}
                      />
                    ) : (
                      <div className="rf-mobile-icon">
                        <GraduationCap size={16} />
                      </div>
                    )}
                    <h3 className="rf-mobile-name">
                      {f.titre}
                    </h3>
                  </div>

                  <p className="rf-mobile-description">
                    {f.description || 'Aucune description'}
                  </p>
                </div>

                <div className="rf-mobile-footer">
                  <button 
                    onClick={() => setSelectedFormationForDetails(f)} 
                    className="rf-mobile-details-btn"
                  >
                    Détails
                  </button>
                  <button 
                    onClick={() => setSelectedFormationForFormateurs(f)} 
                    className="rf-mobile-icon-action"
                    title="Formateurs"
                  >
                    <Users size={14} />
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(f)} 
                    className="rf-mobile-icon-action"
                    title="Modifier"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(f)} 
                    className="rf-mobile-icon-action danger"
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
        <div className="rf-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="rf-modal-card max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            
            <div className="rf-modal-header">
              <h2 className="rf-modal-heading">
                {editingId ? "Modifier la formation" : "Nouvelle formation"}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="rf-modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="rf-form-space">
              <div>
                <label className="rf-field-label">Titre de la formation</label>
                <input 
                  type="text" 
                  name="titre" 
                  required 
                  value={formData.titre ?? ''} 
                  onChange={handleChange}
                  placeholder="Ex: Devenir Développeur Full-Stack"
                  className="rf-input" 
                />
              </div>

              <div>
                <label className="rf-field-label">Description</label>
                <textarea 
                  name="description" 
                  required 
                  rows="3"
                  value={formData.description ?? ''} 
                  onChange={handleChange}
                  placeholder="Présentation générale des objectifs..."
                  className="rf-input resize-none" 
                />
              </div>

              {/* Section Image (Fichier ou URL) */}
              <div className="rf-image-section">
                <div className="rf-image-header">
                  <label className="rf-field-label mb-0">Image de couverture</label>
                  <div className="rf-toggle-tabs">
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
                    className="rf-input" 
                  />
                ) : (
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileChange}
                    className="rf-file-input" 
                  />
                )}

                {imagePreviewUrl || formData.image_url ? (
                  <div className="rf-preview-box">
                    <img
                      src={getFormationImageUrl(imagePreviewUrl || formData.image_url)}
                      alt="Aperçu"
                      className="rf-preview-img"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      onLoad={(e) => { e.currentTarget.style.display = ''; }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="rf-form-grid-2">
                <div>
                  <label className="rf-field-label">Date de début</label>
                  <input 
                    type="date" 
                    name="date_debut" 
                    required 
                    value={formData.date_debut ?? ''} 
                    onChange={handleChange}
                    className="rf-input" 
                  />
                </div>
                <div>
                  <label className="rf-field-label">Date de fin</label>
                  <input 
                    type="date" 
                    name="date_fin" 
                    required 
                    value={formData.date_fin ?? ''} 
                    onChange={handleChange}
                    className="rf-input" 
                  />
                </div>
              </div>

              <div className="rf-form-grid-2">
                <div>
                  <label className="rf-field-label">Limite candidature</label>
                  <input 
                    type="date" 
                    name="date_limite_inscription" 
                    required 
                    value={formData.date_limite_inscription ?? ''} 
                    onChange={handleChange}
                    className="rf-input" 
                  />
                </div>
                <div>
                  <label className="rf-field-label">Capacité Max</label>
                  <input 
                    type="number" 
                    name="capacite_max" 
                    required 
                    value={formData.capacite_max ?? 20} 
                    onChange={handleChange}
                    className="rf-input" 
                  />
                </div>
              </div>

              <div>
                <label className="rf-field-label">Statut</label>
                <select 
                  name="statut" 
                  value={formData.statut ?? 'BROUILLON'} 
                  onChange={handleChange}
                  className="rf-input"
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
                className="rf-submit-btn icon mt-2"
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