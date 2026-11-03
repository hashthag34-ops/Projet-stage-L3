// frontend/src/pages/Apprenant/ApprenantHistorique.jsx
import { useEffect, useState } from 'react';
import { Award, BookOpen, CalendarCheck2, ClipboardList, GraduationCap } from 'lucide-react';
import API from '../../services/api';

const cardClass = 'rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-6';

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
  return '';
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className={`${cardClass} w-full max-w-md p-8 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400`}>
          Chargement de votre historique…
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:space-y-6 sm:px-6 sm:py-6">
      
      {/* En-tête (Optimisé mobile compact) */}
      <header className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 sm:text-xs">Parcours</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Historique de mes formations</h1>
          <p className="mt-1 text-xs text-zinc-300 sm:text-sm">Retrouvez vos notes, votre assiduité et vos décisions de certification.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-500/20 bg-orange-500/10 px-3.5 py-2 text-xs font-bold text-orange-400">
          <BookOpen size={15} />
          {formations.length} formation{formations.length === 1 ? '' : 's'}
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {!error && formations.length === 0 && (
        <section className={`${cardClass} flex flex-col items-center border-dashed p-12 text-center`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <BookOpen size={30} />
          </div>
          <p className="mt-4 text-sm font-bold text-zinc-900 dark:text-white">Aucune formation dans votre historique</p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            Les formations pour lesquelles votre inscription est acceptée apparaîtront ici.
          </p>
        </section>
      )}

      <div className="space-y-4">
        {formations.map((formation) => {
          const completedSessions = Number(formation.total_seances) || 0;
          const presentCount = Number(formation.presentes) || 0;
          const absentCount = Number(formation.absentes) || 0;
          const attendanceRate = completedSessions
            ? Math.round((presentCount / completedSessions) * 100)
            : null;

          return (
            <article
              key={formation.id_formation}
              className={`${cardClass} space-y-4 overflow-hidden`}
            >
              <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
                      <GraduationCap size={18} />
                    </div>
                    <h2 className="text-base font-black text-zinc-900 dark:text-white sm:text-lg">{formation.titre}</h2>
                  </div>
                  <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {formatDate(formation.date_debut)} – {formatDate(formation.date_fin)}
                  </p>
                </div>
                <span className="inline-flex self-start sm:self-auto rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-[11px] font-bold uppercase text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {formatStatus(formation.statut_formation)}
                </span>
              </div>

              {formation.description && (
                <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-sm">{formation.description}</p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                
                {/* Bloc Présence */}
                <section className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    <CalendarCheck2 className="text-orange-500" size={16} /> Présence
                  </h3>
                  {completedSessions === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">Aucune séance terminée.</p>
                  ) : (
                    <>
                      <p className="mt-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        <span className="text-orange-600 dark:text-orange-400">{attendanceRate}%</span> de présence · {presentCount} présent{presentCount > 1 ? 's' : ''}
                        {absentCount > 0 ? ` · ${absentCount} absence${absentCount > 1 ? 's' : ''}` : ''}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {completedSessions} séance{completedSessions > 1 ? 's' : ''} terminée{completedSessions > 1 ? 's' : ''}
                      </p>
                    </>
                  )}
                </section>

                {/* Bloc Certification */}
                <section className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    <Award className="text-orange-500" size={16} /> Certification
                  </h3>
                  {formation.statut_certification === 'CERTIFIE' && (
                    <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">{certificationLabel(formation.statut_certification)}</p>
                  )}
                  {formation.date_certification && (
                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Décision du {formatDate(formation.date_certification)}
                    </p>
                  )}
                  {formation.numero_certification && (
                    <p className="mt-1 break-all text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      N° {formation.numero_certification}
                    </p>
                  )}
                  {!formation.statut_certification && !formation.date_certification && (
                    <p className="mt-2 text-xs text-zinc-500">Aucune décision de certification enregistrée.</p>
                  )}
                </section>

                {/* Bloc Notes */}
                <section className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40 sm:col-span-2">
                  <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    <ClipboardList className="text-orange-500" size={16} /> Notes et Évaluations
                  </h3>
                  {formation.notes.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">Aucune note enregistrée pour cette formation.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {formation.notes.map((note) => (
                        <li key={`${note.origine}-${note.id_note}`} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-white p-3 text-xs dark:border-zinc-700 dark:bg-zinc-900">
                          <div className="space-y-0.5">
                            <p className="font-bold text-zinc-900 dark:text-white">{note.type_evaluation}</p>
                            <p className="text-[11px] text-zinc-400">
                              {note.origine === 'MANUELLE' ? 'Note du formateur' : 'Évaluation en ligne'}
                              {note.date_evaluation ? ` · ${formatDate(note.date_evaluation)}` : ''}
                            </p>
                            {note.commentaire && (
                              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{note.commentaire}</p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-xl bg-orange-500/10 px-3 py-1.5 text-xs font-black text-orange-600 dark:text-orange-400">
                            {note.note} / 20
                          </span>
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