import { useEffect, useState } from 'react';
import { Award, BookOpen, CalendarCheck2, ClipboardList, GraduationCap } from 'lucide-react';
import API from '../../services/api';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const formatStatus = (status) => {
  const labels = {
    BROUILLON: 'En préparation',
    OUVERTE: 'Ouverte',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ARCHIVEE: 'Archivée'
  };
  return labels[status] || status;
};

const certificationLabel = (status) => {
  if (status === 'CERTIFIE') return 'Certifiée';
  if (status === 'NON_CERTIFIE') return 'Non certifiée';
  return 'En attente de décision';
};

export default function ApprenantHistorique() {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/apprenant/historique-formations')
      .then((response) => setFormations(Array.isArray(response.data) ? response.data : []))
      .catch((requestError) => {
        console.error('Erreur historique des formations :', requestError);
        setError(requestError.response?.data?.message || 'Impossible de charger votre historique.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 font-sans text-slate-900 dark:text-zinc-100 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Historique de mes formations</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Retrouvez vos notes, votre assiduité et vos décisions de certification.
        </p>
      </header>

      {loading && (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Chargement de votre historique…
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </p>
      )}

      {!loading && !error && formations.length === 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <BookOpen className="mx-auto mb-3 text-orange-500" size={30} />
          <p className="font-medium">Aucune formation dans votre historique</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            Les formations pour lesquelles votre inscription est acceptée apparaîtront ici.
          </p>
        </section>
      )}

      <div className="space-y-4">
        {formations.map((formation) => {
          const completedSessions = Number(formation.total_seances) || 0;
          const presentCount = Number(formation.presentes) || 0;
          const absentCount = Number(formation.absentes) || 0;
          const lateCount = Number(formation.retards) || 0;
          const attendanceRate = completedSessions
            ? Math.round(((presentCount + lateCount) / completedSessions) * 100)
            : null;

          return (
            <article
              key={formation.id_formation}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="shrink-0 text-orange-500" size={19} />
                    <h2 className="text-lg font-semibold">{formation.titre}</h2>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
                    {formatDate(formation.date_debut)} – {formatDate(formation.date_fin)}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-700 dark:text-orange-300">
                  {formatStatus(formation.statut_formation)}
                </span>
              </div>

              {formation.description && (
                <p className="px-5 pt-4 text-sm text-slate-600 dark:text-zinc-300">{formation.description}</p>
              )}

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <section className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-950">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarCheck2 className="text-orange-500" size={16} /> Présence
                  </h3>
                  {completedSessions === 0 ? (
                    <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Aucune séance terminée.</p>
                  ) : (
                    <>
                      <p className="mt-2 text-sm">
                        {attendanceRate}% de présence · {presentCount} présent{presentCount > 1 ? 's' : ''}
                        {lateCount > 0 ? ` · ${lateCount} retard${lateCount > 1 ? 's' : ''}` : ''}
                        {absentCount > 0 ? ` · ${absentCount} absence${absentCount > 1 ? 's' : ''}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                        {completedSessions} séance{completedSessions > 1 ? 's' : ''} terminée{completedSessions > 1 ? 's' : ''}
                      </p>
                    </>
                  )}
                </section>

                <section className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-950">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Award className="text-orange-500" size={16} /> Certification
                  </h3>
                  <p className="mt-2 text-sm">{certificationLabel(formation.statut_certification)}</p>
                  {formation.date_certification && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                      Décision du {formatDate(formation.date_certification)}
                    </p>
                  )}
                  {formation.numero_certification && (
                    <p className="mt-1 break-all text-xs text-slate-500 dark:text-zinc-400">
                      N° {formation.numero_certification}
                    </p>
                  )}
                </section>

                <section className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-950 sm:col-span-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <ClipboardList className="text-orange-500" size={16} /> Notes
                  </h3>
                  {formation.notes.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">Aucune note enregistrée pour cette formation.</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-slate-200 dark:divide-zinc-800">
                      {formation.notes.map((note) => (
                        <li key={`${note.origine}-${note.id_note}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-medium">{note.type_evaluation}</p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">
                              {note.origine === 'MANUELLE' ? 'Note du formateur' : 'Évaluation en ligne'}
                              {note.date_evaluation ? ` · ${formatDate(note.date_evaluation)}` : ''}
                            </p>
                            {note.commentaire && (
                              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{note.commentaire}</p>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{note.note} / 20</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
