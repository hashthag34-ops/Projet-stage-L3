import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, MapPin, CheckCircle2, AlertTriangle, CircleDashed } from 'lucide-react';
import API from '../../services/api';

export default function ApprenantPlanning() {
  const [seances, setSeances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/apprenant/seances')
      .then((res) => setSeances(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("Erreur planning :", err))
      .finally(() => setLoading(false));
  }, []);

  // Les statuts restent volontairement dans la palette de l'application.
  const renderPresenceBadge = (statut) => {
    switch (statut) {
      case 'PRESENT':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-700 dark:text-orange-400">
            <CheckCircle2 size={13} /> Présent
          </span>
        );
      case 'RETARD':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-black/20 bg-black/5 px-2.5 py-1 text-xs font-bold text-black/70 dark:border-white/20 dark:bg-white/10 dark:text-white/70">
            <AlertTriangle size={13} /> En retard
          </span>
        );
      case 'ABSENT':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-black bg-black px-2.5 py-1 text-xs font-bold text-white dark:border-white dark:bg-white dark:text-black">
            <CircleDashed size={13} /> Absent
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-xs font-semibold text-black/50 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/50">
            <Clock3 size={13} /> À venir / Non émargé
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-4">
      <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-6 dark:border-white/10 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Espace apprenant</p>
          <h1 className="text-3xl font-black tracking-tight">Mon planning</h1>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Retrouvez toutes vos séances de cours programmées.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-black/55 dark:text-white/55"><CalendarDays size={18} className="text-orange-500" /> {seances.length} séance{seances.length > 1 ? 's' : ''}</div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-black/45 dark:text-white/45">Chargement du planning...</div>
      ) : seances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.03] p-12 text-center text-black/55 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/55">
          <CalendarDays size={34} className="mx-auto mb-3 text-orange-500" />
          <p className="text-base font-semibold">Aucune séance programmée</p>
          <p className="mt-1 text-xs">Vous n'avez pas de séance prévue dans vos formations actuelles.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {seances.map((s) => (
            <div 
              key={s.id_seance} 
              className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:border-orange-500 dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_12px_35px_rgba(0,0,0,0.32)]"
            >
              <div>
                {/* Badges : Type de séance + Statut de Présence */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded-lg border border-black/15 bg-black/5 px-2.5 py-1 text-xs font-bold text-black/70 dark:border-white/20 dark:bg-white/10 dark:text-white/70">
                    {s.type_seance || 'Cours'}
                  </span>
                  {renderPresenceBadge(s.statut_presence)}
                </div>

                {/* Formation d'appartenance */}
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">
                  {s.titre_formation}
                </p>

                {/* Titre & Description de la séance */}
                <h2 className="mt-1 text-lg font-black tracking-tight">{s.titre}</h2>
                {s.description && (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-black/55 dark:text-white/55">{s.description}</p>
                )}
              </div>

              {/* Détails Date, Heure et Salle */}
              <div className="mt-5 space-y-3 border-t border-black/10 pt-4 text-xs text-black/60 dark:border-white/10 dark:text-white/60">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold">
                    <CalendarDays size={15} className="text-orange-500" /> {new Date(s.date_seance).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2 py-1 font-bold text-orange-700 dark:text-orange-400">
                    <Clock3 size={13} /> {s.heure_debut?.substring(0, 5)} - {s.heure_fin?.substring(0, 5)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 text-black/50 dark:text-white/50">
                  <span>Lieu / Salle</span>
                  <span className="flex min-w-0 items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
                    <MapPin size={14} className="shrink-0" /> <span className="truncate">{s.salle || 'En ligne'}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}