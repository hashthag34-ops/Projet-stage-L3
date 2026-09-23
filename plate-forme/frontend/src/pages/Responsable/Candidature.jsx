import { useEffect, useState, useRef } from 'react';
import { CheckCircle, Send, XCircle, RefreshCw, ChevronLeft, ChevronRight, UserRound, Mail, Phone, GraduationCap, BriefcaseBusiness, UserCheck } from 'lucide-react';
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

  // Action sur une candidature
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

  // Validation finale de la promotion
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

  // SÉPARATION DES CANDIDATS :
  // 1. Candidats à examiner (Non encore acceptés définitivement) -> sous forme de Badge Card
  const candidatsAExaminer = tousLesCandidats.filter((c) => c.statut !== 'ACCEPTEE');
  // 2. Candidats déjà acceptés -> affichés en Tableau
  const candidatsAcceptes = tousLesCandidats.filter((c) => c.statut === 'ACCEPTEE');

  const currentCandidate = candidatsAExaminer[currentCandidateIndex];

  const nbPreselectionnes = tousLesCandidats.filter((c) => c.statut === 'PRESELECTIONNEE').length;
  const nbAcceptes = candidatsAcceptes.length;
  const placesRestantes = Math.max(0, (selectedGroup?.capacite_max || 0) - nbAcceptes - nbPreselectionnes);

  const selectFormation = (value) => {
    setSelectedFormationId(value);
    setCurrentCandidateIndex(0);
  };

  // Gestion des gestes tactiles (Swipe sur Mobile)
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
    <div className="mx-auto max-w-5xl space-y-8 bg-white px-4 py-8 text-black transition-colors duration-300 dark:bg-black dark:text-white sm:px-6">
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-6 dark:border-white/10 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Espace responsable</p>
          <h1 className="text-3xl font-black tracking-tight">Examen des candidatures</h1>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Étudiez chaque profil en carte, constituez votre promotion et transmettez-la en un clic.</p>
        </div>
        <button onClick={fetchCandidatures} className="flex items-center gap-2 self-start rounded-xl border border-black/15 px-3 py-2 text-sm font-semibold transition hover:border-orange-500 hover:text-orange-600 dark:border-white/20 dark:hover:text-orange-400 sm:self-auto">
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-black/45 dark:text-white/45">Chargement des candidatures...</div>
      ) : !selectedGroup ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.03] p-12 text-center text-black/55 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/55">Aucune candidature enregistrée pour le moment.</div>
      ) : (
        <>
          {/* Sélection de formation & Métriques */}
          <div className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <label htmlFor="formation-select" className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">1. Choisir la formation à traiter</label>
              <select id="formation-select" value={selectedFormationId} onChange={(e) => selectFormation(e.target.value)} className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-orange-500 dark:border-white/20 dark:bg-black sm:min-w-[320px]">
                {formationsDisponibles.map((group) => <option key={group.id_formation} value={group.id_formation}>{group.titre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:min-w-[330px]">
              <div className="rounded-xl bg-white p-3 dark:bg-black"><strong className="block text-lg">{selectedGroup.capacite_max}</strong><span className="text-black/50 dark:text-white/50">places max</span></div>
              <div className="rounded-xl bg-orange-500/10 p-3 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"><strong className="block text-lg">{nbPreselectionnes}</strong><span>retenus</span></div>
              <div className="rounded-xl bg-black p-3 text-white dark:bg-white dark:text-black"><strong className="block text-lg">{placesRestantes}</strong><span>restantes</span></div>
            </div>
          </div>

          {/* 2. SECTION BADGE CARDS (Candidats en attente / pré-sélectionnés) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">2. File d'examen des candidats</p>
                <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                  {candidatsAExaminer.length > 0 
                    ? `Profil ${currentCandidateIndex + 1} sur ${candidatsAExaminer.length} à traiter`
                    : 'Aucun candidat en attente d’examen.'}
                </p>
              </div>
            </div>

            {candidatsAExaminer.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-8 text-center text-sm text-black/50 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/50">
                Tous les candidats de cette formation ont été acceptés ou traités !
              </div>
            ) : (
              /* CARROUSEL AVEC BOUTONS DE PART ET D'AUTRE DE LA CARD */
              <div className="relative flex items-center gap-2 sm:gap-4">
                {/* Bouton Gauche */}
                <button
                  onClick={() => setCurrentCandidateIndex((i) => Math.max(0, i - 1))}
                  disabled={currentCandidateIndex === 0}
                  aria-label="Candidat précédent"
                  className="z-10 shrink-0 rounded-full border border-black/15 bg-white/80 p-2.5 text-black backdrop-blur-md transition hover:border-orange-500 hover:bg-orange-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-20 dark:border-white/20 dark:bg-black/80 dark:text-white dark:hover:bg-orange-500 dark:hover:text-black"
                >
                  <ChevronLeft size={22} />
                </button>

                {/* Badge Card Principale avec support du Swipe */}
                {currentCandidate && (
                  <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.08)] transition-all dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_16px_45px_rgba(0,0,0,0.35)]"
                  >
                    {/* Header de la Card */}
                    <div className="border-b border-black/10 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-black">
                            {currentCandidate.prenom?.[0]}{currentCandidate.nom?.[0]}
                          </div>
                          <div>
                            <h2 className="text-xl font-black sm:text-2xl">{currentCandidate.prenom} {currentCandidate.nom}</h2>
                            <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                              Reçue le {new Date(currentCandidate.date_inscription).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
                          currentCandidate.statut === 'PRESELECTIONNEE' 
                            ? 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400' 
                            : 'border-black/15 text-black/55 dark:border-white/20 dark:text-white/55'
                        }`}>
                          {currentCandidate.statut === 'PRESELECTIONNEE' ? 'PRÉSÉLECTIONNÉ' : currentCandidate.statut}
                        </span>
                      </div>
                    </div>

                    {/* Corps de la Card */}
                    <div className="grid gap-6 p-5 sm:grid-cols-[0.8fr_1.2fr] sm:p-6">
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Profil candidat</h3>
                        <div className="space-y-2.5 text-xs text-black/75 dark:text-white/75 sm:text-sm">
                          <p className="flex items-center gap-2 truncate"><Mail size={16} className="shrink-0 text-orange-500" />{currentCandidate.email}</p>
                          <p className="flex items-center gap-2"><Phone size={16} className="shrink-0 text-orange-500" />{currentCandidate.telephone || 'Non renseigné'}</p>
                          <p className="flex items-center gap-2"><UserRound size={16} className="shrink-0 text-orange-500" />{currentCandidate.age ? `${currentCandidate.age} ans` : 'Âge N/R'}{currentCandidate.genre ? ` · ${currentCandidate.genre}` : ''}</p>
                          <p className="flex items-center gap-2"><GraduationCap size={16} className="shrink-0 text-orange-500" />{currentCandidate.niveau_etude || 'Niveau N/R'}{currentCandidate.filiere ? ` · ${currentCandidate.filiere}` : ''}</p>
                          <p className="flex items-center gap-2"><BriefcaseBusiness size={16} className="shrink-0 text-orange-500" />{currentCandidate.situation_professionnelle || 'Situation N/R'}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Motivation</h3>
                          <p className="max-h-32 overflow-y-auto rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-3 text-xs leading-5 sm:text-sm">
                            {currentCandidate.motivation || 'Aucune motivation renseignée.'}
                          </p>
                        </div>
                        <div>
                          <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">Objectifs et projet</h3>
                          <p className="text-xs leading-5 text-black/70 dark:text-white/70 sm:text-sm">{currentCandidate.objectif || 'Objectif non renseigné.'}</p>
                          {currentCandidate.projet_apres_formation && (
                            <p className="mt-1 text-xs leading-5 text-black/70 dark:text-white/70 sm:text-sm">
                              <strong>Après formation : </strong>{currentCandidate.projet_apres_formation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions sur la Card */}
                    <div className="flex flex-col-reverse gap-3 border-t border-black/10 p-4 dark:border-white/10 sm:flex-row sm:justify-end sm:p-5">
                      <button
                        onClick={() => handleDecision(currentCandidate, 'REFUSEE')}
                        disabled={processingId === currentCandidate.id_inscription}
                        className="flex items-center justify-center gap-2 rounded-xl border border-black/15 px-4 py-2 text-xs font-bold transition hover:border-orange-500 hover:text-orange-600 dark:border-white/20 dark:hover:text-orange-400 sm:text-sm"
                      >
                        <XCircle size={16} /> Annuler la candidature
                      </button>
                      <button
                        onClick={() => handleDecision(currentCandidate, 'PRESELECTIONNEE')}
                        disabled={processingId === currentCandidate.id_inscription || placesRestantes === 0}
                        className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
                      >
                        <CheckCircle size={16} /> Accepter le profil
                      </button>
                    </div>
                  </div>
                )}

                {/* Bouton Droit */}
                <button
                  onClick={() => setCurrentCandidateIndex((i) => Math.min(candidatsAExaminer.length - 1, i + 1))}
                  disabled={currentCandidateIndex === candidatsAExaminer.length - 1}
                  aria-label="Candidat suivant"
                  className="z-10 shrink-0 rounded-full border border-black/15 bg-white/80 p-2.5 text-black backdrop-blur-md transition hover:border-orange-500 hover:bg-orange-500 hover:text-black disabled:cursor-not-allowed disabled:opacity-20 dark:border-white/20 dark:bg-black/80 dark:text-white dark:hover:bg-orange-500 dark:hover:text-black"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            )}
          </div>

          {/* Validation Globale de la Promotion */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 sm:flex-row">
            <div>
              <p className="text-sm font-bold">Promotion prête à être transmise ?</p>
              <p className="mt-1 text-xs text-black/60 dark:text-white/60">{nbPreselectionnes} candidat(s) pré-sélectionné(s) recevront leur accès.</p>
            </div>
            <button
              onClick={() => handleValiderPromotion(selectedGroup.id_formation, selectedGroup.titre, nbPreselectionnes, selectedGroup.capacite_max - nbAcceptes)}
              disabled={nbPreselectionnes === 0 || nbPreselectionnes > selectedGroup.capacite_max - nbAcceptes}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={16} /> Valider et envoyer
            </button>
          </div>

          {/* 3. SECTION TABLEAU (Candidats déjà Acceptés) */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                  <UserCheck size={16} className="text-orange-500" />
                  3. Candidats déjà acceptés ({candidatsAcceptes.length})
                </p>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  Liste des candidats définitivement validés pour cette formation.
                </p>
              </div>
            </div>

            {candidatsAcceptes.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-6 text-center text-xs text-black/40 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/40">
                Aucun candidat n'a encore été définitivement accepté.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-black/10 bg-black/[0.03] text-black/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
                    <tr>
                      <th className="p-3 font-bold">Nom & Prénom</th>
                      <th className="p-3 font-bold">Email</th>
                      <th className="p-3 font-bold">Téléphone</th>
                      <th className="p-3 font-bold">Niveau d'étude</th>
                      <th className="p-3 font-bold text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {candidatsAcceptes.map((cand) => (
                      <tr key={cand.id_inscription} className="transition hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                        <td className="p-3 font-bold">{cand.prenom} {cand.nom}</td>
                        <td className="p-3 text-black/70 dark:text-white/70">{cand.email}</td>
                        <td className="p-3 text-black/70 dark:text-white/70">{cand.telephone || 'N/R'}</td>
                        <td className="p-3 text-black/70 dark:text-white/70">{cand.niveau_etude || 'N/R'}</td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle size={12} /> Accepté
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}