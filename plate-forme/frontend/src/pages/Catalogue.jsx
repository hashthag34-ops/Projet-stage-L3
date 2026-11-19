// frontend/src/pages/Catalogue.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API, { getFormationImageUrl } from '../services/api';
import { getRealtimeSocket } from '../services/realtime';

const STATUT_LABELS = {
  OUVERTE: 'Ouverte',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  FERMEE: 'Fermée',
  ARCHIVEE: 'Archivée',
};

const STATUT_DOT = {
  OUVERTE: 'bg-emerald-500',
  EN_COURS: 'bg-blue-500',
  TERMINEE: 'bg-zinc-400',
  FERMEE: 'bg-zinc-400',
  ARCHIVEE: 'bg-rose-500',
};

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
            isFull ? 'bg-zinc-400' : 'bg-emerald-500'
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
  const [loading, setLoading] = useState(true);

  // État utilisateur pour afficher conditionnellement Se Connecter / Dark Mode
  const [currentUser, setCurrentUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Layout View State (Grid vs List)
  const [viewMode, setViewMode] = useState('grid');

  // Recherche unique (titre et description)
  const [searchTerm, setSearchTerm] = useState('');

  // Avis & Commentaires stockés par ID de formation
  const [catalogueReviews, setCatalogueReviews] = useState({});
  const [visibleReviewCounts, setVisibleReviewCounts] = useState({});

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        setCurrentUser(null);
      }
    }

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
      const data = Array.isArray(res.data) ? res.data : [];
      setFormations(data);

      // Récupérer les avis pour chaque formation terminée ou archivée, triés du plus récent au plus ancien
      const reviewFormations = data.filter(
        (formation) => formation.statut === 'TERMINEE' || formation.statut === 'ARCHIVEE'
      );
      const reviewEntries = await Promise.all(
        reviewFormations.map(async (formation) => {
          try {
            const reviewResponse = await API.get(`/formations/${formation.id_formation}/avis`);
            const reviewsList = Array.isArray(reviewResponse.data) ? reviewResponse.data : [];
            // Tri du plus récent au plus daté
            reviewsList.sort((a, b) => new Date(b.date_creation || b.createdAt || 0) - new Date(a.date_creation || a.createdAt || 0));
            return [formation.id_formation, reviewsList];
          } catch (error) {
            return [formation.id_formation, []];
          }
        })
      );
      setCatalogueReviews(Object.fromEntries(reviewEntries));
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

  const isInscriptionOuverte = (formation) => {
    const today = new Date().toISOString().split('T')[0];
    const dateLimite = new Date(formation.date_limite_inscription)
      .toISOString()
      .split('T')[0];
    return formation.statut === 'OUVERTE' && dateLimite >= today;
  };

  // Filtrage global par recherche sur le titre ET la description
  const filteredFormations = useMemo(
    () =>
      formations.filter((f) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          f.titre.toLowerCase().includes(term) ||
          (f.description && f.description.toLowerCase().includes(term));
        return matchesSearch;
      }),
    [formations, searchTerm]
  );

  // Formations à afficher en haut (Uniquement celles qui ne sont PAS terminées ni archivées)
  const activeFilteredFormations = filteredFormations.filter(
    (formation) => formation.statut !== 'TERMINEE' && formation.statut !== 'ARCHIVEE'
  );

  // Formations terminées ou archivées pour la section des commentaires en bas
  const reviewFilteredFormations = filteredFormations.filter(
    (formation) => formation.statut === 'TERMINEE' || formation.statut === 'ARCHIVEE'
  );

  return (
    <div className="min-h-screen bg-[#F3F2EE] font-sans text-slate-800 transition-colors duration-300 dark:bg-[#0C0C0E] dark:text-zinc-100">
      
      {/* BARRE DE NAVIGATION SUPÉRIEURE */}
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
              <button
                onClick={toggleDarkMode}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                title="Changer le thème"
              >
                <i className={`bi ${isDarkMode ? 'bi-sun' : 'bi-moon'} text-xs`}></i>
              </button>

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

        {/* Barre de recherche uniquement (Filtres par onglets supprimés) */}
        <div className="mb-6 flex justify-end">
          <div className="relative w-full md:w-80">
            <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              placeholder="Rechercher par titre ou description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 py-2.5 pl-9 pr-8 text-xs text-slate-900 dark:text-white outline-none focus:border-orange-500 transition shadow-sm"
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

        {/* SECTION 1 : FORMATIONS EN COURS / OUVERTES / NON TERMINÉES */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : activeFilteredFormations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 py-16 text-xs text-slate-400 mb-12">
            <i className="bi bi-search text-2xl mb-2 text-slate-400"></i>
            <p>Aucune formation en cours ou ouverte ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-16'
                : 'flex flex-col gap-4 mb-16'
            }
          >
            {activeFilteredFormations.map((f) => {
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
                  className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition duration-300 ${
                    viewMode === 'list' ? 'sm:flex-row sm:items-center' : ''
                  }`}
                >
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

                    <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-slate-900/80 dark:bg-black/80 px-2.5 py-1 text-[10px] text-white backdrop-blur-md">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUT_DOT[badgeKey] || STATUT_DOT.FERMEE}`} />
                      {badgeLabel}
                    </div>

                    <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 dark:bg-zinc-900/90 px-2 py-0.5 text-[10px] text-slate-800 dark:text-zinc-100 backdrop-blur-md shadow-sm">
                      <i className="bi bi-star-fill text-amber-400 text-[10px]"></i>
                      {Number(f.note_moyenne || 0).toFixed(1)}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-3.5 justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1 group-hover:text-orange-500 transition">
                          {f.titre}
                        </h3>
                      </div>

                      <p className="mt-1 line-clamp-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        {f.description}
                      </p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500">
                        <span><i className="bi bi-calendar3 me-1"></i>{formatDate(f.date_debut)}</span>
                        <span><i className="bi bi-clock me-1"></i>Limite: {formatDate(f.date_limite_inscription)}</span>
                      </div>

                      <div className="mt-2">
                        <ProgressBar value={f.inscrits_count} max={f.capacite_max} />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-2.5">
                      <span className="text-[10px] text-slate-400">
                        {f.inscrits_count || 0} inscrits
                      </span>

                      {estApprenant ? (
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          Déjà inscrit
                        </span>
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
                          onClick={() => handlePostuler(f)}
                          className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium"
                        >
                          Postuler
                          <i className="bi bi-arrow-right text-[10px]"></i>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Fermée
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* SECTION 2 : FORMATIONS TERMINÉES OU ARCHIVÉES & LEURS COMMENTAIRES (STYLE GOOGLE PLAY) */}
        {reviewFilteredFormations.length > 0 && (
          <section className="mt-12 border-t border-slate-200 pt-10 dark:border-zinc-800">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Avis et commentaires sur les formations terminées et archivées
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                Consultez les retours d'expérience classés du plus récent au plus ancien.
              </p>
            </div>

            <div className="space-y-6">
              {reviewFilteredFormations.map((formation) => {
                const formationReviews = catalogueReviews[formation.id_formation] || [];
                const visibleCount = visibleReviewCounts[formation.id_formation] || 3;
                const visibleReviews = formationReviews.slice(0, visibleCount);

                return (
                  <article
                    key={formation.id_formation}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    {/* En-tête de la formation archivée / terminée */}
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-zinc-800">
                          {formation.image_url ? (
                            <img
                              src={getFormationImageUrl(formation.image_url)}
                              alt={formation.titre}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <i className="bi bi-journal-bookmark"></i>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                              {formation.titre}
                            </h3>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white ${formation.statut === 'ARCHIVEE' ? 'bg-rose-500' : 'bg-zinc-500'}`}>
                              {formation.statut === 'ARCHIVEE' ? 'Archivée' : 'Terminée'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 line-clamp-1">
                            {formation.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-amber-500">
                          <i className="bi bi-star-fill"></i>
                          {Number(formation.note_moyenne || 0).toFixed(1)} / 5
                        </span>
                        <span>({formationReviews.length} avis)</span>
                      </div>
                    </div>

                    {/* Liste des commentaires style Google Play */}
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
                      {visibleReviews.length ? (
                        visibleReviews.map((review) => (
                          <div key={review.id_avis || review.id} className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-600 dark:text-orange-400">
                                  {(review.auteur || 'A')[0].toUpperCase()}
                                </span>
                                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                                  {review.auteur || 'Anonyme'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {review.date_creation || review.createdAt ? formatDate(review.date_creation || review.createdAt) : ''}
                              </span>
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <Stars note={review.note} />
                            </div>

                            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                              {review.commentaire}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="py-6 text-center text-xs text-slate-400 italic">
                          Aucun commentaire publié pour cette formation.
                        </p>
                      )}
                    </div>

                    {/* Bouton Afficher plus */}
                    {visibleCount < formationReviews.length && (
                      <div className="mt-4 pt-2 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleReviewCounts((current) => ({
                              ...current,
                              [formation.id_formation]: (current[formation.id_formation] || 3) + 3,
                            }))
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition shadow-sm"
                        >
                          Afficher plus
                          <i className="bi bi-chevron-down text-[10px]"></i>
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}