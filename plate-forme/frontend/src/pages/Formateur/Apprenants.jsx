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
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-16 w-16 text-lg'
  };

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`${user.prenom || ''} ${user.nom || ''}`}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-orange-500/20`}
      />
    );
  }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  return (
    <div className={`flex items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200 ${sizeClasses[size]}`}>
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
    <div className="space-y-8 p-3 sm:p-6 text-slate-800 dark:text-zinc-100 font-sans transition-colors duration-300">
      
      {/* En-tête style Datix */}
      <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <i className="bi bi-people text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-slate-900 dark:text-white">
              Users Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Consultez les apprenants et gérez les dossiers par formation.</p>
          </div>
        </div>

        {/* Recherche et Filtre */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Here..."
              className="w-full rounded-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 py-2 pl-9 pr-4 text-xs text-slate-800 dark:text-zinc-200 outline-none focus:border-orange-500 transition"
            />
          </div>

          <div className="relative">
            <select
              value={formationFilter}
              onChange={(event) => setFormationFilter(event.target.value)}
              className="appearance-none rounded-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-4 py-2 pr-8 text-xs text-slate-700 dark:text-zinc-300 outline-none focus:border-orange-500"
            >
              <option value="">Toutes les formations</option>
              {formations.map((formation) => (
                <option key={formation.id} value={formation.id}>{formation.titre}</option>
              ))}
            </select>
            <i className="bi bi-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
          </div>
        </div>
      </div>

      {/* LISTE DES APPRENANTS EN MODE CARTES (STYLE IMAGE) */}
      <section className="space-y-6">
        {studentsError ? (
          <p role="alert" className="rounded-2xl bg-orange-500/10 p-4 text-xs text-orange-600 dark:text-orange-400">{studentsError}</p>
        ) : loading ? (
          <p className="py-12 text-center text-xs text-slate-400">Chargement des apprenants...</p>
        ) : groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 p-12 text-center text-xs text-slate-400">
            Aucun apprenant trouvé.
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <i className="bi bi-book text-orange-500 text-sm"></i>
                    <h3 className="text-sm font-medium text-slate-900 dark:text-white">{group.titre}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 text-[10px] text-slate-600 dark:text-zinc-400">
                    {group.students.length} membres
                  </span>
                </div>

                {/* GRILLE DE CARTES SEMBLABLE À L'IMAGE */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.students.map((student) => {
                    const studentKey = `${student.id_apprenant}-${student.id_formation}`;
                    const isMenuOpen = activeMenu === studentKey;

                    return (
                      <div
                        key={studentKey}
                        className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-zinc-900 p-5 border border-slate-200/80 dark:border-zinc-800 shadow-sm hover:shadow-md transition"
                      >
                        {/* Ligne du haut : Badge Actif et Menu Contextuel */}
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                            • Active
                          </span>
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(isMenuOpen ? null : studentKey)}
                              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                            >
                              <i className="bi bi-three-dots-vertical text-sm"></i>
                            </button>

                            {/* Menu déroulant comme sur l'image */}
                            {isMenuOpen && (
                              <div className="absolute right-0 top-8 z-20 w-36 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1 shadow-lg">
                                <button
                                  onClick={() => openStudent(student)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition"
                                >
                                  <i className="bi bi-eye text-xs"></i> View
                                </button>
                                <a
                                  href={`mailto:${student.email}`}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition"
                                >
                                  <i className="bi bi-envelope text-xs"></i> Contact
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Infos utilisateur */}
                        <div className="my-4 flex items-center gap-3">
                          <UserAvatar user={student} size="md" />
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xs font-medium text-slate-900 dark:text-white">
                              {student.prenom} {student.nom}
                            </h4>
                            <a
                              href={`mailto:${student.email}`}
                              className="block truncate text-[11px] text-slate-400 hover:text-orange-500"
                              title={student.email}
                            >
                              {student.email}
                            </a>
                          </div>
                        </div>

                        {/* Pied de carte */}
                        <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="truncate text-[10px] text-slate-400">
                              {student.formation_titre}
                            </span>
                            <button
                              onClick={() => openStudent(student)}
                              className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                            >
                              Details
                            </button>
                          </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <UserAvatar user={selectedStudent} size="md" />
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedStudent.prenom} {selectedStudent.nom}
                  </h3>
                  <a
                    href={`mailto:${selectedStudent.email}`}
                    className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    {selectedStudent.email}
                  </a>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            {/* Modal Body */}
            {detailsLoading ? (
              <p className="py-10 text-center text-xs text-slate-400">Chargement du dossier...</p>
            ) : detailsError ? (
              <p className="my-4 rounded-xl bg-orange-500/10 p-3 text-xs text-orange-600">{detailsError}</p>
            ) : studentDetails && (
              <div className="mt-4 space-y-5">
                {/* Résumé Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 dark:bg-zinc-950 p-3.5 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] uppercase text-slate-400">Moyenne Générale</span>
                    <p className="mt-1 text-base text-slate-900 dark:text-white">
                      {studentDetails.average === null ? 'N/A' : `${Number(studentDetails.average).toFixed(2)} / 20`}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-zinc-950 p-3.5 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[10px] uppercase text-slate-400">Taux de Présence</span>
                    <p className="mt-1 text-base text-orange-600 dark:text-orange-400">
                      {studentDetails.attendance.rate === null ? 'N/A' : formatRate(studentDetails.attendance.rate)}
                    </p>
                  </div>
                </div>

                {/* Liste des Notes */}
                <div>
                  <h4 className="mb-2 text-xs text-slate-900 dark:text-white">Historique des Évaluations</h4>
                  {studentDetails.grades.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 p-4 text-center text-xs text-slate-400">
                      Aucune note enregistrée pour le moment.
                    </p>
                  ) : (
                    <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                      {studentDetails.grades.map((item) => (
                        <div key={`${item.origine}-${item.id_note}`} className="flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-zinc-950 p-3 border border-slate-200 dark:border-zinc-800">
                          <div>
                            <p className="text-xs text-slate-800 dark:text-zinc-200">{item.type_evaluation}</p>
                            <p className="text-[10px] text-slate-400">{formatDate(item.date_evaluation)}</p>
                          </div>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            {Number(item.note)} / 20
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formulaire d'Ajout de Note */}
                <form onSubmit={saveGrade} className="rounded-2xl bg-slate-50 dark:bg-zinc-950 p-4 border border-slate-200 dark:border-zinc-800">
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs text-slate-900 dark:text-white">
                    <i className="bi bi-plus-circle text-orange-500"></i> Ajouter une Nouvelle Note
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      required
                      value={grade.type_evaluation}
                      onChange={(e) => setGrade({ ...grade, type_evaluation: e.target.value })}
                      placeholder="Type (ex: TP, Examen)"
                      className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 text-xs text-slate-800 dark:text-zinc-200 outline-none focus:border-orange-500"
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
                      className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 text-xs text-slate-800 dark:text-zinc-200 outline-none focus:border-orange-500"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={grade.commentaire}
                    onChange={(e) => setGrade({ ...grade, commentaire: e.target.value })}
                    placeholder="Commentaire facultatif..."
                    className="mt-2 w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 text-xs text-slate-800 dark:text-zinc-200 outline-none focus:border-orange-500 resize-none"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-600">{gradeMessage}</span>
                    <button
                      disabled={savingGrade}
                      type="submit"
                      className="rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs text-white shadow-sm transition disabled:opacity-50"
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