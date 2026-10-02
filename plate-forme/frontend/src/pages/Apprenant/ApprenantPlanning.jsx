import { useEffect, useState, useMemo } from 'react';
import { 
  CalendarDays, 
  Clock3, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  CircleDashed,
  Sparkles,
  Filter,
  PieChart as PieIcon
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import API from '../../services/api';

export default function ApprenantPlanning() {
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    API.get('/apprenant/seances')
      .then((res) => setSeances(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Erreur planning :", err))
      .finally(() => setLoading(false));
  }, []);

  // Calculs statistiques
  const stats = useMemo(() => {
    const total = seances.length;
    const presents = seances.filter(s => s.statut_presence === 'PRESENT').length;
    const retards = seances.filter(s => s.statut_presence === 'RETARD').length;
    const absents = seances.filter(s => s.statut_presence === 'ABSENT').length;
    const aVenir = seances.filter(s => !s.statut_presence || s.statut_presence === 'EN_ATTENTE').length;
    const tauxPresence = total > 0 ? Math.round(((presents + retards) / total) * 100) : 0;

    return { total, presents, retards, absents, aVenir, tauxPresence };
  }, [seances]);

  // Données pour Recharts
  const chartData = useMemo(() => {
    return [
      { name: 'Présents', value: stats.presents, color: '#f97316' },  // Orange
      { name: 'Retards', value: stats.retards, color: '#f59e0b' },   // Amber
      { name: 'Absents', value: stats.absents, color: '#64748b' },   // Slate
      { name: 'À venir', value: stats.aVenir, color: '#e2e8f0' }     // Light Slate / Gray
    ].filter(item => item.value > 0);
  }, [stats]);

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    const seanceDate = new Date(dateStr).toISOString().split('T')[0];
    return today === seanceDate;
  };

  const filteredSeances = useMemo(() => {
    return seances.filter((s) => {
      if (filter === 'PRESENT') return s.statut_presence === 'PRESENT';
      if (filter === 'ABSENT') return s.statut_presence === 'ABSENT' || s.statut_presence === 'RETARD';
      if (filter === 'UPCOMING') return !s.statut_presence || s.statut_presence === 'EN_ATTENTE';
      return true;
    });
  }, [seances, filter]);

  const renderPresenceBadge = (statut) => {
    switch (statut) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <CheckCircle2 size={13} /> Présent
          </span>
        );
      case 'RETARD':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <AlertTriangle size={13} /> En retard
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
            <CircleDashed size={13} /> Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
            <Clock3 size={13} /> À venir
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 py-8 px-4 font-sans sm:px-6">
      
      {/* En-tête Fusionné */}
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500">
            Espace Apprenant
          </span>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Mon Planning & Assiduité
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Suivez vos cours et visualisez vos statistiques de présence en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-2xl bg-orange-500/5 px-4 py-2.5 text-xs font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 sm:self-auto">
          <CalendarDays size={16} />
          <span>{seances.length} séance{seances.length > 1 ? 's' : ''} au programme</span>
        </div>
      </div>

      {/* Section Statistiques Recharts avec design fluide */}
      {!loading && seances.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50/80 via-orange-50/30 to-slate-50/50 p-6 backdrop-blur-md dark:from-zinc-900/80 dark:via-zinc-900/40 dark:to-zinc-950/80 dark:border dark:border-white/5">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <PieIcon size={14} className="text-orange-500" /> Bilan de présence
          </div>

          <div className="grid items-center gap-6 md:grid-cols-12">
            {/* Graphique Donut Recharts */}
            <div className="relative flex h-48 items-center justify-center md:col-span-5 lg:col-span-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Contenu au centre du Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {stats.tauxPresence}%
                </span>
                <span className="text-[10px] font-bold uppercase text-slate-400">Taux global</span>
              </div>
            </div>

            {/* Légendes & Chiffres Clés */}
            <div className="grid grid-cols-2 gap-3 md:col-span-7 lg:col-span-8 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/60 p-4 backdrop-blur-sm dark:bg-white/[0.03]">
                <p className="text-xs font-medium text-slate-400">Présences</p>
                <p className="mt-1 text-2xl font-black text-orange-500">{stats.presents}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-4 backdrop-blur-sm dark:bg-white/[0.03]">
                <p className="text-xs font-medium text-slate-400">Retards</p>
                <p className="mt-1 text-2xl font-black text-amber-500">{stats.retards}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-4 backdrop-blur-sm dark:bg-white/[0.03]">
                <p className="text-xs font-medium text-slate-400">Absences</p>
                <p className="mt-1 text-2xl font-black text-slate-700 dark:text-slate-300">{stats.absents}</p>
              </div>
              <div className="rounded-2xl bg-white/60 p-4 backdrop-blur-sm dark:bg-white/[0.03]">
                <p className="text-xs font-medium text-slate-400">À venir</p>
                <p className="mt-1 text-2xl font-black text-slate-400">{stats.aVenir}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barre de Filtres Organique */}
      {!loading && seances.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Filter size={13} /> Filtrer
          </span>
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'UPCOMING', label: 'À venir' },
            { id: 'PRESENT', label: 'Présents' },
            { id: 'ABSENT', label: 'Absences & Retards' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${
                filter === tab.id
                  ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-zinc-800/60 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Skeleton Loading */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 animate-pulse rounded-3xl bg-slate-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : filteredSeances.length === 0 ? (
        /* État vide */
        <div className="rounded-3xl bg-slate-50/50 py-16 text-center dark:bg-zinc-900/30">
          <CalendarDays size={36} className="mx-auto mb-3 text-slate-300 dark:text-zinc-600" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Aucune séance correspondante
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {filter !== 'ALL' ? "Essayez de modifier vos critères de recherche." : "Votre emploi du temps est vide pour le moment."}
          </p>
          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className="mt-4 rounded-full bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-500/20"
            >
              Voir toutes les séances
            </button>
          )}
        </div>
      ) : (
        /* Grille des Séances avec Cartes Mousse / Smooth UI */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSeances.map((s) => {
            const today = isToday(s.date_seance);

            return (
              <div 
                key={s.id_seance} 
                className={`relative flex flex-col justify-between rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 ${
                  today 
                    ? 'bg-gradient-to-br from-orange-50/80 to-white ring-2 ring-orange-500/30 shadow-xl shadow-orange-500/5 dark:from-zinc-900 dark:to-zinc-950 dark:ring-orange-500/40' 
                    : 'bg-slate-50/60 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 dark:hover:shadow-none'
                }`}
              >
                {/* Badge "Aujourd'hui" */}
                {today && (
                  <span className="absolute -top-3 right-6 flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/30">
                    <Sparkles size={11} /> Aujourd'hui
                  </span>
                )}

                <div>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {s.type_seance || 'Cours'}
                    </span>
                    {renderPresenceBadge(s.statut_presence)}
                  </div>

                  <p className="text-xs font-extrabold uppercase tracking-widest text-orange-500">
                    {s.titre_formation}
                  </p>

                  <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                    {s.titre}
                  </h3>

                  {s.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {s.description}
                    </p>
                  )}
                </div>

                {/* Footer Carte Fusionné */}
                <div className="mt-6 border-t border-slate-200/60 pt-4 text-xs dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300 capitalize">
                      <CalendarDays size={14} className="text-orange-500" />
                      {new Date(s.date_seance).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      <Clock3 size={13} className="text-slate-400" /> 
                      {s.heure_debut?.substring(0, 5)} - {s.heure_fin?.substring(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span>Lieu</span>
                    <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                      <MapPin size={13} className="text-orange-500" />
                      <span className="truncate">{s.salle || 'En ligne'}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}