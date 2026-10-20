import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import API from '../../services/api';

const inputClass = 'w-full rounded-xl border border-slate-200 dark:border-zinc-800 bg-transparent p-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-800 dark:text-zinc-100';

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
  const [subject, setSubject] = useState({ id_formation: searchParams.get('formation') || '', titre: '', description: '', duree_minutes: 60, obligatoire: true });
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

  // Données statistiques par évaluation pour le AreaChart
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
      setSubject({ id_formation: '', titre: '', description: '', duree_minutes: 60, obligatoire: true }); 
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
    <div className="space-y-6 p-3 sm:p-6 text-slate-800 dark:text-zinc-100 font-sans transition-colors duration-300">
      
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Évaluations</p>
          <h1 className="mt-2 text-2xl tracking-tight text-slate-900 dark:text-white">Gestion des évaluations</h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">Créez les sujets, composez les questions et suivez les résultats par évaluation.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)} 
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-xs text-white transition shadow-sm"
        >
          <i className="bi bi-plus-lg text-sm"></i> Nouvelle évaluation
        </button>
      </div>

      {message.text && (
        <div className={`rounded-xl border p-3 text-xs ${message.type === 'error' ? 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-300'}`}>
          {message.text}
        </div>
      )}

      {/* PARTIE STATISTIQUE EN HAUT (AreaChart par Évaluation) */}
      <section className="rounded-3xl bg-white dark:bg-zinc-900 p-5 border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              <i className="bi bi-graph-up text-sm"></i>
            </div>
            <h2 className="text-sm text-slate-900 dark:text-white">Taux de réussite par évaluation</h2>
          </div>
          <span className="text-[11px] text-slate-400">Moyenne globale des notes (%)</span>
        </div>

        {evaluationChartData.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">Aucune donnée statistique disponible.</p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evaluationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReussiteEval" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid #27272a', color: '#fff', fontSize: '11px' }}
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
      </section>

      {/* LISTE DES ÉVALUATIONS EN BAS + SYSTÈME DÉROULANT (ACCORDÉON) POUR LES DÉTAILS */}
      <section className="space-y-4">
        <h2 className="text-sm text-slate-900 dark:text-white">Vos sujets d'évaluation</h2>
        
        {evaluations.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800 p-8 text-center text-xs text-slate-400">
            Aucune évaluation créée.
          </div>
        ) : (
          <div className="space-y-3">
            {evaluations.map((item) => {
              const isSelected = selectedId === item.id_evaluation_sujet;

              return (
                <div 
                  key={item.id_evaluation_sujet} 
                  className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden transition"
                >
                  {/* En-tête de l'évaluation (Cliquable pour dérouler) */}
                  <button 
                    onClick={() => setSelectedId(isSelected ? null : item.id_evaluation_sujet)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-900 dark:text-white">{item.titre}</span>
                        <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[9px] uppercase text-slate-600 dark:text-zinc-300">
                          {item.statut}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">{item.formation_titre}</p>
                      {item.statut === 'BROUILLON' && item.date_publication_utc && (
                        <p className="mt-1 text-[10px] text-orange-600 dark:text-orange-400">
                          Publication programmée : {new Date(item.date_publication_utc).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:flex gap-3 text-[11px] text-slate-500 dark:text-zinc-400">
                        <span>{item.questions_count} question(s)</span>
                        <span>{item.total_points}/20 pts</span>
                        <span>{item.tentatives_count} tentative(s)</span>
                      </div>
                      <i className={`bi bi-chevron-down text-xs transition-transform ${isSelected ? 'rotate-180 text-orange-500' : 'text-slate-400'}`}></i>
                    </div>
                  </button>

                  {/* CONTENU DÉROULANT (ACCORDÉON) DES DÉTAILS DE L'ÉVALUATION */}
                  {isSelected && detail && (
                    <div className="border-t border-slate-100 dark:border-zinc-800 p-5 bg-slate-50/50 dark:bg-zinc-950/40 space-y-5 animate-fadeIn">
                      
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-orange-600 dark:text-orange-400">{detail.formation_titre}</p>
                          <h3 className="mt-1 text-lg text-slate-900 dark:text-white">{detail.titre}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{detail.description || 'Aucune description.'}</p>
                          {detail.statut === 'BROUILLON' && detail.date_publication_utc && (
                            <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
                              Publication programmée : {new Date(detail.date_publication_utc).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {detail.statut === 'BROUILLON' && (
                            <button 
                              onClick={publish} 
                              className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-3 py-2 text-xs text-white transition"
                            >
                              <i className="bi bi-check-circle text-sm"></i> Publier maintenant
                            </button>
                          )}
                          <button 
                            onClick={() => setShowQuestion(true)} 
                            disabled={detail.statut !== 'BROUILLON'} 
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 px-3 py-2 text-xs disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                          >
                            <i className="bi bi-plus-lg text-sm"></i> Question
                          </button>
                        </div>
                      </div>

                      {detail.statut === 'BROUILLON' && (
                        <form onSubmit={schedulePublication} className="flex flex-col gap-2 rounded-2xl bg-white dark:bg-zinc-900 p-4 border border-slate-200 dark:border-zinc-800 sm:flex-row sm:items-end">
                          <label className="flex-1 text-xs text-slate-700 dark:text-zinc-300">
                            Date et heure de publication
                            <input className={`${inputClass} mt-1`} type="datetime-local" value={publicationAt} onChange={(event) => setPublicationAt(event.target.value)} required />
                          </label>
                          <button type="submit" className="rounded-xl border border-orange-500 px-4 py-2 text-xs text-orange-700 hover:bg-orange-500/10 dark:text-orange-300 transition">
                            Programmer la publication
                          </button>
                        </form>
                      )}

                      {/* Liste des questions */}
                      <div className="space-y-3">
                        <h4 className="text-xs text-slate-900 dark:text-white">Questions composées</h4>
                        {detail.questions?.length === 0 ? (
                          <p className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 p-5 text-center text-xs text-slate-400">
                            Ajoutez des questions pour atteindre 20 points.
                          </p>
                        ) : (
                          detail.questions.map((item) => (
                            <div key={item.id_question} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                              <div className="flex justify-between gap-3">
                                <div>
                                  <span className="text-[11px] text-orange-600 dark:text-orange-400">
                                    Question {item.numero_question} · {item.points} points
                                  </span>
                                  <p className="mt-1 text-xs text-slate-800 dark:text-zinc-200">{item.enonce}</p>
                                </div>
                                {detail.statut === 'BROUILLON' && (
                                  <button onClick={() => removeQuestion(item.id_question)} title="Supprimer" className="text-slate-400 hover:text-red-500 transition">
                                    <i className="bi bi-trash text-sm"></i>
                                  </button>
                                )}
                              </div>
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {item.choix.map((choice) => (
                                  <div key={choice.id_choix} className={`rounded-xl border px-3 py-2 text-xs ${choice.est_correct ? 'border-orange-500/50 bg-orange-500/10 text-orange-800 dark:text-orange-300' : 'border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                                    {choice.est_correct ? '✓ ' : ''}{choice.libelle}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Résultats associés */}
                      <div className="border-t border-slate-200 dark:border-zinc-800 pt-4">
                        <h4 className="mb-3 text-xs text-slate-900 dark:text-white">Résultats des apprenants</h4>
                        {selectedResults.length === 0 ? (
                          <p className="text-xs text-slate-400">Aucun résultat pour le moment.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400">
                                  <th className="p-2">Apprenant</th>
                                  <th className="p-2">Note</th>
                                  <th className="p-2">Statut</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedResults.map((result) => (
                                  <tr key={result.id_tentative} className="border-b border-slate-100 dark:border-zinc-800/60">
                                    <td className="p-2 text-slate-800 dark:text-zinc-200">{result.prenom} {result.nom}</td>
                                    <td className="p-2 text-slate-900 dark:text-white">{result.note ?? '—'} / 20</td>
                                    <td className="p-2 text-slate-500 dark:text-zinc-400">{result.statut}</td>
                                  </tr>
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
      </section>

      {/* Modal Création de sujet avec Indicateur de Durée */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={createSubject} className="w-full max-w-lg space-y-4 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl text-slate-800 dark:text-zinc-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-slate-900 dark:text-white">Nouvelle évaluation</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <i className="bi bi-x-lg text-sm"></i>
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

            <div className="grid grid-cols-2 gap-3">
              {/* Indicateur de durée explicitement visible */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Durée (Indicateur)</label>
                <div className="relative">
                  <input className={inputClass} type="number" min="1" step="1" placeholder="Durée en minutes" value={subject.duree_minutes} onChange={(event) => setSubject({ ...subject, duree_minutes: event.target.value })} required />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">min</span>
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-800 px-3 text-xs self-end h-[42px]">
                <input type="checkbox" checked={subject.obligatoire} onChange={(event) => setSubject({ ...subject, obligatoire: event.target.checked })} /> Obligatoire
              </label>
            </div>

            <p className="text-[11px] text-slate-400">Après la création, ajoutez les questions puis publiez immédiatement ou programmez la date et l’heure.</p>

            <button className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 py-3 text-xs text-white transition shadow-sm">
              Créer le sujet
            </button>
          </form>
        </div>
      )}

      {/* Modal Ajout de Question */}
      {showQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={addQuestion} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl text-slate-800 dark:text-zinc-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg text-slate-900 dark:text-white">Ajouter une question</h2>
              <button type="button" onClick={() => setShowQuestion(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <textarea className={`${inputClass} resize-none`} placeholder="Énoncé de la question" value={question.enonce} onChange={(event) => setQuestion({ ...question, enonce: event.target.value })} rows="3" required />
            
            <input className={inputClass} type="number" min="0.01" max="20" step="0.01" placeholder="Points" value={question.points} onChange={(event) => setQuestion({ ...question, points: event.target.value })} required />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs text-slate-900 dark:text-white">Choix de réponse</h3>
                <button type="button" onClick={() => setQuestion({ ...question, choix: [...question.choix, { libelle: '', est_correct: false }] })} className="text-xs text-orange-600 dark:text-orange-400 hover:underline">
                  Ajouter un choix
                </button>
              </div>

              {question.choix.map((choice, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input className={inputClass} placeholder={`Choix ${index + 1}`} value={choice.libelle} onChange={(event) => updateChoice(index, 'libelle', event.target.value)} required />
                  <label className="flex shrink-0 items-center gap-1 text-xs text-slate-600 dark:text-zinc-300">
                    <input type="radio" name="correct-choice" checked={choice.est_correct} onChange={() => updateChoice(index, 'est_correct', true)} /> Correct
                  </label>
                </div>
              ))}
            </div>

            <button className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 py-3 text-xs text-white transition shadow-sm">
              Ajouter la question
            </button>
          </form>
        </div>
      )}

    </div>
  );
}