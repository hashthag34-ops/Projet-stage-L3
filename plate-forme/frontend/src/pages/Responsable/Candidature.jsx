import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, CheckCircle2, ChevronRight, Eye, FileSpreadsheet, Filter, GraduationCap,
  Mail, Printer, Search, Send, Users, UserRound, X, AlertCircle, Sparkles, XCircle, Clock
} from 'lucide-react';
import API from '../../services/api';
import { getRealtimeSocket } from '../../services/realtime';

const inputClass = 'rounded-xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-orange-500 dark:focus:bg-zinc-900';
const cardClass = 'rounded-2xl border border-zinc-200/80 bg-white shadow-xs transition-all dark:border-zinc-800/80 dark:bg-zinc-900/70';
const emptyCandidates = [];

const formatDate = (value) => {
  if (!value) return 'Non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Non renseignée' : date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const candidateDetails = [
  ['Nom & Prénom', (candidate) => `${candidate.prenom || ''} ${candidate.nom || ''}`.trim()],
  ['Adresse e-mail', (candidate) => candidate.email],
  ['Téléphone', (candidate) => candidate.telephone],
  ['Âge', (candidate) => candidate.age ? `${candidate.age} ans` : null],
  ['Genre', (candidate) => candidate.genre],
  ['Situation professionnelle', (candidate) => candidate.situation_professionnelle],
  ['Établissement', (candidate) => candidate.etablissement],
  ['Niveau d’étude', (candidate) => candidate.niveau_etude],
  ['Filière', (candidate) => candidate.filiere],
  ['Date de candidature', (candidate) => formatDate(candidate.date_inscription)],
  ['Statut de candidature', (candidate) => getCandidateStatusLabel(candidate.statut)],
  ['Conditions acceptées', (candidate) => candidate.conditions_acceptees == null ? null : candidate.conditions_acceptees ? 'Oui' : 'Non'],
  ['Motivation', (candidate) => candidate.motivation],
  ['Objectif', (candidate) => candidate.objectif],
  ['Projet après la formation', (candidate) => candidate.projet_apres_formation],
  ['Source d’information', (candidate) => candidate.source_information],
  ['Formation similaire précédente', (candidate) => candidate.a_deja_suivi_formation == null ? null : candidate.a_deja_suivi_formation ? 'Oui' : 'Non'],
  ['Détails formation précédente', (candidate) => candidate.formation_precedente],
  ['Remarques ou suggestions', (candidate) => candidate.retour_suggestion],
];

const getCandidateStatusLabel = (status) => ({
  EN_ATTENTE: 'En attente',
  PRESELECTIONNEE: 'Présélectionnée',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
}[status] || status || 'Sans statut');

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

function CandidateDetailsModal({ candidate, onClose }) {
  if (!candidate) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-details-title"
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-6 py-5 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/95">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <UserRound size={22} strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Dossier candidat</p>
              <h2 id="candidate-details-title" className="text-lg font-bold text-zinc-900 dark:text-white">
                {candidate.prenom} {candidate.nom}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            aria-label="Fermer" 
            className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </header>

        <div className="p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {candidateDetails.map(([label, getValue]) => {
              const value = getValue(candidate);
              if (value == null || value === '') return null;
              const isLongText = typeof value === 'string' && value.length > 60;
              
              return (
                <div 
                  key={label} 
                  className={`rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800/50 dark:bg-zinc-800/30 ${isLongText ? 'sm:col-span-2' : ''}`}
                >
                  <dt className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {value}
                  </dd>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Candidatures() {
  const [formations, setFormations] = useState([]);
  const [candidatures, setCandidatures] = useState([]);
  const [selectedFormationId, setSelectedFormationId] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(() => new Set());
  const [candidateDetailsToShow, setCandidateDetailsToShow] = useState(null);
  const [formationSearch, setFormationSearch] = useState('');
  const [formationStatus, setFormationStatus] = useState('TOUT');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [filters, setFilters] = useState({
    etablissement: 'TOUT',
    niveau_etude: 'TOUT',
    situation_professionnelle: 'TOUT',
    genre: 'TOUT',
    statut: 'TOUT',
  });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [formationsResponse, candidaturesResponse] = await Promise.all([
        API.get('/responsable/formations'),
        API.get('/responsable/candidatures'),
      ]);
      const nextFormations = Array.isArray(formationsResponse.data) ? formationsResponse.data : [];
      const nextCandidatures = Array.isArray(candidaturesResponse.data) ? candidaturesResponse.data : [];
      setError('');
      setFormations(nextFormations);
      setCandidatures(nextCandidatures);
      setSelectedFormationId((currentId) => (
        currentId && nextFormations.some((formation) => String(formation.id_formation) === currentId)
          ? currentId
          : ''
      ));
    } catch (requestError) {
      console.error('Erreur lors du chargement des candidatures :', requestError);
      setError(requestError.response?.data?.message || 'Impossible de charger les formations et les candidatures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const socket = getRealtimeSocket();
    socket.on('candidatures:changed', fetchData);
    return () => socket.off('candidatures:changed', fetchData);
  }, []);

  const candidaturesParFormation = useMemo(() => {
    return candidatures.reduce((groups, candidature) => {
      const id = String(candidature.id_formation);
      if (!groups[id]) groups[id] = [];
      groups[id].push(candidature);
      return groups;
    }, {});
  }, [candidatures]);

  const formationsFiltrees = useMemo(() => formations.filter((formation) => {
    const search = `${formation.titre || ''} ${formation.description || ''}`.toLocaleLowerCase();
    const matchesSearch = search.includes(formationSearch.toLocaleLowerCase());
    const matchesStatus = formationStatus === 'TOUT' || formation.statut === formationStatus;
    return matchesSearch && matchesStatus;
  }), [formations, formationSearch, formationStatus]);

  const selectedFormation = formations.find((formation) => String(formation.id_formation) === selectedFormationId);
  const formationCandidates = candidaturesParFormation[selectedFormationId] || emptyCandidates;

  const candidateFilterValues = useMemo(() => ({
    etablissement: [...new Set(formationCandidates.map((candidate) => candidate.etablissement).filter(Boolean))],
    niveau_etude: [...new Set(formationCandidates.map((candidate) => candidate.niveau_etude).filter(Boolean))],
    situation_professionnelle: [...new Set(formationCandidates.map((candidate) => candidate.situation_professionnelle).filter(Boolean))],
    genre: [...new Set(formationCandidates.map((candidate) => candidate.genre).filter(Boolean))],
    statut: [...new Set([
      'EN_ATTENTE',
      'PRESELECTIONNEE',
      'ACCEPTEE',
      'REFUSEE',
      'ANNULEE',
      ...formationCandidates.map((candidate) => candidate.statut).filter(Boolean),
    ])],
  }), [formationCandidates]);

  const filteredCandidates = useMemo(() => formationCandidates.filter((candidate) => {
    const search = [
      candidate.prenom, candidate.nom, candidate.email, candidate.telephone,
      candidate.etablissement, candidate.niveau_etude, candidate.filiere,
      candidate.situation_professionnelle,
    ].filter(Boolean).join(' ').toLocaleLowerCase();
    return search.includes(candidateSearch.toLocaleLowerCase())
      && Object.entries(filters).every(([key, value]) => value === 'TOUT' || candidate[key] === value);
  }), [formationCandidates, candidateSearch, filters]);

  const capacity = Number(selectedFormation?.capacite_max) || 0;
  const acceptedCandidates = useMemo(() => formationCandidates.filter((candidate) => candidate.statut === 'ACCEPTEE'), [formationCandidates]);
  const acceptedCount = acceptedCandidates.length;
  const refusedCount = formationCandidates.filter((candidate) => candidate.statut === 'REFUSEE').length;
  const cancelledCount = formationCandidates.filter((candidate) => candidate.statut === 'ANNULEE').length;
  const preselectedCount = formationCandidates.filter((candidate) => candidate.statut === 'PRESELECTIONNEE').length;
  const remainingPlaces = Math.max(0, capacity - acceptedCount - preselectedCount);
  const isCapacityReached = capacity > 0 && (remainingPlaces === 0 || acceptedCount >= capacity);
  const selectedCandidates = formationCandidates.filter((candidate) => selectedCandidateIds.has(String(candidate.id_inscription)));

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const toggleCandidate = (candidate) => {
    const id = String(candidate.id_inscription);
    const currentlySelected = Array.from(selectedCandidateIds).filter((selectedId) => (
      selectedId !== id && formationCandidates.some((item) =>
        String(item.id_inscription) === selectedId && item.statut !== 'PRESELECTIONNEE'
      )
    )).length;
    if (!selectedCandidateIds.has(id)
      && candidate.statut !== 'PRESELECTIONNEE'
      && remainingPlaces <= 0) {
      window.alert(`La capacité maximale est atteinte avec les ${acceptedCount + preselectedCount} places déjà acceptées ou préselectionnées.`);
      return;
    }
    if (!selectedCandidateIds.has(id)
      && candidate.statut !== 'PRESELECTIONNEE'
      && currentlySelected >= remainingPlaces) {
      window.alert(`Il reste seulement ${remainingPlaces} place(s).`);
      return;
    }
    setSelectedCandidateIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDecision = async (candidate, decision) => {
    setProcessingId(candidate.id_inscription);
    try {
      await API.patch(`/responsable/candidatures/${candidate.id_inscription}/preselection`, { statut: decision });
      setSelectedCandidateIds((current) => {
        const next = new Set(current);
        next.delete(String(candidate.id_inscription));
        return next;
      });
      await fetchData();
    } catch (requestError) {
      window.alert(requestError.response?.data?.message || 'Erreur lors du traitement de la candidature.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleValidatePromotion = async () => {
    if (!selectedFormation || selectedCandidates.length === 0) return;
    if (selectedCandidates.length > Math.max(0, capacity - acceptedCount)) {
      window.alert(`La sélection dépasse les places restantes (${Math.max(0, capacity - acceptedCount)}).`);
      return;
    }
    const confirmed = window.confirm(
      `Valider la promotion « ${selectedFormation.titre} » pour ${selectedCandidates.length} candidat(s) ?\n\n` +
      'Les comptes apprenants seront créés ou mis à jour et les e-mails de confirmation seront envoyés.'
    );
    if (!confirmed) return;
    if (!navigator.onLine) {
      window.alert('Validation impossible sans connexion Internet.');
      return;
    }

    setLoading(true);
    try {
      const response = await API.post(`/responsable/formations/${selectedFormation.id_formation}/valider-promotion`, {
        id_inscriptions: selectedCandidates.map((candidate) => Number(candidate.id_inscription)),
        frontend_url: window.location.origin,
      });
      window.alert(response.data.message || 'La promotion a été validée.');
      setSelectedCandidateIds(new Set());
      await fetchData();
    } catch (requestError) {
      window.alert(requestError.response?.data?.message || 'Erreur lors de la validation de la promotion.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAccepted = () => {
    if (acceptedCandidates.length === 0) {
      window.alert('Aucun candidat accepté à exporter.');
      return;
    }
    const headers = ['Nom', 'Prénom', 'Contact Email', 'Téléphone', 'Genre'];
    const escapeCsv = (value) => {
      const text = String(value ?? '');
      const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replace(/"/g, '""')}"`;
    };

    const rows = acceptedCandidates.map((c) => [
      c.nom || '',
      c.prenom || '',
      c.email || '',
      c.telephone || '',
      c.genre || 'Non renseigné'
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(';'))
      .join('\r\n');

    const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `candidats-acceptes-${selectedFormation.titre.replaceAll(' ', '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  };

  const handlePrintAccepted = () => {
    if (acceptedCandidates.length === 0) {
      window.alert('Aucun candidat accepté à imprimer.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert("Autorisez l'ouverture de la fenêtre d'impression pour continuer.");
      return;
    }

    const headers = ['Nom', 'Prénom', 'Contact Email', 'Téléphone', 'Genre'];
    const tableRows = acceptedCandidates.map((c) => (
      `<tr>
        <td>${escapeHtml(c.nom || '')}</td>
        <td>${escapeHtml(c.prenom || '')}</td>
        <td>${escapeHtml(c.email || '')}</td>
        <td>${escapeHtml(c.telephone || '')}</td>
        <td>${escapeHtml(c.genre || 'Non renseigné')}</td>
      </tr>`
    )).join('');

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Liste des candidats acceptés - ${escapeHtml(selectedFormation.titre)}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #09090b; margin: 32px; }
            header { border-bottom: 2px solid #f97316; padding-bottom: 16px; margin-bottom: 24px; }
            h1 { font-size: 22px; font-weight: 800; margin: 0; color: #09090b; }
            p { color: #71717a; font-size: 13px; margin: 6px 0 0; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 20px; }
            th, td { border: 1px solid #e4e4e7; padding: 12px; text-align: left; }
            th { background: #18181b; color: #ffffff; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
            tr:nth-child(even) { background: #fafafa; }
            @media print { body { margin: 15mm; } tr { break-inside: avoid; } }
          </style>
        </head>
        <body>
          <header>
            <h1>Liste des candidats acceptés</h1>
            <p>Formation : <strong>${escapeHtml(selectedFormation.titre)}</strong> — ${acceptedCandidates.length} candidat(s) accepté(s)</p>
          </header>
          <table>
            <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading && formations.length === 0 && candidatures.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center text-sm font-medium text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          Chargement des candidatures…
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 pb-32 font-sans text-zinc-900 dark:text-zinc-100 sm:px-8">
      {!selectedFormation ? (
        <>
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                <Sparkles size={13} strokeWidth={2} /> Espace Responsable
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                Gestion des candidatures
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Sélectionnez une formation pour consulter, filtrer et valider les dossiers des candidats.
              </p>
            </div>
          </header>

          <section className={`${cardClass} p-5 sm:p-6`}>
            <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
              <div className="relative">
                <Search size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={formationSearch}
                  onChange={(event) => setFormationSearch(event.target.value)}
                  placeholder="Rechercher une formation..."
                  className={`${inputClass} w-full pl-11`}
                />
              </div>
              <select 
                value={formationStatus} 
                onChange={(event) => setFormationStatus(event.target.value)} 
                className={inputClass}
              >
                <option value="TOUT">Tous les statuts</option>
                {[...new Set(formations.map((formation) => formation.statut).filter(Boolean))].map((status) => (
                  <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </div>
          </section>

          {error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-xs font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          {formationsFiltrees.length === 0 ? (
            <div className={`${cardClass} py-16 text-center text-sm text-zinc-500 dark:text-zinc-400`}>
              {formations.length === 0 ? 'Aucune formation enregistrée.' : 'Aucune formation ne correspond aux critères de recherche.'}
            </div>
          ) : (
            <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {formationsFiltrees.map((formation) => {
                const count = (candidaturesParFormation[String(formation.id_formation)] || []).length;
                return (
                  <button
                    key={formation.id_formation}
                    onClick={() => {
                      setSelectedFormationId(String(formation.id_formation));
                      setSelectedCandidateIds(new Set());
                    }}
                    className={`${cardClass} group flex flex-col justify-between p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-lg dark:hover:border-orange-500/40`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white dark:text-orange-400">
                          <GraduationCap size={24} strokeWidth={1.75} />
                        </div>
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {formation.statut || 'En cours'}
                        </span>
                      </div>
                      <h2 className="mt-5 line-clamp-2 text-base font-bold text-zinc-900 dark:text-white">
                        {formation.titre}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {formation.description || 'Aucune description disponible.'}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800/80">
                      <span className="inline-flex items-center gap-2 font-medium text-zinc-600 dark:text-zinc-400">
                        <Users size={16} strokeWidth={1.75} /> {count} candidature{count !== 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-orange-600 transition-all group-hover:translate-x-0.5 dark:text-orange-400">
                        Consulter <ChevronRight size={16} strokeWidth={2} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </section>
          )}
        </>
      ) : (
        <>
          <header className="space-y-4">
            <button
              onClick={() => {
                setSelectedFormationId('');
                setSelectedCandidateIds(new Set());
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 transition-colors hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400"
            >
              <ArrowLeft size={16} strokeWidth={2} /> Retour aux formations
            </button>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">Formation sélectionnée</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">{selectedFormation.titre}</h1>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{selectedFormation.statut || 'Formation'} · Capacite max : {capacity} places</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrintAccepted}
                  disabled={acceptedCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-xs transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-40"
                  title="Imprimer la liste des candidats acceptés"
                >
                  <Printer size={16} strokeWidth={1.75} /> Imprimer
                </button>
                <button
                  onClick={handleExportAccepted}
                  disabled={acceptedCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-40"
                  title="Exporter la liste des candidats acceptés"
                >
                  <FileSpreadsheet size={16} strokeWidth={1.75} /> Exporter CSV
                </button>
              </div>
            </div>
          </header>

          {isCapacityReached && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-center gap-3 font-medium text-amber-900 dark:text-amber-200">
                <AlertCircle size={20} className="text-amber-600 shrink-0 dark:text-amber-400" strokeWidth={1.75} />
                <span>Capacité maximale atteinte ({capacity} places réservées/validées).</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrintAccepted}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-xs dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                >
                  <Printer size={14} /> Imprimer
                </button>
                <button
                  onClick={handleExportAccepted}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-orange-600"
                >
                  <FileSpreadsheet size={14} /> Exporter
                </button>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-xs font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Candidatures reçues', value: formationCandidates.length, icon: Users, color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400' },
              { label: 'Présélectionnées', value: preselectedCount, icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' },
              { label: 'Acceptées', value: acceptedCount, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' },
              { label: 'Refusées / Annulées', value: refusedCount + cancelledCount, icon: XCircle, color: 'text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 dark:text-zinc-500' },
              { label: 'Places restantes', value: remainingPlaces, icon: GraduationCap, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`${cardClass} flex items-center gap-4 p-4`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}>
                  <Icon size={22} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
                  <p className="mt-0.5 text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
                </div>
              </div>
            ))}
          </section>

          <section className={`${cardClass} p-5 sm:p-6 space-y-5`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Liste des candidats</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{filteredCandidates.length} candidat(s) trouvé(s)</p>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={candidateSearch}
                  onChange={(event) => setCandidateSearch(event.target.value)}
                  placeholder="Rechercher par nom, email, école..."
                  className={`${inputClass} w-full pl-11`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              <Filter size={14} strokeWidth={2} /> Filtres
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['etablissement', 'Tous les établissements'],
                ['niveau_etude', 'Tous les niveaux'],
                ['situation_professionnelle', 'Toutes les situations'],
                ['genre', 'Tous les genres'],
                ['statut', 'Tous les statuts'],
              ].map(([key, placeholder]) => (
                <select key={key} value={filters[key]} onChange={(event) => setFilter(key, event.target.value)} className={`${inputClass} min-w-0`}>
                  <option value="TOUT">{placeholder}</option>
                  {(candidateFilterValues[key] || ['EN_ATTENTE', 'PRESELECTIONNEE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE']).map((value) => (
                    <option key={value} value={value}>{key === 'statut' ? getCandidateStatusLabel(value) : value.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              ))}
            </div>
          </section>

          <section className={`${cardClass} overflow-hidden`}>
            {loading ? (
              <div className="p-12 text-center text-xs font-medium text-zinc-400">Mise à jour de la liste...</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500 dark:text-zinc-400">Aucune candidature ne correspond à vos filtres.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-xs">
                  <thead className="border-b border-zinc-200/80 bg-zinc-50/50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-400">
                    <tr>
                      <th className="w-12 px-6 py-4"><span className="sr-only">Sélection</span></th>
                      <th className="px-6 py-4">Candidat</th>
                      <th className="px-6 py-4">Situation</th>
                      <th className="px-6 py-4">Date de dépôt</th>
                      <th className="px-6 py-4">Statut</th>
                      <th className="px-6 py-4">Genre</th>
                      <th className="px-6 py-4">Dossier</th>
                      <th className="px-6 py-4">Compte</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {filteredCandidates.map((candidate) => {
                      const isAlreadyPreselected = candidate.statut === 'PRESELECTIONNEE';
                      const canSelect = ['EN_ATTENTE', 'PRESELECTIONNEE'].includes(candidate.statut)
                        && (isAlreadyPreselected || remainingPlaces > 0);
                      const checked = selectedCandidateIds.has(String(candidate.id_inscription));
                      return (
                        <tr 
                          key={candidate.id_inscription} 
                          className={`transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 ${checked ? 'bg-orange-500/5 dark:bg-orange-500/10' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              aria-label={`Sélectionner ${candidate.prenom} ${candidate.nom}`}
                              checked={checked}
                              disabled={!canSelect}
                              onChange={() => toggleCandidate(candidate)}
                              className="h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-800"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-zinc-900 dark:text-white">{candidate.prenom} {candidate.nom}</div>
                            <div className="mt-1 space-y-0.5 text-[11px] text-zinc-400">
                              <div className="flex items-center gap-1.5"><UserRound size={12} strokeWidth={1.75} />{candidate.telephone || 'Non renseigné'}</div>
                              <div className="flex items-center gap-1.5"><Mail size={12} strokeWidth={1.75} />{candidate.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">{candidate.situation_professionnelle || 'N/A'}</td>
                          <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-600 dark:text-zinc-400">{formatDate(candidate.date_inscription)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                              candidate.statut === 'ACCEPTEE'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                                : candidate.statut === 'PRESELECTIONNEE'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
                                  : candidate.statut === 'REFUSEE' || candidate.statut === 'ANNULEE'
                                    ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                                    : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                candidate.statut === 'ACCEPTEE' ? 'bg-emerald-500' : candidate.statut === 'PRESELECTIONNEE' ? 'bg-amber-500' : 'bg-zinc-400'
                              }`} />
                              {getCandidateStatusLabel(candidate.statut)}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-zinc-600 dark:text-zinc-300">{candidate.genre || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setCandidateDetailsToShow(candidate)} 
                              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-orange-500 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-orange-500 dark:hover:text-orange-400"
                            >
                              <Eye size={14} strokeWidth={1.75} /> Voir dossier
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            {candidate.est_apprenant ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <Check size={14} strokeWidth={2.5} /> Actif
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-zinc-400">En attente</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {candidate.statut === 'ACCEPTEE' ? (
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Acceptée</span>
                            ) : candidate.statut === 'REFUSEE' ? (
                              <span className="text-xs font-semibold text-zinc-400">Refusée</span>
                            ) : candidate.statut === 'ANNULEE' ? (
                              <span className="text-xs font-semibold text-zinc-400">Annulée</span>
                            ) : (
                              <button
                                onClick={() => handleDecision(candidate, 'REFUSEE')}
                                disabled={processingId === candidate.id_inscription}
                                className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                              >
                                Refuser
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {selectedFormation && selectedCandidates.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-4 rounded-2xl border border-orange-500/30 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-orange-500/30 dark:bg-zinc-900/95">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            {selectedCandidates.length} candidat(s) sélectionné(s)
          </span>
          <button
            onClick={handleValidatePromotion}
            disabled={loading || selectedCandidates.length > Math.max(0, capacity - acceptedCount)}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} strokeWidth={2} /> Valider la promotion
          </button>
        </div>
      )}

      <CandidateDetailsModal candidate={candidateDetailsToShow} onClose={() => setCandidateDetailsToShow(null)} />
    </main>
  );
}