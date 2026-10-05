import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, Clock, Info, UserX, ArrowRight, Star,
  Search, Send, Calendar, Users, X, MessageSquare, Sparkles,
  TrendingUp, GraduationCap,
} from 'lucide-react';
import API from '../services/api';

type Formation = {
  id_formation: number;
  titre: string;
  description: string;
  statut: 'OUVERTE' | 'EN_COURS' | 'TERMINEE' | 'FERMEE';
  date_debut: string;
  date_limite_inscription: string;
  capacite_max: number | null;
  inscrits_count: number;
  note_moyenne: number;
  avis_count: number;
  image_url: string | null;
  est_apprenant: boolean;
  statut_candidature: string | null;
  est_complete: boolean;
  avis_deja_depose: boolean;
};

type Comment = {
  id_avis: number;
  auteur: string;
  note: number;
  commentaire: string;
  date_creation: string;
};

const STATUT_LABELS: Record<string, string> = {
  OUVERTE: 'Ouverte',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  FERMEE: 'Fermée',
};

const STATUT_DOT: Record<string, string> = {
  OUVERTE: 'bg-orange-500',
  EN_COURS: 'bg-blue-500',
  TERMINEE: 'bg-slate-400',
  FERMEE: 'bg-slate-400',
};

const STATUT_BADGE: Record<string, string> = {
  OUVERTE: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20',
  EN_COURS: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20',
  TERMINEE: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700',
  FERMEE: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700',
};

const FILTER_TABS = [
  { value: 'TOUT', label: 'Toutes' },
  { value: 'OUVERTE', label: 'Ouvertes' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminées' },
  { value: 'FERMEE', label: 'Fermées' },
];

const formatDate = (value: string) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function ProgressBar({ value, max }: { value: number; max: number | null }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0;
  const isFull = max !== null && value >= max;
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-slate-400' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500 dark:text-zinc-400">
        {value}{max ? ` / ${max}` : ''}
      </span>
    </div>
  );
}

function Stars({ note, size = 13 }: { note: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(note) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-zinc-700'}
        />
      ))}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="h-44 w-full animate-pulse bg-slate-100 dark:bg-zinc-800" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex justify-between gap-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-zinc-800" />
          <div className="h-4 w-12 animate-pulse rounded bg-slate-100 dark:bg-zinc-800" />
        </div>
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-zinc-800" />
        <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-zinc-800" />
        <div className="mt-5 h-2 w-full animate-pulse rounded-full bg-slate-100 dark:bg-zinc-800" />
        <div className="mt-2.5 h-2 w-full animate-pulse rounded-full bg-slate-100 dark:bg-zinc-800" />
        <div className="mt-2.5 h-2 w-3/4 animate-pulse rounded-full bg-slate-100 dark:bg-zinc-800" />
        <div className="mt-6 h-9 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export default function Catalogue() {
  const navigate = useNavigate();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('TOUT');

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [newComment, setNewComment] = useState({ note: 5, commentaire: '' });
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchFormations = useCallback(async () => {
    try {
      const res = await API.get('/formations/catalogue');
      setFormations(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement du catalogue :', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFormations();
  }, [fetchFormations]);

  const handlePostuler = (formation: Formation) => {
    navigate(`/postuler/${formation.id_formation}`);
  };

  const handleOpenDetails = useCallback(async (formation: Formation) => {
    setSelectedFormation(formation);
    setShowDetailModal(true);
    setComments([]);
    setReviewError('');
    setReviewSuccess('');
    setCommentsLoading(true);
    setNewComment({ note: 5, commentaire: '' });
    setHoverRating(0);

    try {
      const response = await API.get(`/formations/${formation.id_formation}/avis`);
      setComments(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setReviewError('Impossible de charger les avis.');
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
  }, []);

  const isInscriptionOuverte = (f: Formation) => {
    const today = new Date().toISOString().split('T')[0];
    const dateLimite = new Date(f.date_limite_inscription).toISOString().split('T')[0];
    return f.statut === 'OUVERTE' && dateLimite >= today;
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFormation || !newComment.commentaire.trim()) return;

    setSubmittingComment(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      await API.post(`/formations/${selectedFormation.id_formation}/avis`, newComment);
      const [catalogueResponse, commentsResponse] = await Promise.all([
        API.get('/formations/catalogue'),
        API.get(`/formations/${selectedFormation.id_formation}/avis`),
      ]);

      const updatedFormation = (catalogueResponse.data as Formation[]).find(
        (item) => item.id_formation === selectedFormation.id_formation,
      );
      if (updatedFormation) {
        setSelectedFormation(updatedFormation);
        setFormations(catalogueResponse.data as Formation[]);
      }
      setComments(Array.isArray(commentsResponse.data) ? commentsResponse.data : []);
      setNewComment({ note: 5, commentaire: '' });
      setReviewSuccess('Votre avis a été publié avec succès !');
    } catch (error) {
      setReviewError('Impossible de publier votre avis.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const filteredFormations = useMemo(
    () =>
      formations.filter((f) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = f.titre.toLowerCase().includes(term) || f.description.toLowerCase().includes(term);
        const matchesStatus = selectedStatus === 'TOUT' || f.statut === selectedStatus;
        return matchesSearch && matchesStatus;
      }),
    [formations, searchTerm, selectedStatus],
  );

  const stats = useMemo(() => {
    const ouvertes = formations.filter((f) => f.statut === 'OUVERTE').length;
    const totalInscrits = formations.reduce((acc, f) => acc + f.inscrits_count, 0);
    const avgNote = formations.length
      ? (formations.reduce((acc, f) => acc + f.note_moyenne, 0) / formations.length).toFixed(1)
      : '0.0';
    return { ouvertes, totalInscrits, avgNote };
  }, [formations]);

  const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-black dark:text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Hero header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 text-xs font-medium text-orange-600 dark:text-orange-400">
            <Sparkles size={14} />
            <span>Formations certifiantes</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Catalogue des formations
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-500 dark:text-zinc-400">
            Découvrez nos programmes et développez vos compétences à votre rythme.
          </p>

          {/* Stats */}
          {!loading && formations.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-500/10">
                  <GraduationCap size={16} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{stats.ouvertes}</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-500">formations ouvertes</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
                  <Users size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{stats.totalInscrits}</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-500">apprenants inscrits</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
                  <TrendingUp size={16} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{stats.avgNote} / 5</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-500">note moyenne</p>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Toolbar */}
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative lg:w-72">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              aria-label="Rechercher une formation"
              placeholder="Rechercher une formation…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-600 ${focusRing}`}
            />
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedStatus(tab.value)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${focusRing} ${
                  selectedStatus === tab.value
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredFormations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-20 dark:border-zinc-800">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-900">
              <Search size={20} className="text-slate-400 dark:text-zinc-600" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-zinc-300">Aucune formation ne correspond à votre recherche.</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">Essayez de modifier vos filtres ou votre recherche.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFormations.map((f, idx) => {
              const ouverte = isInscriptionOuverte(f);
              const estApprenant = f.est_apprenant;
              const statutCandidature = f.statut_candidature;
              const estComplete = f.est_complete;
              const badgeKey = estComplete ? 'TERMINEE' : f.statut;
              const badgeLabel = estComplete ? 'Complet' : (STATUT_LABELS[f.statut] || f.statut);
              const fillPct = f.capacite_max ? Math.min((f.inscrits_count / f.capacite_max) * 100, 100) : 0;

              return (
                <article
                  key={f.id_formation}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_12px_32px_-8px_rgba(249,115,22,0.15)] dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-orange-500/30 dark:hover:shadow-[0_12px_32px_-8px_rgba(249,115,22,0.2)] animate-fade-in-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Visual */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-zinc-800">
                    {f.image_url ? (
                      <img
                        src={f.image_url}
                        alt={f.titre}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BookOpen size={32} className="text-orange-500/70" />
                      </div>
                    )}
                    {/* gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
                    {/* badge */}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md dark:bg-zinc-900/80 dark:text-zinc-200">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUT_DOT[badgeKey] || STATUT_DOT.FERMEE}`} />
                      {badgeLabel}
                    </div>
                    {/* rating on image */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md dark:bg-zinc-900/80 dark:text-zinc-200">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {Number(f.note_moyenne).toFixed(1)}
                      <span className="font-normal text-slate-400 dark:text-zinc-500">({f.avis_count})</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-base font-semibold leading-snug text-slate-900 transition-colors group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                      {f.titre}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-zinc-400">
                      {f.description}
                    </p>

                    {/* Meta */}
                    <div className="mt-4 space-y-2.5 text-xs text-slate-500 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="shrink-0 text-slate-400 dark:text-zinc-600" />
                        <span>Début le <strong className="font-medium text-slate-700 dark:text-zinc-300">{formatDate(f.date_debut)}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="shrink-0 text-slate-400 dark:text-zinc-600" />
                        <span>Inscriptions jusqu'au <strong className="font-medium text-slate-700 dark:text-zinc-300">{formatDate(f.date_limite_inscription)}</strong></span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Users size={12} className="text-slate-400 dark:text-zinc-600" />
                          Places
                        </span>
                        {f.capacite_max && fillPct >= 100 && (
                          <span className="font-semibold text-slate-500 dark:text-zinc-400">Complet</span>
                        )}
                      </div>
                      <ProgressBar value={f.inscrits_count} max={f.capacite_max} />
                    </div>

                    {/* Action */}
                    <div className="mt-auto pt-5">
                      {estApprenant ? (
                        <button
                          onClick={() => handleOpenDetails(f)}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 transition hover:bg-orange-100 active:scale-[0.98] dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20 ${focusRing}`}
                        >
                          {f.statut === 'TERMINEE' ? (
                            <><Star size={15} /> {f.avis_deja_depose ? 'Consulter les avis' : 'Donner votre avis'}</>
                          ) : (
                            <><CheckCircle2 size={15} /> Vous suivez cette formation</>
                          )}
                        </button>
                      ) : statutCandidature === 'EN_ATTENTE' ? (
                        <button
                          disabled
                          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                        >
                          <Clock size={15} /> Candidature en cours
                        </button>
                      ) : estComplete ? (
                        <button
                          disabled
                          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400 dark:bg-zinc-800 dark:text-zinc-500"
                        >
                          <UserX size={15} /> Formation complète
                        </button>
                      ) : ouverte ? (
                        <button
                          onClick={() => handlePostuler(f)}
                          className={`group/btn flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 hover:shadow-md hover:shadow-orange-500/30 active:scale-[0.98] dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
                        >
                          Postuler
                          <ArrowRight size={15} className="transition-transform group-hover/btn:translate-x-0.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenDetails(f)}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-orange-500 dark:hover:text-orange-400 ${focusRing}`}
                        >
                          <Info size={15} /> À propos et avis
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {showDetailModal && selectedFormation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedFormation.titre}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 animate-scale-in"
          >
            {/* Modal header with image */}
            <div className="relative h-28 w-full overflow-hidden bg-slate-100 dark:bg-zinc-800">
              {selectedFormation.image_url && (
                <img src={selectedFormation.image_url} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                type="button"
                aria-label="Fermer"
                onClick={handleCloseModal}
                className={`absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-700 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 ${focusRing}`}
              >
                <X size={16} />
              </button>
              <div className="absolute bottom-3 left-5">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUT_BADGE[selectedFormation.statut] || STATUT_BADGE.FERMEE}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${STATUT_DOT[selectedFormation.statut] || STATUT_DOT.FERMEE}`} />
                  {STATUT_LABELS[selectedFormation.statut] || selectedFormation.statut}
                </span>
              </div>
            </div>

            {/* Modal body */}
            <div className="max-h-[calc(90vh-7rem)] overflow-y-auto p-6 scrollbar-thin">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {selectedFormation.titre}
              </h3>

              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-zinc-300">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  {Number(selectedFormation.note_moyenne).toFixed(1)}
                  <span className="font-normal text-slate-400 dark:text-zinc-500">({selectedFormation.avis_count} avis)</span>
                </span>
                <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                  <Users size={13} /> {selectedFormation.inscrits_count} apprenants
                </span>
              </div>

              <div className="mt-5 space-y-6 text-sm text-slate-600 dark:text-zinc-300">
                {/* Présentation */}
                <section>
                  <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">Présentation</h4>
                  <p className="leading-relaxed text-slate-600 dark:text-zinc-400">
                    {selectedFormation.description}
                  </p>
                </section>

                {/* Avis */}
                <section>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Avis des apprenants</h4>
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-zinc-300">
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                      {Number(selectedFormation.note_moyenne).toFixed(1)} / 5
                    </span>
                  </div>

                  {reviewError && (
                    <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                      {reviewError}
                    </p>
                  )}
                  {reviewSuccess && (
                    <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {reviewSuccess}
                    </p>
                  )}

                  <div className="mt-3 max-h-56 space-y-2.5 overflow-y-auto pr-1 scrollbar-thin">
                    {commentsLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <div key={i} className="rounded-xl bg-slate-50 p-3.5 dark:bg-zinc-800/40">
                            <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-zinc-700" />
                            <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-slate-200 dark:bg-zinc-700" />
                            <div className="mt-1.5 h-2.5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-zinc-700" />
                          </div>
                        ))}
                      </div>
                    ) : comments.length ? (
                      comments.map((comment) => (
                        <article key={comment.id_avis} className="rounded-xl bg-slate-50 p-3.5 transition hover:bg-slate-100 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/60">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[10px] font-bold text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                                {comment.auteur.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{comment.auteur}</span>
                            </div>
                            <Stars note={comment.note} size={11} />
                          </div>
                          <p className="mt-2 text-xs leading-normal text-slate-600 dark:text-zinc-300">{comment.commentaire}</p>
                          <time className="mt-2 block text-[11px] text-slate-400 dark:text-zinc-500">
                            {formatDate(comment.date_creation)}
                          </time>
                        </article>
                      ))
                    ) : (
                      <div className="py-8 text-center">
                        <MessageSquare size={20} className="mx-auto text-slate-300 dark:text-zinc-700" />
                        <p className="mt-2 text-xs text-slate-400 dark:text-zinc-500">
                          Aucun avis pour le moment.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Formulaire d'avis */}
                {selectedFormation.statut === 'TERMINEE' && selectedFormation.est_apprenant && !selectedFormation.avis_deja_depose && (
                  <form
                    onSubmit={handleCommentSubmit}
                    className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                        <MessageSquare size={14} className="text-orange-500" /> Donner votre avis
                      </h4>

                      <div className="flex items-center" role="radiogroup" aria-label="Note">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            role="radio"
                            aria-checked={newComment.note === star}
                            aria-label={`${star} sur 5`}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setNewComment((prev) => ({ ...prev, note: star }))}
                            className={`rounded p-0.5 transition-transform hover:scale-110 ${focusRing}`}
                          >
                            <Star
                              size={18}
                              className={(hoverRating || newComment.note) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-zinc-600'}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      required
                      maxLength={2000}
                      placeholder="Partagez votre expérience : contenu, formateur, organisation…"
                      value={newComment.commentaire}
                      onChange={(e) => setNewComment((prev) => ({ ...prev, commentaire: e.target.value }))}
                      className={`w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-600 ${focusRing}`}
                    />

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                        Réservé aux apprenants ayant terminé cette session.
                      </span>
                      <button
                        type="submit"
                        disabled={submittingComment}
                        className={`inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 hover:shadow-md hover:shadow-orange-500/30 disabled:opacity-50 dark:text-slate-950 dark:hover:bg-orange-400 ${focusRing}`}
                      >
                        <Send size={13} />
                        {submittingComment ? 'Envoi…' : 'Publier'}
                      </button>
                    </div>
                  </form>
                )}

                {selectedFormation.statut === 'TERMINEE' && selectedFormation.est_apprenant && selectedFormation.avis_deja_depose && (
                  <p className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-500 dark:bg-zinc-800/40 dark:text-zinc-400">
                    Vous avez déjà partagé votre avis sur cette formation.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
