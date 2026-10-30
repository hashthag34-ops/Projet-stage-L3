// frontend/src/pages/Apprenant/ApprenantEvaluations.jsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardCheck, Play, RotateCcw, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import API from '../../services/api';
import { getRealtimeSocket } from '../../services/realtime';
import '../css/ApprenantEvaluations.css'; // Importation du CSS classique

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

  if (loading) return <p className="eval-loading">Chargement des évaluations...</p>;

  const totalQuestions = detail?.questions?.length || 0;
  const currentQuestion = detail?.questions?.[currentQuestionIndex];
  const progressPercent = totalQuestions > 0 ? Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100) : 0;

  return (
    <div className="eval-container">
      <header className="eval-header">
        <div>
          <p className="eval-header-tag">Espace apprenant</p>
          <h1 className="eval-header-title">Mes évaluations</h1>
          <p className="eval-header-desc">Passez les évaluations publiées pour vos formations.</p>
        </div>
        <div className="eval-badge-counter">
          <ClipboardCheck size={16} className="counter-icon" />
          {evaluations.length} évaluation{evaluations.length === 1 ? '' : 's'} disponible{evaluations.length === 1 ? '' : 's'}
        </div>
      </header>

      {error && <p role="alert" className="eval-error-alert">{error}</p>}

      {detail ? (
        <section className="eval-quiz-section">
          <button type="button" onClick={leaveEvaluation} className="eval-back-btn">
            <ArrowLeft size={15} /> Retour aux évaluations
          </button>
          
          {result ? (
            <div className="eval-result-card">
              <CheckCircle2 size={38} className="result-check-icon" />
              <p className="result-tag">Évaluation terminée</p>
              <h2 className="result-title">{detail.titre}</h2>
              <p className="result-score">{result.note} <span className="score-denominator">/ 20</span></p>
              {terminationReason === 'onglet' && <p role="alert" className="result-warning">La tentative a été terminée automatiquement car l’onglet a été quitté.</p>}
              {terminationReason === 'temps' && <p className="result-warning">Le temps est écoulé. Seules les réponses sauvegardées avant la fin ont été prises en compte.</p>}
              <button type="button" onClick={leaveEvaluation} className="eval-btn-primary">Retour à la liste</button>
            </div>
          ) : (
            <div className="eval-quiz-card">
              
              {/* En-tête : Titre, Progression & Minuterie */}
              <div className="quiz-topbar">
                <div>
                  <p className="quiz-formation-tag">{detail.formation_titre}</p>
                  <h2 className="quiz-title">{detail.titre}</h2>
                  <p className="quiz-progress-text">Total test: {progressPercent}% complété</p>
                </div>

                <div className="quiz-timer-wrapper">
                  {detail.duree_minutes && (
                    <div className="timer-badge">
                      <div className="timer-circle">
                        <span className="timer-text">{timeLeft !== null ? formatSeconds(timeLeft) : formatDuration(detail.duree_minutes)}</span>
                      </div>
                      <div className="timer-label">
                        Temps restant
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Avertissement anti-triche */}
              <p className="quiz-anticheat-banner">
                ⚠️ Quitter cet onglet terminera immédiatement l’évaluation.
              </p>

              {/* Question active */}
              {currentQuestion && (
                <fieldset className="quiz-fieldset">
                  <legend className="quiz-legend">
                    <div className="quiz-meta-row">
                      <span>Question {currentQuestion.numero_question} sur {totalQuestions}</span>
                      <span className="quiz-points">{currentQuestion.points} point{currentQuestion.points > 1 ? 's' : ''}</span>
                    </div>
                    <span className="quiz-question-text">{currentQuestion.enonce}</span>
                  </legend>

                  <div className="quiz-choices-list">
                    {currentQuestion.choix.map((choice) => {
                      const isSelected = Number(answers[currentQuestion.id_question]) === choice.id_choix;
                      return (
                        <label 
                          key={choice.id_choix} 
                          className={`quiz-choice-label ${isSelected ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id_question}`}
                            value={choice.id_choix}
                            checked={isSelected}
                            onChange={() => saveAnswer(currentQuestion.id_question, choice.id_choix)}
                            className="quiz-radio"
                          />
                          <span>{choice.libelle}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* Navigation mobile-friendly */}
              <div className="quiz-navigation-footer">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  className="eval-nav-btn secondary"
                >
                  <ChevronLeft size={15} /> Précédent
                </button>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                    className="eval-nav-btn primary"
                  >
                    Suivant <ChevronRight size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitAttempt(false)}
                    className="eval-nav-btn primary"
                  >
                    <Send size={14} /> {submitting ? 'Envoi...' : 'Terminer l’évaluation'}
                  </button>
                )}
              </div>

            </div>
          )}
        </section>
      ) : evaluations.length === 0 ? (
        <div className="eval-empty-card">
          <ClipboardCheck size={32} className="empty-icon" />
          <h2 className="empty-title">Aucune évaluation disponible</h2>
          <p className="empty-desc">Les évaluations publiées par vos formateurs apparaîtront ici.</p>
        </div>
      ) : (
        <div className="eval-grid">
          {evaluations.map((evaluation) => {
            const completed = evaluation.tentative_statut === 'TERMINEE';
            const inProgress = evaluation.tentative_statut === 'EN_COURS';
            return (
              <article key={evaluation.id_evaluation_sujet} className="eval-card">
                <div>
                  <p className="eval-card-formation"><BookOpen size={13} className="formation-icon" /> {evaluation.formation_titre}</p>
                  <h2 className="eval-card-title">{evaluation.titre}</h2>
                  {evaluation.description && <p className="eval-card-desc">{evaluation.description}</p>}
                  <div className="eval-card-meta">
                    <span>{evaluation.questions_count} questions</span>
                    <span>{evaluation.total_points}/20 pts</span>
                    <span>{formatDuration(evaluation.duree_minutes)}</span>
                  </div>
                </div>
                <div className="eval-card-footer">
                  {completed ? (
                    <>
                      <span className="status-badge-done">
                        <CheckCircle2 size={13} /> Terminé
                      </span>
                      <span className="eval-note-text">Note : {evaluation.note}/20</span>
                    </>
                  ) : (
                    <>
                      <span className="eval-type-label">{evaluation.obligatoire ? 'Obligatoire' : 'Optionnel'}</span>
                      <button 
                        type="button" 
                        onClick={() => openEvaluation(evaluation)} 
                        disabled={openingId === evaluation.id_evaluation_sujet} 
                        className="eval-start-btn"
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