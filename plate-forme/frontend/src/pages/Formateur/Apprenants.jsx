// frontend/src/pages/Formateur/Apprenants.jsx
import { useEffect, useMemo, useState } from 'react';
import API from '../../services/api';
import { Search, ChevronDown, Users, BookOpen, Eye, Mail, X, Plus, GraduationCap } from 'lucide-react';

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

const cardClass = 'rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-6';
const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';

function UserAvatar({ user, size = "md" }) {
  const avatar = getAvatarSrc(user);
  const sizeClasses = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-10 w-10 text-xs';

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`${user.prenom || ''} ${user.nom || ''}`}
        className={`rounded-2xl object-cover shrink-0 ${sizeClasses}`}
      />
    );
  }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  return (
    <div className={`flex items-center justify-center rounded-2xl bg-orange-500/10 font-black text-orange-600 dark:text-orange-400 shrink-0 ${sizeClasses}`}>
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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:px-6 sm:py-6">
      
      {/* En-tête */}
      <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-400">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 sm:text-xs">Formateur</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Gestion des apprenants</h1>
            <p className="mt-1 text-xs text-zinc-300 sm:text-sm">Consultez les apprenants et gérez les dossiers par formation.</p>
          </div>
        </div>
      </header>

      {/* Recherche et Filtre */}
      <section className={`${cardClass} space-y-4`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un apprenant..."
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="relative">
            <select
              value={formationFilter}
              onChange={(event) => setFormationFilter(event.target.value)}
              className={`${inputClass} appearance-none pr-10`}
            >
              <option value="">Toutes les formations</option>
              {formations.map((formation) => (
                <option key={formation.id} value={formation.id}>{formation.titre}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>
      </section>

      {/* Section Taux de présence */}
      <section className={cardClass}>
        <div className="flex flex-col gap-4 mb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Taux de présence</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Consultez les présences par formation, séance ou apprenant.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              ['formation', 'Par formation'],
              ['seance', 'Par séance'],
              ['apprenant', 'Par apprenant']
            ].map(([view, label]) => (
              <button
                key={view}
                type="button"
                onClick={() => setAttendanceView(view)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${attendanceView === view ? 'bg-orange-500 text-zinc-950 shadow-xs' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {attendanceView === 'formation' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attendanceStats.formations.map((formation) => (
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40" key={formation.id_formation}>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{formation.formation_titre}</h3>
                <p className="mt-2 text-lg font-black text-orange-600 dark:text-orange-400">{formatRate(formation.taux_presence)} <span className="text-xs font-bold text-zinc-400">présents</span></p>
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{formation.presents} présents · {formation.absents} absents</p>
              </div>
            ))}
          </div>
        )}

        {attendanceView === 'seance' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-zinc-100 bg-zinc-50 font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-400">
                <tr>
                  <th className="p-3 pl-4">Séance</th>
                  <th className="p-3">Formation</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 pr-4">Présence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {attendanceStats.seances.map((seance) => (
                  <tr key={seance.id_seance} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 pl-4 font-bold text-zinc-900 dark:text-white">{seance.seance_titre || `Séance #${seance.id_seance}`}</td>
                    <td className="p-3 text-zinc-500 dark:text-zinc-400">{seance.formation_titre}</td>
                    <td className="p-3 text-zinc-500 dark:text-zinc-400">{formatDate(seance.date_seance)}</td>
                    <td className="p-3 pr-4">
                      <span className="font-bold text-orange-600 dark:text-orange-400">{formatRate(seance.taux_presence)}</span>
                      <span className="ml-1.5 text-zinc-400">({seance.presents}/{seance.total_enregistres})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {attendanceView === 'apprenant' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-zinc-100 bg-zinc-50 font-bold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/70 dark:text-zinc-400">
                <tr>
                  <th className="p-3 pl-4">Apprenant</th>
                  <th className="p-3">Formation</th>
                  <th className="p-3">Présences</th>
                  <th className="p-3 pr-4">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {attendanceStats.apprenants.map((student) => (
                  <tr key={`${student.id_apprenant}-${student.id_formation}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="p-3 pl-4 font-bold text-zinc-900 dark:text-white">{student.prenom} {student.nom}</td>
                    <td className="p-3 text-zinc-500 dark:text-zinc-400">{student.formation_titre}</td>
                    <td className="p-3 text-zinc-500 dark:text-zinc-400">{student.presents} / {student.total_seances}</td>
                    <td className="p-3 pr-4 font-black text-orange-600 dark:text-orange-400">{formatRate(student.taux_presence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* LISTE DES APPRENANTS EN MODE CARTES */}
      <section className="space-y-6">
        {studentsError ? (
          <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
            {studentsError}
          </div>
        ) : loading ? (
          <div className={`${cardClass} text-center text-xs text-zinc-500 py-12`}>Chargement des apprenants...</div>
        ) : groups.length === 0 ? (
          <div className={`${cardClass} border-dashed p-12 text-center text-xs text-zinc-500`}>
            Aucun apprenant trouvé.
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-orange-500" />
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white">{group.titre}</h3>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-[10px] font-bold uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {group.students.length} membre{group.students.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* GRILLE DE CARTES */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.students.map((student) => {
                    const studentKey = `${student.id_apprenant}-${student.id_formation}`;
                    const isMenuOpen = activeMenu === studentKey;

                    return (
                      <div
                        key={studentKey}
                        className={`${cardClass} flex flex-col justify-between transition hover:-translate-y-0.5 hover:shadow-md`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                            • Active
                          </span>
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(isMenuOpen ? null : studentKey)}
                              className="rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            >
                              <span className="text-xs font-bold px-1">•••</span>
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-8 z-20 w-36 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
                                <button
                                  onClick={() => openStudent(student)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                >
                                  <Eye size={14} /> Voir
                                </button>
                                <a
                                  href={`mailto:${student.email}`}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                                >
                                  <Mail size={14} /> Contact
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Infos utilisateur */}
                        <div className="my-4 flex items-center gap-3">
                          <UserAvatar user={student} size="md" />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-black text-zinc-900 dark:text-white truncate sm:text-sm">
                              {student.prenom} {student.nom}
                            </h4>
                            <a
                              href={`mailto:${student.email}`}
                              className="mt-0.5 block text-[11px] font-medium text-zinc-500 hover:text-orange-500 dark:text-zinc-400 truncate"
                              title={student.email}
                            >
                              {student.email}
                            </a>
                          </div>
                        </div>

                        {/* Pied de carte */}
                        <div className="border-t border-zinc-100 pt-3 flex items-center justify-between dark:border-zinc-800">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate max-w-[140px]">
                            {student.formation_titre}
                          </span>
                          <button
                            onClick={() => openStudent(student)}
                            className="text-xs font-black text-orange-600 hover:underline dark:text-orange-400"
                          >
                            Détails
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${cardClass} max-h-[90vh] w-full max-w-lg overflow-y-auto space-y-5 p-6 shadow-2xl`}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <UserAvatar user={selectedStudent} size="lg" />
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white sm:text-base">
                    {selectedStudent.prenom} {selectedStudent.nom}
                  </h3>
                  <a
                    href={`mailto:${selectedStudent.email}`}
                    className="text-xs font-semibold text-orange-600 hover:underline dark:text-orange-400"
                  >
                    {selectedStudent.email}
                  </a>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-12 text-center text-xs text-zinc-500">Chargement du dossier...</div>
            ) : detailsError ? (
              <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {detailsError}
              </div>
            ) : studentDetails && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Moyenne Générale</p>
                    <p className="mt-1 text-base font-black text-zinc-900 dark:text-white sm:text-lg">
                      {studentDetails.average === null ? 'N/A' : `${Number(studentDetails.average).toFixed(2)} / 20`}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Taux de Présence</p>
                    <p className="mt-1 text-base font-black text-orange-600 dark:text-orange-400 sm:text-lg">
                      {studentDetails.attendance.rate === null ? 'N/A' : formatRate(studentDetails.attendance.rate)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Historique des Évaluations</h4>
                  {studentDetails.grades.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
                      Aucune note enregistrée pour le moment.
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                      {studentDetails.grades.map((item) => (
                        <div key={`${item.origine}-${item.id_note}`} className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-white">{item.type_evaluation}</p>
                            <p className="text-[10px] text-zinc-400">{formatDate(item.date_evaluation)}</p>
                          </div>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {Number(item.note)} / 20
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={saveGrade} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    <Plus size={15} className="text-orange-500" /> Ajouter une Nouvelle Note
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      required
                      value={grade.type_evaluation}
                      onChange={(e) => setGrade({ ...grade, type_evaluation: e.target.value })}
                      placeholder="Type (ex: TP, Examen)"
                      className={inputClass}
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
                      className={inputClass}
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={grade.commentaire}
                    onChange={(e) => setGrade({ ...grade, commentaire: e.target.value })}
                    placeholder="Commentaire facultatif..."
                    className={`${inputClass} resize-none`}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{gradeMessage}</span>
                    <button
                      disabled={savingGrade}
                      type="submit"
                      className="rounded-2xl bg-orange-500 px-5 py-2.5 text-xs font-black text-zinc-950 transition hover:bg-orange-400 disabled:opacity-50 shadow-xs"
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