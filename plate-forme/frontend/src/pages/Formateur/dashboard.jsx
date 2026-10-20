import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import API from '../../services/api';

export default function FormateurDashboard() {
  const [formations, setFormations] = useState([]);
  const [apprenantStats, setApprenantStats] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    
    // Chargement parallèle des données du Dashboard
    Promise.all([
      API.get('/formateur/formations').catch(() => ({ data: [] })),
      API.get('/formateur/apprenants/statistiques').catch(() => ({ data: [] })),
      API.get('/formateur/evaluations').catch(() => ({ data: [] }))
    ]).then(([formationsRes, statsRes, evalsRes]) => {
      if (active) {
        setFormations(formationsRes.data || []);
        setApprenantStats(statsRes.data || []);
        setEvaluations(evalsRes.data || []);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, []);

  // Calcul des statistiques cumulées pour les cartes
  const globalMetrics = useMemo(() => {
    const totalApprenants = formations.reduce((acc, curr) => acc + (curr.apprenants_count || 0), 0);
    const totalEvals = evaluations.length;
    const totalTentatives = evaluations.reduce((acc, curr) => acc + (Number(curr.tentatives_count) || 0), 0);
    
    const avgReussite = apprenantStats.length > 0
      ? (apprenantStats.reduce((acc, curr) => acc + (Number(curr.taux_reussite) || 0), 0) / apprenantStats.length).toFixed(1)
      : 0;

    const avgPresence = apprenantStats.length > 0
      ? (apprenantStats.reduce((acc, curr) => acc + (Number(curr.taux_presence) || 0), 0) / apprenantStats.length).toFixed(1)
      : 0;

    return { totalApprenants, totalEvals, totalTentatives, avgReussite, avgPresence };
  }, [formations, apprenantStats, evaluations]);

  // Données préparées pour le graphique Recharts
  const chartData = useMemo(() => {
    if (apprenantStats.length > 0) {
      return apprenantStats.map(stat => ({
        name: stat.formation_titre.length > 12 ? stat.formation_titre.substring(0, 12) + '...' : stat.formation_titre,
        fullTitle: stat.formation_titre,
        Reussite: Number(stat.taux_reussite) || 0,
        Presence: Number(stat.taux_presence) || 0,
      }));
    }
    return [
      { name: 'S1', Reussite: 65, Presence: 85 },
      { name: 'S2', Reussite: 78, Presence: 90 },
      { name: 'S3', Reussite: 82, Presence: 88 },
      { name: 'S4', Reussite: 91, Presence: 95 },
    ];
  }, [apprenantStats]);

  return (
    <div className="space-y-8 p-2 sm:p-4 text-slate-800 dark:text-zinc-100 transition-colors duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <i className="bi bi-stars"></i> Vue d'ensemble du formateur
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Tableau de bord
          </h1>
        </div>

        {/* RACCOURCIS DE NAVIGATION DIRECTE */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/Formateur/Apprenants"
            className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <i className="bi bi-people text-orange-500"></i>
            <span>Apprenants</span>
          </Link>

          <Link
            to="/Formateur/Planning"
            className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <i className="bi bi-calendar-event text-orange-500"></i>
            <span>Planning</span>
          </Link>

          <Link
            to="/Formateur/Forum"
            className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <i className="bi bi-chat-square-text text-orange-500"></i>
            <span>Forum</span>
          </Link>

          <Link
            to="/Formateur/Evaluations"
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-zinc-200"
          >
            <i className="bi bi-clipboard-check text-orange-500"></i>
            <span>Évaluations</span>
          </Link>
        </div>
      </div>

      {/* TOP METRICS CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1 : Taux de Réussite */}
        <div className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900/90 dark:border dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Taux de Réussite</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <i className="bi bi-award"></i>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{globalMetrics.avgReussite}%</span>
            <span className="text-[11px] font-bold text-orange-500 flex items-center">
              <i className="bi bi-trending-up me-0.5"></i> +2.4%
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-1000" style={{ width: `${Math.min(globalMetrics.avgReussite, 100)}%` }} />
          </div>
        </div>

        {/* Card 2 : Taux de Présence */}
        <div className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900/90 dark:border dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Taux de Présence</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <i className="bi bi-check-circle"></i>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{globalMetrics.avgPresence}%</span>
            <span className="text-[11px] font-bold text-orange-500 flex items-center">
              <i className="bi bi-trending-up me-0.5"></i> +1.2%
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-1000" style={{ width: `${Math.min(globalMetrics.avgPresence, 100)}%` }} />
          </div>
        </div>

        {/* Card 3 : Évaluations Créées & Tentatives */}
        <div className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900/90 dark:border dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Évaluations & Tests</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <i className="bi bi-clipboard-check"></i>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{globalMetrics.totalEvals}</span>
            <span className="text-xs font-semibold text-slate-400">sujets ({globalMetrics.totalTentatives} tps)</span>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-orange-500">Suivi actif des compétences</p>
        </div>

        {/* Card 4 : Total Apprenants */}
        <div className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-zinc-900/90 dark:border dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Apprenants Inscrits</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <i className="bi bi-people"></i>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{globalMetrics.totalApprenants}</span>
            <span className="text-xs font-semibold text-slate-400">élèves suivis</span>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-orange-500">Répartis sur vos modules</p>
        </div>

      </div>

      {/* SECTION GRAPHIQUE + BANNÈRE */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* GRAPHIQUE */}
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-900/90 dark:border dark:border-zinc-800/80 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Performances par Module</h2>
              <p className="text-[11px] text-slate-400">Comparatif réussite et assiduité en temps réel</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-white"></span> Réussite</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500"></span> Présence</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReussite" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPresence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderRadius: '16px', border: '1px solid #27272a', color: '#fff', fontSize: '11px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Reussite" 
                  stroke="#71717a" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorReussite)" 
                  isAnimationActive={true}
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="Presence" 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorPresence)" 
                  isAnimationActive={true}
                  animationDuration={1800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BANNIÈRE LATÉRALE */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 text-white shadow-lg border border-zinc-800">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-orange-400">
                <i className="bi bi-stars"></i>
              </div>
              <span className="rounded-full bg-orange-500/20 px-2.5 py-1 text-[10px] font-bold text-orange-300 backdrop-blur-md">
                Espace Formateur
              </span>
            </div>
            <h3 className="mt-6 text-lg font-bold leading-tight">Module d'évaluation Pédagogique</h3>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Consultez les résultats de vos étudiants, attribuez des notes et publiez de nouvelles évaluations en toute simplicité.
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <Link
              to="/Formateur/Evaluations"
              className="flex w-full items-center justify-center rounded-2xl bg-white/10 py-3 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
            >
              Gérer les évaluations
            </Link>
          </div>
        </div>

      </div>

      {/* LISTE DES FORMATIONS ASSIGNÉES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="bi bi-book text-orange-500"></i>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Formations qui vous sont assignées</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">{formations.length} module(s)</span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">Chargement des formations...</p>
        ) : formations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-zinc-800">
            Aucune formation ne vous est assignée pour le moment.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {formations.map((formation) => (
              <div 
                key={formation.id_formation} 
                className="flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm transition dark:bg-zinc-900/90 dark:border dark:border-zinc-800/80"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{formation.titre}</h3>
                    <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
                      {formation.statut || 'En cours'}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-zinc-400">
                    {formation.description || 'Aucune description fournie.'}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 font-semibold">
                    <i className="bi bi-people text-orange-500"></i>
                    <span>{formation.apprenants_count || 0} apprenant(s)</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">Lecture seule</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}