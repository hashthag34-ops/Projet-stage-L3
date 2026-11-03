// frontend/src/pages/Apprenant/ApprenantEvaluations.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardCheck, Play, RotateCcw, Send, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import API from '../../services/api';
import { getRealtimeSocket } from '../../services/realtime';

const cardClass = 'rounded-3xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 sm:p-6';
const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className={`${cardClass} w-full max-w-md p-8 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400`}>
          Chargement des évaluations...
        </div>
      </div>
    );
  }

  const totalQuestions = detail?.questions?.length || 0;
  const currentQuestion = detail?.questions?.[currentQuestionIndex];
  const progressPercent = totalQuestions > 0 ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:space-y-6 sm:px-6 sm:py-6">
      
      {/* En-tête (Optimisé mobile compact) */}
      <header className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 sm:text-xs">Espace apprenant</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Mes évaluations</h1>
          <p className="mt-1 text-xs text-zinc-300 sm:text-sm">Passez les évaluations publiées pour vos formations.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-orange-500/10 border border-orange-500/20 px-3.5 py-2 text-xs font-bold text-orange-400">
          <ClipboardCheck size={15} />
          {evaluations.length} évaluation{evaluations.length === 1 ? '' : 's'} disponible{evaluations.length === 1 ? '' : 's'}
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {detail ? (
        <section className="space-y-4">
          <button 
            type="button" 
            onClick={leaveEvaluation} 
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <ArrowLeft size={16} /> Retour aux évaluations
          </button>
          
          {result ? (
            <div className={`${cardClass} text-center p-6 sm:p-10 space-y-4`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Évaluation terminée</p>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white sm:text-2xl">{detail.titre}</h2>
              <p className="text-3xl font-black text-orange-600 dark:text-orange-400">
                {result.note} <span className="text-sm font-bold text-zinc-400">/ 20</span>
              </p>
              
              {terminationReason === 'onglet' && (
                <div role="alert" className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  La tentative a été terminée automatiquement car l’onglet a été quitté.
                </div>
              )}
              {terminationReason === 'temps' && (
                <div role="alert" className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Le temps est écoulé. Seules les réponses sauvegardées avant la fin ont été prises en compte.
                </div>
              )}

              {!!result.correction?.length && (
                <div className="mt-6 text-left space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Correction détaillée</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {result.correction.map((question) => (
                      <div 
                        key={question.id_question} 
                        className={`rounded-2xl border p-4 text-xs ${question.correcte ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}
                      >
                        <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-white mb-1.5">
                          <span>Question {question.numero_question}</span>
                          <span className={question.correcte ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {question.points_obtenus} / {question.points} pt
                          </span>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-2">{question.enonce}</p>
                        <p className="text-zinc-600 dark:text-zinc-400"><b>Votre réponse :</b> {question.reponse_choisie_libelle || 'Aucune réponse'}</p>
                        {!question.correcte && (
                          <p className="text-emerald-700 dark:text-emerald-400 mt-1"><b>Bonne réponse :</b> {question.reponse_correcte_libelle}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                type="button" 
                onClick={leaveEvaluation} 
                className="mt-4 w-full rounded-2xl bg-orange-500 py-3 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 sm:max-w-xs"
              >
                Retour à la liste
              </button>
            </div>
          ) : (
            <div className={`${cardClass} space-y-5 sm:p-8`}>
              
              {/* En-tête : Titre, Progression & Minuterie */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">{detail.formation_titre}</p>
                  <h2 className="mt-1 text-lg font-black text-zinc-900 dark:text-white sm:text-xl">{detail.titre}</h2>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-semibold">Test : {progressPercent}% complété</p>
                </div>

                {detail.duree_minutes && (
                  <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-zinc-400">Temps restant</p>
                      <p className="text-sm font-black text-orange-600 dark:text-orange-400 tabular-nums">
                        {timeLeft !== null ? formatSeconds(timeLeft) : formatDuration(detail.duree_minutes)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Avertissement anti-triche */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle size={18} className="shrink-0" />
                <span>Quitter cet onglet terminera immédiatement l’évaluation.</span>
              </div>

              {/* Question active */}
              {currentQuestion && (
                <fieldset className="space-y-4 border-0 p-0 m-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      <span>Question {currentQuestion.numero_question} sur {totalQuestions}</span>
                      <span className="rounded-lg bg-orange-500/10 px-2 py-0.5 text-orange-600 dark:text-orange-400 font-extrabold">
                        {currentQuestion.points} point{currentQuestion.points > 1 ? 's' : ''}
                      </span>
                    </div>
                    <legend className="text-sm font-black text-zinc-900 dark:text-white sm:text-base leading-snug">
                      {currentQuestion.enonce}
                    </legend>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {currentQuestion.choix.map((choice) => {
                      const isSelected = Number(answers[currentQuestion.id_question]) === choice.id_choix;
                      return (
                        <label 
                          key={choice.id_choix} 
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${isSelected ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/30 text-orange-950 dark:text-orange-200' : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/80'}`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id_question}`}
                            value={choice.id_choix}
                            checked={isSelected}
                            onChange={() => saveAnswer(currentQuestion.id_question, choice.id_choix)}
                            className="h-4 w-4 text-orange-500 focus:ring-orange-500 dark:border-zinc-700"
                          />
                          <span className="text-xs font-bold sm:text-sm">{choice.libelle}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* Navigation mobile-friendly */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Précédent
                </button>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-500 px-5 py-2.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400"
                  >
                    Suivant <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitAttempt(false)}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-500 px-5 py-2.5 text-xs font-black text-zinc-950 shadow-sm transition hover:bg-orange-400 disabled:opacity-50"
                  >
                    <Send size={15} /> {submitting ? 'Envoi...' : 'Terminer l’évaluation'}
                  </button>
                )}
              </div>

            </div>
          )}
        </section>
      ) : evaluations.length === 0 ? (
        <div className={`${cardClass} flex flex-col items-center justify-center border-dashed p-12 text-center`}>
          <ClipboardCheck size={36} className="text-zinc-400" />
          <h2 className="mt-3 text-sm font-bold text-zinc-800 dark:text-zinc-200">Aucune évaluation disponible</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Les évaluations publiées par vos formateurs apparaîtront ici.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {evaluations.map((evaluation) => {
            const completed = evaluation.tentative_statut === 'TERMINEE';
            const inProgress = evaluation.tentative_statut === 'EN_COURS';
            return (
              <article key={evaluation.id_evaluation_sujet} className={`${cardClass} flex flex-col justify-between`}>
                <div className="space-y-2.5">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    <BookOpen size={13} /> {evaluation.formation_titre}
                  </p>
                  <h2 className="text-base font-black text-zinc-900 dark:text-white line-clamp-2">{evaluation.titre}</h2>
                  {evaluation.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">{evaluation.description}</p>}
                  
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    <span className="rounded-lg bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{evaluation.questions_count} questions</span>
                    <span className="rounded-lg bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{evaluation.total_points}/20 pts</span>
                    <span className="rounded-lg bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{formatDuration(evaluation.duree_minutes)}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  {completed ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={13} /> Terminé
                      </span>
                      <span className="text-xs font-black text-zinc-900 dark:text-white">Note : {evaluation.note}/20</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] font-bold text-zinc-400">{evaluation.obligatoire ? 'Obligatoire' : 'Optionnel'}</span>
                      <button 
                        type="button" 
                        onClick={() => openEvaluation(evaluation)} 
                        disabled={openingId === evaluation.id_evaluation_sujet} 
                        className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-zinc-950 shadow-xs transition hover:bg-orange-400 disabled:opacity-50"
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