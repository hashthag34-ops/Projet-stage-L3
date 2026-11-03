// frontend/src/pages/Formateur/dashboard.jsx
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { 
  Users, 
  Calendar, 
  MessageSquare, 
  ClipboardCheck, 
  Award, 
  CheckCircle, 
  BookOpen, 
  Sparkles, 
  TrendingUp 
} from 'lucide-react';
import API from '../../services/api';

const cardClass = 'rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-6';
const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';

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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:px-6 sm:py-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-3.5 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
            <Sparkles size={14} /> Vue d'ensemble du formateur
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Tableau de bord
          </h1>
        </div>

        {/* RACCOURCIS DE NAVIGATION DIRECTE */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/Formateur/Apprenants"
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Users size={15} className="text-orange-500" />
            <span>Apprenants</span>
          </Link>

          <Link
            to="/Formateur/Planning"
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Calendar size={15} className="text-orange-500" />
            <span>Planning</span>
          </Link>

          <Link
            to="/Formateur/Forum"
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <MessageSquare size={15} className="text-orange-500" />
            <span>Forum</span>
          </Link>

          <Link
            to="/Formateur/Evaluations"
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400"
          >
            <ClipboardCheck size={15} />
            <span>Évaluations</span>
          </Link>
        </div>
      </div>

      {/* TOP METRICS CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1 : Taux de Réussite */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Taux de Réussite</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Award size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-900 dark:text-white sm:text-3xl">{globalMetrics.avgReussite}%</span>
            <span className="inline-flex items-center text-xs font-extrabold text-orange-600 dark:text-orange-400">
              <TrendingUp size={13} className="mr-0.5" /> +2.4%
            </span>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-1000" style={{ width: `${Math.min(globalMetrics.avgReussite, 100)}%` }} />
          </div>
        </div>

        {/* Card 2 : Taux de Présence */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Taux de Présence</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-900 dark:text-white sm:text-3xl">{globalMetrics.avgPresence}%</span>
            <span className="inline-flex items-center text-xs font-extrabold text-orange-600 dark:text-orange-400">
              <TrendingUp size={13} className="mr-0.5" /> +1.2%
            </span>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-orange-500 transition-all duration-1000" style={{ width: `${Math.min(globalMetrics.avgPresence, 100)}%` }} />
          </div>
        </div>

        {/* Card 3 : Évaluations Créées & Tentatives */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Évaluations & Tests</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <ClipboardCheck size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-900 dark:text-white sm:text-3xl">{globalMetrics.totalEvals}</span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">sujets ({globalMetrics.totalTentatives} tps)</span>
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">Suivi actif des compétences</p>
        </div>

        {/* Card 4 : Total Apprenants */}
        <div className={cardClass}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Apprenants Inscrits</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-900 dark:text-white sm:text-3xl">{globalMetrics.totalApprenants}</span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">élèves suivis</span>
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">Répartis sur vos modules</p>
        </div>

      </div>

      {/* SECTION GRAPHIQUE + BANNÈRE */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        
        {/* GRAPHIQUE */}
        <div className={cardClass}>
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Performances par Module</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Comparatif réussite et assiduité en temps réel</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-zinc-600 dark:text-zinc-300">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-zinc-500" /> Réussite</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Présence</span>
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#71717a" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', color: '#fff', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Reussite" 
                  stroke="#71717a" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorReussite)" 
                  isAnimationActive={true}
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="Presence" 
                  stroke="#f97316" 
                  strokeWidth={2.5} 
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
        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-white shadow-xl">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl" />
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-orange-400 backdrop-blur-md">
                <Sparkles size={20} />
              </div>
              <span className="rounded-full bg-orange-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-300 backdrop-blur-md">
                Espace Formateur
              </span>
            </div>
            <h3 className="mt-5 text-lg font-black leading-snug">Module d'évaluation Pédagogique</h3>
            <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
              Consultez les résultats de vos étudiants, attribuez des notes et publiez de nouvelles évaluations en toute simplicité.
            </p>
          </div>

          <div className="mt-6">
            <Link
              to="/Formateur/Evaluations"
              className="flex w-full items-center justify-center rounded-2xl bg-orange-500 py-3 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400"
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
            <BookOpen size={18} className="text-orange-500" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Formations qui vous sont assignées</h2>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {formations.length} module(s)
          </span>
        </div>

        {loading ? (
          <div className={`${cardClass} text-center text-xs text-zinc-500 py-12`}>Chargement des formations...</div>
        ) : formations.length === 0 ? (
          <div className={`${cardClass} border-dashed p-12 text-center text-xs text-zinc-500`}>
            Aucune formation ne vous est assignée pour le moment.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formations.map((formation) => (
              <div 
                key={formation.id_formation} 
                className={`${cardClass} flex flex-col justify-between transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-white line-clamp-2">{formation.titre}</h3>
                    <span className="shrink-0 rounded-full bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-orange-600 dark:text-orange-400">
                      {formation.statut || 'En cours'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {formation.description || 'Aucune description fournie.'}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
                    <Users size={14} className="text-orange-500" />
                    <span>{formation.apprenants_count || 0} apprenant(s)</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Lecture seule</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}