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
      { name: 'Absent', value: stats.absents, color: '#64748b' },
      { name: 'À venir', value: stats.aVenir, color: '#cbd5e1' },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const legend = [
    { label: 'Présent', value: stats.presents, dotClass: 'dot-orange' },
    { label: 'Absent', value: stats.absents, dotClass: 'dot-slate' },
    { label: 'À venir', value: stats.aVenir, dotClass: 'dot-light' },
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
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
            <CheckCircle2 size={12} /> Présent
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
            <CircleDashed size={12} /> Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            <Clock3 size={12} /> À venir
          </span>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8 text-slate-900">

      {/* En-tête */}
      <header className="flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm md:flex-row md:items-center md:px-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 md:text-3xl">
            Mon planning
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Retrouvez vos séances et suivez votre assiduité.
          </p>
        </div>
        {!loading && (
          <p className="text-sm font-semibold text-slate-500">
            {seances.length} séance{seances.length > 1 ? 's' : ''} au programme
          </p>
        )}
      </header>

      {/* Bilan de présence */}
      {!loading && seances.length > 0 && (
        <section
          aria-label="Bilan de présence"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
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
                      borderRadius: '10px',
                      border: '1px solid var(--plan-border)',
                      backgroundColor: 'var(--plan-panel)',
                      color: 'var(--plan-text)',
                      boxShadow: 'none',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-950">
                  {stats.tauxPresence}%
                </span>
                <span className="text-xs text-slate-500">Présence</span>
              </div>
            </div>

            {/* Légende */}
            <dl className="grid w-full grid-cols-3 gap-3">
              {legend.map((item) => (
                <div key={item.label}>
                  <dt className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass === 'dot-orange' ? 'bg-orange-500' : item.dotClass === 'dot-slate' ? 'bg-slate-500' : 'bg-slate-300'}`} aria-hidden="true" />
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-lg font-bold">
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
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${active ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
              >
                {tab.label}
                <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>
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
            <div key={n} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : filteredSeances.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center">
          <CalendarDays size={30} className="mb-3 text-orange-500" />
          <p className="font-bold text-slate-900">
            {filter !== 'ALL' ? 'Aucune séance dans cette catégorie' : 'Aucune séance planifiée'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {filter !== 'ALL'
              ? 'Choisissez un autre filtre pour voir vos séances.'
              : 'Vos prochaines séances apparaîtront ici.'}
          </p>
          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white"
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
                className={`flex gap-4 rounded-2xl border bg-white p-4 shadow-sm ${today ? 'border-orange-300 ring-2 ring-orange-100' : 'border-slate-200'}`}
              >
                {/* Bloc date */}
                <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl ${today ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  <span className="text-xl font-bold">{date.getDate()}</span>
                  <span className="text-xs uppercase">
                    {date.toLocaleDateString('fr-FR', { month: 'short' })}
                  </span>
                </div>

                {/* Infos */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-orange-500">
                        {s.titre_formation}
                        {s.type_seance ? ` · ${s.type_seance}` : ''}
                      </p>
                      <h3 className="mt-1 text-lg font-bold">
                        {s.titre}
                      </h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {today && (
                        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                          Aujourd'hui
                        </span>
                      )}
                      {renderPresenceBadge(s.statut_presence)}
                    </div>
                  </div>

                  {s.description && (
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {s.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays size={14} />
                      {date.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock3 size={14} />
                      {s.heure_debut?.substring(0, 5)} – {s.heure_fin?.substring(0, 5)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />
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