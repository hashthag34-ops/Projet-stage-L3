// frontend/src/pages/Apprenant/ApprenantDashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Clock3, MapPin, Star, Target, TrendingUp } from 'lucide-react';
import API from '../../services/api';

const cardClass = 'rounded-3xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-5';
const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';

export default function ApprenantDashboard() {
  const [formations, setFormations] = useState([]);
  const [seances, setSeances] = useState([]);
  const [nextSeance, setNextSeance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [resFormations, resSeances] = await Promise.all([
          API.get('/apprenant/mes-formations'),
          API.get('/apprenant/seances')
        ]);

        setFormations(resFormations.data || []);
        const fetchedSeances = resSeances.data || [];
        setSeances(fetchedSeances);
        
        const upcoming = fetchedSeances.find((seance) => {
          const sessionDate = new Date(`${seance.date_seance}T${seance.heure_fin || '23:59'}`);
          return sessionDate >= new Date();
        });
        if (upcoming) {
          setNextSeance(upcoming);
        }
      } catch (err) {
        console.error("Erreur de chargement du dashboard :", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const attendance = seances.filter((seance) => ['PRESENT', 'ABSENT'].includes(seance.statut_presence));
  const presentCount = seances.filter((seance) => seance.statut_presence === 'PRESENT').length;
  const absentCount = seances.filter((seance) => seance.statut_presence === 'ABSENT').length;
  const attendanceRate = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 0;
  const completedSessions = seances.filter((seance) => seance.statut_presence).length;
  const lateCount = seances.filter((seance) => seance.statut_presence === 'RETARD').length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className={`${cardClass} w-full max-w-md p-8 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400`}>
          Chargement de ton espace...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:space-y-6 sm:px-6 sm:py-6">
      
      {/* En-tête de bienvenue (Optimisé mobile compact & percutant) */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 px-5 py-6 text-white shadow-xl sm:px-8 sm:py-8">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl sm:h-40 sm:w-40" />
        <p className="relative mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 sm:text-xs">Tableau de bord</p>
        <h1 className="relative text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">Ravi de te revoir 👋</h1>
        <p className="relative mt-2 max-w-xl text-xs text-zinc-300 sm:text-sm">Suis ton parcours, tes présences et tes prochaines échéances depuis un seul espace.</p>
      </header>

      {/* Cartes KPI Principales (Grille adaptative mobile 2 colonnes) */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={`${cardClass} flex flex-col justify-between`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Formations</p>
              <p className="mt-1.5 text-xl font-black sm:text-2xl">{formations.length}</p>
            </div>
            <div className="rounded-2xl bg-orange-500/10 p-2.5 text-orange-600 dark:text-orange-400"><BookOpen size={20} /></div>
          </div>
        </div>

        <div className={`${cardClass} flex flex-col justify-between`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Séances</p>
              <p className="mt-1.5 text-xl font-black sm:text-2xl">{completedSessions}</p>
            </div>
            <div className="rounded-2xl bg-orange-500/10 p-2.5 text-orange-600 dark:text-orange-400"><CalendarDays size={20} /></div>
          </div>
        </div>

        <div className={`${cardClass} flex flex-col justify-between`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Assiduité</p>
              <p className="mt-1.5 text-xl font-black text-orange-600 dark:text-orange-400 sm:text-2xl">{attendanceRate} %</p>
            </div>
            <div className="rounded-2xl bg-orange-500/10 p-2.5 text-orange-600 dark:text-orange-400"><Target size={20} /></div>
          </div>
        </div>

        <div className={`${cardClass} flex flex-col justify-between`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Évaluations</p>
              <p className="mt-1.5 text-sm font-bold sm:text-base">Aucune note</p>
            </div>
            <div className="rounded-2xl bg-orange-500/10 p-2.5 text-orange-600 dark:text-orange-400"><Star size={20} /></div>
          </div>
        </div>
      </section>

      {/* Grille principale : Formations et Prochaine séance */}
      <div className="grid gap-4 lg:grid-cols-2">
        
        {/* Mes Formations */}
        <section className={`${cardClass} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">Historique</p>
                <h2 className="text-base font-black sm:text-lg">Mes formations</h2>
              </div>
              <Link to="/apprenant/catalogue" className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline dark:text-orange-400">
                Catalogue <ArrowRight size={13} />
              </Link>
            </div>

            {formations.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                Tu n'es inscrit à aucune formation pour le moment.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {formations.map((f) => (
                  <div key={f.id_formation} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold sm:text-sm">{f.titre}</h3>
                        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">{f.description}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-orange-700 dark:text-orange-300">
                        {f.statut || 'EN_COURS'}
                      </span>
                    </div>

                    <div className="mt-3.5">
                      <div className="mb-1.5 flex justify-between text-[10px] font-bold text-zinc-500">
                        <span>Progression</span>
                        <span>{f.progression || 0}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                        <div 
                          className="h-full rounded-full bg-orange-500 transition-all duration-500"
                          style={{ width: `${f.progression || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Prochaine séance */}
        <section className={`${cardClass} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">À venir</p>
                <h2 className="text-base font-black sm:text-lg">Prochaine séance</h2>
              </div>
              <Link to="/apprenant/planning" className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline dark:text-orange-400">
                Tout voir <ArrowRight size={13} />
              </Link>
            </div>

            {nextSeance ? (
              <div className="mt-4 rounded-2xl bg-zinc-950 p-4 text-white shadow-md dark:bg-zinc-800 sm:p-5">
                <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-extrabold text-zinc-950">
                  {nextSeance.type_seance || 'Cours Pratique'}
                </span>
                <h3 className="mt-3 text-sm font-black sm:text-base">{nextSeance.titre}</h3>
                <p className="mt-1 text-xs text-zinc-300 line-clamp-2">{nextSeance.description}</p>
                
                <div className="mt-4 space-y-1.5 border-t border-zinc-800 pt-3 text-xs text-zinc-300">
                  <p className="flex items-center gap-2"><CalendarDays size={14} className="text-orange-400 shrink-0" /><strong>Date :</strong> {new Date(nextSeance.date_seance).toLocaleDateString('fr-FR')}</p>
                  <p className="flex items-center gap-2"><Clock3 size={14} className="text-orange-400 shrink-0" /><strong>Horaire :</strong> {nextSeance.heure_debut} - {nextSeance.heure_fin}</p>
                  <p className="flex items-center gap-2"><MapPin size={14} className="text-orange-400 shrink-0" /><strong>Lieu :</strong> {nextSeance.salle || 'En ligne'}</p>
                </div>
              </div>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                Aucun cours prévu prochainement.
              </p>
            )}
          </div>
        </section>

      </div>

      {/* Suivi présence */}
      <section className={cardClass}>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-orange-500/10 p-3 text-orange-600 dark:text-orange-400"><TrendingUp size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">Suivi présence</p>
            <h2 className="text-base font-black sm:text-lg">Ton assiduité</h2>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3 text-center sm:p-4">
            <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Présences</p>
            <p className="mt-1 text-xl font-black text-orange-600 dark:text-orange-400 sm:text-2xl">{presentCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-center sm:p-4">
            <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Retards</p>
            <p className="mt-1 text-xl font-black text-amber-600 dark:text-amber-400 sm:text-2xl">{lateCount}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/40 sm:p-4">
            <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Absences</p>
            <p className="mt-1 text-xl font-black text-zinc-900 dark:text-white sm:text-2xl">{absentCount}</p>
          </div>
        </div>
      </section>

    </div>
  );
}