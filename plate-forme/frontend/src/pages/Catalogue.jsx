import React, { useState, useEffect } from 'react';
import { 
  BookOpen, CheckCircle, Clock, Info, UserX, ArrowRight, Star, 
  Sun, Moon, Search, MessageSquare, Send, Calendar, Users, Award 
} from 'lucide-react';
import API from '../services/api';

export default function Catalogue() {
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

  // Filtres & Recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('TOUT');

  // Section Commentaires
  const [comments, setComments] = useState([
    { id: 1, auteur: 'Sophie M.', note: 5, message: 'Formations de grande qualité, les projets pratiques sont très formateurs !' },
    { id: 2, auteur: 'Alexandre D.', note: 4, message: 'Excellente plateforme, très intuitive et claire pour s\'inscrire.' }
  ]);
  const [newComment, setNewComment] = useState({ auteur: '', note: 5, message: '' });
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    fetchFormations();
  }, []);

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

  const handlePostuler = (formation) => {
    window.location.href = `/postuler/${formation.id_formation}`;
  };

  const handleOpenDetails = (formation) => {
    setSelectedFormation(formation);
    setShowDetailModal(true);
  };

  const isInscriptionOuverte = (formation) => {
    const today = new Date().toISOString().split('T')[0];
    const dateLimite = new Date(formation.date_limite_inscription).toISOString().split('T')[0];
    return formation.statut === 'OUVERTE' && dateLimite >= today;
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.auteur || !newComment.message) return;

    setSubmittingComment(true);
    try {
      // Tentative d'envoi vers l'API si le routeur existe
      await API.post('/comments', newComment);
      setComments([ { ...newComment, id: Date.now() }, ...comments ]);
    } catch (err) {
      // Fallback local en cas d'absence de endpoint API
      setComments([ { ...newComment, id: Date.now() }, ...comments ]);
    } finally {
      setNewComment({ auteur: '', note: 5, message: '' });
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
    <div className="min-h-screen bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white">
      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Banner Hero / Title */}
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-black/10 pb-8 dark:border-white/10">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Apprendre. Évoluer. Réussir.</p>
            <h1 className="mb-3 text-4xl font-black tracking-tight sm:text-5xl">Catalogue des formations</h1>
            <p className="text-base leading-7 text-black/60 dark:text-white/60">Explorez nos programmes de formation professionnelle et développez de nouvelles compétences clés.</p>
          </div>

          {/* Recherche & Filtres */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-black/15 bg-black/5 pl-10 pr-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none dark:border-white/15 dark:bg-white/5"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-black/15 bg-black/5 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none dark:border-white/15 dark:bg-zinc-900"
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
          <div className="py-20 text-center text-black/50 dark:text-white/50 animate-pulse">Chargement des formations...</div>
        ) : filteredFormations.length === 0 ? (
          <div className="py-16 text-center text-black/50 dark:text-white/50">
            Aucune formation ne correspond à vos critères.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredFormations.map((f) => {
              const ouverte = isInscriptionOuverte(f);
              const estApprenant = f.est_apprenant;
              const statutCandidature = f.statut_candidature;
              const estComplete = f.est_complete;

              return (
                <div
                  key={f.id_formation}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-orange-500 dark:border-white/10 dark:bg-zinc-950"
                >
                  {/* Image / Fallback Dégradé */}
                  <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-orange-500/20 via-zinc-800 to-black">
                    {f.image_url ? (
                      <img
                        src={f.image_url}
                        alt={f.titre}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      /* Dégradé par défaut si pas d'image */
                      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-orange-600/30 via-zinc-900 to-black">
                        <BookOpen size={40} className="mb-2 text-orange-500 opacity-80" />
                        <span className="text-sm font-bold text-white/80 line-clamp-2">{f.titre}</span>
                      </div>
                    )}
                    
                    {/* Badge Statut */}
                    <span className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-black/10 ${
                      estComplete ? 'bg-black text-white dark:bg-zinc-800' :
                      f.statut === 'OUVERTE' ? 'bg-orange-500 text-black' :
                      f.statut === 'EN_COURS' ? 'bg-white text-black' : 'bg-black/80 text-white'
                    }`}>
                      {estComplete ? 'COMPLET' : f.statut}
                    </span>
                  </div>

                  {/* Contenu Card */}
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <h3 className="mb-2 text-xl font-bold tracking-tight text-black dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {f.titre}
                      </h3>
                      <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-black/60 dark:text-white/60">
                        {f.description}
                      </p>
                      
                      {/* Métadonnées & Détails */}
                      <div className="mb-6 space-y-2 rounded-xl border border-black/5 bg-black/[0.02] p-4 text-xs dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5 text-black/60 dark:text-white/60">
                            <Users size={14} className="text-orange-500" /> Capacity :
                          </span>
                          <span className="font-semibold text-black dark:text-white">
                            {f.inscrits_count} / {f.capacite_max || '∞'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5 text-black/60 dark:text-white/60">
                            <Calendar size={14} className="text-orange-500" /> Début :
                          </span>
                          <span className="font-medium">{new Date(f.date_debut).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1.5 text-black/60 dark:text-white/60">
                            <Clock size={14} className="text-orange-500" /> Date limite :
                          </span>
                          <span className="font-medium">{new Date(f.date_limite_inscription).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2">
                      {estApprenant ? (
                        <button
                          disabled
                          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 py-3 text-sm font-semibold text-orange-700 dark:text-orange-400"
                        >
                          <CheckCircle size={16} />
                          Vous suivez cette formation
                        </button>
                      ) : statutCandidature === 'EN_ATTENTE' ? (
                        <button
                          disabled
                          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 py-3 text-sm font-semibold text-orange-700 dark:text-orange-400"
                        >
                          <Clock size={16} />
                          Candidature en cours
                        </button>
                      ) : estComplete ? (
                        <button
                          disabled
                          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-black/20 bg-black/5 py-3 text-sm font-semibold text-black/60 dark:border-white/20 dark:bg-white/5 dark:text-white/60"
                        >
                          <UserX size={16} />
                          Complet (Capacité max)
                        </button>
                      ) : ouverte ? (
                        <button
                          onClick={() => handlePostuler(f)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black shadow-md shadow-orange-500/20 transition hover:bg-orange-400 active:scale-95"
                        >
                          Postuler maintenant
                          <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenDetails(f)}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-transparent py-3 text-sm font-semibold transition hover:border-orange-500 hover:text-orange-600 dark:border-white/20 dark:hover:text-orange-400"
                        >
                          <Info size={16} />
                          À propos & Retours
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION COMMENTAIRES / AVIS */}
        <section className="mt-20 border-t border-black/10 pt-12 dark:border-white/10">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black tracking-tight">Avis et commentaires</h2>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Partagez votre expérience ou donnez votre avis sur nos formations
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Formulaire de commentaire */}
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-6 dark:border-white/10 dark:bg-zinc-950">
              <h3 className="mb-4 text-lg font-bold flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-500" />
                Laissez un commentaire
              </h3>
              
              <form onSubmit={handleCommentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-black/60 dark:text-white/60 mb-1">Votre Nom / Pseudo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean Dupont"
                    value={newComment.auteur}
                    onChange={(e) => setNewComment({ ...newComment, auteur: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none dark:border-white/15 dark:bg-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-black/60 dark:text-white/60 mb-1">Note</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewComment({ ...newComment, note: star })}
                        className="text-orange-500 p-1 hover:scale-110 transition-transform"
                      >
                        <Star size={20} fill={star <= newComment.note ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-black/60 dark:text-white/60 mb-1">Votre message</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Qu'avez-vous pensé de nos formations ?"
                    value={newComment.message}
                    onChange={(e) => setNewComment({ ...newComment, message: e.target.value })}
                    className="w-full rounded-xl border border-black/15 bg-white p-3 text-sm focus:border-orange-500 focus:outline-none dark:border-white/15 dark:bg-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingComment}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
                >
                  <Send size={16} />
                  {submittingComment ? 'Envoi...' : 'Publier le commentaire'}
                </button>
              </form>
            </div>

            {/* Liste des commentaires */}
            <div className="lg:col-span-2 space-y-4">
              {comments.map((c) => (
                <div key={c.id} className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">{c.auteur}</span>
                    <div className="flex text-orange-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < c.note ? "currentColor" : "none"} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed">{c.message}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Modale d'informations */}
      {showDetailModal && selectedFormation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-white p-6 text-black shadow-2xl dark:bg-zinc-950 dark:text-white">
            <h3 className="mb-2 text-xl font-bold">{selectedFormation.titre}</h3>
            <p className="mb-4 text-xs font-semibold text-orange-600 dark:text-orange-400">Inscriptions closes pour cette session</p>

            <div className="space-y-4 text-sm text-black/70 dark:text-white/70">
              <div>
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wider">Présentation</h4>
                <p className="rounded-xl border border-black/10 bg-black/[0.04] p-3 dark:border-white/10 dark:bg-white/[0.04]">{selectedFormation.description}</p>
              </div>

              <div>
                <h4 className="mb-1 text-xs font-bold uppercase tracking-wider">Avis & Retours des participants</h4>
                <div className="space-y-2 rounded-xl border border-black/10 bg-black/[0.04] p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center gap-1 text-orange-500 text-xs">
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <span className="ml-2 text-black/50 dark:text-white/50">4.9/5 (Basé sur les évaluations)</span>
                  </div>
                  <p className="text-xs italic text-black/50 dark:text-white/50">
                    "Une formation très pratique qui m'a permis de valider mes projets professionnels."
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDetailModal(false)}
              className="mt-6 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}