// frontend/src/pages/Apprenant/ApprenantDashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Clock3, MapPin, Star, Target, TrendingUp } from 'lucide-react';
import API from '../../services/api';

export default function ApprenantDashboard() {
  const [formations, setFormations] = useState([]);
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
        
        // Les séances sont triées par l'API, mais on vérifie la date pour ignorer l'historique.
        const upcoming = (resSeances.data || []).find((seance) => {
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

  const attendance = seances.filter((seance) => ['PRESENT', 'RETARD', 'ABSENT'].includes(seance.statut_presence));
  const presentCount = seances.filter((seance) => seance.statut_presence === 'PRESENT').length;
  const lateCount = seances.filter((seance) => seance.statut_presence === 'RETARD').length;
  const absentCount = seances.filter((seance) => seance.statut_presence === 'ABSENT').length;
  const attendanceRate = attendance.length ? Math.round(((presentCount + lateCount) / attendance.length) * 100) : 0;
  const completedSessions = seances.filter((seance) => seance.statut_presence).length;

  if (loading) return <div className="p-6 text-black/50 dark:text-white/50">Chargement de ton espace...</div>;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6 shadow-sm dark:bg-orange-500/15">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-400">Tableau de bord</p>
        <h1 className="text-3xl font-black tracking-tight">Ravi de te revoir</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">Suis ton parcours, tes présences et tes prochaines échéances depuis un seul espace.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">Formations suivies</p>
            <p className="mt-1 text-3xl font-black">{formations.length}</p>
          </div>
          <BookOpen className="text-orange-500" size={27} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">Séances réalisées</p>
            <p className="mt-1 text-3xl font-black">{completedSessions}</p>
          </div>
          <CalendarDays className="text-orange-500" size={27} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">Assiduité</p>
            <p className="mt-1 text-3xl font-black text-orange-600 dark:text-orange-400">{attendanceRate} %</p>
          </div>
          <Target className="text-orange-500" size={27} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45">Évaluations</p>
            <p className="mt-1 text-sm font-bold">Aucune note</p>
          </div>
          <Star className="text-orange-500" size={27} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="space-y-5 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
            <div><p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Historique</p><h2 className="mt-1 text-xl font-black">Mes formations</h2></div>
            <Link to="/apprenant/catalogue" className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-500 dark:text-orange-400">Catalogue <ArrowRight size={14} />
            </Link>
          </div>

          {formations.length === 0 ? (
            <p className="py-4 text-sm italic text-black/50 dark:text-white/50">Tu n'es inscrit à aucune formation pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {formations.map((f) => (
                <div key={f.id_formation} className="space-y-3 rounded-xl border border-black/10 bg-black/[0.03] p-4 transition hover:border-orange-500/40 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{f.titre}</h3>
                      <p className="line-clamp-1 text-xs text-black/50 dark:text-white/50">{f.description}</p>
                    </div>
                    <span className="whitespace-nowrap rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-700 dark:text-orange-400">
                      {f.statut || 'EN_COURS'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-black/50 dark:text-white/50"><span>Progression</span><span>{f.progression || 0}%</span></div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div 
                        className="h-full bg-orange-500 transition-all duration-300"
                        style={{ width: `${f.progression || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5 rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10"><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">À venir</p><h2 className="mt-1 text-xl font-black">Prochaine séance</h2></div><Link to="/apprenant/planning" className="flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400">Tout voir <ArrowRight size={14} />
            </Link>
          </div>

          {nextSeance ? (
            <div className="space-y-4 rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-4 dark:bg-orange-500/10">
              <span className="inline-block rounded-lg bg-orange-500 px-2.5 py-1 text-xs font-bold text-black">
                {nextSeance.type_seance || 'Cours Pratique'}
              </span>
              <h3 className="text-base font-black">{nextSeance.titre}</h3>
              <p className="text-xs leading-5 text-black/60 dark:text-white/60">{nextSeance.description}</p>
              
              <div className="space-y-2 border-t border-orange-500/20 pt-3 text-xs text-black/70 dark:text-white/70">
                <p className="flex items-center gap-2"><CalendarDays size={15} className="text-orange-500" /><strong>Date :</strong> {new Date(nextSeance.date_seance).toLocaleDateString('fr-FR')}</p>
                <p className="flex items-center gap-2"><Clock3 size={15} className="text-orange-500" /><strong>Horaire :</strong> {nextSeance.heure_debut} - {nextSeance.heure_fin}</p>
                <p className="flex items-center gap-2"><MapPin size={15} className="text-orange-500" /><strong>Lieu :</strong> {nextSeance.salle || 'En ligne'}</p>
              </div>
            </div>
          ) : (
            <p className="py-4 text-sm italic text-black/50 dark:text-white/50">Aucun cours prévu prochainement.</p>
          )}
        </section>

      </div>
      <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950"><div className="mb-5 flex items-center gap-2"><TrendingUp size={19} className="text-orange-500" /><div><p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Suivi présence</p><h2 className="mt-1 text-xl font-black">Ton assiduité</h2></div></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="rounded-xl bg-orange-500/10 p-4"><p className="text-xs font-semibold text-black/50 dark:text-white/50">Présences</p><p className="mt-1 text-2xl font-black text-orange-600 dark:text-orange-400">{presentCount}</p></div><div className="rounded-xl bg-black/5 p-4 dark:bg-white/10"><p className="text-xs font-semibold text-black/50 dark:text-white/50">Retards</p><p className="mt-1 text-2xl font-black">{lateCount}</p></div><div className="rounded-xl bg-black p-4 text-white dark:bg-white dark:text-black"><p className="text-xs font-semibold opacity-60">Absences</p><p className="mt-1 text-2xl font-black">{absentCount}</p></div></div></section>
    </div>
  );
}