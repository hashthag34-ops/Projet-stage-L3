import { useEffect, useState, useMemo } from 'react';
import { 
  CalendarDays, 
  Clock3, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  CircleDashed,
  UserCheck,
  Sparkles,
  Filter
} from 'lucide-react';
import API from '../../services/api';

export default function ApprenantPlanning() {
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'UPCOMING', 'PRESENT', 'ABSENT'

  useEffect(() => {
    API.get('/apprenant/seances')
      .then((res) => setSeances(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Erreur planning :", err))
      .finally(() => setLoading(false));
  }, []);

  // Calculs statistiques rapides
  const stats = useMemo(() => {
    const total = seances.length;
    const presents = seances.filter(s => s.statut_presence === 'PRESENT').length;
    const retards = seances.filter(s => s.statut_presence === 'RETARD').length;
    const absents = seances.filter(s => s.statut_presence === 'ABSENT').length;
    const tauxPresence = total > 0 ? Math.round(((presents + retards) / total) * 100) : 0;

    return { total, presents, retards, absents, tauxPresence };
  }, [seances]);

  // Vérifier si la séance est aujourd'hui
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    const seanceDate = new Date(dateStr).toISOString().split('T')[0];
    return today === seanceDate;
  };

  // Filtrage des séances
  const filteredSeances = useMemo(() => {
    return seances.filter((s) => {
      if (filter === 'PRESENT') return s.statut_presence === 'PRESENT';
      if (filter === 'ABSENT') return s.statut_presence === 'ABSENT' || s.statut_presence === 'RETARD';
      if (filter === 'UPCOMING') return !s.statut_presence || s.statut_presence === 'EN_ATTENTE';
      return true;
    });
  }, [seances, filter]);

  // Rendu personnalisé des badges de statut
  const renderPresenceBadge = (statut) => {
    switch (statut) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-700 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-400">
            <CheckCircle2 size={13} /> Présent
          </span>
        );
      case 'RETARD':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-400">
            <AlertTriangle size={13} /> En retard
          </span>
        );
      case 'ABSENT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-2.5 py-1 text-xs font-bold text-white dark:border-white dark:bg-white dark:text-black">
            <CircleDashed size={13} /> Absent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-xs font-semibold text-black/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
            <Clock3 size={13} /> À venir
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-6 px-4 sm:px-6">
      
      {/* En-tête de la page */}
      <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-6 dark:border-white/10 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
            Espace apprenant
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Mon planning
          </h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Consultez votre emploi du temps et votre historique de présence.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] px-3.5 py-2 text-xs font-semibold text-black/70 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70">
          <CalendarDays size={16} className="text-orange-500" />
          <span>{seances.length} séance{seances.length > 1 ? 's' : ''} au total</span>
        </div>
      </div>

      {/* Cartes KPI / Bilan de Présence */}
      {!loading && seances.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <p className="text-xs font-semibold text-black/50 dark:text-white/50">Taux de présence</p>
            <p className="mt-1 text-2xl font-black text-orange-600 dark:text-orange-400">{stats.tauxPresence}%</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <p className="text-xs font-semibold text-black/50 dark:text-white/50">Séances suivies</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{stats.presents}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <p className="text-xs font-semibold text-black/50 dark:text-white/50">Retards</p>
            <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{stats.retards}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950">
            <p className="text-xs font-semibold text-black/50 dark:text-white/50">Absences</p>
            <p className="mt-1 text-2xl font-black text-slate-800 dark:text-slate-200">{stats.absents}</p>
          </div>
        </div>
      )}

      {/* Barre de Filtres */}
      {!loading && seances.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-black/10 pb-4 dark:border-white/10">
          <span className="mr-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
            <Filter size={14} /> Filtrer :
          </span>
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'UPCOMING', label: 'À venir' },
            { id: 'PRESENT', label: 'Présent' },
            { id: 'ABSENT', label: 'Absences / Retards' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                filter === tab.id
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'border border-black/10 bg-black/[0.02] text-black/70 hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Chargement Skeleton */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950 space-y-4">
              <div className="flex justify-between">
                <div className="h-5 w-20 rounded bg-black/10 dark:bg-white/10" />
                <div className="h-5 w-24 rounded-full bg-black/10 dark:bg-white/10" />
              </div>
              <div className="h-4 w-3/4 rounded bg-black/10 dark:bg-white/10" />
              <div className="h-6 w-1/2 rounded bg-black/10 dark:bg-white/10" />
              <div className="h-12 w-full rounded bg-black/5 dark:bg-white/5" />
            </div>
          ))}
        </div>
      ) : filteredSeances.length === 0 ? (
        /* Etat vide / Aucun résultat */
        <div className="rounded-3xl border border-dashed border-black/15 bg-black/[0.02] p-12 text-center text-black/55 dark:border-white/15 dark:bg-white/[0.02] dark:text-white/55">
          <CalendarDays size={40} className="mx-auto mb-3 text-orange-500/80" />
          <p className="text-base font-bold text-slate-800 dark:text-white">Aucune séance trouvée</p>
          <p className="mt-1 text-xs">
            {filter !== 'ALL' 
              ? "Aucune séance ne correspond aux critères de filtrage sélectionnés." 
              : "Vous n'avez pas de séance prévue dans vos formations actuelles."}
          </p>
          {filter !== 'ALL' && (
            <button
              onClick={() => setFilter('ALL')}
              className="mt-4 inline-flex items-center rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        /* Grille des Séances */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSeances.map((s) => {
            const today = isToday(s.date_seance);

            return (
              <div 
                key={s.id_seance} 
                className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-zinc-950 dark:shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${
                  today 
                    ? 'border-orange-500 ring-2 ring-orange-500/20' 
                    : 'border-black/10 hover:border-orange-500/50 dark:border-white/10'
                }`}
              >
                {/* Tag "Aujourd'hui" */}
                {today && (
                  <span className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-orange-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                    <Sparkles size={11} /> Aujourd'hui
                  </span>
                )}

                <div>
                  {/* Badges : Type de séance + Statut de Présence */}
                  <div className="mb-3.5 flex items-center justify-between gap-2">
                    <span className="rounded-lg border border-black/10 bg-black/5 px-2.5 py-1 text-xs font-bold text-black/70 dark:border-white/15 dark:bg-white/10 dark:text-white/80">
                      {s.type_seance || 'Cours'}
                    </span>
                    {renderPresenceBadge(s.statut_presence)}
                  </div>

                  {/* Formation d'appartenance */}
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">
                    {s.titre_formation}
                  </p>

                  {/* Titre & Description */}
                  <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    {s.titre}
                  </h2>
                  {s.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-black/60 dark:text-white/60">
                      {s.description}
                    </p>
                  )}
                </div>

                {/* Details : Date, Heure et Lieu */}
                <div className="mt-6 space-y-2.5 border-t border-black/10 pt-4 text-xs dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-black/80 dark:text-white/80 capitalize">
                      <CalendarDays size={15} className="text-orange-500" />
                      {new Date(s.date_seance).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-1 font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                      <Clock3 size={13} /> {s.heure_debut?.substring(0, 5)} - {s.heure_fin?.substring(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-black/50 dark:text-white/50">
                    <span>Lieu / Salle</span>
                    <span className="flex min-w-0 items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
                      <MapPin size={14} className="shrink-0" />
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