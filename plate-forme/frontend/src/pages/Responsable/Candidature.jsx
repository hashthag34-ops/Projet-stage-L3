import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, CheckCircle, ChevronRight, Eye, Filter, GraduationCap,
  Mail, RefreshCw, Search, Send, Users, UserRound, X
} from 'lucide-react';
import API from '../../services/api';

const inputClass = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200';
const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900';
const emptyCandidates = [];

const formatDate = (value) => {
  if (!value) return 'Non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Non renseignée' : date.toLocaleDateString('fr-FR');
};

const candidateDetails = [
  ['Nom', (candidate) => `${candidate.prenom || ''} ${candidate.nom || ''}`.trim()],
  ['Adresse e-mail', (candidate) => candidate.email],
  ['Téléphone', (candidate) => candidate.telephone],
  ['Âge', (candidate) => candidate.age ? `${candidate.age} ans` : null],
  ['Genre', (candidate) => candidate.genre],
  ['Situation professionnelle', (candidate) => candidate.situation_professionnelle],
  ['Établissement', (candidate) => candidate.etablissement],
  ['Niveau d’étude', (candidate) => candidate.niveau_etude],
  ['Filière', (candidate) => candidate.filiere],
  ['Date de candidature', (candidate) => formatDate(candidate.date_inscription)],
  ['Statut de candidature', (candidate) => candidate.statut],
  ['Conditions de candidature acceptées', (candidate) => candidate.conditions_acceptees == null ? null : candidate.conditions_acceptees ? 'Oui' : 'Non'],
  ['Motivation', (candidate) => candidate.motivation],
  ['Objectif', (candidate) => candidate.objectif],
  ['Projet après la formation', (candidate) => candidate.projet_apres_formation],
  ['Source d’information', (candidate) => candidate.source_information],
  ['A déjà suivi une formation', (candidate) => candidate.a_deja_suivi_formation == null ? null : candidate.a_deja_suivi_formation ? 'Oui' : 'Non'],
  ['Formation précédente', (candidate) => candidate.formation_precedente],
  ['Retour ou suggestion', (candidate) => candidate.retour_suggestion],
];

function CandidateDetailsModal({ candidate, onClose }) {
  if (!candidate) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-details-title"
        className={`${cardClass} max-h-[90vh] w-full max-w-2xl overflow-y-auto`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 flex items-start justify-between border-b border-slate-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Dossier candidat</p>
            <h2 id="candidate-details-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {candidate.prenom} {candidate.nom}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800">
            <X size={18} />
          </button>
        </header>
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          {candidateDetails.map(([label, getValue]) => {
            const value = getValue(candidate);
            if (value == null || value === '') return null;
            return (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-medium text-slate-500 dark:text-zinc-400">{label}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-900 dark:text-zinc-100">{value}</dd>
              </div>
            );
          })}
        </dl>
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
  const acceptedCount = formationCandidates.filter((candidate) => candidate.statut === 'ACCEPTEE').length;
  const refusedCount = formationCandidates.filter((candidate) => candidate.statut === 'REFUSEE').length;
  const preselectedCount = formationCandidates.filter((candidate) => candidate.statut === 'PRESELECTIONNEE').length;
  const remainingPlaces = Math.max(0, capacity - acceptedCount - preselectedCount);
  const selectedCandidates = formationCandidates.filter((candidate) => selectedCandidateIds.has(String(candidate.id_inscription)));

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const toggleCandidate = (candidate) => {
    const id = String(candidate.id_inscription);
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

  if (loading && formations.length === 0 && candidatures.length === 0) {
    return <div className="mx-auto max-w-7xl p-8 text-center text-sm text-slate-500">Chargement des formations…</div>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-28 font-sans text-slate-800 dark:text-zinc-100 sm:px-6">
      {!selectedFormation ? (
        <>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Espace responsable</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Gestion des candidatures</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Choisissez une formation pour consulter et traiter ses dossiers.</p>
            </div>
            <button onClick={fetchData} className={`${inputClass} inline-flex items-center justify-center gap-2`} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
          </header>

          <section className={`${cardClass} p-4`}>
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <label className="relative">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={formationSearch}
                  onChange={(event) => setFormationSearch(event.target.value)}
                  placeholder="Rechercher une formation…"
                  className={`${inputClass} w-full pl-10`}
                />
              </label>
              <select value={formationStatus} onChange={(event) => setFormationStatus(event.target.value)} className={inputClass}>
                <option value="TOUT">Tous les statuts</option>
                {[...new Set(formations.map((formation) => formation.statut).filter(Boolean))].map((status) => (
                  <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </div>
          </section>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
          {formationsFiltrees.length === 0 ? (
            <div className={`${cardClass} p-10 text-center text-sm text-slate-500 dark:text-zinc-400`}>
              {formations.length === 0 ? 'Aucune formation disponible.' : 'Aucune formation ne correspond aux filtres.'}
            </div>
          ) : (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {formationsFiltrees.map((formation) => {
                const count = (candidaturesParFormation[String(formation.id_formation)] || []).length;
                return (
                  <button
                    key={formation.id_formation}
                    onClick={() => {
                      setSelectedFormationId(String(formation.id_formation));
                      setSelectedCandidateIds(new Set());
                    }}
                    className={`${cardClass} group p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:hover:border-blue-700`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><GraduationCap size={22} /></span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {formation.statut || 'Sans statut'}
                      </span>
                    </div>
                    <h2 className="mt-4 line-clamp-2 text-lg font-bold text-slate-900 dark:text-white">{formation.titre}</h2>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-500 dark:text-zinc-400">{formation.description || 'Aucune description renseignée.'}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm dark:border-zinc-800">
                      <span className="inline-flex items-center gap-2 text-slate-600 dark:text-zinc-300"><Users size={16} /> {count} candidature{count !== 1 ? 's' : ''}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-blue-600 group-hover:gap-2 dark:text-blue-400">Voir les dossiers <ChevronRight size={16} /></span>
                    </div>
                  </button>
                );
              })}
            </section>
          )}
        </>
      ) : (
        <>
          <header className="space-y-5">
            <button
              onClick={() => {
                setSelectedFormationId('');
                setSelectedCandidateIds(new Set());
              }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
            >
              <ArrowLeft size={17} /> Toutes les formations
            </button>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Candidatures de la formation</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{selectedFormation.titre}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{selectedFormation.statut || 'Formation'} · {capacity} places au total</p>
              </div>
              <button onClick={fetchData} className={`${inputClass} inline-flex items-center justify-center gap-2`} disabled={loading}>
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualiser
              </button>
            </div>
          </header>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Candidatures reçues', value: formationCandidates.length, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400' },
              { label: 'Candidatures acceptées', value: acceptedCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
              { label: 'Candidatures refusées', value: refusedCount, icon: X, color: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' },
              { label: 'Places restantes', value: remainingPlaces, icon: GraduationCap, color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`${cardClass} flex items-center gap-4 p-4`}>
                <span className={`rounded-xl p-3 ${color}`}><Icon size={20} /></span>
                <div><p className="text-sm text-slate-500 dark:text-zinc-400">{label}</p><p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white">{value}</p></div>
              </div>
            ))}
          </section>

          <section className={`${cardClass} space-y-4 p-4`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Candidats</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400">{filteredCandidates.length} résultat{filteredCandidates.length !== 1 ? 's' : ''}</p>
              </div>
              <label className="relative w-full lg:max-w-sm">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={candidateSearch}
                  onChange={(event) => setCandidateSearch(event.target.value)}
                  placeholder="Rechercher un candidat…"
                  className={`${inputClass} w-full pl-10`}
                />
              </label>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-zinc-500"><Filter size={15} /> Filtres</div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ['etablissement', 'Tous les établissements', 'Établissement'],
                ['niveau_etude', 'Tous les niveaux', 'Niveau'],
                ['situation_professionnelle', 'Toutes les situations', 'Situation professionnelle'],
                ['genre', 'Tous les genres', 'Genre'],
                ['statut', 'Tous les statuts', 'Statut de candidature'],
              ].map(([key, placeholder]) => (
                <select key={key} value={filters[key]} onChange={(event) => setFilter(key, event.target.value)} className={`${inputClass} min-w-0`}>
                  <option value="TOUT">{placeholder}</option>
                  {(candidateFilterValues[key] || ['EN_ATTENTE', 'PRESELECTIONNEE', 'ACCEPTEE', 'REFUSEE']).map((value) => (
                    <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              ))}
            </div>
          </section>

          <section className={`${cardClass} overflow-hidden`}>
            {loading ? (
              <div className="p-10 text-center text-sm text-slate-500">Actualisation des candidatures…</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 dark:text-zinc-400">Aucun candidat ne correspond à ces filtres.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-zinc-800/70 dark:text-zinc-400">
                    <tr>
                      <th className="w-12 px-4 py-3"><span className="sr-only">Sélection</span></th>
                      <th className="px-4 py-3">Candidat</th>
                      <th className="px-4 py-3">Situation professionnelle</th>
                      <th className="px-4 py-3">Date de candidature</th>
                      <th className="px-4 py-3">Genre</th>
                      <th className="px-4 py-3">Informations</th>
                      <th className="px-4 py-3">Compte apprenant</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {filteredCandidates.map((candidate) => {
                      const canSelect = ['EN_ATTENTE', 'PRESELECTIONNEE'].includes(candidate.statut);
                      const checked = selectedCandidateIds.has(String(candidate.id_inscription));
                      return (
                        <tr key={candidate.id_inscription} className={`transition hover:bg-slate-50/70 dark:hover:bg-zinc-800/30 ${checked ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''}`}>
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              aria-label={`Sélectionner ${candidate.prenom} ${candidate.nom}`}
                              checked={checked}
                              disabled={!canSelect}
                              onChange={() => toggleCandidate(candidate)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{candidate.prenom} {candidate.nom}</div>
                            <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-zinc-400">
                              <div className="inline-flex items-center gap-1.5"><UserRound size={13} />{candidate.telephone || 'Téléphone non renseigné'}</div>
                              <div className="inline-flex items-center gap-1.5"><Mail size={13} />{candidate.email}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-zinc-300">{candidate.situation_professionnelle || 'Non renseignée'}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-slate-600 dark:text-zinc-300">{formatDate(candidate.date_inscription)}</td>
                          <td className="px-4 py-4 text-slate-600 dark:text-zinc-300">{candidate.genre || 'Non renseigné'}</td>
                          <td className="px-4 py-4">
                            <button onClick={() => setCandidateDetailsToShow(candidate)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-blue-400">
                              <Eye size={14} /> Voir le dossier
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            {candidate.est_apprenant ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><Check size={13} /> Configuré</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">À configurer</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {candidate.statut === 'ACCEPTEE' ? (
                              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Acceptée</span>
                            ) : candidate.statut === 'REFUSEE' ? (
                              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Refusée</span>
                            ) : (
                              <button
                                onClick={() => handleDecision(candidate, 'REFUSEE')}
                                disabled={processingId === candidate.id_inscription}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:text-rose-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
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
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl border border-blue-200 bg-white p-3 shadow-xl dark:border-blue-900 dark:bg-zinc-900">
          <span className="px-1 text-sm font-semibold text-slate-700 dark:text-zinc-200">{selectedCandidates.length} sélectionné{selectedCandidates.length > 1 ? 's' : ''}</span>
          <button
            onClick={handleValidatePromotion}
            disabled={loading || selectedCandidates.length > Math.max(0, capacity - acceptedCount)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} /> Valider la promotion
          </button>
        </div>
      )}

      <CandidateDetailsModal candidate={candidateDetailsToShow} onClose={() => setCandidateDetailsToShow(null)} />
    </main>
  );
}
