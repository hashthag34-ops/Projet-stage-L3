// frontend/src/pages/Apprenant/ApprenantPlanning.jsx
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

const cardClass = 'rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-6';

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
    const absents = seances.filter((s) => s.statut_presence === 'ABSENT').length;
    const aVenir = seances.filter((s) => !s.statut_presence || s.statut_presence === 'EN_ATTENTE').length;
    const tauxPresence = total > 0 ? Math.round((presents / total) * 100) : 0;

    return { total, presents, absents, aVenir, tauxPresence };
  }, [seances]);

  const chartData = useMemo(() => {
    return [
      { name: 'Présent', value: stats.presents, color: '#f97316' },
      { name: 'Absent', value: stats.absents, color: '#71717a' },
      { name: 'À venir', value: stats.aVenir, color: '#e4e4e7' },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const legend = [
    { label: 'Présent', value: stats.presents, dotClass: 'bg-orange-500' },
    { label: 'Absent', value: stats.absents, dotClass: 'bg-zinc-500' },
    { label: 'À venir', value: stats.aVenir, dotClass: 'bg-zinc-300 dark:bg-zinc-700' },
  ];

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    const seanceDate = new Date(dateStr).toISOString().split('T')[0];
    return today === seanceDate;
  };

  const matchesFilter = (s, id) => {
    if (id === 'PRESENT') return s.statut_presence === 'PRESENT';
    if (id === 'ABSENT') return s.statut_presence === 'ABSENT';
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
    switch (statut) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={13} /> Présent
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-400">
            <CircleDashed size={13} /> Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-400">
            <Clock3 size={13} /> À venir
          </span>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:space-y-6 sm:px-6 sm:py-6">

      {/* En-tête */}
      <header className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 sm:text-xs">Calendrier</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Mon planning</h1>
          <p className="mt-1 text-xs text-zinc-300 sm:text-sm">Retrouvez vos séances et suivez votre assiduité.</p>
        </div>
        {!loading && (
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-500/20 bg-orange-500/10 px-3.5 py-2 text-xs font-bold text-orange-400">
            <CalendarDays size={15} />
            {seances.length} séance{seances.length > 1 ? 's' : ''} au programme
          </div>
        )}
      </header>

      {/* Bilan de présence */}
      {!loading && seances.length > 0 && (
        <section
          aria-label="Bilan de présence"
          className={cardClass}
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* Donut */}
            <div className="relative h-44 w-44 shrink-0">
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
                      borderRadius: '16px',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#18181b',
                      color: '#fff',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-zinc-950 dark:text-white">
                  {stats.tauxPresence}%
                </span>
                <span className="text-[11px] font-bold text-zinc-400">Présence</span>
              </div>
            </div>

            {/* Légende */}
            <dl className="grid w-full grid-cols-3 gap-3">
              {legend.map((item) => (
                <div key={item.label} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3.5 text-center dark:border-zinc-800 dark:bg-zinc-800/40">
                  <dt className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} aria-hidden="true" />
                    {item.label}
                  </dt>
                  <dd className="mt-1.5 text-xl font-black text-zinc-900 dark:text-white">
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
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les séances">
          {FILTERS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${active ? 'bg-orange-500 text-zinc-950 shadow-sm' : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${active ? 'bg-zinc-950/10 text-zinc-950' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                  {counts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="grid gap-3" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 animate-pulse rounded-3xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40" />
          ))}
        </div>
      ) : filteredSeances.length === 0 ? (
        <div className={`${cardClass} flex flex-col items-center border-dashed p-12 text-center`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <CalendarDays size={30} />
          </div>
          <p className="mt-4 text-sm font-bold text-zinc-900 dark:text-white">
            {filter !== 'ALL' ? 'Aucune séance dans cette catégorie' : 'Aucune séance planifiée'}
          </p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
            {filter !== 'ALL'
              ? 'Choisissez un autre filtre pour voir vos séances.'
              : 'Vos prochaines séances apparaîtront ici.'}
          </p>
          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className="mt-5 rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400"
            >
              Voir toutes les séances
            </button>
          )}
        </div>
      ) : (
        <ul className="grid gap-3">
          {filteredSeances.map((s) => {
            const today = isToday(s.date_seance);
            const date = new Date(s.date_seance);

            return (
              <li
                key={s.id_seance}
                className={`${cardClass} flex flex-col gap-4 sm:flex-row sm:items-center`}
              >
                {/* Bloc date */}
                <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl ${today ? 'bg-orange-500 text-zinc-950 font-black shadow-md' : 'border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-200'}`}>
                  <span className="text-xl font-black">{date.getDate()}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">
                    {date.toLocaleDateString('fr-FR', { month: 'short' })}
                  </span>
                </div>

                {/* Infos */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                        {s.titre_formation}
                        {s.type_seance ? ` · ${s.type_seance}` : ''}
                      </p>
                      <h3 className="mt-1 text-base font-black text-zinc-900 dark:text-white sm:text-lg">
                        {s.titre}
                      </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {today && (
                        <span className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black text-zinc-950 shadow-xs">
                          Aujourd'hui
                        </span>
                      )}
                      {renderPresenceBadge(s.statut_presence)}
                    </div>
                  </div>

                  {s.description && (
                    <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-sm">
                      {s.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-orange-500 shrink-0" />
                      {date.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock3 size={14} className="text-orange-500 shrink-0" />
                      {s.heure_debut?.substring(0, 5)} – {s.heure_fin?.substring(0, 5)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-orange-500 shrink-0" />
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