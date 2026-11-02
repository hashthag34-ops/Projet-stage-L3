// frontend/src/pages/Apprenant/ApprenantHistorique.jsx
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

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-3 pb-8 text-slate-900">
      <header className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm md:px-8">
        <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">Historique de mes formations</h1>
        <p className="mt-2 text-sm text-slate-500">
          Retrouvez vos notes, votre assiduité et vos décisions de certification.
        </p>
      </header>

      {loading && (
        <p role="status" className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-center text-sm text-slate-500">
          Chargement de votre historique…
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && formations.length === 0 && (
        <section className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
          <BookOpen className="mb-3 text-orange-500" size={30} />
          <p className="font-bold text-slate-900">Aucune formation dans votre historique</p>
          <p className="mt-2 max-w-lg text-sm text-slate-500">
            Les formations pour lesquelles votre inscription est acceptée apparaîtront ici.
          </p>
        </section>
      )}

      <div className="grid gap-5">
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
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="text-orange-500" size={19} />
                    <h2 className="font-bold text-slate-950">{formation.titre}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(formation.date_debut)} – {formatDate(formation.date_fin)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {formatStatus(formation.statut_formation)}
                </span>
              </div>

              {formation.description && (
                <p className="px-5 pt-5 text-sm leading-6 text-slate-600">{formation.description}</p>
              )}

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <section className="rounded-xl bg-slate-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <CalendarCheck2 className="text-orange-500" size={16} /> Présence
                  </h3>
                  {completedSessions === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">Aucune séance terminée.</p>
                  ) : (
                    <>
                      <p className="mt-3 text-sm text-slate-600">
                        {attendanceRate}% de présence · {presentCount} présent{presentCount > 1 ? 's' : ''}
                        {absentCount > 0 ? ` · ${absentCount} absence${absentCount > 1 ? 's' : ''}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {completedSessions} séance{completedSessions > 1 ? 's' : ''} terminée{completedSessions > 1 ? 's' : ''}
                      </p>
                    </>
                  )}
                </section>

                <section className="rounded-xl bg-slate-50 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Award className="text-orange-500" size={16} /> Certification
                  </h3>
                  {formation.statut_certification === 'CERTIFIE' && (
                    <p className="mt-3 text-sm font-semibold text-slate-700">{certificationLabel(formation.statut_certification)}</p>
                  )}
                  {formation.date_certification && (
                    <p className="mt-1 text-xs text-slate-500">
                      Décision du {formatDate(formation.date_certification)}
                    </p>
                  )}
                  {formation.numero_certification && (
                    <p className="mt-1 break-all text-xs text-slate-500">
                      N° {formation.numero_certification}
                    </p>
                  )}
                </section>

                <section className="rounded-xl bg-slate-50 p-4 md:col-span-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <ClipboardList className="text-orange-500" size={16} /> Notes
                  </h3>
                  {formation.notes.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">Aucune note enregistrée pour cette formation.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {formation.notes.map((note) => (
                        <li key={`${note.origine}-${note.id_note}`} className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{note.type_evaluation}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {note.origine === 'MANUELLE' ? 'Note du formateur' : 'Évaluation en ligne'}
                              {note.date_evaluation ? ` · ${formatDate(note.date_evaluation)}` : ''}
                            </p>
                            {note.commentaire && (
                              <p className="mt-2 text-sm text-slate-600">{note.commentaire}</p>
                            )}
                          </div>
                          <span className="shrink-0 font-bold text-orange-500">{note.note} / 20</span>
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