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
import '../css/ApprenantPlanning.css'; // Importation du CSS classique

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
    { label: 'Présent', value: stats.presents, dotClass: 'dot-orange' },
    { label: 'En retard', value: stats.retards, dotClass: 'dot-amber' },
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
    switch (statut) {
      case 'PRESENT':
        return (
          <span className="badge-presence present">
            <CheckCircle2 size={12} /> Présent
          </span>
        );
      case 'RETARD':
        return (
          <span className="badge-presence retard">
            <AlertTriangle size={12} /> En retard
          </span>
        );
      case 'ABSENT':
        return (
          <span className="badge-presence absent">
            <CircleDashed size={12} /> Absent
          </span>
        );
      default:
        return (
          <span className="badge-presence upcoming">
            <Clock3 size={12} /> À venir
          </span>
        );
    }
  };

  return (
    <div className="planning-container">

      {/* En-tête */}
      <header className="planning-header">
        <div>
          <h1 className="planning-title">
            Mon planning
          </h1>
          <p className="planning-desc">
            Retrouvez vos séances et suivez votre assiduité.
          </p>
        </div>
        {!loading && (
          <p className="planning-count-text">
            {seances.length} séance{seances.length > 1 ? 's' : ''} au programme
          </p>
        )}
      </header>

      {/* Bilan de présence */}
      {!loading && seances.length > 0 && (
        <section
          aria-label="Bilan de présence"
          className="planning-stats-card"
        >
          <div className="stats-inner-flex">
            {/* Donut */}
            <div className="donut-wrapper">
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
              <div className="donut-center-text">
                <span className="donut-percent">
                  {stats.tauxPresence}%
                </span>
                <span className="donut-label">Présence</span>
              </div>
            </div>

            {/* Légende */}
            <dl className="legend-grid">
              {legend.map((item) => (
                <div key={item.label}>
                  <dt className="legend-dt">
                    <span className={`legend-dot ${item.dotClass}`} aria-hidden="true" />
                    {item.label}
                  </dt>
                  <dd className="legend-dd">
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
        <div className="planning-filters-bar" role="tablist" aria-label="Filtrer les séances">
          {FILTERS.map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`filter-pill ${active ? 'active' : ''}`}
              >
                {tab.label}
                <span className={`filter-badge ${active ? 'active' : ''}`}>
                  {counts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="planning-skeleton-list" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="planning-skeleton-item" />
          ))}
        </div>
      ) : filteredSeances.length === 0 ? (
        <div className="planning-empty-box">
          <CalendarDays size={30} className="empty-icon" />
          <p className="empty-title">
            {filter !== 'ALL' ? 'Aucune séance dans cette catégorie' : 'Aucune séance planifiée'}
          </p>
          <p className="empty-subtitle">
            {filter !== 'ALL'
              ? 'Choisissez un autre filtre pour voir vos séances.'
              : 'Vos prochaines séances apparaîtront ici.'}
          </p>
          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className="empty-reset-btn"
            >
              Voir toutes les séances
            </button>
          )}
        </div>
      ) : (
        <ul className="planning-seances-list">
          {filteredSeances.map((s) => {
            const today = isToday(s.date_seance);
            const date = new Date(s.date_seance);

            return (
              <li
                key={s.id_seance}
                className={`seance-item ${today ? 'today' : ''}`}
              >
                {/* Bloc date */}
                <div className={`seance-date-box ${today ? 'today' : ''}`}>
                  <span className="seance-day">{date.getDate()}</span>
                  <span className="seance-month">
                    {date.toLocaleDateString('fr-FR', { month: 'short' })}
                  </span>
                </div>

                {/* Infos */}
                <div className="seance-content">
                  <div className="seance-header-row">
                    <div className="seance-titles">
                      <p className="seance-formation-tag">
                        {s.titre_formation}
                        {s.type_seance ? ` · ${s.type_seance}` : ''}
                      </p>
                      <h3 className="seance-name">
                        {s.titre}
                      </h3>
                    </div>
                    <div className="seance-badges-row">
                      {today && (
                        <span className="badge-today">
                          Aujourd'hui
                        </span>
                      )}
                      {renderPresenceBadge(s.statut_presence)}
                    </div>
                  </div>

                  {s.description && (
                    <p className="seance-desc">
                      {s.description}
                    </p>
                  )}

                  <div className="seance-meta-row">
                    <span className="meta-item">
                      <CalendarDays size={14} className="meta-icon" />
                      {date.toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="meta-item">
                      <Clock3 size={14} className="meta-icon" />
                      {s.heure_debut?.substring(0, 5)} – {s.heure_fin?.substring(0, 5)}
                    </span>
                    <span className="meta-item">
                      <MapPin size={14} className="meta-icon" />
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