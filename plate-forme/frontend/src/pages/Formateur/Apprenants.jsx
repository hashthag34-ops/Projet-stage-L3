// frontend/src/pages/Formateur/Apprenants.jsx
import { useEffect, useMemo, useState } from 'react';
import API from '../../services/api';

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
  const [attendanceStats, setAttendanceStats] = useState({ formations: [], seances: [], apprenants: [] });
  const [attendanceView, setAttendanceView] = useState('formation');

  useEffect(() => {
    let active = true;
    Promise.all([
      API.get('/formateur/apprenants'),
      API.get('/formateur/apprenants/statistiques')
    ])
      .then(([studentResponse, statsResponse]) => {
        if (active) {
          setStudents(studentResponse.data);
          setAttendanceStats(statsResponse.data);
        }
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
    <div className="apprenants-container [display:flex] [flex-direction:column] [gap:24px] [padding:12px_12px_48px_12px] [max-width:1280px] [margin:0_auto] [font-family:inherit] [color:var(--app-text)] [background-color:var(--app-bg)] [box-sizing:border-box] [min-height:100vh] [transition:background-color_0.3s_ease,_color_0.3s_ease]">
      
      {/* En-tête style Datix */}
      <div className="apprenants-header-card [display:flex] [flex-direction:column] [gap:16px] [background-color:var(--app-panel)] [padding:20px] [border-radius:24px] [border:1px_solid_var(--app-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box]">
        <div className="apprenants-header-title-box [display:flex] [align-items:center] [gap:12px]">
          <div className="apprenants-header-icon [display:flex] [height:40px] [width:40px] [flex-shrink:0] [align-items:center] [justify-content:center] [border-radius:16px] [background-color:var(--orange-bg-light)] [color:var(--orange-primary)]">
            <i className="bi bi-people text-lg"></i>
          </div>
          <div>
            <h1 className="apprenants-title [margin:0] [font-size:18px] [font-weight:800] [letter-spacing:-0.025em] [color:var(--app-text)]">
              Users Management
            </h1>
            <p className="apprenants-subtitle [margin:2px_0_0_0] [font-size:12px] [color:var(--app-muted)]">Consultez les apprenants et gérez les dossiers par formation.</p>
          </div>
        </div>

        {/* Recherche et Filtre */}
        <div className="apprenants-controls-box [display:flex] [flex-wrap:wrap] [align-items:center] [gap:12px]">
          <div className="apprenants-search-wrapper [position:relative] [width:100%]">
            <i className="bi bi-search search-icon [position:absolute] [left:14px] [top:50%] [transform:translateY(-50%)] [color:var(--app-muted)] [font-size:12px]"></i>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Here..."
              className="apprenants-search-input [width:100%] [border-radius:9999px] [background-color:var(--app-subbox)] [border:1px_solid_var(--app-border)] [padding:10px_14px_10px_36px] [font-size:12px] [color:var(--app-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
            />
          </div>

          <div className="apprenants-select-wrapper [position:relative] [width:100%]">
            <select
              value={formationFilter}
              onChange={(event) => setFormationFilter(event.target.value)}
              className="apprenants-select [appearance:none] [width:100%] [border-radius:9999px] [background-color:var(--app-subbox)] [border:1px_solid_var(--app-border)] [padding:10px_32px_10px_16px] [font-size:12px] [color:var(--app-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
            >
              <option value="">Toutes les formations</option>
              {formations.map((formation) => (
                <option key={formation.id} value={formation.id}>{formation.titre}</option>
              ))}
            </select>
            <i className="bi bi-chevron-down select-chevron [pointer-events:none] [position:absolute] [right:14px] [top:50%] [transform:translateY(-50%)] [color:var(--app-muted)] [font-size:10px]"></i>
          </div>
        </div>
      </div>

      <section className="apprenants-attendance-section [border:1px_solid_var(--app-border)] [border-radius:24px] [background:var(--app-panel)] [padding:20px]">
        <div className="apprenants-attendance-header [display:flex] [flex-direction:column] [gap:14px] [margin-bottom:16px]">
          <div>
            <h2>Taux de présence</h2>
            <p>Consultez les présences par formation, séance ou apprenant.</p>
          </div>
          <div className="apprenants-attendance-tabs [display:flex] [flex-wrap:wrap] [gap:8px]">
            <button type="button" className={attendanceView === 'formation' ? 'active' : ''} onClick={() => setAttendanceView('formation')}>Par formation</button>
            <button type="button" className={attendanceView === 'seance' ? 'active' : ''} onClick={() => setAttendanceView('seance')}>Par séance</button>
            <button type="button" className={attendanceView === 'apprenant' ? 'active' : ''} onClick={() => setAttendanceView('apprenant')}>Par apprenant</button>
          </div>
        </div>

        {attendanceView === 'formation' && (
          <div className="apprenants-attendance-grid [display:grid] [gap:12px] [grid-template-columns:repeat(auto-fit,_minmax(220px,_1fr))]">
            {attendanceStats.formations.map((formation) => (
              <div className="apprenants-attendance-card [display:flex] [flex-direction:column] [gap:5px] [border-radius:16px] [border:1px_solid_var(--app-border)] [background:var(--app-subbox)] [padding:16px]" key={formation.id_formation}>
                <strong>{formation.formation_titre}</strong>
                <span>{formatRate(formation.taux_presence)} présents</span>
                <small>{formation.presents} présents · {formation.absents} absents</small>
              </div>
            ))}
          </div>
        )}
        {attendanceView === 'seance' && (
          <div className="apprenants-attendance-table-wrap [overflow-x:auto]">
            <table className="apprenants-attendance-table [width:100%] [border-collapse:collapse] [font-size:12px]">
              <thead><tr><th>Séance</th><th>Formation</th><th>Date</th><th>Présence</th></tr></thead>
              <tbody>{attendanceStats.seances.map((seance) => (
                <tr key={seance.id_seance}>
                  <td>{seance.seance_titre || `Séance #${seance.id_seance}`}</td>
                  <td>{seance.formation_titre}</td>
                  <td>{formatDate(seance.date_seance)}</td>
                  <td><strong>{formatRate(seance.taux_presence)}</strong> <small>({seance.presents}/{seance.total_enregistres})</small></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {attendanceView === 'apprenant' && (
          <div className="apprenants-attendance-table-wrap [overflow-x:auto]">
            <table className="apprenants-attendance-table [width:100%] [border-collapse:collapse] [font-size:12px]">
              <thead><tr><th>Apprenant</th><th>Formation</th><th>Présences</th><th>Taux</th></tr></thead>
              <tbody>{attendanceStats.apprenants.map((student) => (
                <tr key={`${student.id_apprenant}-${student.id_formation}`}>
                  <td>{student.prenom} {student.nom}</td>
                  <td>{student.formation_titre}</td>
                  <td>{student.presents}/{student.total_seances}</td>
                  <td><strong>{formatRate(student.taux_presence)}</strong></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {/* LISTE DES APPRENANTS EN MODE CARTES */}
      <section className="apprenants-section [display:flex] [flex-direction:column] [gap:24px]">
        {studentsError ? (
          <p role="alert" className="apprenants-error-alert [border-radius:16px] [border:1px_solid_rgba(225,_29,_72,_0.3)] [background-color:rgba(225,_29,_72,_0.1)] [padding:16px] [font-size:12px] [color:\#e11d48]">{studentsError}</p>
        ) : loading ? (
          <p className="apprenants-loading-text [padding:48px_0] [text-align:center] [font-size:12px] [color:var(--app-muted)]">Chargement des apprenants...</p>
        ) : groups.length === 0 ? (
          <div className="apprenants-empty-box [border-radius:24px] [border:2px_dashed_var(--app-border)] [background-color:var(--app-panel)] [padding:48px_24px] [text-align:center] [font-size:12px] [color:var(--app-muted)]">
            Aucun apprenant trouvé.
          </div>
        ) : (
          <div className="apprenants-groups-space [display:flex] [flex-direction:column] [gap:24px]">
            {groups.map((group) => (
              <div key={group.id} className="apprenants-group-container [display:flex] [flex-direction:column] [gap:16px]">
                <div className="apprenants-group-header [display:flex] [align-items:center] [justify-content:space-between] [border-bottom:1px_solid_var(--app-border)] [padding-bottom:8px]">
                  <div className="apprenants-group-title-row [display:flex] [align-items:center] [gap:8px]">
                    <i className="bi bi-book text-orange-500 text-sm"></i>
                    <h3 className="apprenants-group-title [margin:0] [font-size:14px] [font-weight:800] [color:var(--app-text)]">{group.titre}</h3>
                  </div>
                  <span className="apprenants-group-badge [border-radius:9999px] [background-color:var(--app-subbox)] [padding:4px_10px] [font-size:10px] [font-weight:700] [color:var(--app-muted)]">
                    {group.students.length} membres
                  </span>
                </div>

                {/* GRILLE DE CARTES */}
                <div className="apprenants-cards-grid [display:grid] [gap:16px] [grid-template-columns:1fr]">
                  {group.students.map((student) => {
                    const studentKey = `${student.id_apprenant}-${student.id_formation}`;
                    const isMenuOpen = activeMenu === studentKey;

                    return (
                      <div
                        key={studentKey}
                        className="apprenant-card [display:flex] [flex-direction:column] [justify-content:space-between] [border-radius:24px] [background-color:var(--app-panel)] [padding:20px] [border:1px_solid_var(--app-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [transition:transform_0.2s,_box-shadow_0.2s] [box-sizing:border-box] [&:hover]:[box-shadow:0_8px_20px_var(--shadow-color)]"
                      >
                        {/* Ligne du haut : Badge Actif et Menu Contextuel */}
                        <div className="apprenant-card-top [display:flex] [align-items:center] [justify-content:space-between]">
                          <span className="apprenant-active-badge [border-radius:9999px] [background-color:rgba(16,_185,_129,_0.1)] [padding:2px_10px] [font-size:10px] [font-weight:700] [color:\#10b981]">
                            • Active
                          </span>
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(isMenuOpen ? null : studentKey)}
                              className="apprenant-menu-btn [border-radius:9999px] [padding:4px_8px] [color:var(--app-muted)] [background:none] [border:none] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:var(--app-hover)] [&:hover]:[color:var(--app-text)]"
                            >
                              <i className="bi bi-three-dots-vertical text-sm"></i>
                            </button>

                            {/* Menu déroulant */}
                            {isMenuOpen && (
                              <div className="apprenant-dropdown-menu [position:absolute] [right:0] [top:32px] [z-index:20] [width:140px] [border-radius:16px] [border:1px_solid_var(--app-border)] [background-color:var(--app-panel)] [padding:4px] [box-shadow:0_10px_25px_var(--shadow-color)] [box-sizing:border-box]">
                                <button
                                  onClick={() => openStudent(student)}
                                  className="dropdown-item [display:flex] [width:100%] [align-items:center] [gap:8px] [border-radius:12px] [padding:8px_12px] [text-align:left] [font-size:12px] [color:var(--app-text)] [background:none] [border:none] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:var(--app-hover)]"
                                >
                                  <i className="bi bi-eye text-xs"></i> View
                                </button>
                                <a
                                  href={`mailto:${student.email}`}
                                  className="dropdown-item [display:flex] [width:100%] [align-items:center] [gap:8px] [border-radius:12px] [padding:8px_12px] [text-align:left] [font-size:12px] [color:var(--app-text)] [background:none] [border:none] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:var(--app-hover)]"
                                >
                                  <i className="bi bi-envelope text-xs"></i> Contact
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Infos utilisateur */}
                        <div className="apprenant-user-info [margin:16px_0] [display:flex] [align-items:center] [gap:12px]">
                          <UserAvatar user={student} size="md" />
                          <div className="min-w-0 flex-1">
                            <h4 className="apprenant-name [margin:0] [font-size:13px] [font-weight:800] [color:var(--app-text)] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]">
                              {student.prenom} {student.nom}
                            </h4>
                            <a
                              href={`mailto:${student.email}`}
                              className="apprenant-email [display:block] [margin-top:2px] [font-size:11px] [color:var(--app-muted)] [text-decoration:none] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis] [transition:color_0.2s] [&:hover]:[color:var(--orange-primary)]"
                              title={student.email}
                            >
                              {student.email}
                            </a>
                          </div>
                        </div>

                        {/* Pied de carte */}
                        <div className="apprenant-card-footer [border-top:1px_solid_var(--app-border)] [padding-top:12px] [display:flex] [align-items:center] [justify-content:space-between]">
                          <span className="apprenant-formation-label [font-size:10px] [color:var(--app-muted)] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis] [max-width:130px]">
                            {student.formation_titre}
                          </span>
                          <button
                            onClick={() => openStudent(student)}
                            className="apprenant-details-link [font-size:12px] [font-weight:700] [color:var(--orange-primary)] [background:none] [border:none] [cursor:pointer] [padding:0] [&:hover]:[text-decoration:underline]"
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
          className="apprenants-modal-backdrop [position:fixed] [inset:0] [z-index:50] [display:flex] [align-items:center] [justify-content:center] [background-color:rgba(0,_0,_0,_0.6)] [backdrop-filter:blur(4px)] [padding:16px] [box-sizing:border-box]"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="apprenants-modal-card [max-height:90vh] [width:100%] [max-width:540px] [overflow-y:auto] [border-radius:24px] [background-color:var(--app-panel)] [padding:24px] [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.4)] [border:1px_solid_var(--app-border)] [box-sizing:border-box]"
          >
            {/* Modal Header */}
            <div className="modal-header [display:flex] [align-items:center] [justify-content:space-between] [border-bottom:1px_solid_var(--app-border)] [padding-bottom:16px]">
              <div className="modal-user-title [display:flex] [align-items:center] [gap:12px]">
                <UserAvatar user={selectedStudent} size="md" />
                <div>
                  <h3 className="modal-name [margin:0] [font-size:14px] [font-weight:800] [color:var(--app-text)]">
                    {selectedStudent.prenom} {selectedStudent.nom}
                  </h3>
                  <a
                    href={`mailto:${selectedStudent.email}`}
                    className="modal-mail [font-size:12px] [color:var(--orange-primary)] [text-decoration:none] [&:hover]:[text-decoration:underline]"
                  >
                    {selectedStudent.email}
                  </a>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="modal-close-btn [border-radius:9999px] [padding:6px_10px] [color:var(--app-muted)] [background:none] [border:none] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:var(--app-hover)] [&:hover]:[color:var(--app-text)]"
              >
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            {/* Modal Body */}
            {detailsLoading ? (
              <p className="apprenants-loading-text [padding:48px_0] [text-align:center] [font-size:12px] [color:var(--app-muted)]">Chargement du dossier...</p>
            ) : detailsError ? (
              <p className="modal-error-alert [margin:16px_0] [border-radius:12px] [background-color:rgba(225,_29,_72,_0.1)] [padding:12px] [font-size:12px] [color:\#e11d48]">{detailsError}</p>
            ) : studentDetails && (
              <div className="modal-body [margin-top:20px] [display:flex] [flex-direction:column] [gap:20px]">
                {/* Résumé Stats */}
                <div className="modal-stats-grid [display:grid] [grid-template-columns:repeat(2,_1fr)] [gap:12px]">
                  <div className="modal-stat-box [border-radius:16px] [background-color:var(--app-subbox)] [padding:14px] [border:1px_solid_var(--app-border)]">
                    <span className="modal-stat-title [font-size:10px] [text-transform:uppercase] [color:var(--app-muted)] [font-weight:700]">Moyenne Générale</span>
                    <p className="modal-stat-value [margin:4px_0_0_0] [font-size:16px] [font-weight:900] [color:var(--app-text)]">
                      {studentDetails.average === null ? 'N/A' : `${Number(studentDetails.average).toFixed(2)} / 20`}
                    </p>
                  </div>
                  <div className="modal-stat-box [border-radius:16px] [background-color:var(--app-subbox)] [padding:14px] [border:1px_solid_var(--app-border)]">
                    <span className="modal-stat-title [font-size:10px] [text-transform:uppercase] [color:var(--app-muted)] [font-weight:700]">Taux de Présence</span>
                    <p className="modal-stat-value [margin:4px_0_0_0] [font-size:16px] [font-weight:900] [color:var(--app-text)] orange">
                      {studentDetails.attendance.rate === null ? 'N/A' : formatRate(studentDetails.attendance.rate)}
                    </p>
                  </div>
                </div>

                {/* Liste des Notes */}
                <div>
                  <h4 className="modal-subtitle [margin:0_0_8px_0] [font-size:12px] [font-weight:800] [color:var(--app-text)]">Historique des Évaluations</h4>
                  {studentDetails.grades.length === 0 ? (
                    <div className="modal-empty-grades [border-radius:16px] [border:1px_dashed_var(--app-border)] [padding:16px] [text-align:center] [font-size:12px] [color:var(--app-muted)]">
                      Aucune note enregistrée pour le moment.
                    </div>
                  ) : (
                    <div className="modal-grades-scroll [max-height:150px] [overflow-y:auto] [display:flex] [flex-direction:column] [gap:8px] [padding-right:4px]">
                      {studentDetails.grades.map((item) => (
                        <div key={`${item.origine}-${item.id_note}`} className="modal-grade-item [display:flex] [align-items:center] [justify-content:space-between] [border-radius:16px] [background-color:var(--app-subbox)] [padding:12px_16px] [border:1px_solid_var(--app-border)]">
                          <div>
                            <p className="grade-type [margin:0] [font-size:12px] [font-weight:700] [color:var(--app-text)]">{item.type_evaluation}</p>
                            <p className="grade-date [margin:2px_0_0_0] [font-size:10px] [color:var(--app-muted)]">{formatDate(item.date_evaluation)}</p>
                          </div>
                          <span className="grade-val [font-size:12px] [font-weight:900] [color:\#10b981]">
                            {Number(item.note)} / 20
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formulaire d'Ajout de Note */}
                <form onSubmit={saveGrade} className="modal-form-box [border-radius:16px] [background-color:var(--app-subbox)] [padding:16px] [border:1px_solid_var(--app-border)]">
                  <h4 className="modal-form-title [margin:0_0_12px_0] [display:flex] [align-items:center] [gap:8px] [font-size:12px] [font-weight:800] [color:var(--app-text)]">
                    <i className="bi bi-plus-circle text-orange-500"></i> Ajouter une Nouvelle Note
                  </h4>
                  <div className="modal-form-grid [display:grid] [grid-template-columns:1fr] [gap:12px]">
                    <input
                      required
                      value={grade.type_evaluation}
                      onChange={(e) => setGrade({ ...grade, type_evaluation: e.target.value })}
                      placeholder="Type (ex: TP, Examen)"
                      className="apprenants-input [width:100%] [border-radius:12px] [border:1px_solid_var(--app-border)] [background-color:var(--app-panel)] [padding:10px_12px] [font-size:12px] [color:var(--app-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
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
                      className="apprenants-input [width:100%] [border-radius:12px] [border:1px_solid_var(--app-border)] [background-color:var(--app-panel)] [padding:10px_12px] [font-size:12px] [color:var(--app-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={grade.commentaire}
                    onChange={(e) => setGrade({ ...grade, commentaire: e.target.value })}
                    placeholder="Commentaire facultatif..."
                    className="apprenants-textarea [width:100%] [border-radius:12px] [border:1px_solid_var(--app-border)] [background-color:var(--app-panel)] [padding:10px_12px] [font-size:12px] [color:var(--app-text)] [outline:none] [resize:none] [box-sizing:border-box] [transition:border-color_0.2s] mt-2"
                  />
                  <div className="modal-form-footer [margin-top:12px] [display:flex] [align-items:center] [justify-content:space-between]">
                    <span className="grade-success-msg [font-size:10px] [font-weight:700] [color:\#10b981]">{gradeMessage}</span>
                    <button
                      disabled={savingGrade}
                      type="submit"
                      className="apprenants-submit-btn [border-radius:12px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:8px_16px] [font-size:12px] [font-weight:800] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s]"
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