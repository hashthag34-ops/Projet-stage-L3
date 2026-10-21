import { useEffect, useState, useRef } from 'react';
import { 
  CheckCircle, Send, RefreshCw, ChevronLeft, ChevronRight, 
  Search, Eye, Users, UserX, Clock, Calendar, MapPin, 
  Check, X, ChevronDown, Filter
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
  const [filterNiveau, setFilterNiveau] = useState('TOUT');

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
  const nbRefuses = tousLesCandidats.filter((c) => c.statut === 'REFUSEE').length;
  const nbAcceptes = candidatsAcceptes.length;
  const placesRestantes = Math.max(0, (selectedGroup?.capacite_max || 0) - nbAcceptes - nbPreselectionnes);

  // Liste unique des niveaux d'études pour le filtre
  const niveauxEtudeUniques = Array.from(new Set(tousLesCandidats.map(c => c.niveau_etude).filter(Boolean)));

  // Filtrage du tableau de résultats
  const candidatsFiltres = tousLesCandidats.filter((c) => {
    const matchSearch = `${c.prenom} ${c.nom} ${c.email} ${c.niveau_etude} ${c.filiere}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'TOUT' || c.statut === filterStatut;
    const matchNiveau = filterNiveau === 'TOUT' || c.niveau_etude === filterNiveau;
    return matchSearch && matchStatut && matchNiveau;
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
      
      {/* CARD PRINCIPALE D'EN-TÊTE (Style Fiche Offre ATS Référence) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        
        {/* Ligne Référence & Boutons d'Action Globaux */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-5 dark:border-zinc-800">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                #OFFRE-{selectedGroup?.id_formation || '001'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> EN COURS
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-blue-600 dark:text-blue-400">
                EN LIGNE
              </span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                {selectedGroup?.titre || 'Gestion des Candidatures'}
              </h1>
            </div>
          </div>

          {/* Sélection de Formation & Bouton Action Valider */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select 
              value={selectedFormationId} 
              onChange={(e) => selectFormation(e.target.value)} 
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-blue-600"
            >
              {formationsDisponibles.map((group) => (
                <option key={group.id_formation} value={group.id_formation}>{group.titre}</option>
              ))}
            </select>

            {selectedGroup && (
              <button
                onClick={() => handleValiderPromotion(selectedGroup.id_formation, selectedGroup.titre, nbPreselectionnes, selectedGroup.capacite_max - nbAcceptes)}
                disabled={nbPreselectionnes === 0 || nbPreselectionnes > selectedGroup.capacite_max - nbAcceptes}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={14} /> Valider Promotion ({nbPreselectionnes})
              </button>
            )}

            <button 
              onClick={fetchCandidatures} 
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition"
              title="Actualiser"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>
          </div>
        </div>

        {/* MÉTROLOGIE & COMPTEURS (Inspiré de l'Image de Référence) */}
        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500 dark:text-zinc-400">
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Eye size={15} className="text-slate-400" />
              <span><strong className="text-slate-900 dark:text-white">{tousLesCandidats.length}</strong> vues / postulants</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={15} className="text-blue-600 dark:text-blue-400" />
              <span><strong className="text-slate-900 dark:text-white">{nbPreselectionnes}</strong> retenus</span>
            </div>
            <div className="flex items-center gap-2">
              <UserX size={15} className="text-rose-500" />
              <span><strong className="text-slate-900 dark:text-white">{nbRefuses}</strong> refusés</span>
            </div>
          </div>

          <div className="flex items-center gap-4 border-l border-slate-100 pl-4 dark:border-zinc-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Capacité disponible</span>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                {placesRestantes} / {selectedGroup?.capacite_max || 0} places
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* CARROUSEL / MODE EXAMEN INDIVIDUEL TACTILE */}
      {candidatsAExaminer.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="mb-3 flex items-center justify-between text-xs font-bold">
            <span className="text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
              <Clock size={14} /> Examen individuel du dossier ({currentCandidateIndex + 1} sur {candidatsAExaminer.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentCandidateIndex((i) => Math.max(0, i - 1))}
                disabled={currentCandidateIndex === 0}
                className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentCandidateIndex((i) => Math.min(candidatsAExaminer.length - 1, i + 1))}
                disabled={currentCandidateIndex === candidatsAExaminer.length - 1}
                className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
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
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
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
                <strong>Motivation :</strong> {currentCandidate.motivation || 'Aucune lettre renseignée.'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDecision(currentCandidate, 'REFUSEE')}
                  disabled={processingId === currentCandidate.id_inscription}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                >
                  Refuser
                </button>
                <button
                  onClick={() => handleDecision(currentCandidate, 'PRESELECTIONNEE')}
                  disabled={processingId === currentCandidate.id_inscription || placesRestantes === 0}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-40"
                >
                  Pré-sélectionner
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABLEAU DES CANDIDATS DE STYLE "DATA GRID ATS" */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        
        {/* Titre & Barre de Recherche et Filtres Déroulants */}
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Candidats ({candidatsFiltres.length})
              </h2>
              <p className="text-xs text-slate-400">
                Affinez la recherche en renseignant les filtres correspondants à vos attentes.
              </p>
            </div>

            {/* Barre de recherche */}
            <div className="relative w-full md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un candidat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Grille de Dropdowns de Filtres (Inspirée de la Maquette) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            
            {/* Filtre Statut */}
            <div>
              <select 
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 outline-none"
              >
                <option value="TOUT">Tous les statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="PRESELECTIONNEE">Présélectionné</option>
                <option value="ACCEPTEE">Accepté</option>
                <option value="REFUSEE">Refusé</option>
              </select>
            </div>

            {/* Filtre Niveau d'étude */}
            <div>
              <select 
                value={filterNiveau}
                onChange={(e) => setFilterNiveau(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 outline-none"
              >
                <option value="TOUT">Toutes qualifications</option>
                {niveauxEtudeUniques.map(niv => (
                  <option key={niv} value={niv}>{niv}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Corps du Tableau */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Chargement des données...</div>
        ) : candidatsFiltres.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Aucun candidat ne correspond aux filtres actuels.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold text-slate-400 dark:border-zinc-800 dark:bg-zinc-800/40">
                <tr>
                  <th className="p-3.5 pl-5">Candidat</th>
                  <th className="p-3.5">Filière / Spécialité</th>
                  <th className="p-3.5">Niveau</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {candidatsFiltres.map((cand) => (
                  <tr key={cand.id_inscription} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/30 transition">
                    
                    {/* Colonne Candidat */}
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                        />
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-700 dark:text-zinc-200">
                          {cand.prenom?.[0]}{cand.nom?.[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{cand.prenom} {cand.nom}</p>
                          <p className="text-[10px] text-slate-400">{cand.telephone || 'Sans téléphone'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Filière */}
                    <td className="p-3.5 font-medium text-slate-700 dark:text-zinc-300">
                      {cand.filiere || 'Général'}
                    </td>

                    {/* Niveau */}
                    <td className="p-3.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {cand.niveau_etude || 'N/R'}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="p-3.5 text-slate-500 dark:text-zinc-400 truncate max-w-[160px]">
                      {cand.email}
                    </td>

                    {/* Statut Style Maquette (Pill pastel) */}
                    <td className="p-3.5">
                      {cand.statut === 'ACCEPTEE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                          OFFRE ENVOYÉE
                        </span>
                      ) : cand.statut === 'PRESELECTIONNEE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/70 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                          PRÉSÉLECTIONNÉ
                        </span>
                      ) : cand.statut === 'REFUSEE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100/70 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                          REFUSÉ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                          AUCUN
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pr-5 text-right">
                      {cand.statut !== 'ACCEPTEE' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDecision(cand, 'REFUSEE')}
                            disabled={processingId === cand.id_inscription}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                          >
                            Refuser
                          </button>
                          <button
                            onClick={() => handleDecision(cand, 'PRESELECTIONNEE')}
                            disabled={processingId === cand.id_inscription || placesRestantes === 0}
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs disabled:opacity-40 transition"
                          >
                            Retenir
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Offre envoyée !
                        </span>
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