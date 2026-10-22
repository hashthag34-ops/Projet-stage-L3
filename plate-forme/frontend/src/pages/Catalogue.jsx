import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API, { getFormationImageUrl } from '../services/api';
import { getRealtimeSocket } from '../services/realtime';

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
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFull
              ? 'bg-zinc-400'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-slate-500 dark:text-zinc-400">
        {value}{max ? `/${max}` : ''}
      </span>
    </div>
  );
}

function Stars({ note }) {
  return (
    <span className="flex gap-0.5 text-amber-400 text-xs">
      {[1, 2, 3, 4, 5].map((s) => (
        <i
          key={s}
          className={`bi ${s <= Math.round(note) ? 'bi-star-fill' : 'bi-star text-slate-300 dark:text-zinc-700'}`}
        />
      ))}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="h-56 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-zinc-800" />
      <div className="flex flex-1 flex-col p-3 space-y-2">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
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

  // État utilisateur pour afficher conditionnellement Se Connecter / Dark Mode
  const [currentUser, setCurrentUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    // Vérification de la session utilisateur
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        setCurrentUser(null);
      }
    }

    // Synchronisation du thème
    const dark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    setIsDarkMode(dark);
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

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

  useEffect(() => {
    const socket = getRealtimeSocket();
    socket.on('formations:changed', fetchFormations);
    return () => socket.off('formations:changed', fetchFormations);
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

  return (
    <div className="min-h-screen bg-[#F3F2EE] font-sans text-slate-800 transition-colors duration-300 dark:bg-[#0C0C0E] dark:text-zinc-100">
      
      {/* BARRE DE NAVIGATION SUPÉRIEURE (S'affiche uniquement si non connecté) */}
      {!currentUser && (
        <header className="w-full border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 backdrop-blur-md px-4 py-3 sm:px-8">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span>
              <span className="text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Plateforme de Formation
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Bouton Dark / Light Mode */}
              <button
                onClick={toggleDarkMode}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                title="Changer le thème"
              >
                <i className={`bi ${isDarkMode ? 'bi-sun' : 'bi-moon'} text-xs`}></i>
              </button>

              {/* Bouton Se connecter */}
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs text-white transition shadow-sm"
              >
                <i className="bi bi-box-arrow-in-right text-sm"></i>
                <span>Se connecter</span>
              </Link>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
        
        {/* En-tête du catalogue */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl text-slate-900 dark:text-white tracking-tight">
              Catalogue des Formations
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Découvrez nos programmes de formation disponibles
            </p>
          </div>

          {/* Commutateur de vue Grille / Liste */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-2xl bg-slate-200/70 p-1 dark:bg-zinc-800/80">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <i className="bi bi-grid-3x3-gap-fill text-xs"></i>
                <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <i className="bi bi-list-task text-xs"></i>
                <span className="hidden sm:inline">Liste</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barre de filtres et recherche */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTER_TABS.map((tab) => {
              const active = selectedStatus === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setSelectedStatus(tab.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs transition ${
                    active
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Rechercher une formation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 py-2 pl-9 pr-8 text-xs text-slate-900 dark:text-white outline-none focus:border-orange-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <i className="bi bi-x text-sm"></i>
              </button>
            )}
          </div>
        </div>

        {/* GRILLE / LISTE DES CARTES (STYLE ENOVA - IMAGE GRANDE, INFOS COMPACTES) */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredFormations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 py-16 text-xs text-slate-400">
            <i className="bi bi-search text-2xl mb-2 text-slate-400"></i>
            <p>Aucune formation trouvée.</p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-4'
            }
          >
            {filteredFormations.map((f) => {
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
                  onClick={() => handleOpenDetails(f)}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      handleOpenDetails(f);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Consulter les informations et les avis de la formation ${f.titre}`}
                  className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 transition duration-300 ${
                    viewMode === 'list' ? 'sm:flex-row sm:items-center' : ''
                  }`}
                >
                  {/* IMAGE MISE EN VALEUR (PLUS GRANDE) */}
                  <div
                    className={`relative w-full overflow-hidden rounded-t-3xl bg-slate-100 dark:bg-zinc-800 ${
                      viewMode === 'list' ? 'h-48 sm:h-36 sm:w-56 shrink-0' : 'h-60 sm:h-64'
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
                      <div className="flex h-full w-full items-center justify-center bg-slate-200 dark:bg-zinc-800 text-slate-400">
                        <i className="bi bi-journal-bookmark text-3xl"></i>
                      </div>
                    )}

                    {/* Badge Statut flottant haut gauche */}
                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-900/80 dark:bg-black/80 px-2.5 py-1 text-[10px] text-white backdrop-blur-md">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUT_DOT[badgeKey] || STATUT_DOT.FERMEE}`} />
                      {badgeLabel}
                    </div>

                    {/* Badge Note flottant haut droite */}
                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 dark:bg-zinc-900/90 px-2 py-0.5 text-[10px] text-slate-800 dark:text-zinc-100 backdrop-blur-md shadow-sm">
                      <i className="bi bi-star-fill text-amber-400 text-[10px]"></i>
                      {Number(f.note_moyenne || 0).toFixed(1)}
                    </div>
                  </div>

                  {/* SECTION INFORMATION COMPACTE (REDUITE EN HAUTEUR) */}
                  <div className="flex flex-1 flex-col p-3.5 justify-between">
                    <div>
                      {/* Titre & Dates */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1 group-hover:text-orange-500 transition">
                          {f.titre}
                        </h3>
                      </div>

                      {/* Description courte */}
                      <p className="mt-1 line-clamp-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        {f.description}
                      </p>

                      {/* Micro-données */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500">
                        <span><i className="bi bi-calendar3 me-1"></i>{formatDate(f.date_debut)}</span>
                        <span><i className="bi bi-clock me-1"></i>Limite: {formatDate(f.date_limite_inscription)}</span>
                      </div>

                      <div className="mt-2">
                        <ProgressBar value={f.inscrits_count} max={f.capacite_max} />
                      </div>
                    </div>

                    {/* Pied de carte compact avec action */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-2.5">
                      <span className="text-[10px] text-slate-400">
                        {f.inscrits_count || 0} inscrits
                      </span>

                      {/* Boutons d'action */}
                      {estApprenant ? (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenDetails(f);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                        >
                          {f.statut === 'TERMINEE' ? 'Consulter les avis' : 'Déjà inscrit'}
                          <i className="bi bi-arrow-up-right text-[10px]"></i>
                        </button>
                      ) : statutCandidature === 'EN_ATTENTE' ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          En attente
                        </span>
                      ) : estComplete ? (
                        <span className="text-xs text-slate-400">
                          Complet
                        </span>
                      ) : ouverte ? (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handlePostuler(f);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                        >
                          Postuler
                          <i className="bi bi-arrow-right text-[10px]"></i>
                        </button>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenDetails(f);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        >
                          Infos
                          <i className="bi bi-info-circle text-[10px]"></i>
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

      {/* Modal Détails & Avis */}
      {showDetailModal && selectedFormation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl text-slate-800 dark:text-zinc-100"
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <i className="bi bi-x-lg text-sm"></i>
            </button>

            <div className="max-h-[calc(90vh-4rem)] overflow-y-auto space-y-4 pr-1">
              <h3 className="text-lg text-slate-900 dark:text-white">
                {selectedFormation.titre}
              </h3>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <i className="bi bi-star-fill text-amber-400"></i>
                  {Number(selectedFormation.note_moyenne || 0).toFixed(1)} / 5 ({selectedFormation.avis_count || 0} avis)
                </span>
                <span>
                  <i className="bi bi-people me-1"></i>{selectedFormation.inscrits_count || 0} inscrits
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-600 dark:text-zinc-300">
                <div>
                  <h4 className="text-[11px] uppercase tracking-wider text-slate-400">Présentation</h4>
                  <p className="mt-1 leading-relaxed text-slate-800 dark:text-zinc-200">
                    {selectedFormation.description}
                  </p>
                </div>

                <div className="pt-2">
                  <h4 className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">Avis des apprenants</h4>

                  {reviewError && (
                    <p className="mb-2 rounded-xl bg-orange-500/10 p-2 text-xs text-orange-600">{reviewError}</p>
                  )}
                  {reviewSuccess && (
                    <p className="mb-2 rounded-xl bg-emerald-500/10 p-2 text-xs text-emerald-600">{reviewSuccess}</p>
                  )}

                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {commentsLoading ? (
                      <p className="text-center text-xs text-slate-400">Chargement des avis...</p>
                    ) : comments.length ? (
                      comments.map((comment) => (
                        <div
                          key={comment.id_avis}
                          className="rounded-2xl bg-slate-50 dark:bg-zinc-950 p-3 border border-slate-200 dark:border-zinc-800"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-800 dark:text-zinc-200">
                              {comment.auteur || 'Anonyme'}
                            </span>
                            <Stars note={comment.note} />
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
                            {comment.commentaire}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-xs text-slate-400">
                        Aucun avis publié pour le moment.
                      </p>
                    )}
                  </div>
                </div>

                {/* Formulaire de dépôts d'avis */}
                {selectedFormation.statut === 'TERMINEE' &&
                  selectedFormation.est_apprenant &&
                  !selectedFormation.avis_deja_depose && (
                    <form onSubmit={handleCommentSubmit} className="mt-4 space-y-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-900 dark:text-white">Déposer un avis</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewComment((prev) => ({ ...prev, note: star }))}
                              className="text-sm"
                            >
                              <i className={`bi ${newComment.note >= star ? 'bi-star-fill text-amber-400' : 'bi-star text-slate-300 dark:text-zinc-700'}`}></i>
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
                        className="w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-orange-500 resize-none"
                      />

                      <button
                        type="submit"
                        disabled={submittingComment}
                        className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 py-2 text-xs text-white transition disabled:opacity-50"
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