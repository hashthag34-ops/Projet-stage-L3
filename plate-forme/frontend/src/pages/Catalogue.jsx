import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, Clock, Info, UserX, ArrowRight, Star,
  Search, Send, Calendar, Users, X, MessageSquare, Sparkles,
  TrendingUp, GraduationCap, LayoutGrid, List, MapPin, Plus, Heart,
  Filter, ChevronDown, Check, ArrowUpRight
} from 'lucide-react';
import API, { getFormationImageUrl } from '../services/api';

const STATUT_LABELS = {
  OUVERTE: 'Ouverte',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  FERMEE: 'Fermée',
};

const STATUT_DOT = {
  OUVERTE: 'bg-emerald-500',
  EN_COURS: 'bg-blue-500',
  TERMINEE: 'bg-zinc-400',
  FERMEE: 'bg-zinc-400',
};

const STATUT_BADGE_STYLE = {
  OUVERTE: 'bg-emerald-600 text-white',
  EN_COURS: 'bg-blue-600 text-white',
  TERMINEE: 'bg-zinc-700 text-white',
  FERMEE: 'bg-zinc-500 text-white',
};

const FILTER_TABS = [
  { value: 'TOUT', label: 'Toutes' },
  { value: 'OUVERTE', label: 'Ouvertes' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminées' },
  { value: 'FERMEE', label: 'Fermées' },
];

const formatDate = (value) =>
  new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

function ProgressBar({ value, max }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0;
  const isFull = max !== null && value >= max;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFull
              ? 'bg-zinc-400'
              : 'bg-emerald-600 dark:bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-stone-500 dark:text-zinc-400">
        {value}{max ? `/${max}` : ''}
      </span>
    </div>
  );
}

function Stars({ note, size = 13 }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={
            s <= Math.round(note)
              ? 'fill-amber-400 text-amber-400'
              : 'text-stone-300 dark:text-zinc-700'
          }
        />
      ))}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-stone-200/80 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="h-48 w-full animate-pulse rounded-2xl bg-stone-200/60 dark:bg-zinc-800" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex justify-between gap-3">
          <div className="h-5 w-3/4 animate-pulse rounded-md bg-stone-200/60 dark:bg-zinc-800" />
          <div className="h-5 w-16 animate-pulse rounded-md bg-stone-200/60 dark:bg-zinc-800" />
        </div>
        <div className="mt-3 h-3.5 w-full animate-pulse rounded bg-stone-200/60 dark:bg-zinc-800" />
        <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded bg-stone-200/60 dark:bg-zinc-800" />
        <div className="mt-6 h-2 w-full animate-pulse rounded-full bg-stone-200/60 dark:bg-zinc-800" />
        <div className="mt-6 h-10 w-full animate-pulse rounded-xl bg-stone-200/60 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export default function Catalogue() {
  const navigate = useNavigate();
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Layout View State (Grid vs List)
  const [viewMode, setViewMode] = useState('grid');

  // Filtres & Recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('TOUT');

  // Avis & Commentaires
  const [comments, setComments] = useState([]);
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

  const handlePostuler = (formation) => {
    navigate(`/postuler/${formation.id_formation}`);
  };

  const handleOpenDetails = useCallback(async (formation) => {
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

  const isInscriptionOuverte = (formation) => {
    const today = new Date().toISOString().split('T')[0];
    const dateLimite = new Date(formation.date_limite_inscription)
      .toISOString()
      .split('T')[0];
    return formation.statut === 'OUVERTE' && dateLimite >= today;
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFormation || !newComment.commentaire.trim()) return;

    setSubmittingComment(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      await API.post(
        `/formations/${selectedFormation.id_formation}/avis`,
        newComment
      );
      const [catalogueResponse, commentsResponse] = await Promise.all([
        API.get('/formations/catalogue'),
        API.get(`/formations/${selectedFormation.id_formation}/avis`),
      ]);

      const updatedFormation = catalogueResponse.data.find(
        (item) => item.id_formation === selectedFormation.id_formation
      );
      if (updatedFormation) {
        setSelectedFormation(updatedFormation);
        setFormations(catalogueResponse.data);
      }
      setComments(
        Array.isArray(commentsResponse.data) ? commentsResponse.data : []
      );
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
        const matchesSearch =
          f.titre.toLowerCase().includes(term) ||
          f.description.toLowerCase().includes(term);
        const matchesStatus =
          selectedStatus === 'TOUT' || f.statut === selectedStatus;
        return matchesSearch && matchesStatus;
      }),
    [formations, searchTerm, selectedStatus]
  );

  const stats = useMemo(() => {
    const ouvertes = formations.filter((f) => f.statut === 'OUVERTE').length;
    const totalInscrits = formations.reduce(
      (acc, f) => acc + (f.inscrits_count || 0),
      0
    );
    const avgNote = formations.length
      ? (
          formations.reduce((acc, f) => acc + (f.note_moyenne || 0), 0) /
          formations.length
        ).toFixed(1)
      : '0.0';
    return { ouvertes, totalInscrits, avgNote };
  }, [formations]);

  const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 dark:focus-visible:ring-amber-400';

  return (
    <div className="min-h-screen bg-[#F3F2EE] font-sans text-stone-900 transition-colors duration-300 dark:bg-[#0C0C0E] dark:text-zinc-100">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Top Header Title & Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              Formations & Catalogue
            </h1>
            
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher Pills */}
            <div className="flex items-center rounded-full bg-stone-200/70 p-1 dark:bg-zinc-800/80">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-stone-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                    : 'text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-stone-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                    : 'text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <List size={14} />
                <span className="hidden sm:inline">Liste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar Section */}
        {}
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_TABS.map((tab) => {
              const active = selectedStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setSelectedStatus(tab.value)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${focusRing} ${
                    active
                      ? 'bg-stone-900 text-white shadow-sm dark:bg-white dark:text-stone-950'
                      : 'bg-white/80 text-stone-700 hover:bg-white dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Input Box */}
          <div className="relative w-full md:w-80">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-zinc-500"
            />
            <input
              type="text"
              aria-label="Rechercher une formation"
              placeholder="Rechercher intitulé, compétences..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-full border border-stone-200/80 bg-white/90 py-2 pl-10 pr-4 text-xs font-medium text-stone-900 placeholder-stone-400 shadow-sm transition hover:border-stone-300 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-white dark:placeholder-zinc-500 ${focusRing}`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-zinc-200"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Card Grid / List Container */}
        {}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredFormations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white/50 py-16 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
              <Search size={22} />
            </div>
            <p className="mt-4 text-sm font-bold text-stone-800 dark:text-zinc-200">
              Aucune formation trouvée
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
              Modifiez vos termes de recherche ou sélectionnez une autre catégorie.
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-4'
            }
          >
            {filteredFormations.map((f, idx) => {
              const ouverte = isInscriptionOuverte(f);
              const estApprenant = f.est_apprenant;
              const statutCandidature = f.statut_candidature;
              const estComplete = f.est_complete;
              const badgeKey = estComplete ? 'TERMINEE' : f.statut;
              const badgeLabel = estComplete
                ? 'Complet'
                : STATUT_LABELS[f.statut] || f.statut;

              return (
                <article
                  key={f.id_formation}
                  className={`group relative flex flex-col overflow-hidden rounded-3xl border border-stone-200/80 bg-white  transition-all duration-300 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/90 ${
                    viewMode === 'list' ? 'sm:flex-row sm:items-center' : ''
                  }`}
                >
                  {/* Image Preview with Floating Badges */}
                  <div
                    className={`relative w-full overflow-hidden rounded-t-3xl bg-stone-100 dark:bg-zinc-800 ${
                      viewMode === 'list' ? 'h-48 sm:h-36 sm:w-56 shrink-0' : 'h-52'
                    }`}
                  >
                    {f.image_url ? (
                      <img
                        src={getFormationImageUrl(f.image_url)}
                        alt={f.titre}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                        onLoad={(event) => {
                          event.currentTarget.style.display = '';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-stone-200/60 dark:bg-zinc-800">
                        <BookOpen size={36} className="text-stone-400 dark:text-zinc-600" />
                      </div>
                    )}

                    {/* Top Left Status Pill Badge (Replicating "New", "Active" from reference) */}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-stone-900/80 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md dark:bg-black/80">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          STATUT_DOT[badgeKey] || STATUT_DOT.FERMEE
                        }`}
                      />
                      {badgeLabel}
                    </div>

                    {/* Top Right Wishlist / Rating Pill Badge */}
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-stone-800 shadow-sm backdrop-blur-md dark:bg-zinc-900/90 dark:text-zinc-100">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      {Number(f.note_moyenne || 0).toFixed(1)}
                    </div>
                  </div>

                  {/* Card Content Header & Details */}
                  <div className="flex flex-1 flex-col p-3.5">
                    
                    {/* Title & Price/Highlight Row */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-extrabold text-stone-900 transition-colors group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                        {f.titre}
                      </h3>
                    </div>

                    {/* Short Description */}
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stone-500 dark:text-zinc-400">
                      {f.description}
                    </p>

                    {/* Key Metadata Row */}
                    <div className="mt-3 flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] font-medium text-stone-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-stone-400 dark:text-zinc-500" />
                        <span>Début: {formatDate(f.date_debut)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-stone-400 dark:text-zinc-500" />
                        <span>Limite: {formatDate(f.date_limite_inscription)}</span>
                      </div>
                    </div>

                    {/* Capacity Progress Indicator */}
                    <div className="mt-3">
                      <ProgressBar value={f.inscrits_count} max={f.capacite_max} />
                    </div>

                    {/* Bottom Action Section (Replicating matched buyers / link from reference) */}
                    <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 dark:border-zinc-800/80">
                      <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400">
                        {f.inscrits_count || 0} inscrits
                      </span>

                      {/* Action Button */}
                      {estApprenant ? (
                        <button
                          onClick={() => handleOpenDetails(f)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          {f.statut === 'TERMINEE' ? 'Consulter les avis' : 'Formation suivie'}
                          <ArrowUpRight size={14} />
                        </button>
                      ) : statutCandidature === 'EN_ATTENTE' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          En attente
                        </span>
                      ) : estComplete ? (
                        <span className="text-xs font-bold text-stone-400 dark:text-zinc-500">
                          Complet
                        </span>
                      ) : ouverte ? (
                        <button
                          onClick={() => handlePostuler(f)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-stone-900 hover:text-emerald-600 dark:text-white dark:hover:text-emerald-400"
                        >
                          Postuler
                          <ArrowRight size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenDetails(f)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-white"
                        >
                          Avis & Infos
                          <Info size={14} />
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

      {/* Modal Details & Review Posting */}
      {}
      {showDetailModal && selectedFormation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm dark:bg-black/70"
          onClick={handleCloseModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedFormation.titre}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {/* Modal Header Image */}
            <div className="relative h-32 w-full bg-stone-200 dark:bg-zinc-800">
              {selectedFormation.image_url && (
                <img
                  src={getFormationImageUrl(selectedFormation.image_url)}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                  }}
                  onLoad={(event) => {
                    event.currentTarget.style.display = '';
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Close Button */}
              <button
                type="button"
                aria-label="Fermer"
                onClick={handleCloseModal}
                className="absolute right-3 top-3 rounded-full bg-stone-900/80 p-2 text-white shadow-md backdrop-blur-md hover:bg-black dark:bg-white/90 dark:text-black"
              >
                <X size={15} />
              </button>

              <div className="absolute bottom-3 left-4">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-stone-900 shadow-sm backdrop-blur-md dark:bg-zinc-900 dark:text-white">
                  {STATUT_LABELS[selectedFormation.statut] || selectedFormation.statut}
                </span>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-6">
              <h3 className="text-xl font-extrabold text-stone-900 dark:text-white">
                {selectedFormation.titre}
              </h3>

              <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-stone-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  {Number(selectedFormation.note_moyenne || 0).toFixed(1)} / 5 ({selectedFormation.avis_count || 0} avis)
                </span>
                <span className="flex items-center gap-1">
                  <Users size={13} /> {selectedFormation.inscrits_count || 0} inscrits
                </span>
              </div>

              {/* Description */}
              <div className="mt-5 space-y-4 text-xs text-stone-600 dark:text-zinc-300">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                    Présentation
                  </h4>
                  <p className="mt-1 leading-relaxed text-stone-700 dark:text-zinc-300">
                    {selectedFormation.description}
                  </p>
                </div>

                {/* Reviews List */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                    Avis des apprenants
                  </h4>

                  {reviewError && (
                    <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      {reviewError}
                    </p>
                  )}
                  {reviewSuccess && (
                    <p className="mt-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {reviewSuccess}
                    </p>
                  )}

                  <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {commentsLoading ? (
                      <p className="text-center text-xs text-stone-400">Chargement des avis...</p>
                    ) : comments.length ? (
                      comments.map((comment) => (
                        <div
                          key={comment.id_avis}
                          className="rounded-2xl bg-stone-100/70 p-3 dark:bg-zinc-800/50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-800 dark:text-zinc-200">
                              {comment.auteur || 'Anonyme'}
                            </span>
                            <Stars note={comment.note} size={11} />
                          </div>
                          <p className="mt-1 text-xs text-stone-600 dark:text-zinc-300">
                            {comment.commentaire}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-xs text-stone-400 dark:text-zinc-500">
                        Aucun avis publié pour le moment.
                      </p>
                    )}
                  </div>
                </div>

                {/* Add Review Form */}
                {selectedFormation.statut === 'TERMINEE' &&
                  selectedFormation.est_apprenant &&
                  !selectedFormation.avis_deja_depose && (
                    <form onSubmit={handleCommentSubmit} className="mt-4 space-y-3 rounded-2xl border border-stone-200 p-3.5 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900 dark:text-white">
                          Déposer un avis
                        </span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewComment((prev) => ({ ...prev, note: star }))}
                              className="p-0.5"
                            >
                              <Star
                                size={16}
                                className={
                                  newComment.note >= star
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-stone-300 dark:text-zinc-700'
                                }
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        required
                        placeholder="Rédigez votre retour sur la formation..."
                        value={newComment.commentaire}
                        onChange={(e) =>
                          setNewComment((prev) => ({
                            ...prev,
                            commentaire: e.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-stone-200 p-2 text-xs text-stone-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                      />

                      <button
                        type="submit"
                        disabled={submittingComment}
                        className="w-full rounded-full bg-stone-900 py-2 text-xs font-bold text-white transition hover:bg-stone-800 dark:bg-white dark:text-stone-900"
                      >
                        {submittingComment ? 'Envoi...' : 'Publier mon avis'}
                      </button>
                    </form>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}