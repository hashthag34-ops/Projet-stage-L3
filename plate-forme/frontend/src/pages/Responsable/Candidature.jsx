// frontend/src/pages/Responsable/Candidature.jsx
import { useEffect, useState } from 'react';
import { CheckCircle, Send, XCircle, RefreshCw, ChevronLeft, ChevronRight, UserRound, Mail, Phone, GraduationCap, BriefcaseBusiness } from 'lucide-react';
import API from '../../services/api';

export default function Candidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedFormationId, setSelectedFormationId] = useState('');
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);

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

  // Valider toute la promotion (création des comptes et envoi des mails)
  const handleDecision = async (candidature, decision) => {
    setProcessingId(candidature.id_inscription);
    try {
      await API.patch(`/responsable/candidatures/${candidature.id_inscription}/preselection`, {
        statut: decision
      });
      await fetchCandidatures();
      setCurrentCandidateIndex((index) => Math.min(index, Math.max(0, selectedGroup?.liste.length - 1 || 0)));
    } catch (err) {
      alert(err.response?.data?.message || "Erreur lors du traitement de la candidature.");
    } finally {
      setProcessingId(null);
    }
  };

  // 2. Valider toute la promotion (Batch creation + mails)
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

  // Groupement des candidatures par formation
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
  const candidatsDeLaFormation = selectedGroup?.liste || [];
  const currentCandidate = candidatsDeLaFormation[currentCandidateIndex];
  const nbPreselectionnes = selectedGroup?.liste.filter((c) => c.statut === 'PRESELECTIONNEE').length || 0;
  const nbAcceptes = selectedGroup?.liste.filter((c) => c.statut === 'ACCEPTEE').length || 0;
  const placesRestantes = Math.max(0, (selectedGroup?.capacite_max || 0) - nbAcceptes - nbPreselectionnes);

  const selectFormation = (value) => {
    setSelectedFormationId(value);
    setCurrentCandidateIndex(0);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 bg-white px-4 py-8 text-black transition-colors duration-300 dark:bg-black dark:text-white sm:px-6">
      <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-6 dark:border-white/10 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Espace responsable</p>
          <h1 className="text-3xl font-black tracking-tight">Examen des candidatures</h1>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Étudiez chaque profil, constituez votre promotion et transmettez-la en un clic.</p>
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

          <div className="flex items-center justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">2. File des candidats</p><p className="mt-1 text-sm text-black/50 dark:text-white/50">Profil {currentCandidateIndex + 1} sur {candidatsDeLaFormation.length}</p></div>
            <div className="flex gap-2"><button onClick={() => setCurrentCandidateIndex((i) => Math.max(0, i - 1))} disabled={currentCandidateIndex === 0} className="rounded-xl border border-black/15 p-2.5 transition hover:border-orange-500 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/20"><ChevronLeft size={19} /></button><button onClick={() => setCurrentCandidateIndex((i) => Math.min(candidatsDeLaFormation.length - 1, i + 1))} disabled={currentCandidateIndex === candidatsDeLaFormation.length - 1} className="rounded-xl border border-black/15 p-2.5 transition hover:border-orange-500 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/20"><ChevronRight size={19} /></button></div>
          </div>

          {currentCandidate && <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_16px_45px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_16px_45px_rgba(0,0,0,0.35)]">
            <div className="border-b border-black/10 bg-black/[0.03] p-6 dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-black">{currentCandidate.prenom?.[0]}{currentCandidate.nom?.[0]}</div><div><h2 className="text-2xl font-black">{currentCandidate.prenom} {currentCandidate.nom}</h2><p className="mt-1 text-sm text-black/50 dark:text-white/50">Candidature reçue le {new Date(currentCandidate.date_inscription).toLocaleDateString('fr-FR')}</p></div></div><span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${currentCandidate.statut === 'PRESELECTIONNEE' ? 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400' : currentCandidate.statut === 'ACCEPTEE' ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black' : 'border-black/15 text-black/55 dark:border-white/20 dark:text-white/55'}`}>{currentCandidate.statut}</span></div>
            </div>
            <div className="grid gap-8 p-6 sm:grid-cols-[0.8fr_1.2fr] sm:p-8">
              <div className="space-y-4"><h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Profil candidat</h3><div className="space-y-3 text-sm text-black/65 dark:text-white/65"><p className="flex gap-2"><Mail size={16} className="shrink-0 text-orange-500" />{currentCandidate.email}</p><p className="flex gap-2"><Phone size={16} className="shrink-0 text-orange-500" />{currentCandidate.telephone || 'Téléphone non renseigné'}</p><p className="flex gap-2"><UserRound size={16} className="shrink-0 text-orange-500" />{currentCandidate.age ? `${currentCandidate.age} ans` : 'Âge non renseigné'}{currentCandidate.genre ? ` · ${currentCandidate.genre}` : ''}</p><p className="flex gap-2"><GraduationCap size={16} className="shrink-0 text-orange-500" />{currentCandidate.niveau_etude || 'Niveau d’étude non renseigné'}{currentCandidate.filiere ? ` · ${currentCandidate.filiere}` : ''}</p><p className="flex gap-2"><BriefcaseBusiness size={16} className="shrink-0 text-orange-500" />{currentCandidate.situation_professionnelle || 'Situation non renseignée'}</p></div></div>
              <div className="space-y-5"><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Motivation</h3><p className="rounded-xl border border-orange-500/20 bg-orange-500/[0.06] p-4 text-sm leading-6">{currentCandidate.motivation || 'Aucune motivation renseignée.'}</p></div><div><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">Objectifs et projet</h3><p className="text-sm leading-6 text-black/65 dark:text-white/65">{currentCandidate.objectif || 'Objectif non renseigné.'}</p>{currentCandidate.projet_apres_formation && <p className="mt-2 text-sm leading-6 text-black/65 dark:text-white/65"><strong>Après la formation : </strong>{currentCandidate.projet_apres_formation}</p>}</div></div>
            </div>
            {currentCandidate.statut !== 'ACCEPTEE' && <div className="flex flex-col-reverse gap-3 border-t border-black/10 p-6 dark:border-white/10 sm:flex-row sm:justify-end sm:p-8"><button onClick={() => handleDecision(currentCandidate, 'REFUSEE')} disabled={processingId === currentCandidate.id_inscription} className="flex items-center justify-center gap-2 rounded-xl border border-black/15 px-5 py-2.5 text-sm font-bold transition hover:border-orange-500 hover:text-orange-600 dark:border-white/20 dark:hover:text-orange-400"><XCircle size={17} /> Annuler la candidature</button><button onClick={() => handleDecision(currentCandidate, 'PRESELECTIONNEE')} disabled={processingId === currentCandidate.id_inscription || placesRestantes === 0} className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle size={17} /> Accepter le profil</button></div>}
          </div>}

          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 sm:flex-row"><div><p className="text-sm font-bold">Promotion prête à être transmise ?</p><p className="mt-1 text-xs text-black/60 dark:text-white/60">{nbPreselectionnes} candidat(s) seront traité(s) et recevront leur accès.</p></div><button onClick={() => handleValiderPromotion(selectedGroup.id_formation, selectedGroup.titre, nbPreselectionnes, selectedGroup.capacite_max - nbAcceptes)} disabled={nbPreselectionnes === 0 || nbPreselectionnes > selectedGroup.capacite_max - nbAcceptes} className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"><Send size={16} /> Valider et envoyer</button></div>
        </>
      )}
    </div>
  );
}