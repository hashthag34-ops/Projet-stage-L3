import { useEffect, useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock3,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import API from '../../services/api';

const FILTERS = [
  { id: 'ALL', label: 'Toutes' },
  { id: 'UPCOMING', label: 'À venir' },
  { id: 'PRESENT', label: 'Présent' },
  { id: 'ABSENT', label: 'Absences et retards' },
];

export default function ApprenantPlanning() {
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    API.get('/apprenant/seances')
      .then((res) => setSeances(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('Erreur planning :', err))
      .finally(() => setLoading(false));
  }, []);

  // Statistiques
  const stats = useMemo(() => {
    const total = seances.length;
    const presents = seances.filter((s) => s.statut_presence === 'PRESENT').length;
    const retards = seances.filter((s) => s.statut_presence === 'RETARD').length;
    const absents = seances.filter((s) => s.statut_presence === 'ABSENT').length;
    const aVenir = seances.filter((s) => !s.statut_presence || s.statut_presence === 'EN_ATTENTE').length;
    const tauxPresence = total > 0 ? Math.round(((presents + retards) / total) * 100) : 0;

    return { total, presents, retards, absents, aVenir, tauxPresence };
  }, [seances]);

  const chartData = useMemo(() => {
    return [
      { name: 'Présent', value: stats.presents, color: '#f97316' },
      { name: 'En retard', value: stats.retards, color: '#f59e0b' },
      { name: 'Absent', value: stats.absents, color: '#64748b' },
      { name: 'À venir', value: stats.aVenir, color: '#cbd5e1' },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const legend = [
    { label: 'Présent', value: stats.presents, color: 'bg-orange-500' },
    { label: 'En retard', value: stats.retards, color: 'bg-amber-500' },
    { label: 'Absent', value: stats.absents, color: 'bg-slate-500' },
    { label: 'À venir', value: stats.aVenir, color: 'bg-slate-300 dark:bg-zinc-600' },
  ];

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    const seanceDate = new Date(dateStr).toISOString().split('T')[0];
    return today === seanceDate;
  };

  const matchesFilter = (s, id) => {
    if (id === 'PRESENT') return s.statut_presence === 'PRESENT';
    if (id === 'ABSENT') return s.statut_presence === 'ABSENT' || s.statut_presence === 'RETARD';
    if (id === 'UPCOMING') return !s.statut_presence || s.statut_presence === 'EN_ATTENTE';
    return true;
  };

  const filteredSeances = useMemo(
    () => seances.filter((s) => matchesFilter(s, filter)),
    [seances, filter]
  );

  const counts = useMemo(() => {
    const result = {};
    FILTERS.forEach((f) => {
      result[f.id] = seances.filter((s) => matchesFilter(s, f.id)).length;
    });
    return result;
  }, [seances]);

  const renderPresenceBadge = (statut) => {
    const base = 'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';
    switch (statut) {
      case 'PRESENT':
        return (
          <span className={`${base} bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20`}>
            <CheckCircle2 size={12} /> Présent
          </span>
        );
      case 'RETARD':
        return (
          <span className={`${base} bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20`}>
            <AlertTriangle size={12} /> En retard
          </span>
        );
      case 'ABSENT':
        return (
          <span className={`${base} bg-slate-100 text-slate-700 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700`}>
            <CircleDashed size={12} /> Absent
          </span>
        );
      default:
        return (
          <span className={`${base} bg-white text-slate-500 ring-slate-200 dark:bg-transparent dark:text-zinc-400 dark:ring-zinc-700`}>
            <Clock3 size={12} /> À venir
          </span>
        );
    }
  };

  const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40';

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 font-sans text-slate-900 sm:px-6 dark:text-zinc-100">

      {/* En-tête */}
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Mon planning
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
            Retrouvez vos séances et suivez votre assiduité.
          </p>
        </div>
        {!loading && (
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            {seances.length} séance{seances.length > 1 ? 's' : ''} au programme
          </p>
        )}
      </header>

      {/* Bilan de présence */}
      {!loading && seances.length > 0 && (
        <section
          aria-label="Bilan de présence"
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60"
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
            {/* Donut */}
            <div className="relative h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: 'none',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {stats.tauxPresence}%
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400">Présence</span>
              </div>
            </div>

            {/* Légende */}
            <dl className="grid w-full flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {legend.map((item) => (
                <div key={item.label}>
                  <dt className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                    <span className={`h-2 w-2 rounded-full ${item.color}`} aria-hidden="true" />
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* Filtres */}
      {!loading && seances.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrer les séances">
          {FILTERS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${focusRing} ${
                  active
                    ? 'border-orange-500 bg-orange-500 text-white dark:text-slate-950'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white'
                }`}
              >
                {tab.label}
                <span className={`text-xs ${active ? 'opacity-80' : 'text-slate-400 dark:text-zinc-500'}`}>
                  {counts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-zinc-900" />
          ))}
        </div>
      ) : filteredSeances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-14 text-center dark:border-zinc-800">
          <CalendarDays size={30} className="mx-auto mb-3 text-slate-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">
            {filter !== 'ALL' ? 'Aucune séance dans cette catégorie' : 'Aucune séance planifiée'}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
            {filter !== 'ALL'
              ? 'Choisissez un autre filtre pour voir vos séances.'
              : 'Vos prochaines séances apparaîtront ici.'}
          </p>
          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className={`mt-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 ${focusRing}`}
            >
              Voir toutes les séances
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredSeances.map((s) => {
            const today = isToday(s.date_seance);
            const date = new Date(s.date_seance);

            return (
              <li
                key={s.id_seance}
                className={`flex gap-4 rounded-2xl border bg-white p-4 transition-colors dark:bg-zinc-900/60 sm:gap-5 sm:p-5 ${
                  today
                    ? 'border-orange-300 dark:border-orange-500/40'
                    : 'border-slate-200 hover:border-slate-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                {/* Bloc date */}
                <div
                  className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl ${
                    today
                      ? 'bg-orange-500 text-white dark:text-slate-950'
                      : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <span className="text-xl font-semibold leading-none">{date.getDate()}</span>
                  <span className="mt-1 text-xs capitalize leading-none opacity-80">
                    {date.toLocaleDateString('fr-FR', { month: 'short' })}
                  </span>
                </div>

                {/* Infos */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-orange-600 dark:text-orange-400">
                        {s.titre_formation}
                        {s.type_seance ? ` · ${s.type_seance}` : ''}
                      </p>
                      <h3 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white">
                        {s.titre}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {today && (
                        <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-xs font-medium text-white dark:text-slate-950">
                          Aujourd'hui
                        </span>
                      )}
                      {renderPresenceBadge(s.statut_presence)}
                    </div>
                  </div>

                  {s.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
                      {s.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
                    <span className="flex items-center gap-1.5 capitalize">
                      <CalendarDays size={14} className="text-slate-400 dark:text-zinc-500" />
                      {date.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock3 size={14} className="text-slate-400 dark:text-zinc-500" />
                      {s.heure_debut?.substring(0, 5)} – {s.heure_fin?.substring(0, 5)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-slate-400 dark:text-zinc-500" />
                      {s.salle || 'En ligne'}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}