import { useEffect, useState, useRef } from 'react';
import { 
  CheckCircle, Send, XCircle, RefreshCw, ChevronLeft, ChevronRight, 
  UserRound, Mail, Phone, GraduationCap, BriefcaseBusiness, UserCheck, Sparkles,
  Search, Filter, Check, MoreHorizontal, ArrowRight, User
} from 'lucide-react';
import API from '../../services/api';

export default function Candidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedFormationId, setSelectedFormationId] = useState('');
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);

  // Filtres de recherche tableau
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('TOUT');

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
      `• Les e-mails avec les badges QR Code seront envoyés aux candidats pré-sélectionnés.\n\n` +
      `La validation sera annulée si les e-mails ne peuvent pas être envoyés.`;

    if (!window.confirm(confirmMsg)) return;
    if (!navigator.onLine) {
      alert('Validation impossible sans connexion Internet : aucun compte ne sera créé et aucun candidat ne sera accepté.');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post(`/responsable/formations/${id_formation}/valider-promotion`, {
        frontend_url: window.location.origin
      });
      alert(res.data.message || "Validation de la promotion effectuée avec succès !");
      await fetchCandidatures();
    } catch (err) {
      alert(err.response?.data?.message || (
        navigator.onLine
          ? "Erreur lors de la validation finale. Aucune candidature n'a été validée."
          : 'Connexion Internet perdue : la validation a échoué et aucun e-mail de configuration n’a été envoyé.'
      ));
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

  // Filtrage du tableau de résultats
  const candidatsFiltres = tousLesCandidats.filter((c) => {
    const matchSearch = `${c.prenom} ${c.nom} ${c.email} ${c.niveau_etude}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'TOUT' || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

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
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 font-sans text-slate-800 dark:text-zinc-100 transition-colors duration-300 antialiased">
      
      {/* Top Banner / Card d'En-tête Style Référence */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                #PROMO-{selectedGroup?.id_formation || '001'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> EN COURS
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {selectedGroup?.titre || 'Gestion des Candidatures'}
              </h1>
            </div>

            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
              Examens des candidatures, sélection des apprenants et validation finale.
            </p>
          </div>

          {/* Badges de Statut / Compteurs */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-zinc-800/80 lg:border-t-0 lg:pt-0">
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/50 min-w-[100px]">
              <span className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase">Total</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{tousLesCandidats.length}</span>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/50 min-w-[100px]">
              <span className="block text-xs font-bold text-orange-600 dark:text-orange-400 uppercase">Retenus</span>
              <span className="text-lg font-black text-orange-600 dark:text-orange-400">{nbPreselectionnes}</span>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/50 min-w-[100px]">
              <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Acceptés</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{nbAcceptes}</span>
            </div>
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/50 min-w-[100px]">
              <span className="block text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase">Restants</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">{placesRestantes} / {selectedGroup?.capacite_max || 0}</span>
            </div>

            <button 
              onClick={fetchCandidatures} 
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              title="Actualiser"
            >
              <RefreshCw size={16} className={loading ? "animate-spin text-orange-500" : ""} />
            </button>
          </div>

        </div>
      </div>

      {/* Barre d'actions & Sélection de Formation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-80">
          <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase mb-1">
            Formation sélectionnée
          </label>
          <select 
            value={selectedFormationId} 
            onChange={(e) => selectFormation(e.target.value)} 
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-orange-500"
          >
            {formationsDisponibles.map((group) => (
              <option key={group.id_formation} value={group.id_formation}>{group.titre}</option>
            ))}
          </select>
        </div>

        {/* Action Valider Promotion Globale */}
        {selectedGroup && (
          <button
            onClick={() => handleValiderPromotion(selectedGroup.id_formation, selectedGroup.titre, nbPreselectionnes, selectedGroup.capacite_max - nbAcceptes)}
            disabled={nbPreselectionnes === 0 || nbPreselectionnes > selectedGroup.capacite_max - nbAcceptes}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed self-end"
          >
            <Send size={15} /> Valider la promotion ({nbPreselectionnes})
          </button>
        )}
      </div>

      {/* Focus Dossier / Mode Examen Carrousel */}
      {candidatsAExaminer.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mb-3 flex items-center justify-between text-xs font-bold">
            <span className="text-orange-600 dark:text-orange-400 uppercase">
              Examen individuel ({currentCandidateIndex + 1} / {candidatsAExaminer.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentCandidateIndex((i) => Math.max(0, i - 1))}
                disabled={currentCandidateIndex === 0}
                className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentCandidateIndex((i) => Math.min(candidatsAExaminer.length - 1, i + 1))}
                disabled={currentCandidateIndex === candidatsAExaminer.length - 1}
                className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {currentCandidate && (
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-black text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                  {currentCandidate.prenom?.[0]}{currentCandidate.nom?.[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {currentCandidate.prenom} {currentCandidate.nom}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {currentCandidate.email} • {currentCandidate.telephone || 'Sans tél'}
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-zinc-300 max-w-md line-clamp-2">
                <strong>Motivation :</strong> {currentCandidate.motivation || 'Aucune renseignée.'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDecision(currentCandidate, 'REFUSEE')}
                  disabled={processingId === currentCandidate.id_inscription}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Refuser
                </button>
                <button
                  onClick={() => handleDecision(currentCandidate, 'PRESELECTIONNEE')}
                  disabled={processingId === currentCandidate.id_inscription || placesRestantes === 0}
                  className="rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-orange-600 disabled:opacity-40"
                >
                  Pré-sélectionner
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION TABLEAU DES CANDIDATS (STYLE IMAGE DE RÉFÉRENCE) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        
        {/* Header Tableau & Filtres Horizontaux */}
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Candidats ({candidatsFiltres.length})
            </h2>

            {/* Champ de Recherche */}
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un candidat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Filtres Pilules (Qualification, Statut, etc.) */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button 
              onClick={() => setFilterStatut('TOUT')}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                filterStatut === 'TOUT' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              Tous
            </button>
            <button 
              onClick={() => setFilterStatut('EN_ATTENTE')}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                filterStatut === 'EN_ATTENTE' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              En attente
            </button>
            <button 
              onClick={() => setFilterStatut('PRESELECTIONNEE')}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                filterStatut === 'PRESELECTIONNEE' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              Présélectionnés
            </button>
            <button 
              onClick={() => setFilterStatut('ACCEPTEE')}
              className={`rounded-lg px-3 py-1 font-semibold transition ${
                filterStatut === 'ACCEPTEE' 
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              Acceptés
            </button>
          </div>
        </div>

        {/* Structure du Tableau */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Chargement du tableau...</div>
        ) : candidatsFiltres.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">Aucun candidat trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase dark:border-zinc-800 dark:bg-zinc-800/40">
                <tr>
                  <th className="p-3.5">Candidat</th>
                  <th className="p-3.5">Formation / Filière</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {candidatsFiltres.map((cand) => (
                  <tr key={cand.id_inscription} className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition">
                    
                    {/* Colonne Candidat */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-zinc-700 text-[10px] font-bold text-slate-700 dark:text-zinc-200">
                          {cand.prenom?.[0]}{cand.nom?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{cand.prenom} {cand.nom}</p>
                          <p className="text-[10px] text-slate-400">{cand.niveau_etude || 'Niveau N/R'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Colonne Formation / Informations */}
                    <td className="p-3.5">
                      <p className="font-medium text-slate-700 dark:text-zinc-300 truncate max-w-[180px]">{cand.formation_titre}</p>
                      <p className="text-[10px] text-slate-400">{cand.filiere || 'Général'}</p>
                    </td>

                    {/* Colonne Contact */}
                    <td className="p-3.5 text-slate-600 dark:text-zinc-400">
                      <p>{cand.email}</p>
                      <p className="text-[10px] text-slate-400">{cand.telephone || 'Non renseigné'}</p>
                    </td>

                    {/* Colonne Statut Badges */}
                    <td className="p-3.5">
                      {cand.statut === 'ACCEPTEE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle size={11} /> ACCEPTÉ
                        </span>
                      ) : cand.statut === 'PRESELECTIONNEE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20">
                          PRÉSÉLECTIONNÉ
                        </span>
                      ) : cand.statut === 'REFUSEE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          REFUSÉ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                          EN ATTENTE
                        </span>
                      )}
                    </td>

                    {/* Colonne Actions */}
                    <td className="p-3.5 text-right">
                      {cand.statut !== 'ACCEPTEE' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDecision(cand, 'REFUSEE')}
                            disabled={processingId === cand.id_inscription}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Refuser
                          </button>
                          <button
                            onClick={() => handleDecision(cand, 'PRESELECTIONNEE')}
                            disabled={processingId === cand.id_inscription || placesRestantes === 0}
                            className="rounded-lg bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-orange-600 disabled:opacity-40"
                          >
                            Retenir
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">Validé</span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}