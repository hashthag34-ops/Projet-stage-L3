// frontend/src/pages/Formateur/Apprenants.jsx
import { useEffect, useMemo, useState } from 'react';
import API from '../../services/api';
import '../css/Apprenants.css'; // Importation du CSS classique

const formatRate = (value) => `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`;
const formatDate = (value) => value ? String(value).slice(0, 10).split('-').reverse().join('/') : '—';

const BACKEND_URL = import.meta.env.VITE_URL;

const getAvatarSrc = (user) => {
  if (!user) return null;
  const avatar = user.photo_profil || user.photo;
  if (!avatar) return null;
  if (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.startsWith('blob:')) return avatar;
  return `${BACKEND_URL}/uploads/avatars/${avatar}`;
};

function UserAvatar({ user, size = "md" }) {
  const avatar = getAvatarSrc(user);
  const sizeClass = `avatar-${size}`;

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`${user.prenom || ''} ${user.nom || ''}`}
        className={`user-avatar object-cover ${sizeClass}`}
      />
    );
  }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  return (
    <div className={`user-avatar-initials ${sizeClass}`}>
      {initials || 'U'}
    </div>
  );
}

export default function FormateurApprenants() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [formationFilter, setFormationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentsError, setStudentsError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [grade, setGrade] = useState({ type_evaluation: 'Travaux pratiques', note: '', commentaire: '' });
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeMessage, setGradeMessage] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    let active = true;
    API.get('/formateur/apprenants')
      .then((response) => {
        if (active) setStudents(response.data);
      })
      .catch((error) => {
        if (active) setStudentsError(error.response?.data?.message || 'Impossible de charger les apprenants.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const formations = useMemo(() => {
    const uniqueFormations = new Map();
    students.forEach((student) => uniqueFormations.set(String(student.id_formation), student.formation_titre));
    return [...uniqueFormations].map(([id, titre]) => ({ id, titre }));
  }, [students]);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matchingStudents = students.filter((student) => {
      const matchesSearch = `${student.nom} ${student.prenom} ${student.email} ${student.formation_titre}`
        .toLowerCase().includes(query);
      return matchesSearch && (!formationFilter || String(student.id_formation) === formationFilter);
    });
    const grouped = new Map();
    matchingStudents.forEach((student) => {
      const key = String(student.id_formation);
      if (!grouped.has(key)) grouped.set(key, { id: key, titre: student.formation_titre, students: [] });
      grouped.get(key).students.push(student);
    });
    return [...grouped.values()];
  }, [students, search, formationFilter]);

  const openStudent = async (student) => {
    setSelectedStudent(student);
    setStudentDetails(null);
    setDetailsError('');
    setGradeMessage('');
    setGrade({ type_evaluation: 'Travaux pratiques', note: '', commentaire: '' });
    setDetailsLoading(true);
    setActiveMenu(null);
    try {
      const response = await API.get(`/formateur/apprenants/${student.id_apprenant}/formation/${student.id_formation}`);
      setStudentDetails(response.data);
    } catch (error) {
      setDetailsError(error.response?.data?.message || 'Impossible de charger les détails de cet apprenant.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const saveGrade = async (event) => {
    event.preventDefault();
    if (!selectedStudent) return;
    setSavingGrade(true);
    setGradeMessage('');
    try {
      await API.post(
        `/formateur/apprenants/${selectedStudent.id_apprenant}/formation/${selectedStudent.id_formation}/notes`,
        { ...grade, note: Number(grade.note) }
      );
      const response = await API.get(
        `/formateur/apprenants/${selectedStudent.id_apprenant}/formation/${selectedStudent.id_formation}`
      );
      setStudentDetails(response.data);
      setGrade({ type_evaluation: 'Travaux pratiques', note: '', commentaire: '' });
      setGradeMessage('Note enregistrée.');
    } catch (error) {
      setGradeMessage(error.response?.data?.message || 'Impossible d’enregistrer cette note.');
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <div className="apprenants-container">
      
      {/* En-tête style Datix */}
      <div className="apprenants-header-card">
        <div className="apprenants-header-title-box">
          <div className="apprenants-header-icon">
            <i className="bi bi-people text-lg"></i>
          </div>
          <div>
            <h1 className="apprenants-title">
              Users Management
            </h1>
            <p className="apprenants-subtitle">Consultez les apprenants et gérez les dossiers par formation.</p>
          </div>
        </div>

        {/* Recherche et Filtre */}
        <div className="apprenants-controls-box">
          <div className="apprenants-search-wrapper">
            <i className="bi bi-search search-icon"></i>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Here..."
              className="apprenants-search-input"
            />
          </div>

          <div className="apprenants-select-wrapper">
            <select
              value={formationFilter}
              onChange={(event) => setFormationFilter(event.target.value)}
              className="apprenants-select"
            >
              <option value="">Toutes les formations</option>
              {formations.map((formation) => (
                <option key={formation.id} value={formation.id}>{formation.titre}</option>
              ))}
            </select>
            <i className="bi bi-chevron-down select-chevron"></i>
          </div>
        </div>
      </div>

      {/* LISTE DES APPRENANTS EN MODE CARTES */}
      <section className="apprenants-section">
        {studentsError ? (
          <p role="alert" className="apprenants-error-alert">{studentsError}</p>
        ) : loading ? (
          <p className="apprenants-loading-text">Chargement des apprenants...</p>
        ) : groups.length === 0 ? (
          <div className="apprenants-empty-box">
            Aucun apprenant trouvé.
          </div>
        ) : (
          <div className="apprenants-groups-space">
            {groups.map((group) => (
              <div key={group.id} className="apprenants-group-container">
                <div className="apprenants-group-header">
                  <div className="apprenants-group-title-row">
                    <i className="bi bi-book text-orange-500 text-sm"></i>
                    <h3 className="apprenants-group-title">{group.titre}</h3>
                  </div>
                  <span className="apprenants-group-badge">
                    {group.students.length} membres
                  </span>
                </div>

                {/* GRILLE DE CARTES */}
                <div className="apprenants-cards-grid">
                  {group.students.map((student) => {
                    const studentKey = `${student.id_apprenant}-${student.id_formation}`;
                    const isMenuOpen = activeMenu === studentKey;

                    return (
                      <div
                        key={studentKey}
                        className="apprenant-card"
                      >
                        {/* Ligne du haut : Badge Actif et Menu Contextuel */}
                        <div className="apprenant-card-top">
                          <span className="apprenant-active-badge">
                            • Active
                          </span>
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(isMenuOpen ? null : studentKey)}
                              className="apprenant-menu-btn"
                            >
                              <i className="bi bi-three-dots-vertical text-sm"></i>
                            </button>

                            {/* Menu déroulant */}
                            {isMenuOpen && (
                              <div className="apprenant-dropdown-menu">
                                <button
                                  onClick={() => openStudent(student)}
                                  className="dropdown-item"
                                >
                                  <i className="bi bi-eye text-xs"></i> View
                                </button>
                                <a
                                  href={`mailto:${student.email}`}
                                  className="dropdown-item"
                                >
                                  <i className="bi bi-envelope text-xs"></i> Contact
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Infos utilisateur */}
                        <div className="apprenant-user-info">
                          <UserAvatar user={student} size="md" />
                          <div className="min-w-0 flex-1">
                            <h4 className="apprenant-name">
                              {student.prenom} {student.nom}
                            </h4>
                            <a
                              href={`mailto:${student.email}`}
                              className="apprenant-email"
                              title={student.email}
                            >
                              {student.email}
                            </a>
                          </div>
                        </div>

                        {/* Pied de carte */}
                        <div className="apprenant-card-footer">
                          <span className="apprenant-formation-label">
                            {student.formation_titre}
                          </span>
                          <button
                            onClick={() => openStudent(student)}
                            className="apprenant-details-link"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL DE DÉTAILS DE L'APPRENANT ET SAISIE DE NOTE */}
      {selectedStudent && (
        <div
          className="apprenants-modal-backdrop"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="apprenants-modal-card"
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-user-title">
                <UserAvatar user={selectedStudent} size="md" />
                <div>
                  <h3 className="modal-name">
                    {selectedStudent.prenom} {selectedStudent.nom}
                  </h3>
                  <a
                    href={`mailto:${selectedStudent.email}`}
                    className="modal-mail"
                  >
                    {selectedStudent.email}
                  </a>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="modal-close-btn"
              >
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            {/* Modal Body */}
            {detailsLoading ? (
              <p className="apprenants-loading-text">Chargement du dossier...</p>
            ) : detailsError ? (
              <p className="modal-error-alert">{detailsError}</p>
            ) : studentDetails && (
              <div className="modal-body">
                {/* Résumé Stats */}
                <div className="modal-stats-grid">
                  <div className="modal-stat-box">
                    <span className="modal-stat-title">Moyenne Générale</span>
                    <p className="modal-stat-value">
                      {studentDetails.average === null ? 'N/A' : `${Number(studentDetails.average).toFixed(2)} / 20`}
                    </p>
                  </div>
                  <div className="modal-stat-box">
                    <span className="modal-stat-title">Taux de Présence</span>
                    <p className="modal-stat-value orange">
                      {studentDetails.attendance.rate === null ? 'N/A' : formatRate(studentDetails.attendance.rate)}
                    </p>
                  </div>
                </div>

                {/* Liste des Notes */}
                <div>
                  <h4 className="modal-subtitle">Historique des Évaluations</h4>
                  {studentDetails.grades.length === 0 ? (
                    <div className="modal-empty-grades">
                      Aucune note enregistrée pour le moment.
                    </div>
                  ) : (
                    <div className="modal-grades-scroll">
                      {studentDetails.grades.map((item) => (
                        <div key={`${item.origine}-${item.id_note}`} className="modal-grade-item">
                          <div>
                            <p className="grade-type">{item.type_evaluation}</p>
                            <p className="grade-date">{formatDate(item.date_evaluation)}</p>
                          </div>
                          <span className="grade-val">
                            {Number(item.note)} / 20
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formulaire d'Ajout de Note */}
                <form onSubmit={saveGrade} className="modal-form-box">
                  <h4 className="modal-form-title">
                    <i className="bi bi-plus-circle text-orange-500"></i> Ajouter une Nouvelle Note
                  </h4>
                  <div className="modal-form-grid">
                    <input
                      required
                      value={grade.type_evaluation}
                      onChange={(e) => setGrade({ ...grade, type_evaluation: e.target.value })}
                      placeholder="Type (ex: TP, Examen)"
                      className="apprenants-input"
                    />
                    <input
                      required
                      type="number"
                      min="0"
                      max="20"
                      step="0.01"
                      value={grade.note}
                      onChange={(e) => setGrade({ ...grade, note: e.target.value })}
                      placeholder="Note / 20"
                      className="apprenants-input"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={grade.commentaire}
                    onChange={(e) => setGrade({ ...grade, commentaire: e.target.value })}
                    placeholder="Commentaire facultatif..."
                    className="apprenants-textarea mt-2"
                  />
                  <div className="modal-form-footer">
                    <span className="grade-success-msg">{gradeMessage}</span>
                    <button
                      disabled={savingGrade}
                      type="submit"
                      className="apprenants-submit-btn"
                    >
                      {savingGrade ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}