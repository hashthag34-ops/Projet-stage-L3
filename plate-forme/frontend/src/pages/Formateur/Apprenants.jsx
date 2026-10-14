import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, BookOpen, CalendarCheck, Check, ClipboardList, Mail,
  Search, UserRound, Users, X, MoreVertical, Eye, PlusCircle, Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
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
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-purple-500/20`}
      />
    );
  }

  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  return (
    <div className={`flex items-center justify-center font-bold rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-sm ${sizeClasses[size]}`}>
      {initials || 'U'}
    </div>
  );
}

export default function FormateurApprenants() {
  const [students, setStudents] = useState([]);
  const [statistics, setStatistics] = useState([]);
  const [search, setSearch] = useState('');
  const [formationFilter, setFormationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentsError, setStudentsError] = useState('');
  const [statisticsError, setStatisticsError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [grade, setGrade] = useState({ type_evaluation: 'Travaux pratiques', note: '', commentaire: '' });
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeMessage, setGradeMessage] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);

  const loadStatistics = async () => {
    try {
      const response = await API.get('/formateur/apprenants/statistiques');
      setStatistics(response.data);
      setStatisticsError('');
    } catch (error) {
      setStatisticsError(error.response?.data?.message || 'Impossible de charger les statistiques.');
    }
  };

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

    API.get('/formateur/apprenants/statistiques')
      .then((response) => {
        if (active) {
          setStatistics(response.data);
          setStatisticsError('');
        }
      })
      .catch((error) => {
        if (active) setStatisticsError(error.response?.data?.message || 'Impossible de charger les statistiques.');
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
      await loadStatistics();
    } catch (error) {
      setGradeMessage(error.response?.data?.message || 'Impossible d’enregistrer cette note.');
    } finally {
      setSavingGrade(false);
    }
  };

  // Préparation des données pour Recharts
  const chartData = useMemo(() => {
    return statistics.map(stat => ({
      name: stat.formation_titre.length > 15 ? stat.formation_titre.substring(0, 15) + '...' : stat.formation_titre,
      fullTitle: stat.formation_titre,
      Reussite: Number(stat.taux_reussite) || 0,
      Presence: Number(stat.taux_presence) || 0,
    }));
  }, [statistics]);

  return (
    <div className="space-y-8 p-2 sm:p-4">
      {/* En-tête */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des Apprenants</h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Consultez les statistiques, le suivi et les notes par formation.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-zinc-900 dark:text-zinc-200">
            <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span>{students.length} Apprenants</span>
          </div>
        </div>
      </header>

      {/* STATISTIQUES AVEC RECHARTS */}
      <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <BarChart3 size={18} />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Aperçu des performances par formation</h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Réussite (%)</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500"></span> Présence (%)</span>
          </div>
        </div>

        {statisticsError ? (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">{statisticsError}</p>
        ) : statistics.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Aucune statistique disponible.</p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                />
                <Bar dataKey="Reussite" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                <Bar dataKey="Presence" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* FILTRES & RECHERCHE */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par nom, email ou formation..."
              className="w-full rounded-full bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 shadow-sm outline-none backdrop-blur-sm transition focus:ring-2 focus:ring-indigo-500/20 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                id="formation-filter"
                value={formationFilter}
                onChange={(event) => setFormationFilter(event.target.value)}
                className="appearance-none rounded-full bg-white px-4 py-2.5 pr-8 text-xs font-medium text-slate-700 shadow-sm outline-none dark:bg-zinc-900 dark:text-zinc-200"
              >
                <option value="">Toutes les formations</option>
                {formations.map((formation) => (
                  <option key={formation.id} value={formation.id}>{formation.titre}</option>
                ))}
              </select>
              <Filter size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>

        {/* GRILLE DE CARTES PAR GROUPE (STYLE DATIX MAQUETTE) */}
        {studentsError ? (
          <p role="alert" className="rounded-2xl bg-red-50 p-4 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">{studentsError}</p>
        ) : loading ? (
          <p className="py-12 text-center text-xs text-slate-400">Chargement des apprenants...</p>
        ) : groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-12 text-center text-xs text-slate-400 dark:border-zinc-800">
            Aucun apprenant trouvé.
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{group.titre}</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {group.students.length} membres
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.students.map((student) => {
                    const studentKey = `${student.id_apprenant}-${student.id_formation}`;
                    const isMenuOpen = activeMenu === studentKey;

                    return (
                      <div
                        key={studentKey}
                        className="group relative flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900"
                      >
                        {/* Status Badge & Options Menu */}
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                            • Actif
                          </span>
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(isMenuOpen ? null : studentKey)}
                              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Context Menu Popover */}
                            {isMenuOpen && (
                              <div className="absolute right-0 top-7 z-20 w-36 rounded-2xl border border-slate-100 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                                <button
                                  onClick={() => openStudent(student)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                  <Eye size={14} /> Voir dossier
                                </button>
                                <a
                                  href={`mailto:${student.email}`}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                  <Mail size={14} /> Contacter
                                </a>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Profil Info */}
                        <div className="my-4 flex items-center gap-3">
                          <UserAvatar user={student} size="md" />
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xs font-bold text-slate-900 dark:text-white">
                              {student.prenom} {student.nom}
                            </h4>
                            {/* EMAIL CLIQUABLE */}
                            <a
                              href={`mailto:${student.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block truncate text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                              title={student.email}
                            >
                              {student.email}
                            </a>
                          </div>
                        </div>

                        {/* Formation Tag & Footer button */}
                        <div className="border-t border-slate-100 pt-3 dark:border-zinc-800/80">
                          <div className="flex items-center justify-between">
                            <span className="truncate text-[10px] font-medium text-slate-400">
                              {student.formation_titre}
                            </span>
                            <button
                              onClick={() => openStudent(student)}
                              className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              Détails
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <UserAvatar user={selectedStudent} size="md" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedStudent.prenom} {selectedStudent.nom}
                  </h3>
                  <a
                    href={`mailto:${selectedStudent.email}`}
                    className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {selectedStudent.email}
                  </a>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            {detailsLoading ? (
              <p className="py-10 text-center text-xs text-slate-400">Chargement du dossier...</p>
            ) : detailsError ? (
              <p className="my-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-500/10">{detailsError}</p>
            ) : studentDetails && (
              <div className="mt-4 space-y-5">
                {/* Résumé Stats en Bannières */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-zinc-800/50">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Moyenne Générale</span>
                    <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">
                      {studentDetails.average === null ? 'N/A' : `${Number(studentDetails.average).toFixed(2)} / 20`}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-zinc-800/50">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Taux de Présence</span>
                    <p className="mt-1 text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                      {studentDetails.attendance.rate === null ? 'N/A' : formatRate(studentDetails.attendance.rate)}
                    </p>
                  </div>
                </div>

                {/* Liste des Notes */}
                <div>
                  <h4 className="mb-2 text-xs font-bold text-slate-900 dark:text-white">Historique des Évaluations</h4>
                  {studentDetails.grades.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-zinc-800">
                      Aucune note enregistrée pour le moment.
                    </p>
                  ) : (
                    <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                      {studentDetails.grades.map((item) => (
                        <div key={`${item.origine}-${item.id_note}`} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 dark:bg-zinc-800/40">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">{item.type_evaluation}</p>
                            <p className="text-[10px] text-slate-400">{formatDate(item.date_evaluation)}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {Number(item.note)} / 20
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formulaire d'Ajout de Note */}
                <form onSubmit={saveGrade} className="rounded-2xl bg-indigo-50/50 p-4 dark:bg-indigo-500/5">
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    <PlusCircle size={15} /> Ajouter une Nouvelle Note
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      required
                      value={grade.type_evaluation}
                      onChange={(e) => setGrade({ ...grade, type_evaluation: e.target.value })}
                      placeholder="Type (ex: TP, Examen)"
                      className="w-full rounded-xl border-none bg-white p-2.5 text-xs text-slate-800 shadow-sm outline-none dark:bg-zinc-800 dark:text-zinc-200"
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
                      className="w-full rounded-xl border-none bg-white p-2.5 text-xs text-slate-800 shadow-sm outline-none dark:bg-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={grade.commentaire}
                    onChange={(e) => setGrade({ ...grade, commentaire: e.target.value })}
                    placeholder="Commentaire facultatif..."
                    className="mt-2 w-full rounded-xl border-none bg-white p-2.5 text-xs text-slate-800 shadow-sm outline-none dark:bg-zinc-800 dark:text-zinc-200"
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-emerald-600">{gradeMessage}</span>
                    <button
                      disabled={savingGrade}
                      type="submit"
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
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