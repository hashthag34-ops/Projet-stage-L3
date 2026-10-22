import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardCheck, Play, RotateCcw, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../../services/api';
import { getRealtimeSocket } from '../../services/realtime';

const formatDuration = (minutes) => {
  if (!minutes) return 'Sans limite de durée';
  return `${minutes} min`;
};

const formatSeconds = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function ApprenantEvaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [detail, setDetail] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [terminationReason, setTerminationReason] = useState(null);
  
  // Navigation question par question
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(null);

  // References
  const answersRef = useRef(answers);
  const attemptRef = useRef(attempt);
  const submittingRef = useRef(submitting);
  const answerSaveQueue = useRef(Promise.resolve());
  const answerSaveErrors = useRef(new Set());
  const serverClockOffset = useRef(0);
  const tabSwitchTriggered = useRef(false);
  const timeoutSubmitTriggered = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  const loadEvaluations = useCallback(async () => {
    const response = await API.get('/apprenant/evaluations');
    setEvaluations(Array.isArray(response.data) ? response.data : []);
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadEvaluations()
        .catch((loadError) => setError(loadError.response?.data?.message || 'Impossible de charger les évaluations.'))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadEvaluations]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const refreshEvaluations = () => {
      loadEvaluations().catch((loadError) => {
        setError(loadError.response?.data?.message || 'Impossible de charger les évaluations.');
      });
    };
    socket.on('evaluations:changed', refreshEvaluations);
    return () => socket.off('evaluations:changed', refreshEvaluations);
  }, [loadEvaluations]);

  const submitAttempt = useCallback(async (isAutoSubmit = false, reason = null) => {
    const currentAttempt = attemptRef.current;
    if (!currentAttempt || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError('');

    try {
      await answerSaveQueue.current;
      if (answerSaveErrors.current.size > 0 && !isAutoSubmit) {
        setError('Une réponse n’a pas pu être sauvegardée. Vérifiez votre connexion puis réessayez.');
        return;
      }
      const response = await API.post(`/apprenant/evaluations/tentatives/${currentAttempt.id_tentative}/terminer`, {});
      setResult(response.data);
      setAttempt(null);
      attemptRef.current = null;
      setTimeLeft(null);
      setTerminationReason(reason);
      await loadEvaluations();
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Impossible d’enregistrer vos réponses.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [loadEvaluations]);

  // Timer Countdown
  useEffect(() => {
    if (!attempt || !attempt.deadline_epoch_ms) return;

    const deadline = Number(attempt.deadline_epoch_ms);
    if (!Number.isFinite(deadline)) return;

    serverClockOffset.current = Number(attempt.server_now_epoch_ms) - Date.now();
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((deadline - (Date.now() + serverClockOffset.current)) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && !timeoutSubmitTriggered.current) {
        timeoutSubmitTriggered.current = true;
        submitAttempt(true, 'temps');
      }
    };
    updateTimer();
    const timer = setInterval(updateTimer, 250);

    return () => clearInterval(timer);
  }, [attempt, submitAttempt]);

  useEffect(() => {
    if (!detail || !attempt || result) return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !tabSwitchTriggered.current) {
        tabSwitchTriggered.current = true;
        submitAttempt(true, 'onglet');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [detail, attempt, result, submitAttempt]);

  const openEvaluation = async (evaluation) => {
    if (evaluation.tentative_statut === 'TERMINEE') return;

    setOpeningId(evaluation.id_evaluation_sujet);
    setError('');
    setResult(null);
    setTerminationReason(null);
    setAnswers({});
    setCurrentQuestionIndex(0);
    try {
      const [detailResponse, attemptResponse] = await Promise.all([
        API.get(`/apprenant/evaluations/${evaluation.id_evaluation_sujet}`),
        API.post(`/apprenant/evaluations/${evaluation.id_evaluation_sujet}/tentatives`)
      ]);
      setDetail(detailResponse.data);
      setAttempt(attemptResponse.data);
      attemptRef.current = attemptResponse.data;
      const savedAnswers = Object.fromEntries(
        (attemptResponse.data.reponses || []).map((answer) => [answer.id_question, answer.id_choix])
      );
      answersRef.current = savedAnswers;
      setAnswers(savedAnswers);
      answerSaveQueue.current = Promise.resolve();
      answerSaveErrors.current.clear();
      tabSwitchTriggered.current = false;
      timeoutSubmitTriggered.current = false;
    } catch (openError) {
      setError(openError.response?.data?.message || 'Impossible d’ouvrir cette évaluation.');
    } finally {
      setOpeningId(null);
    }
  };

  const saveAnswer = (questionId, choiceId) => {
    const attemptId = attemptRef.current?.id_tentative;
    if (!attemptId) return;

    const updatedAnswers = { ...answersRef.current, [questionId]: choiceId };
    answersRef.current = updatedAnswers;
    setAnswers(updatedAnswers);
    answerSaveQueue.current = answerSaveQueue.current.then(async () => {
      try {
        await API.put(`/apprenant/evaluations/tentatives/${attemptId}/reponses`, {
          id_question: questionId,
          id_choix: choiceId
        });
        answerSaveErrors.current.delete(questionId);
      } catch (saveError) {
        answerSaveErrors.current.add(questionId);
        setError(saveError.response?.data?.message || 'Impossible de sauvegarder votre réponse.');
      }
    });
  };

  const leaveEvaluation = () => {
    setDetail(null);
    setAttempt(null);
    attemptRef.current = null;
    setAnswers({});
    setResult(null);
    setTimeLeft(null);
    setTerminationReason(null);
    setCurrentQuestionIndex(0);
    answersRef.current = {};
    answerSaveQueue.current = Promise.resolve();
    answerSaveErrors.current.clear();
    tabSwitchTriggered.current = false;
    timeoutSubmitTriggered.current = false;
    setError('');
  };

  if (loading) return <p className="p-6 text-xs text-zinc-500 dark:text-zinc-400 font-sans">Chargement des évaluations...</p>;

  const totalQuestions = detail?.questions?.length || 0;
  const currentQuestion = detail?.questions?.[currentQuestionIndex];
  const progressPercent = totalQuestions > 0 ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500 dark:text-orange-400">Espace apprenant</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Mes évaluations</h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Passez les évaluations publiées pour vos formations.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <ClipboardCheck size={16} className="text-orange-500" />
          {evaluations.length} évaluation{evaluations.length === 1 ? '' : 's'} disponible{evaluations.length === 1 ? '' : 's'}
        </div>
      </header>

      {error && <p role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-700 dark:text-rose-300">{error}</p>}

      {detail ? (
        <section className="mx-auto max-w-2xl">
          <button type="button" onClick={leaveEvaluation} className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition">
            <ArrowLeft size={15} /> Retour aux évaluations
          </button>
          
          {result ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <CheckCircle2 size={38} className="mx-auto text-orange-500" />
              <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Évaluation terminée</p>
              <h2 className="mt-2 text-xl font-black">{detail.titre}</h2>
              <p className="mt-3 text-3xl font-black">{result.note} <span className="text-sm font-normal text-zinc-400">/ 20</span></p>
              {terminationReason === 'onglet' && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">La tentative a été terminée automatiquement car l’onglet a été quitté.</p>}
              {terminationReason === 'temps' && <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">Le temps est écoulé. Seules les réponses sauvegardées avant la fin ont été prises en compte.</p>}
              <button type="button" onClick={leaveEvaluation} className="mt-6 rounded-2xl bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900">Retour à la liste</button>
            </div>
          ) : (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
              
              {/* En-tête : Titre, Progression & Minuterie */}
              <div className="flex flex-col gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500">{detail.formation_titre}</p>
                  <h2 className="mt-1 text-lg font-black">{detail.titre}</h2>
                  <p className="mt-1 text-[11px] font-semibold text-zinc-400">Total test: {progressPercent}% complété</p>
                </div>

                <div className="flex items-center gap-4">
                  {detail.duree_minutes && (
                    <div className="flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 px-3.5 py-2">
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-orange-500 text-orange-500">
                        <span className="text-[10px] font-black">{timeLeft !== null ? formatSeconds(timeLeft) : formatDuration(detail.duree_minutes)}</span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Temps restant
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Avertissement anti-triche */}
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                ⚠️ Quitter cet onglet terminera immédiatement l’évaluation.
              </p>

              {/* Question active */}
              {currentQuestion && (
                <fieldset className="space-y-4">
                  <legend className="w-full pb-2">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      <span>Question {currentQuestion.numero_question} sur {totalQuestions}</span>
                      <span className="text-orange-500">{currentQuestion.points} point{currentQuestion.points > 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 block">{currentQuestion.enonce}</span>
                  </legend>

                  <div className="space-y-2.5 pt-2">
                    {currentQuestion.choix.map((choice) => {
                      const isSelected = Number(answers[currentQuestion.id_question]) === choice.id_choix;
                      return (
                        <label 
                          key={choice.id_choix} 
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-xs font-medium transition ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-500/10 text-zinc-900 dark:text-white font-bold' 
                              : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id_question}`}
                            value={choice.id_choix}
                            checked={isSelected}
                            onChange={() => saveAnswer(currentQuestion.id_question, choice.id_choix)}
                            className="accent-orange-500"
                          />
                          <span>{choice.libelle}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-5">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition"
                >
                  <ChevronLeft size={15} /> Précédent
                </button>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-orange-400 transition shadow-xs"
                  >
                    Suivant <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitAttempt(false)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-zinc-950 hover:bg-orange-400 disabled:opacity-50 transition shadow-xs"
                  >
                    <Send size={14} /> {submitting ? 'Envoi...' : 'Terminer l’évaluation'}
                  </button>
                )}
              </div>

            </div>
          )}
        </section>
      ) : evaluations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <ClipboardCheck size={32} className="mx-auto text-orange-500" />
          <h2 className="mt-3 text-sm font-bold">Aucune évaluation disponible</h2>
          <p className="mt-1 text-xs text-zinc-400">Les évaluations publiées par vos formateurs apparaîtront ici.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {evaluations.map((evaluation) => {
            const completed = evaluation.tentative_statut === 'TERMINEE';
            const inProgress = evaluation.tentative_statut === 'EN_COURS';
            return (
              <article key={evaluation.id_evaluation_sujet} className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400"><BookOpen size={13} className="text-orange-500" /> {evaluation.formation_titre}</p>
                  <h2 className="mt-1.5 text-sm font-bold text-zinc-900 dark:text-white">{evaluation.titre}</h2>
                  {evaluation.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">{evaluation.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                    <span>{evaluation.questions_count} questions</span>
                    <span>{evaluation.total_points}/20 pts</span>
                    <span>{formatDuration(evaluation.duree_minutes)}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  {completed ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={13} /> Terminé
                      </span>
                      <span className="text-xs font-bold">Note : {evaluation.note}/20</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-medium text-zinc-400">{evaluation.obligatoire ? 'Obligatoire' : 'Optionnel'}</span>
                      <button 
                        type="button" 
                        onClick={() => openEvaluation(evaluation)} 
                        disabled={openingId === evaluation.id_evaluation_sujet} 
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-orange-400 disabled:opacity-50 transition shadow-xs"
                      >
                        {inProgress ? <RotateCcw size={14} /> : <Play size={14} />}
                        {openingId === evaluation.id_evaluation_sujet ? 'Ouverture...' : inProgress ? 'Reprendre' : 'Commencer'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}