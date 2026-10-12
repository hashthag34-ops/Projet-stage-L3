import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, BookOpen, CalendarCheck, Check, ClipboardList, Mail,
  Search, UserRound, Users, X
} from 'lucide-react';
import API from '../../services/api';

const formatRate = (value) => `${Number(value || 0).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`;
const formatDate = (value) => value ? String(value).slice(0, 10).split('-').reverse().join('/') : '—';

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

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end dark:border-white/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Suivi pédagogique</p>
          <h1 className="mt-2 text-3xl font-black">Mes apprenants</h1>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Consultez les résultats et le suivi de présence de vos formations.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold">
          <Users size={19} className="text-orange-500" /> {students.length} apprenant(s)
        </div>
      </header>

      <section aria-labelledby="stats-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-orange-500" />
          <h2 id="stats-title" className="text-xl font-black">Statistiques par formation</h2>
        </div>
        {statisticsError ? (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">{statisticsError}</p>
        ) : statistics.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
            Aucune statistique disponible pour le moment.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {statistics.map((item) => (
              <article key={item.id_formation} className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
                <h3 className="font-black">{item.formation_titre}</h3>
                <div>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> Réussite (moyenne ≥ 10/20)</span>
                    <strong>{formatRate(item.taux_reussite)}</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(Number(item.taux_reussite), 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2"><CalendarCheck size={16} className="text-orange-500" /> Présence (retards inclus)</span>
                    <strong>{formatRate(item.taux_presence)}</strong>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(Number(item.taux_presence), 100)}%` }} />
                  </div>
                </div>
                <p className="text-xs text-black/55 dark:text-white/55">
                  Absences : {formatRate(item.taux_absence)} · {item.total_presences} présence(s) enregistrée(s)
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="students-title" className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 id="students-title" className="text-xl font-black">Liste des apprenants par formation</h2>
          <label className="sr-only" htmlFor="formation-filter">Filtrer par formation</label>
          <select
            id="formation-filter"
            value={formationFilter}
            onChange={(event) => setFormationFilter(event.target.value)}
            className="rounded-xl border border-black/15 bg-white px-4 py-3 text-sm outline-none focus:border-orange-500 dark:border-white/20 dark:bg-zinc-950"
          >
            <option value="">Toutes les formations</option>
            {formations.map((formation) => <option key={formation.id} value={formation.id}>{formation.titre}</option>)}
          </select>
        </div>

        <div className="relative">
          <Search size={17} className="absolute left-3 top-3.5 text-black/40" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un apprenant ou une formation"
            aria-label="Rechercher un apprenant ou une formation"
            className="w-full rounded-xl border border-black/15 bg-transparent py-3 pl-10 pr-4 text-sm outline-none focus:border-orange-500 dark:border-white/20"
          />
        </div>

        {studentsError ? (
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">{studentsError}</p>
        ) : loading ? (
          <p className="py-10 text-center text-sm text-black/50">Chargement des apprenants...</p>
        ) : groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 p-12 text-center text-sm text-black/50 dark:border-white/15">
            Aucun apprenant trouvé.
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`formation-${group.id}`} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 id={`formation-${group.id}`} className="flex items-center gap-2 text-lg font-black">
                    <BookOpen size={18} className="text-orange-500" /> {group.titre}
                  </h3>
                  <span className="text-xs font-semibold text-black/50 dark:text-white/50">{group.students.length} apprenant(s)</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.students.map((student) => (
                    <article key={`${student.id_apprenant}-${student.id_formation}`} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                      <button type="button" onClick={() => openStudent(student)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-sm font-black text-black">
                          {student.prenom?.[0]}{student.nom?.[0]}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-black">{student.prenom} {student.nom}</span>
                          <span className="block truncate text-sm text-black/55 dark:text-white/55">{student.email}</span>
                          <span className="mt-1 block text-xs font-bold text-orange-600 dark:text-orange-400">Voir le dossier et les notes</span>
                        </span>
                      </button>
                      <a href={`mailto:${student.email}`} title="Envoyer un email" aria-label={`Envoyer un email à ${student.prenom} ${student.nom}`} className="rounded-lg p-2 text-orange-600 hover:bg-orange-500/10">
                        <Mail size={17} />
                      </a>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedStudent(null); }}
        >
          <section role="dialog" aria-modal="true" aria-labelledby="student-dialog-title" className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-black/10 bg-white p-5 shadow-2xl sm:p-7 dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-5 dark:border-white/10">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 font-black text-black">
                  {selectedStudent.prenom?.[0]}{selectedStudent.nom?.[0]}
                </span>
                <div className="min-w-0">
                  <h2 id="student-dialog-title" className="truncate text-xl font-black">{selectedStudent.prenom} {selectedStudent.nom}</h2>
                  <p className="truncate text-sm text-black/55 dark:text-white/55">{selectedStudent.formation_titre}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedStudent(null)} aria-label="Fermer" className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"><X size={20} /></button>
            </div>

            {detailsLoading ? (
              <p className="py-10 text-center text-sm text-black/55 dark:text-white/55">Chargement du dossier...</p>
            ) : detailsError ? (
              <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">{detailsError}</p>
            ) : studentDetails && (
              <div className="mt-5 space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
                    <p className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">Contact</p>
                    <a href={`mailto:${studentDetails.student.email}`} className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-orange-600 dark:text-orange-400">
                      <Mail size={15} /> {studentDetails.student.email}
                    </a>
                    <p className="mt-2 flex items-center gap-2 text-sm"><UserRound size={15} /> {studentDetails.student.telephone || 'Téléphone non renseigné'}</p>
                  </div>
                  <div className="rounded-xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
                    <p className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">Résultats et présence</p>
                    <p className="mt-2 text-sm">Moyenne : <strong>{studentDetails.average === null ? 'Aucune note' : `${Number(studentDetails.average).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/20`}</strong></p>
                    <p className="mt-1 text-sm">Présence : <strong>{studentDetails.attendance.rate === null ? 'Aucune donnée' : formatRate(studentDetails.attendance.rate)}</strong></p>
                    <p className="mt-1 text-xs text-black/55 dark:text-white/55">
                      {studentDetails.attendance.present} présence(s), {studentDetails.attendance.absent} absence(s)
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 flex items-center gap-2 font-black"><ClipboardList size={18} className="text-orange-500" /> Notes de la formation</h3>
                  {studentDetails.grades.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-black/15 p-4 text-sm text-black/50 dark:border-white/15">Aucune note enregistrée.</p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {studentDetails.grades.map((item) => (
                        <div key={`${item.origine}-${item.id_note}`} className="flex items-center justify-between gap-3 rounded-xl border border-black/10 px-4 py-3 dark:border-white/10">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{item.type_evaluation}</p>
                            <p className="text-xs text-black/50 dark:text-white/50">{formatDate(item.date_evaluation)} · {item.origine === 'MANUELLE' ? 'Note formateur' : 'Évaluation en ligne'}</p>
                            {item.commentaire && <p className="mt-1 text-xs text-black/65 dark:text-white/65">{item.commentaire}</p>}
                          </div>
                          <strong className="shrink-0 text-lg text-orange-600 dark:text-orange-400">{Number(item.note).toLocaleString('fr-FR')}/20</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={saveGrade} className="space-y-3 rounded-2xl border border-orange-500/25 bg-orange-500/[0.04] p-4">
                  <h3 className="font-black">Ajouter une note</h3>
                  <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
                    <label className="space-y-1 text-xs font-bold">
                      Type d’évaluation
                      <input
                        required
                        maxLength={150}
                        value={grade.type_evaluation}
                        onChange={(event) => setGrade({ ...grade, type_evaluation: event.target.value })}
                        placeholder="Ex. Travaux pratiques"
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-orange-500 dark:border-white/20 dark:bg-zinc-900"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-bold">
                      Note / 20
                      <input
                        required
                        type="number"
                        min="0"
                        max="20"
                        step="0.01"
                        value={grade.note}
                        onChange={(event) => setGrade({ ...grade, note: event.target.value })}
                        placeholder="15"
                        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-orange-500 dark:border-white/20 dark:bg-zinc-900"
                      />
                    </label>
                  </div>
                  <label className="block space-y-1 text-xs font-bold">
                    Commentaire (facultatif)
                    <textarea
                      maxLength={2000}
                      rows={2}
                      value={grade.commentaire}
                      onChange={(event) => setGrade({ ...grade, commentaire: event.target.value })}
                      className="w-full resize-y rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-orange-500 dark:border-white/20 dark:bg-zinc-900"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p role="status" className={`text-sm ${gradeMessage.includes('enregistrée') ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{gradeMessage}</p>
                    <button disabled={savingGrade} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-black text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60">
                      {savingGrade ? 'Enregistrement...' : 'Enregistrer la note'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
