// frontend/src/pages/Formateur/GsEvaluation.jsx
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { 
  BarChart2, 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Pencil, 
  CheckCircle2, 
  X, 
  Eye, 
  EyeOff, 
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

const cardClass = 'rounded-3xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900';
const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';

export default function GsEvaluation() {
  const [searchParams] = useSearchParams();
  const [formations, setFormations] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [publicationAt, setPublicationAt] = useState('');
  const [editDraft, setEditDraft] = useState(null);
  const [expandedResultId, setExpandedResultId] = useState(null);

  // États pour afficher / masquer les menus statistiques et classements
  const [showStats, setShowStats] = useState(true);
  const [showRankings, setShowRankings] = useState(true);

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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:px-6 sm:py-6">
      
      {/* Barre d'action supérieure */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">Évaluations</p>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white mt-1">Gestion des évaluations</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Créez les sujets, composez les questions et suivez les résultats.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)} 
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 shrink-0"
        >
          <Plus size={16} /> Nouvelle évaluation
        </button>
      </div>

      {message.text && (
        <div role="alert" className={`rounded-2xl border p-4 text-xs font-semibold ${message.type === 'error' ? 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
          {message.text}
        </div>
      )}

      {/* SECTION STATISTIQUES AVEC MENU DÉPLIABLE (Afficher / Masquer) */}
      <div className={cardClass}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <BarChart2 size={18} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">Taux de réussite par évaluation</h2>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Statistiques globales des notes (%)</p>
            </div>
          </div>
          <button
            onClick={() => setShowStats(!showStats)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            {showStats ? <><EyeOff size={14} /> Masquer</> : <><Eye size={14} /> Afficher</>}
          </button>
        </div>

        {showStats && (
          <div className="p-4 sm:p-6">
            {evaluationChartData.length === 0 ? (
              <p className="py-12 text-center text-xs text-zinc-400">Aucune donnée statistique disponible.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evaluationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReussiteEval" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderRadius: '16px', border: '1px solid #27272a', color: '#fff', fontSize: '11px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="Reussite" 
                      stroke="#f97316" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorReussiteEval)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION CLASSEMENTS AVEC MENU DÉPLIABLE (Afficher / Masquer) */}
      <div className={cardClass}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Trophy size={18} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white">Classements des apprenants</h2>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Par formation et par évaluation</p>
            </div>
          </div>
          <button
            onClick={() => setShowRankings(!showRankings)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            {showRankings ? <><EyeOff size={14} /> Masquer</> : <><Eye size={14} /> Afficher</>}
          </button>
        </div>

        {showRankings && (
          <div className="p-4 sm:p-6 grid gap-6 md:grid-cols-2">
            
            {/* Classement par formation */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Classement par formation</h3>
              {rankedFormationResults.map((group) => (
                <div key={group.formation} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-2">
                  <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400">{group.formation}</h4>
                  {!group.learners.length ? (
                    <p className="text-[11px] text-zinc-400 italic">Aucun résultat.</p>
                  ) : (
                    <ol className="space-y-1.5">
                      {group.learners.map((learner, index) => (
                        <li key={learner.id} className="flex items-center justify-between text-xs border-b border-zinc-100 dark:border-zinc-800 pb-1 last:border-0">
                          <span className="font-semibold truncate pr-2"><strong className="text-orange-500">{index + 1}.</strong> {learner.name}</span>
                          <span className="font-bold shrink-0">{learner.average.toFixed(2)} / 20</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>

            {/* Classement par évaluation */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Classement par évaluation</h3>
              {rankedEvaluationResults.map((evaluation) => (
                <div key={evaluation.id_evaluation_sujet} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-2">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate">{evaluation.titre}</h4>
                    <p className="text-[10px] text-zinc-400 truncate">{evaluation.formation_titre}</p>
                  </div>
                  {!evaluation.learners.length ? (
                    <p className="text-[11px] text-zinc-400 italic">Aucun résultat.</p>
                  ) : (
                    <ol className="space-y-1.5">
                      {evaluation.learners.map((learner, index) => (
                        <li key={learner.id_tentative} className="flex items-center justify-between text-xs border-b border-zinc-100 dark:border-zinc-800 pb-1 last:border-0">
                          <span className="font-semibold truncate pr-2"><strong className="text-orange-500">{index + 1}.</strong> {learner.displayName}</span>
                          <span className="font-bold shrink-0">{learner.numericNote.toFixed(2)} / 20</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      {/* LISTE DES ÉVALUATIONS + ACCORDÉON */}
      <div className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Vos sujets d'évaluation</h2>
        
        {evaluations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center text-xs text-zinc-500">
            Aucune évaluation créée.
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((item) => {
              const isSelected = selectedId === item.id_evaluation_sujet;

              return (
                <div key={item.id_evaluation_sujet} className={cardClass}>
                  <button 
                    onClick={() => setSelectedId(isSelected ? null : item.id_evaluation_sujet)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 bg-transparent border-none cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-3xl"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white truncate">{item.titre}</span>
                        <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase text-orange-600 dark:text-orange-400">
                          {item.statut}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">{item.formation_titre}</p>
                      {item.statut === 'BROUILLON' && item.date_publication_utc && (
                        <p className="text-[10px] font-bold text-orange-500 mt-1">
                          Publication programmée : {new Date(item.date_publication_utc).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-zinc-400">
                      <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold">
                        <span>{item.questions_count} question(s)</span>
                        <span>{item.total_points}/20 pts</span>
                        <span>{item.tentatives_count} tentative(s)</span>
                      </div>
                      {isSelected ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {/* CONTENU DÉROULANT DES DÉTAILS */}
                  {isSelected && detail && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 sm:p-6 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-6 rounded-b-3xl">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">{detail.formation_titre}</p>
                          <h3 className="text-base font-black text-zinc-900 dark:text-white mt-0.5">{detail.titre}</h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{detail.description || 'Aucune description.'}</p>
                          {detail.statut === 'BROUILLON' && detail.date_publication_utc && (
                            <p className="text-[10px] font-bold text-orange-500 mt-1">
                              Publication programmée : {new Date(detail.date_publication_utc).toLocaleString()}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 shrink-0">
                          {detail.statut === 'BROUILLON' && (
                            <button
                              type="button"
                              onClick={openEdit}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100"
                            >
                              <Pencil size={14} /> Modifier
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={deleteEvaluation}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 transition hover:bg-rose-500/20"
                          >
                            <Trash2 size={14} /> Supprimer
                          </button>
                          {detail.statut === 'BROUILLON' && (
                            <button 
                              onClick={publish} 
                              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-black text-zinc-950 transition hover:bg-orange-400"
                            >
                              <CheckCircle2 size={14} /> Publier
                            </button>
                          )}
                          <button 
                            onClick={() => setShowQuestion(true)} 
                            disabled={detail.statut !== 'BROUILLON'} 
                            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 disabled:opacity-50"
                          >
                            <Plus size={14} /> Question
                          </button>
                        </div>
                      </div>

                      {detail.statut === 'BROUILLON' && (
                        <form onSubmit={schedulePublication} className="flex flex-col sm:flex-row gap-3 rounded-2xl bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 items-center">
                          <label className="flex-1 w-full text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            Date et heure de publication
                            <input className={`${inputClass} mt-1`} type="datetime-local" value={publicationAt} onChange={(event) => setPublicationAt(event.target.value)} required />
                          </label>
                          <button type="submit" className="w-full sm:w-auto self-end rounded-2xl border border-orange-500 bg-orange-500/10 px-4 py-3 text-xs font-black text-orange-600 dark:text-orange-400 transition hover:bg-orange-500 hover:text-zinc-950">
                            Programmer
                          </button>
                        </form>
                      )}

                      {/* Liste des questions */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">Questions composées</h4>
                        {detail.questions?.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-xs text-zinc-400">
                            Ajoutez des questions pour atteindre 20 points.
                          </div>
                        ) : (
                          detail.questions.map((item) => (
                            <div key={item.id_question} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <span className="text-[10px] font-black uppercase text-orange-500">
                                    Question {item.numero_question} · {item.points} point(s)
                                  </span>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white mt-1">{item.enonce}</p>
                                </div>
                                {detail.statut === 'BROUILLON' && (
                                  <button onClick={() => removeQuestion(item.id_question)} title="Supprimer" className="text-zinc-400 hover:text-rose-500 transition">
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                              <div className="grid gap-2">
                                {item.choix.map((choice) => (
                                  <div key={choice.id_choix} className={`rounded-xl px-3 py-2 text-xs font-semibold border ${choice.est_correct ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'}`}>
                                    {choice.est_correct ? '✓ ' : '• '}{choice.libelle}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Résultats associés */}
                      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">Résultats des apprenants</h4>
                        {selectedResults.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center text-xs text-zinc-400">
                            Aucun résultat pour le moment.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold">
                                  <th className="pb-3">Apprenant</th>
                                  <th className="pb-3">Note</th>
                                  <th className="pb-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {selectedResults.map((result) => (
                                  <Fragment key={result.id_tentative}>
                                    <tr>
                                      <td className="py-3 font-semibold text-zinc-900 dark:text-white">{result.prenom} {result.nom}</td>
                                      <td className="py-3 font-bold">{result.note ?? '—'} / 20</td>
                                      <td className="py-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() => setExpandedResultId((current) => current === result.id_tentative ? null : result.id_tentative)}
                                          className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100"
                                        >
                                          {expandedResultId === result.id_tentative ? 'Masquer' : 'Voir les réponses'}
                                        </button>
                                      </td>
                                    </tr>
                                    {expandedResultId === result.id_tentative && (
                                      <tr>
                                        <td colSpan="3" className="pb-4 pt-1">
                                          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
                                            {!result.correction?.length ? (
                                              <p className="text-zinc-400 italic">Aucune réponse enregistrée.</p>
                                            ) : (
                                              result.correction.map((answer) => (
                                                <div key={answer.id_question} className={`rounded-xl p-3 text-xs border ${answer.correcte ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-900 dark:text-rose-200'}`}>
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
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Création de sujet */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4" onClick={() => setShowCreate(false)}>
          <form onSubmit={createSubject} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-black text-zinc-900 dark:text-white">Nouvelle évaluation</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                <X size={16} />
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Durée (minutes)</label>
                <input className={inputClass} type="number" min="1" step="1" placeholder="60" value={subject.duree_minutes} onChange={(event) => setSubject({ ...subject, duree_minutes: event.target.value })} required />
              </div>

              <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-xs font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 self-end h-[46px]">
                <input type="checkbox" checked={subject.obligatoire} onChange={(event) => setSubject({ ...subject, obligatoire: event.target.checked })} /> Obligatoire
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Date et heure de fermeture</label>
              <input className={inputClass} type="datetime-local" value={subject.date_fermeture} onChange={(event) => setSubject({ ...subject, date_fermeture: event.target.value })} required />
            </div>

            <button className="w-full rounded-2xl bg-orange-500 py-3.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 mt-2">
              Créer le sujet
            </button>
          </form>
        </div>
      )}

      {/* Modal Modification du brouillon */}
      {editDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4" onClick={() => setEditDraft(null)}>
          <form onSubmit={updateSubject} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-black text-zinc-900 dark:text-white">Modifier l’évaluation</h2>
              <button type="button" onClick={() => setEditDraft(null)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                <X size={16} />
              </button>
            </div>

            <input className={inputClass} placeholder="Titre de l’évaluation" value={editDraft.titre} onChange={(event) => setEditDraft({ ...editDraft, titre: event.target.value })} required />
            
            <textarea className={`${inputClass} resize-none`} placeholder="Description" value={editDraft.description} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })} rows="3" />
            
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Durée (minutes)</label>
                <input className={inputClass} type="number" min="1" step="1" value={editDraft.duree_minutes} onChange={(event) => setEditDraft({ ...editDraft, duree_minutes: event.target.value })} required />
              </div>
              <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-xs font-bold text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 self-end h-[46px]">
                <input type="checkbox" checked={editDraft.obligatoire} onChange={(event) => setEditDraft({ ...editDraft, obligatoire: event.target.checked })} /> Obligatoire
              </label>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Date et heure de fermeture</label>
              <input className={inputClass} type="datetime-local" value={editDraft.date_fermeture} onChange={(event) => setEditDraft({ ...editDraft, date_fermeture: event.target.value })} required />
            </div>

            <button className="w-full rounded-2xl bg-orange-500 py-3.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 mt-2">
              Enregistrer les modifications
            </button>
          </form>
        </div>
      )}

      {/* Modal Ajout de Question */}
      {showQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4" onClick={() => setShowQuestion(false)}>
          <form onSubmit={addQuestion} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-base font-black text-zinc-900 dark:text-white">Ajouter une question</h2>
              <button type="button" onClick={() => setShowQuestion(false)} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
                <X size={16} />
              </button>
            </div>

            <textarea className={`${inputClass} resize-none`} placeholder="Énoncé de la question" value={question.enonce} onChange={(event) => setQuestion({ ...question, enonce: event.target.value })} rows="3" required />
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Nombre de points</label>
              <input className={inputClass} type="number" min="0.01" max="20" step="0.01" placeholder="5" value={question.points} onChange={(event) => setQuestion({ ...question, points: event.target.value })} required />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-500">Choix de réponse</h3>
                <button type="button" onClick={() => setQuestion({ ...question, choix: [...question.choix, { libelle: '', est_correct: false }] })} className="text-xs font-bold text-orange-500 hover:underline">
                  + Ajouter un choix
                </button>
              </div>

              {question.choix.map((choice, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input className={inputClass} placeholder={`Choix ${index + 1}`} value={choice.libelle} onChange={(event) => updateChoice(index, 'libelle', event.target.value)} required />
                  <label className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <input type="radio" name="correct-choice" checked={choice.est_correct} onChange={() => updateChoice(index, 'est_correct', true)} /> Correct
                  </label>
                </div>
              ))}
            </div>

            <button className="w-full rounded-2xl bg-orange-500 py-3.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 mt-2">
              Ajouter la question
            </button>
          </form>
        </div>
      )}

    </div>
  );
}