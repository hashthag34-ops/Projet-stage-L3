// frontend/src/pages/Formateur/GsEvaluation.jsx
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { 
  BarChart2, 
  Trophy, 
  Plus, 
  Trash2, 
  Pencil, 
  CheckCircle2, 
  X, 
  Eye, 
  EyeOff, 
  Search,
  Filter,
  Clock,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import API from '../../services/api';

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const selectedResultsByEvaluation = (results, evaluationId) => results
  .filter((result) => result.id_evaluation_sujet === evaluationId)
  .map((result) => ({
    ...result,
    displayName: `${result.prenom} ${result.nom}`,
    numericNote: Number(result.note || 0)
  }))
  .sort((a, b) => b.numericNote - a.numericNote);

const cardClass = 'rounded-3xl border border-zinc-200/80 bg-white shadow-xs transition-all dark:border-zinc-800/80 dark:bg-zinc-900/70';
const inputClass = 'w-full rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-100';

export default function GsEvaluation() {
  const [searchParams] = useSearchParams();
  const [formations, setFormations] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [results, setResults] = useState([]);
  
  // Gestion des modals et détails
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showRankingsModal, setShowRankingsModal] = useState(false);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [publicationAt, setPublicationAt] = useState('');
  const [editDraft, setEditDraft] = useState(null);
  const [expandedResultId, setExpandedResultId] = useState(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFormation, setFilterFormation] = useState('TOUT');
  const [filterStatus, setFilterStatus] = useState('TOUT');

  const [subject, setSubject] = useState({ id_formation: searchParams.get('formation') || '', titre: '', description: '', duree_minutes: 60, obligatoire: true, date_fermeture: '' });
  const [question, setQuestion] = useState({ enonce: '', points: 5, choix: [{ libelle: '', est_correct: true }, { libelle: '', est_correct: false }] });

  const load = async () => {
    try {
      const [formationResponse, evaluationResponse, resultResponse] = await Promise.all([
        API.get('/formateur/formations'), 
        API.get('/formateur/evaluations'), 
        API.get('/formateur/evaluations/resultats')
      ]);
      setFormations(formationResponse.data); 
      setEvaluations(evaluationResponse.data); 
      setResults(resultResponse.data);
    } catch (error) { 
      setMessage({ type: 'error', text: error.response?.data?.message || 'Impossible de charger les évaluations.' }); 
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => { 
    if (selectedId) {
      API.get(`/formateur/evaluations/${selectedId}`)
        .then((response) => setDetail(response.data))
        .catch(console.error);
    } else {
      setDetail(null);
    }
  }, [selectedId]);

  const selectedResults = useMemo(() => results.filter((item) => item.id_evaluation_sujet === selectedId), [results, selectedId]);
  
  const rankedFormationResults = useMemo(() => {
    const groups = new Map();
    results.forEach((result) => {
      const key = String(result.formation_titre);
      if (!groups.has(key)) groups.set(key, new Map());
      const learners = groups.get(key);
      if (!learners.has(result.id_apprenant)) learners.set(result.id_apprenant, []);
      learners.get(result.id_apprenant).push(Number(result.note || 0));
    });
    return [...groups.entries()].map(([formation, learners]) => ({
      formation,
      learners: [...learners.entries()].map(([id, notes]) => ({
        id,
        name: (() => {
          const learner = results.find((item) => item.id_apprenant === id);
          return learner ? `${learner.prenom} ${learner.nom}` : `Apprenant #${id}`;
        })(),
        average: notes.reduce((total, note) => total + note, 0) / notes.length
      })).sort((a, b) => b.average - a.average)
    })).sort((a, b) => a.formation.localeCompare(b.formation));
  }, [results]);

  const rankedEvaluationResults = useMemo(() => evaluations.map((evaluation) => {
    const learners = selectedResultsByEvaluation(results, evaluation.id_evaluation_sujet);
    return {
      ...evaluation,
      learners
    };
  }).sort((a, b) => a.titre.localeCompare(b.titre)), [evaluations, results]);

  const evaluationChartData = useMemo(() => {
    return evaluations.map((item) => {
      const evalResults = results.filter((r) => r.id_evaluation_sujet === item.id_evaluation_sujet);
      const totalNotes = evalResults.reduce((acc, r) => acc + (Number(r.note) || 0), 0);
      const avgNote = evalResults.length > 0 ? (totalNotes / evalResults.length) : 0;
      const successRate = (avgNote / 20) * 100;

      return {
        name: item.titre.length > 12 ? item.titre.substring(0, 12) + '...' : item.titre,
        fullName: item.titre,
        Reussite: Number(successRate.toFixed(1))
      };
    });
  }, [evaluations, results]);

  // Filtrage des évaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((item) => {
      const matchesSearch = item.titre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFormation = filterFormation === 'TOUT' || String(item.id_formation) === filterFormation;
      const matchesStatus = filterStatus === 'TOUT' || item.statut === filterStatus;
      return matchesSearch && matchesFormation && matchesStatus;
    });
  }, [evaluations, searchQuery, filterFormation, filterStatus]);

  const createSubject = async (event) => { 
    event.preventDefault(); 
    try { 
      const response = await API.post('/formateur/evaluations', subject); 
      setShowCreate(false); 
      setSubject({ id_formation: '', titre: '', description: '', duree_minutes: 60, obligatoire: true, date_fermeture: '' }); 
      setSelectedId(response.data.id_evaluation_sujet); 
      await load(); 
      setMessage({ type: 'success', text: 'Évaluation créée. Ajoutez maintenant ses questions.' }); 
    } catch (error) { 
      setMessage({ type: 'error', text: error.response?.data?.message || 'Création impossible.' }); 
    } 
  };

  const addQuestion = async (event) => { 
    event.preventDefault(); 
    try { 
      await API.post(`/formateur/evaluations/${selectedId}/questions`, { ...question, points: Number(question.points) }); 
      setQuestion({ enonce: '', points: 5, choix: [{ libelle: '', est_correct: true }, { libelle: '', est_correct: false }] }); 
      setShowQuestion(false); 
      const response = await API.get(`/formateur/evaluations/${selectedId}`); 
      setDetail(response.data); 
      await load(); 
    } catch (error) { 
      setMessage({ type: 'error', text: error.response?.data?.message || 'Question impossible à ajouter.' }); 
    } 
  };

  const publish = async () => { 
    try { 
      await API.patch(`/formateur/evaluations/${selectedId}/statut`, { statut: 'PUBLIEE' }); 
      setMessage({ type: 'success', text: 'Évaluation publiée.' }); 
      await load(); 
      const response = await API.get(`/formateur/evaluations/${selectedId}`); 
      setDetail(response.data); 
    } catch (error) { 
      setMessage({ type: 'error', text: error.response?.data?.message || 'Publication impossible.' }); 
    } 
  };

  const schedulePublication = async (event) => {
    event.preventDefault();
    try {
      await API.patch(`/formateur/evaluations/${selectedId}/statut`, {
        statut: 'BROUILLON',
        date_publication: new Date(publicationAt).toISOString()
      });
      setMessage({ type: 'success', text: 'Publication programmée. L’évaluation sera accessible à la date choisie.' });
      await load();
      const response = await API.get(`/formateur/evaluations/${selectedId}`);
      setDetail(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Programmation impossible.' });
    }
  };

  const openEdit = () => {
    setEditDraft({
      titre: detail.titre || '',
      description: detail.description || '',
      duree_minutes: detail.duree_minutes || 60,
      obligatoire: detail.obligatoire !== false,
      date_fermeture: toDateTimeLocal(detail.date_fermeture_utc || detail.date_fermeture)
    });
  };

  const updateSubject = async (event) => {
    event.preventDefault();
    try {
      await API.patch(`/formateur/evaluations/${selectedId}`, editDraft);
      const response = await API.get(`/formateur/evaluations/${selectedId}`);
      setDetail(response.data);
      setEditDraft(null);
      await load();
      setMessage({ type: 'success', text: 'Évaluation modifiée.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Modification impossible.' });
    }
  };

  const deleteEvaluation = async () => {
    if (!window.confirm('Supprimer définitivement cette évaluation et toutes ses tentatives, réponses et notes ?')) return;
    try {
      await API.delete(`/formateur/evaluations/${selectedId}`);
      setSelectedId(null);
      setDetail(null);
      await load();
      setMessage({ type: 'success', text: 'Évaluation et données associées supprimées.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Suppression impossible.' });
    }
  };

  const removeQuestion = async (questionId) => { 
    try { 
      await API.delete(`/formateur/evaluations/${selectedId}/questions/${questionId}`); 
      const response = await API.get(`/formateur/evaluations/${selectedId}`); 
      setDetail(response.data); 
      await load(); 
    } catch (error) { 
      setMessage({ type: 'error', text: error.response?.data?.message || 'Suppression impossible.' }); 
    } 
  };

  const updateChoice = (index, field, value) => setQuestion((current) => ({ 
    ...current, 
    choix: current.choix.map((choice, choiceIndex) => choiceIndex === index ? { ...choice, [field]: value } : field === 'est_correct' && value ? { ...choice, est_correct: false } : choice) 
  }));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 pb-32 font-sans text-zinc-900 dark:text-zinc-100 sm:px-8">
      
      {/* En-tête de la page avec boutons de stats et classements en haut à droite */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <CheckCircle size={13} strokeWidth={2} /> Espace Formateur
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
            Gestion des évaluations
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Créez des sujets, composez des questions et suivez les performances de vos apprenants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowStatsModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <BarChart2 size={15} strokeWidth={1.75} /> Statistiques
          </button>
          <button
            onClick={() => setShowRankingsModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Trophy size={15} strokeWidth={1.75} /> Classements
          </button>
          <button 
            onClick={() => setShowCreate(true)} 
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600"
          >
            <Plus size={16} strokeWidth={2} /> Nouvelle évaluation
          </button>
        </div>
      </div>

      {message.text && (
        <div role="alert" className={`rounded-2xl border p-4 text-xs font-semibold ${message.type === 'error' ? 'border-red-200 bg-red-50/50 text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400' : 'border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400'}`}>
          {message.text}
        </div>
      )}

      {/* SECTION FILTRAGE & RECHERCHE */}
      <section className={`${cardClass} p-5 sm:p-6 space-y-4`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une évaluation par titre ou description..."
              className={`${inputClass} w-full pl-11`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterFormation}
              onChange={(e) => setFilterFormation(e.target.value)}
              className={inputClass}
            >
              <option value="TOUT">Toutes les formations</option>
              {formations.map((f) => (
                <option key={f.id_formation} value={String(f.id_formation)}>{f.titre}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={inputClass}
            >
              <option value="TOUT">Tous les statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="PUBLIEE">Publiée</option>
            </select>
          </div>
        </div>
      </section>

      {/* LISTE DES ÉVALUATIONS EN GRILLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">Sujets d'évaluation</h2>
          <span className="text-xs text-zinc-400">{filteredEvaluations.length} résultat(s)</span>
        </div>
        
        {filteredEvaluations.length === 0 ? (
          <div className={`${cardClass} py-16 text-center text-sm text-zinc-400`}>
            Aucune évaluation ne correspond à vos critères.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredEvaluations.map((item) => (
              <div 
                key={item.id_evaluation_sujet} 
                className={`${cardClass} flex flex-col justify-between p-6 transition-all duration-200 hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-lg`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                      item.statut === 'PUBLIEE' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50' 
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${item.statut === 'PUBLIEE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {item.statut}
                    </span>
                    <span className="text-xs font-medium text-zinc-400">{item.total_points}/20 pts</span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-white line-clamp-1">
                    {item.titre}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-orange-600 dark:text-orange-400 line-clamp-1">
                    {item.formation_titre}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {item.description || 'Aucune description fournie.'}
                  </p>

                  {item.statut === 'BROUILLON' && item.date_publication_utc && (
                    <p className="mt-3 text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Clock size={13} strokeWidth={1.75} /> Programmée : {new Date(item.date_publication_utc).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                  <div className="text-zinc-500 dark:text-zinc-400 space-x-2">
                    <span>{item.questions_count} question(s)</span>
                    <span>·</span>
                    <span>{item.tentatives_count} tentative(s)</span>
                  </div>
                  <button 
                    onClick={() => setSelectedId(item.id_evaluation_sujet)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:border-orange-500 hover:text-orange-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-orange-500 dark:hover:text-orange-400"
                  >
                    <Eye size={14} strokeWidth={1.75} /> Gérer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL STATISTIQUES ================= */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm" onClick={() => setShowStatsModal(false)}>
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <BarChart2 size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Statistiques globales</h2>
                  <p className="text-xs text-zinc-400">Taux de réussite (%) par évaluation</p>
                </div>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            {evaluationChartData.length === 0 ? (
              <p className="py-12 text-center text-xs text-zinc-400">Aucune donnée statistique disponible.</p>
            ) : (
              <div className="h-80 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evaluationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReussiteEval" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', color: '#fff', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="Reussite" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReussiteEval)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL CLASSEMENTS ================= */}
      {showRankingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm" onClick={() => setShowRankingsModal(false)}>
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Trophy size={20} strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Classements des apprenants</h2>
                  <p className="text-xs text-zinc-400">Par formation et par évaluation</p>
                </div>
              </div>
              <button onClick={() => setShowRankingsModal(false)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 space-y-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Classement par formation</h3>
                {rankedFormationResults.map((group) => (
                  <div key={group.formation} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                    <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400">{group.formation}</h4>
                    {!group.learners.length ? (
                      <p className="text-xs text-zinc-400 italic">Aucun résultat.</p>
                    ) : (
                      <ol className="space-y-2">
                        {group.learners.map((learner, index) => (
                          <li key={learner.id} className="flex items-center justify-between text-xs border-b border-zinc-100 pb-1.5 last:border-0 dark:border-zinc-800/80">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              <strong className="text-orange-500 mr-1.5">#{index + 1}</strong> {learner.name}
                            </span>
                            <span className="font-bold text-zinc-900 dark:text-white">{learner.average.toFixed(2)} / 20</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-5 space-y-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Classement par évaluation</h3>
                {rankedEvaluationResults.map((evaluation) => (
                  <div key={evaluation.id_evaluation_sujet} className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{evaluation.titre}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">{evaluation.formation_titre}</p>
                    </div>
                    {!evaluation.learners.length ? (
                      <p className="text-xs text-zinc-400 italic">Aucun résultat.</p>
                    ) : (
                      <ol className="space-y-2">
                        {evaluation.learners.map((learner, index) => (
                          <li key={learner.id_tentative} className="flex items-center justify-between text-xs border-b border-zinc-100 pb-1.5 last:border-0 dark:border-zinc-800/80">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              <strong className="text-orange-500 mr-1.5">#{index + 1}</strong> {learner.displayName}
                            </span>
                            <span className="font-bold text-zinc-900 dark:text-white">{learner.numericNote.toFixed(2)} / 20</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL GESTION / DÉTAILS D'UNE ÉVALUATION ================= */}
      {selectedId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm" onClick={() => setSelectedId(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">{detail.formation_titre}</span>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">{detail.titre}</h2>
              </div>
              <button onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-50/50 p-4 rounded-2xl dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{detail.description || 'Aucune description fournie.'}</p>
                {detail.statut === 'BROUILLON' && detail.date_publication_utc && (
                  <p className="text-xs font-bold text-orange-500 mt-1">
                    Publication programmée : {new Date(detail.date_publication_utc).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {detail.statut === 'BROUILLON' && (
                  <button onClick={openEdit} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    <Pencil size={14} strokeWidth={1.75} /> Modifier
                  </button>
                )}
                <button onClick={deleteEvaluation} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                  <Trash2 size={14} strokeWidth={1.75} /> Supprimer
                </button>
                {detail.statut === 'BROUILLON' && (
                  <>
                    <button onClick={publish} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700">
                      <CheckCircle2 size={14} strokeWidth={1.75} /> Publier
                    </button>
                    <button onClick={() => setShowQuestion(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-orange-600">
                      <Plus size={14} strokeWidth={2} /> Ajouter une question
                    </button>
                  </>
                )}
              </div>
            </div>

            {detail.statut === 'BROUILLON' && (
              <form onSubmit={schedulePublication} className="flex flex-col sm:flex-row gap-3 rounded-2xl bg-zinc-50/50 p-4 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 items-end">
                <label className="flex-1 w-full text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Programmer la date et l'heure de publication
                  <input className={`${inputClass} mt-1`} type="datetime-local" value={publicationAt} onChange={(e) => setPublicationAt(e.target.value)} required />
                </label>
                <button type="submit" className="w-full sm:w-auto rounded-xl bg-orange-500 px-4 py-3 text-xs font-bold text-white transition hover:bg-orange-600">
                  Programmer
                </button>
              </form>
            )}

            {/* Questions composées */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Questions composées ({detail.questions?.length || 0})</h3>
              {detail.questions?.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
                  Aucune question n'a été ajoutée à ce sujet.
                </div>
              ) : (
                <div className="space-y-3">
                  {detail.questions.map((item) => (
                    <div key={item.id_question} className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="text-[11px] font-bold uppercase text-orange-600 dark:text-orange-400">
                            Question {item.numero_question} · {item.points} point(s)
                          </span>
                          <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">{item.enonce}</p>
                        </div>
                        {detail.statut === 'BROUILLON' && (
                          <button onClick={() => removeQuestion(item.id_question)} title="Supprimer" className="text-zinc-400 hover:text-red-500 transition">
                            <Trash2 size={16} strokeWidth={1.75} />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-2">
                        {item.choix.map((choice) => (
                          <div key={choice.id_choix} className={`rounded-xl px-3.5 py-2 text-xs font-medium border ${choice.est_correct ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'}`}>
                            {choice.est_correct ? '✓ ' : '• '}{choice.libelle}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Résultats associés */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Résultats des apprenants</h3>
              {selectedResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
                  Aucun résultat enregistré pour le moment.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-semibold">
                        <th className="pb-3 px-3">Apprenant</th>
                        <th className="pb-3 px-3">Note</th>
                        <th className="pb-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {selectedResults.map((result) => (
                        <Fragment key={result.id_tentative}>
                          <tr>
                            <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-white">{result.prenom} {result.nom}</td>
                            <td className="py-3 px-3 font-bold">{result.note ?? '—'} / 20</td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setExpandedResultId((current) => current === result.id_tentative ? null : result.id_tentative)}
                                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                              >
                                {expandedResultId === result.id_tentative ? 'Masquer' : 'Voir les réponses'}
                              </button>
                            </td>
                          </tr>
                          {expandedResultId === result.id_tentative && (
                            <tr>
                              <td colSpan="3" className="pb-4 px-3 pt-1">
                                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                  {!result.correction?.length ? (
                                    <p className="text-zinc-400 italic">Aucune réponse détaillée enregistrée.</p>
                                  ) : (
                                    result.correction.map((answer) => (
                                      <div key={answer.id_question} className={`rounded-xl p-3 text-xs border ${answer.correcte ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200'}`}>
                                        <strong className="block mb-1">Question {answer.numero_question} : {answer.enonce}</strong>
                                        <div>Réponse de l’apprenant : <span className="font-semibold">{answer.reponse_choisie || 'Aucune réponse'}</span></div>
                                        {!answer.correcte && <div className="mt-0.5">Bonne réponse : <span className="font-semibold">{answer.reponse_correcte || '—'}</span></div>}
                                        <div className="mt-1 font-bold">{answer.correcte ? '✓ Correcte' : '✗ Incorrecte'} — {answer.points_obtenus}/{answer.points} pt</div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CRÉATION DE SUJET ================= */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <form onSubmit={createSubject} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Nouvelle évaluation</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <select className={inputClass} value={subject.id_formation} onChange={(event) => setSubject({ ...subject, id_formation: event.target.value })} required>
              <option value="">Choisir une formation</option>
              {formations.map((formation) => (
                <option key={formation.id_formation} value={formation.id_formation}>{formation.titre}</option>
              ))}
            </select>

            <input className={inputClass} placeholder="Titre de l’évaluation" value={subject.titre} onChange={(event) => setSubject({ ...subject, titre: event.target.value })} required />
            
            <textarea className={`${inputClass} resize-none`} placeholder="Description" value={subject.description} onChange={(event) => setSubject({ ...subject, description: event.target.value })} rows="3" />

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Durée (minutes)</label>
                <input className={inputClass} type="number" min="1" step="1" placeholder="60" value={subject.duree_minutes} onChange={(event) => setSubject({ ...subject, duree_minutes: event.target.value })} required />
              </div>

              <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 self-end h-[46px]">
                <input type="checkbox" checked={subject.obligatoire} onChange={(event) => setSubject({ ...subject, obligatoire: event.target.checked })} /> Obligatoire
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Date et heure de fermeture</label>
              <input className={inputClass} type="datetime-local" value={subject.date_fermeture} onChange={(event) => setSubject({ ...subject, date_fermeture: event.target.value })} required />
            </div>

            <button className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 mt-2">
              Créer le sujet
            </button>
          </form>
        </div>
      )}

      {/* ================= MODAL MODIFICATION DU BROUILLON ================= */}
      {editDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm" onClick={() => setEditDraft(null)}>
          <form onSubmit={updateSubject} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Modifier l’évaluation</h2>
              <button type="button" onClick={() => setEditDraft(null)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <input className={inputClass} placeholder="Titre de l’évaluation" value={editDraft.titre} onChange={(event) => setEditDraft({ ...editDraft, titre: event.target.value })} required />
            
            <textarea className={`${inputClass} resize-none`} placeholder="Description" value={editDraft.description} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })} rows="3" />
            
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Durée (minutes)</label>
                <input className={inputClass} type="number" min="1" step="1" value={editDraft.duree_minutes} onChange={(event) => setEditDraft({ ...editDraft, duree_minutes: event.target.value })} required />
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-xs font-semibold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 self-end h-[46px]">
                <input type="checkbox" checked={editDraft.obligatoire} onChange={(event) => setEditDraft({ ...editDraft, obligatoire: event.target.checked })} /> Obligatoire
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Date et heure de fermeture</label>
              <input className={inputClass} type="datetime-local" value={editDraft.date_fermeture} onChange={(event) => setEditDraft({ ...editDraft, date_fermeture: event.target.value })} required />
            </div>

            <button className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 mt-2">
              Enregistrer les modifications
            </button>
          </form>
        </div>
      )}

      {/* ================= MODAL AJOUT DE QUESTION ================= */}
      {showQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm" onClick={() => setShowQuestion(false)}>
          <form onSubmit={addQuestion} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Ajouter une question</h2>
              <button type="button" onClick={() => setShowQuestion(false)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>

            <textarea className={`${inputClass} resize-none`} placeholder="Énoncé de la question" value={question.enonce} onChange={(event) => setQuestion({ ...question, enonce: event.target.value })} rows="3" required />
            
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Nombre de points</label>
              <input className={inputClass} type="number" min="0.01" max="20" step="0.01" placeholder="5" value={question.points} onChange={(event) => setQuestion({ ...question, points: event.target.value })} required />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Choix de réponse</h3>
                <button type="button" onClick={() => setQuestion({ ...question, choix: [...question.choix, { libelle: '', est_correct: false }] })} className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline">
                  + Ajouter un choix
                </button>
              </div>

              {question.choix.map((choice, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input className={inputClass} placeholder={`Choix ${index + 1}`} value={choice.libelle} onChange={(event) => updateChoice(index, 'libelle', event.target.value)} required />
                  <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <input type="radio" name="correct-choice" checked={choice.est_correct} onChange={() => updateChoice(index, 'est_correct', true)} className="text-orange-500 focus:ring-orange-500" /> Correct
                  </label>
                </div>
              ))}
            </div>

            <button className="w-full rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 mt-2">
              Ajouter la question
            </button>
          </form>
        </div>
      )}

    </div>
  );
}