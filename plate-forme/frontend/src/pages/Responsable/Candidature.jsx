import { useEffect, useState, useRef } from 'react';
import { 
  CheckCircle, Send, XCircle, RefreshCw, ChevronLeft, ChevronRight, 
  UserRound, Mail, Phone, GraduationCap, BriefcaseBusiness, UserCheck, Sparkles 
} from 'lucide-react';
import API from '../../services/api';

export default function Candidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedFormationId, setSelectedFormationId] = useState('');
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);

  // Pour le swipe / glissement sur mobile
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const fetchCandidatures = async () => {
    try {
      const res = await API.get('/responsable/candidatures');
      setCandidatures(Array.isArray(res.data) ? res.data : []);
      setSelectedFormationId((current) => current || (res.data[0]?.id_formation ? String(res.data[0].id_formation) : ''));
    } catch (err) {
      console.error("Erreur de chargement :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidatures();
  }, []);

  const handleDecision = async (candidature, decision) => {
    setProcessingId(candidature.id_inscription);
    try {
      await API.patch(`/responsable/candidatures/${candidature.id_inscription}/preselection`, {
        statut: decision
      });
      await fetchCandidatures();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors du traitement de la candidature.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleValiderPromotion = async (id_formation, titreFormation, countPreselection, maxCapacite) => {
    if (countPreselection > maxCapacite) {
      alert(`Impossible : Vous avez présélectionné ${countPreselection} candidat(s) pour une capacité de ${maxCapacite}.`);
      return;
    }

    const confirmMsg = `Êtes-vous sûr de vouloir valider définitivement la promotion "${titreFormation}" ?\n\n` +
      `• ${countPreselection} compte(s) utilisateur(s) seront créés.\n` +
      `• Les e-mails avec les badges QR Code seront envoyés aux candidats pré-sélectionnés.`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await API.post(`/responsable/formations/${id_formation}/valider-promotion`);
      alert(res.data.message || "Validation de la promotion effectuée avec succès !");
      fetchCandidatures();
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors de la validation finale.");
    } finally {
      setLoading(false);
    }
  };

  // Groupement par formation
  const candidaturesParFormation = candidatures.reduce((acc, cand) => {
    const key = cand.id_formation || cand.formation_titre;
    if (!acc[key]) {
      acc[key] = {
        id_formation: cand.id_formation,
        titre: cand.formation_titre,
        capacite_max: cand.capacite_max,
        liste: []
      };
    }
    acc[key].liste.push(cand);
    return acc;
  }, {});

  const formationsDisponibles = Object.values(candidaturesParFormation);
  const selectedGroup = formationsDisponibles.find(
    (group) => String(group.id_formation) === String(selectedFormationId)
  ) || formationsDisponibles[0];

  const tousLesCandidats = selectedGroup?.liste || [];

  const candidatsAExaminer = tousLesCandidats.filter((c) => c.statut !== 'ACCEPTEE');
  const candidatsAcceptes = tousLesCandidats.filter((c) => c.statut === 'ACCEPTEE');

  const currentCandidate = candidatsAExaminer[currentCandidateIndex];

  const nbPreselectionnes = tousLesCandidats.filter((c) => c.statut === 'PRESELECTIONNEE').length;
  const nbAcceptes = candidatsAcceptes.length;
  const placesRestantes = Math.max(0, (selectedGroup?.capacite_max || 0) - nbAcceptes - nbPreselectionnes);

  const selectFormation = (value) => {
    setSelectedFormationId(value);
    setCurrentCandidateIndex(0);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isSwipeLeft = distance > 50;
    const isSwipeRight = distance < -50;

    if (isSwipeLeft && currentCandidateIndex < candidatsAExaminer.length - 1) {
      setCurrentCandidateIndex((i) => i + 1);
    }
    if (isSwipeRight && currentCandidateIndex > 0) {
      setCurrentCandidateIndex((i) => i - 1);
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 text-zinc-900 font-sans transition-colors duration-300 dark:text-zinc-100 sm:px-6 antialiased">
      
      {/* Header Page */}
      <div className="relative flex flex-col justify-between gap-6 pb-2 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
            <Sparkles size={13} />
            <span>Espace Responsable</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            Examen des candidatures
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-xl">
            Passez en revue les badges candidats, sélectionnez les meilleurs profils et validez la promotion en toute simplicité.
          </p>
        </div>

        <button 
          onClick={fetchCandidatures} 
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-zinc-100 dark:bg-zinc-800/80 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-orange-500/10 hover:text-orange-600 dark:hover:bg-orange-500/20 dark:hover:text-orange-400 transition-all active:scale-95"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-orange-500" : ""} /> 
          <span>Actualiser</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-sm font-medium text-zinc-400 rounded-3xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950">
          <RefreshCw size={24} className="animate-spin text-orange-500 mb-3" />
          <span>Chargement des dossiers...</span>
        </div>
      ) : !selectedGroup ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-12 text-center text-zinc-500 dark:text-zinc-400">
          Aucune candidature enregistrée pour le moment.
        </div>
      ) : (
        /* BLOC UNIQUE UNIFIÉ ET FUSIONNÉ */
        <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-950 shadow-xl shadow-zinc-200/50 dark:shadow-none divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
          
          {/* Section 1 : Sélection & Statistiques */}
          <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              
              <div className="flex-1 space-y-2">
                <label htmlFor="formation-select" className="block text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  1. Sélectionner une formation
                </label>
                <div className="relative">
                  <select 
                    id="formation-select" 
                    value={selectedFormationId} 
                    onChange={(e) => selectFormation(e.target.value)} 
                    className="w-full appearance-none rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900 px-4 py-3 text-sm font-bold text-zinc-800 dark:text-zinc-100 shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-800"
                  >
                    {formationsDisponibles.map((group) => (
                      <option key={group.id_formation} value={group.id_formation}>{group.titre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Badges métriques fondus */}
              <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[360px]">
                <div className="rounded-2xl bg-white dark:bg-zinc-900 p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
                  <span className="block text-xl font-black text-zinc-900 dark:text-white">{selectedGroup.capacite_max}</span>
                  <span className="text-[11px] font-medium text-zinc-400">Capacité max</span>
                </div>
                <div className="rounded-2xl bg-orange-500/10 dark:bg-orange-500/15 p-3.5 border border-orange-500/20 shadow-xs">
                  <span className="block text-xl font-black text-orange-600 dark:text-orange-400">{nbPreselectionnes}</span>
                  <span className="text-[11px] font-semibold text-orange-600/80 dark:text-orange-400/80">Retenus</span>
                </div>
                <div className="rounded-2xl bg-zinc-900 dark:bg-zinc-100 p-3.5 shadow-xs text-white dark:text-zinc-900">
                  <span className="block text-xl font-black">{placesRestantes}</span>
                  <span className="text-[11px] font-medium opacity-80">Restantes</span>
                </div>
              </div>

            </div>
          </div>

          {/* Section 2 : Carousel des Candidats & Badge Card */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  2. Carousel des candidats
                </h2>
                <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {candidatsAExaminer.length > 0 
                    ? `Dossier ${currentCandidateIndex + 1} sur ${candidatsAExaminer.length}`
                    : 'Aucun candidat en attente.'}
                </p>
              </div>
            </div>

            {candidatsAExaminer.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-8 text-center text-sm font-medium text-zinc-400 dark:border-zinc-800/60 dark:bg-zinc-900/20">
                Tous les candidats ont été traités ou acceptés !
              </div>
            ) : (
              /* Carousel Responsive Intégré */
              <div className="relative flex items-center gap-3 sm:gap-5">
                
                {/* Flèche Gauche */}
                <button
                  onClick={() => setCurrentCandidateIndex((i) => Math.max(0, i - 1))}
                  disabled={currentCandidateIndex === 0}
                  aria-label="Candidat précédent"
                  className="z-10 shrink-0 rounded-full border border-zinc-200 bg-white p-3 text-zinc-700 shadow-md backdrop-blur-md transition hover:border-orange-500 hover:text-orange-600 disabled:opacity-20 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500 dark:hover:text-orange-400 active:scale-95"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Badge Card Principale (Fondue) */}
                {currentCandidate && (
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-50/40 dark:border-zinc-800/80 dark:bg-zinc-900/40 transition-all duration-300"
                  >
                    {/* Header Card */}
                    <div className="border-b border-zinc-200/60 bg-gradient-to-r from-orange-500/5 via-transparent to-transparent p-5 dark:border-zinc-800/60 dark:from-orange-500/10">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-base font-black text-white shadow-md shadow-orange-500/20">
                            {currentCandidate.prenom?.[0]}{currentCandidate.nom?.[0]}
                          </div>
                          <div>
                            <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">
                              {currentCandidate.prenom} {currentCandidate.nom}
                            </h3>
                            <p className="text-xs font-medium text-zinc-400">
                              Candidature reçue le {new Date(currentCandidate.date_inscription).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>

                        <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
                          currentCandidate.statut === 'PRESELECTIONNEE' 
                            ? 'bg-orange-500/15 text-orange-600 border border-orange-500/30 dark:text-orange-400' 
                            : 'bg-white text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                        }`}>
                          {currentCandidate.statut === 'PRESELECTIONNEE' ? 'PRÉSÉLECTIONNÉ' : currentCandidate.statut}
                        </span>
                      </div>
                    </div>

                    {/* Contenu Card */}
                    <div className="grid gap-5 p-5 md:grid-cols-2">
                      {/* Profil */}
                      <div className="space-y-3 rounded-xl bg-white dark:bg-zinc-900 p-4 border border-zinc-200/60 dark:border-zinc-800/60 shadow-xs">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Coordonnées & Infos</h4>
                        <div className="space-y-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                          <p className="flex items-center gap-2.5 truncate"><Mail size={15} className="text-orange-500 shrink-0" />{currentCandidate.email}</p>
                          <p className="flex items-center gap-2.5"><Phone size={15} className="text-orange-500 shrink-0" />{currentCandidate.telephone || 'Non renseigné'}</p>
                          <p className="flex items-center gap-2.5"><UserRound size={15} className="text-orange-500 shrink-0" />{currentCandidate.age ? `${currentCandidate.age} ans` : 'Âge N/R'}{currentCandidate.genre ? ` · ${currentCandidate.genre}` : ''}</p>
                          <p className="flex items-center gap-2.5"><GraduationCap size={15} className="text-orange-500 shrink-0" />{currentCandidate.niveau_etude || 'Niveau N/R'}{currentCandidate.filiere ? ` · ${currentCandidate.filiere}` : ''}</p>
                          <p className="flex items-center gap-2.5"><BriefcaseBusiness size={15} className="text-orange-500 shrink-0" />{currentCandidate.situation_professionnelle || 'Situation N/R'}</p>
                        </div>
                      </div>

                      {/* Motivations */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-1.5">Motivation</h4>
                          <p className="max-h-24 overflow-y-auto rounded-xl bg-orange-500/5 border border-orange-500/10 p-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                            {currentCandidate.motivation || 'Aucune motivation renseignée.'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Objectifs et projet</h4>
                          <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">{currentCandidate.objectif || 'Non renseigné.'}</p>
                          {currentCandidate.projet_apres_formation && (
                            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                              <strong className="text-zinc-700 dark:text-zinc-300">Après formation : </strong>{currentCandidate.projet_apres_formation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pied de Card - Boutons de Décision */}
                    <div className="flex flex-col-reverse gap-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/50 p-4 sm:flex-row sm:justify-end">
                      <button
                        onClick={() => handleDecision(currentCandidate, 'REFUSEE')}
                        disabled={processingId === currentCandidate.id_inscription}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95"
                      >
                        <XCircle size={15} className="text-rose-500" /> Refuser
                      </button>
                      <button
                        onClick={() => handleDecision(currentCandidate, 'PRESELECTIONNEE')}
                        disabled={processingId === currentCandidate.id_inscription || placesRestantes === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                      >
                        <CheckCircle size={15} /> Pré-sélectionner
                      </button>
                    </div>
                  </div>
                )}

                {/* Flèche Droite */}
                <button
                  onClick={() => setCurrentCandidateIndex((i) => Math.min(candidatsAExaminer.length - 1, i + 1))}
                  disabled={currentCandidateIndex === candidatsAExaminer.length - 1}
                  aria-label="Candidat suivant"
                  className="z-10 shrink-0 rounded-full border border-zinc-200 bg-white p-3 text-zinc-700 shadow-md backdrop-blur-md transition hover:border-orange-500 hover:text-orange-600 disabled:opacity-20 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500 dark:hover:text-orange-400 active:scale-95"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Section 3 : Banner de Validation Globale (Incrustée) */}
          <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-0.5 text-center sm:text-left">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">Validation finale de la promotion</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {nbPreselectionnes} candidat(s) pré-sélectionné(s) prêts à recevoir leurs accès officiels.
                </p>
              </div>
              <button
                onClick={() => handleValiderPromotion(selectedGroup.id_formation, selectedGroup.titre, nbPreselectionnes, selectedGroup.capacite_max - nbAcceptes)}
                disabled={nbPreselectionnes === 0 || nbPreselectionnes > selectedGroup.capacite_max - nbAcceptes}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-xs font-extrabold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                <Send size={15} /> Valider la promotion
              </button>
            </div>
          </div>

          {/* Section 4 : Tableau des Candidats Définitifs */}
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                3. Candidats déjà acceptés ({candidatsAcceptes.length})
              </h2>
            </div>

            {candidatsAcceptes.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-6 text-center text-xs text-zinc-400 dark:border-zinc-800/60 dark:bg-zinc-900/20">
                Aucun candidat n'a encore été définitivement accepté.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-200/60 bg-zinc-100/60 text-zinc-400 dark:border-zinc-800/60 dark:bg-zinc-900/60 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Candidat</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Téléphone</th>
                        <th className="p-4">Niveau</th>
                        <th className="p-4 text-right">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                      {candidatsAcceptes.map((cand) => (
                        <tr key={cand.id_inscription} className="transition hover:bg-white dark:hover:bg-zinc-900/60">
                          <td className="p-4 font-bold text-zinc-800 dark:text-zinc-200">{cand.prenom} {cand.nom}</td>
                          <td className="p-4 text-zinc-500">{cand.email}</td>
                          <td className="p-4 text-zinc-500">{cand.telephone || 'N/R'}</td>
                          <td className="p-4 text-zinc-500">{cand.niveau_etude || 'N/R'}</td>
                          <td className="p-4 text-right">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle size={13} /> Accepté
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}