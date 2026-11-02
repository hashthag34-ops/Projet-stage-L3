// frontend/src/pages/Apprenant/ApprenantDashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, Clock3, MapPin, Star, Target, TrendingUp } from 'lucide-react';
import API from '../../services/api';

export default function ApprenantDashboard() {
  const [formations, setFormations] = useState([]);
  const [seances, setSeances] = useState([]); // Ajouté pour éviter l'erreur de référence sur 'seances'
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
        
        // Les séances sont triées par l'API, mais on vérifie la date pour ignorer l'historique.
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

  if (loading) return <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">Chargement de ton espace...</div>;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6 pb-8 text-slate-900">
      
      {/* En-tête de bienvenue */}
      <header className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-8 text-white shadow-xl md:px-10">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
        <p className="relative mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Tableau de bord</p>
        <h1 className="relative text-3xl font-bold md:text-4xl">Ravi de te revoir</h1>
        <p className="relative mt-3 max-w-2xl text-sm text-slate-300">Suis ton parcours, tes présences et tes prochaines échéances depuis un seul espace.</p>
      </header>

      {/* Cartes KPI Principales */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Formations suivies</p>
            <p className="mt-1 text-3xl font-bold">{formations.length}</p>
          </div>
          <div className="rounded-xl bg-orange-50 p-3 text-orange-500"><BookOpen size={24} /></div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Séances réalisées</p>
            <p className="mt-1 text-3xl font-bold">{completedSessions}</p>
          </div>
          <div className="rounded-xl bg-orange-50 p-3 text-orange-500"><CalendarDays size={24} /></div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Assiduité</p>
            <p className="mt-1 text-3xl font-bold text-orange-500">{attendanceRate} %</p>
          </div>
          <div className="rounded-xl bg-orange-50 p-3 text-orange-500"><Target size={24} /></div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-500">Évaluations</p>
            <p className="mt-1 text-lg font-bold">Aucune note</p>
          </div>
          <div className="rounded-xl bg-orange-50 p-3 text-orange-500"><Star size={24} /></div>
        </div>
      </section>

      {/* Grille principale : Formations et Prochaine séance */}
      <div className="grid gap-5 lg:grid-cols-2">
        
        {/* Mes Formations */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-500">Historique</p>
              <h2 className="mt-1 text-xl font-bold">Mes formations</h2>
            </div>
            <Link to="/apprenant/catalogue" className="flex items-center gap-1 text-sm font-bold text-orange-500">
              Catalogue <ArrowRight size={14} />
            </Link>
          </div>

          {formations.length === 0 ? (
            <p className="mt-8 rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">Tu n'es inscrit à aucune formation pour le moment.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {formations.map((f) => (
                <div key={f.id_formation} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{f.titre}</h3>
                      <p className="mt-1 text-sm text-slate-500">{f.description}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
                      {f.statut || 'EN_COURS'}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
                      <span>Progression</span>
                      <span>{f.progression || 0}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div 
                        className="h-full rounded-full bg-orange-500"
                        style={{ width: `${f.progression || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Prochaine séance */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-orange-500">À venir</p>
              <h2 className="mt-1 text-xl font-bold">Prochaine séance</h2>
            </div>
            <Link to="/apprenant/planning" className="flex items-center gap-1 text-sm font-bold text-orange-500">
              Tout voir <ArrowRight size={14} />
            </Link>
          </div>

          {nextSeance ? (
            <div className="mt-5 rounded-xl bg-slate-950 p-5 text-white">
              <span className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold">
                {nextSeance.type_seance || 'Cours Pratique'}
              </span>
              <h3 className="mt-4 text-lg font-bold">{nextSeance.titre}</h3>
              <p className="mt-1 text-sm text-slate-300">{nextSeance.description}</p>
              
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p className="flex items-center gap-2"><CalendarDays size={15} /><strong>Date :</strong> {new Date(nextSeance.date_seance).toLocaleDateString('fr-FR')}</p>
                <p className="flex items-center gap-2"><Clock3 size={15} /><strong>Horaire :</strong> {nextSeance.heure_debut} - {nextSeance.heure_fin}</p>
                <p className="flex items-center gap-2"><MapPin size={15} /><strong>Lieu :</strong> {nextSeance.salle || 'En ligne'}</p>
              </div>
            </div>
          ) : (
            <p className="mt-8 rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">Aucun cours prévu prochainement.</p>
          )}
        </section>

      </div>

      {/* Suivi présence */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-orange-50 p-3 text-orange-500"><TrendingUp size={19} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-500">Suivi présence</p>
            <h2 className="text-xl font-bold">Ton assiduité</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-orange-50 p-4 text-center">
            <p className="text-sm text-slate-500">Présences</p>
            <p className="mt-1 text-2xl font-bold text-orange-500">{presentCount}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4 text-center">
            <p className="text-sm text-slate-500">Retards</p>
            <p className="mt-1 text-2xl font-bold">{lateCount}</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-4 text-center">
            <p className="text-sm text-slate-500">Absences</p>
            <p className="mt-1 text-2xl font-bold">{absentCount}</p>
          </div>
        </div>
      </section>

    </div>
  );
}