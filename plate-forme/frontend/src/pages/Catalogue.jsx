import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, CheckCircle, Clock, Info, UserX, ArrowRight, Star, 
  Search, Send, Calendar, Users, X, MessageSquare, Sparkles
} from 'lucide-react';
import API from '../services/api';

export default function Catalogue() {
  const navigate = useNavigate();
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const fetchFormations = async () => {
    try {
      const res = await API.get('/formations/catalogue');
      setFormations(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement du catalogue :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(fetchFormations, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handlePostuler = (formation) => {
    navigate(`/postuler/${formation.id_formation}`);
  };

  const handleOpenDetails = async (formation) => {
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
      setReviewError(error.response?.data?.message || 'Impossible de charger les avis.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const isInscriptionOuverte = (formation) => {
    const today = new Date().toISOString().split('T')[0];
    const dateLimite = new Date(formation.date_limite_inscription).toISOString().split('T')[0];
    return formation.statut === 'OUVERTE' && dateLimite >= today;
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFormation || !newComment.commentaire.trim()) return;

    setSubmittingComment(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      await API.post(`/formations/${selectedFormation.id_formation}/avis`, newComment);
      const [catalogueResponse, commentsResponse] = await Promise.all([
        API.get('/formations/catalogue'),
        API.get(`/formations/${selectedFormation.id_formation}/avis`)
      ]);
      
      const updatedFormation = catalogueResponse.data.find((item) => item.id_formation === selectedFormation.id_formation);
      if (updatedFormation) {
        setSelectedFormation(updatedFormation);
        setFormations(catalogueResponse.data);
      }
      setComments(Array.isArray(commentsResponse.data) ? commentsResponse.data : []);
      setNewComment({ note: 5, commentaire: '' });
      setReviewSuccess('Votre avis a été publié avec succès !');
    } catch (error) {
      setReviewError(error.response?.data?.message || 'Impossible de publier votre avis.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const filteredFormations = formations.filter((f) => {
    const matchesSearch = f.titre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'TOUT' || f.statut === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-black dark:text-zinc-100">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        
        {/* Banner Hero / Title Section */}
        <div className="mb-10 flex flex-col gap-6 rounded-3xl border border-slate-200/80 bg-white/60 p-6 backdrop-blur-xl md:flex-row md:items-end md:justify-between dark:border-zinc-800/80 dark:bg-zinc-900/40">
          <div className="max-w-2xl">
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
              Découvrez nos programmes d'apprentissage conçus pour propulser vos compétences vers de nouveaux sommets.
            </p>
          </div>

          {/* Recherche & Filtres */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher une formation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-600 dark:focus:border-orange-500"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-800 shadow-sm transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-orange-500"
            >
              <option value="TOUT">Tous les statuts</option>
              <option value="OUVERTE">Ouverte</option>
              <option value="EN_COURS">En cours</option>
              <option value="FERMEE">Fermée</option>
            </select>
          </div>
        </div>

        {/* Grille du catalogue */}
        {loading ? (
          <div className="flex py-24 items-center justify-center text-sm font-medium text-slate-500 dark:text-zinc-500 animate-pulse">
            Chargement des programmes de formation...
          </div>
        ) : filteredFormations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500 dark:border-zinc-800 dark:text-zinc-500">
            Aucune formation disponible selon vos termes de recherche.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredFormations.map((f) => {
              const ouverte = isInscriptionOuverte(f);
              const estApprenant = f.est_apprenant;
              const statutCandidature = f.statut_candidature;
              const estComplete = f.est_complete;

              return (
                <div
                  key={f.id_formation}
                  className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1  hover:shadow-xl hover:shadow-gray-500/50 dark:border-zinc-800/80 dark:bg-zinc-900/60"
                >
                  {/* Bannière visuelle */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                    {f.image_url ? (
                      <img
                        src={f.image_url}
                        alt={f.titre}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-orange-600/30 via-zinc-900 to-zinc-950 p-6 text-center">
                        <BookOpen size={36} className="mb-2 text-orange-500 opacity-80" />
                        <span className="text-xs font-semibold text-zinc-300 line-clamp-1">{f.titre}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Badge de statut */}
                    <span className={`absolute top-4 right-4 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                      estComplete ? 'border-zinc-700 bg-zinc-900/90 text-zinc-300' :
                      f.statut === 'OUVERTE' ? 'border-orange-500/30 bg-orange-500/90 text-slate-950' :
                      f.statut === 'EN_COURS' ? 'border-blue-500/30 bg-blue-500/90 text-white' : 'border-zinc-800 bg-zinc-950/80 text-zinc-400'
                    }`}>
                      {estComplete ? 'Complet' : f.statut}
                    </span>

                    {/* Note sur la bannière */}
                    <div className="absolute bottom-3 left-4 flex items-center gap-1.5 text-xs font-bold text-white">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span>{Number(f.note_moyenne).toFixed(1)}</span>
                      <span className="text-[10px] font-normal text-zinc-300">({f.avis_count} avis)</span>
                    </div>
                  </div>

                  {/* Contenu de la carte */}
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                        {f.titre}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-400">
                        {f.description}
                      </p>

                      {/* Fusion des Métadonnées sous forme de puces fluides */}
                      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                          <Users size={12} className="text-orange-500" /> {f.inscrits_count} / {f.capacite_max || '∞'} places
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                          <Calendar size={12} className="text-orange-500" /> Début: {new Date(f.date_debut).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 font-medium text-slate-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                          <Clock size={12} className="text-orange-500" /> Limite: {new Date(f.date_limite_inscription).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {/* Zone Boutons Actions Fusionnés */}
                    <div className="mt-6 pt-2 border-t border-slate-100 dark:border-zinc-800/60">
                      {estApprenant ? (
                        <button
                          onClick={() => handleOpenDetails(f)}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500/10 border border-orange-500/30 px-4 py-2.5 text-xs font-bold text-orange-600 transition hover:bg-orange-500/20 dark:text-orange-400"
                        >
                          {f.statut === 'TERMINEE' ? (
                            <><Star size={14} /> {f.avis_deja_depose ? 'Consulter les avis' : 'Donner votre avis'}</>
                          ) : (
                            <><CheckCircle size={14} /> Vous suivez cette formation</>
                          )}
                        </button>
                      ) : statutCandidature === 'EN_ATTENTE' ? (
                        <button
                          disabled
                          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-400"
                        >
                          <Clock size={14} /> Candidature en cours
                        </button>
                      ) : estComplete ? (
                        <button
                          disabled
                          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-400 dark:bg-zinc-800 dark:text-zinc-500"
                        >
                          <UserX size={14} /> Formation Complète
                        </button>
                      ) : ouverte ? (
                        <button
                          onClick={() => handlePostuler(f)}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-orange-400 active:scale-[0.98] shadow-md shadow-orange-500/15"
                        >
                          Postuler maintenant <ArrowRight size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenDetails(f)}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:border-orange-500 hover:text-orange-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-orange-500 dark:hover:text-orange-400"
                        >
                          <Info size={14} /> À propos & Retours
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal À Propos & Retours / Formulaire d'avis */}
      {showDetailModal && selectedFormation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  {selectedFormation.statut}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {selectedFormation.titre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-6 text-xs text-slate-600 dark:text-zinc-300">
              {/* Description */}
              <div>
                <h4 className="mb-2 font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Présentation
                </h4>
                <p className="rounded-2xl bg-slate-50 p-4 leading-relaxed dark:bg-zinc-800/50 text-slate-700 dark:text-zinc-300 border border-slate-100 dark:border-zinc-800">
                  {selectedFormation.description}
                </p>
              </div>

              {/* Liste des avis */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-zinc-800">
                  <h4 className="font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    Retours & Avis
                  </h4>
                  <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {Number(selectedFormation.note_moyenne).toFixed(1)} / 5 ({selectedFormation.avis_count} avis)
                  </span>
                </div>

                {reviewError && (
                  <p role="alert" className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-red-600 dark:text-red-400">
                    {reviewError}
                  </p>
                )}
                {reviewSuccess && (
                  <p role="status" className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                    {reviewSuccess}
                  </p>
                )}

                <div className="mt-3 max-h-52 space-y-3 overflow-y-auto pr-1">
                  {commentsLoading ? (
                    <p className="py-4 text-center text-slate-400">Chargement des retours...</p>
                  ) : comments.length ? (
                    comments.map((comment) => (
                      <article key={comment.id_avis} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 dark:border-zinc-800/50 dark:bg-zinc-800/30">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-zinc-200">{comment.auteur}</span>
                          <span className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={12}
                                className={star <= comment.note ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-zinc-700"}
                              />
                            ))}
                          </span>
                        </div>
                        <p className="mt-1.5 text-slate-600 dark:text-zinc-300 leading-normal">{comment.commentaire}</p>
                        <time className="mt-2 block text-[10px] text-slate-400 dark:text-zinc-500">
                          {new Date(comment.date_creation).toLocaleDateString('fr-FR')}
                        </time>
                      </article>
                    ))
                  ) : (
                    <p className="py-4 text-center text-slate-400 dark:text-zinc-500">Aucun avis disponible pour cette formation.</p>
                  )}
                </div>
              </div>

              {/* Formulaire d'avis intéractif avec étoiles */}
              {selectedFormation.statut === 'TERMINEE' && selectedFormation.est_apprenant && !selectedFormation.avis_deja_depose && (
                <form onSubmit={handleCommentSubmit} className="space-y-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 dark:bg-orange-500/10">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                      <MessageSquare size={14} /> Donner votre avis
                    </h4>
                    
                    {/* Étoiles intéractives */}
                    <div className="flex items-center gap-1" role="radiogroup">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setNewComment((prev) => ({ ...prev, note: star }))}
                          className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            size={18}
                            className={(hoverRating || newComment.note) >= star ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-zinc-600"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    required
                    maxLength={2000}
                    placeholder="Partagez votre expérience sur le contenu, le formateur..."
                    value={newComment.commentaire}
                    onChange={(e) => setNewComment((prev) => ({ ...prev, commentaire: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder:text-zinc-600"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                      Réservé aux apprenants ayant terminé cette session.
                    </span>
                    <button
                      type="submit"
                      disabled={submittingComment}
                      className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
                    >
                      <Send size={12} />
                      {submittingComment ? 'Envoi...' : 'Publier'}
                    </button>
                  </div>
                </form>
              )}

              {selectedFormation.statut === 'TERMINEE' && selectedFormation.est_apprenant && selectedFormation.avis_deja_depose && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-[11px] font-medium text-slate-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                  Vous avez déjà partagé votre avis sur cette formation.
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}