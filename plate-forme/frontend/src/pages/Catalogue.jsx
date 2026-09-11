import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Clock, Info, UserX, ArrowRight, Star, Sun, Moon } from 'lucide-react';
import API from '../services/api';

export default function Catalogue() {
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

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

  return (
    <div className="min-h-screen bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white">
      <header className="border-b border-black/10 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-black/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-black">
              <BookOpen size={21} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600 dark:text-orange-400">Forma</p>
              <p className="text-sm font-semibold">Plateforme de formation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDarkMode((value) => !value)}
            aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
            title={darkMode ? 'Mode clair' : 'Mode sombre'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/15 text-black transition hover:border-orange-500 hover:text-orange-600 dark:border-white/20 dark:text-white dark:hover:text-orange-400"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Apprendre. Évoluer. Réussir.</p>
          <h1 className="mb-3 text-4xl font-black tracking-tight sm:text-5xl">Catalogue des formations</h1>
          <p className="max-w-xl text-base leading-7 text-black/60 dark:text-white/60">Des programmes concrets pour développer vos compétences et construire la suite de votre parcours.</p>
        </div>

      {loading ? (
        <div className="py-20 text-center text-black/50 dark:text-white/50">Chargement des formations...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {formations.map((f) => {
            const ouverte = isInscriptionOuverte(f);
            const estApprenant = f.est_apprenant;
            const statutCandidature = f.statut_candidature;
            const estComplete = f.est_complete;

            return (
              <div
                key={f.id_formation}
                className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_12px_35px_rgba(0,0,0,0.07)] transition hover:-translate-y-1 hover:border-orange-500 dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
              >
                {/* Image & Badges */}
                <div className="relative h-48 bg-orange-100 dark:bg-orange-950/40">
                  <img
                    src={f.image_url || "/api/placeholder/400/200"}
                    alt={f.titre}
                    className="h-full w-full object-cover grayscale-[20%]"
                  />
                  
                  {/* Badge Statut */}
                  <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full shadow-md ${
                    estComplete ? 'bg-black text-white' :
                    f.statut === 'OUVERTE' ? 'bg-orange-500 text-black' :
                    f.statut === 'EN_COURS' ? 'bg-white text-black' : 'bg-black/80 text-white'
                  }`}>
                    {estComplete ? 'COMPLET' : f.statut}
                  </span>
                </div>

                {/* Contenu Card */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="mb-2 text-lg font-bold">{f.titre}</h3>
                    <p className="mb-4 line-clamp-2 text-xs text-black/55 dark:text-white/55">{f.description}</p>
                    
                    <div className="mb-4 space-y-1.5 rounded-xl border border-black/5 bg-black/[0.03] p-3 text-xs dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex justify-between">
                        <span className="text-black/50 dark:text-white/50">Places réservées :</span>
                        <span className="font-semibold">
                          {f.inscrits_count} / {f.capacite_max || '∞'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/50 dark:text-white/50">Début :</span>
                        <span>{new Date(f.date_debut).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-black/50 dark:text-white/50">Limite d'inscription :</span>
                        <span>{new Date(f.date_limite_inscription).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* GESTION DYNAMIQUE DU BOUTON */}
                  <div className="pt-2">
                    {estApprenant ? (
                      /* CAS 1 : Utilisateur déjà inscrit et accepté */
                      <button
                        disabled
                        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 py-2.5 text-sm font-semibold text-orange-700 dark:text-orange-400"
                      >
                        <CheckCircle size={16} />
                        Vous suivez cette formation
                      </button>
                    ) : statutCandidature === 'EN_ATTENTE' ? (
                      /* CAS 2 : Candidature en cours de traitement */
                      <button
                        disabled
                        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 py-2.5 text-sm font-semibold text-orange-700 dark:text-orange-400"
                      >
                        <Clock size={16} />
                        Candidature en cours
                      </button>
                    ) : estComplete ? (
                      /* CAS 3 : La formation a atteint sa capacité max */
                      <button
                        disabled
                        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-black/20 bg-black/5 py-2.5 text-sm font-semibold text-black/60 dark:border-white/20 dark:bg-white/5 dark:text-white/60"
                      >
                        <UserX size={16} />
                        Complet (Capacité maximale atteinte)
                      </button>
                    ) : ouverte ? (
                      /* CAS 4 : Formation ouverte et places disponibles */
                      <button
                        onClick={() => handlePostuler(f)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 active:scale-95"
                      >
                        Postuler maintenant
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      /* CAS 5 : Date limite dépassée ou statut non ouvert */
                      <button
                        onClick={() => handleOpenDetails(f)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-transparent py-2.5 text-sm font-semibold transition hover:border-orange-500 hover:text-orange-600 dark:border-white/20 dark:hover:text-orange-400"
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