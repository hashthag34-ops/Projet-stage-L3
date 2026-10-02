import { useEffect, useState, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardCheck, Clock3, Play, RotateCcw, Send, AlertTriangle } from 'lucide-react';
import API from '../../services/api';

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
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(null);

  // References to keep fresh state in callbacks & timers
  const answersRef = useRef(answers);
  const attemptRef = useRef(attempt);
  const submittingRef = useRef(submitting);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  const loadEvaluations = async () => {
    const response = await API.get('/apprenant/evaluations');
    setEvaluations(Array.isArray(response.data) ? response.data : []);
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadEvaluations()
        .catch((loadError) => setError(loadError.response?.data?.message || 'Impossible de charger les évaluations.'))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  const submitAttempt = useCallback(async (isAutoSubmit = false) => {
    const currentAttempt = attemptRef.current;
    if (!currentAttempt || submittingRef.current) return;

    setSubmitting(true);
    setError('');

    try {
      const response = await API.post(`/apprenant/evaluations/tentatives/${currentAttempt.id_tentative}/terminer`, {
        reponses: Object.entries(answersRef.current).map(([id_question, id_choix]) => ({ id_question, id_choix }))
      });
      setResult(response.data);
      setAttempt(null);
      setTimeLeft(null);
      await loadEvaluations();
    } catch (submitError) {
      setError(submitError.response?.data?.message || 'Impossible d’enregistrer vos réponses.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    if (!detail || !detail.duree_minutes || !attempt) {
      setTimeLeft(null);
      return;
    }

    // Calculation based on duration
    const initialTime = detail.duree_minutes * 60;
    setTimeLeft(initialTime);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          submitAttempt(true); // Automatic submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [detail, attempt, submitAttempt]);

  const openEvaluation = async (evaluation) => {
    if (evaluation.tentative_statut === 'TERMINEE') return; // Double protection

    setOpeningId(evaluation.id_evaluation_sujet);
    setError('');
    setResult(null);
    setAnswers({});
    try {
      const [detailResponse, attemptResponse] = await Promise.all([
        API.get(`/apprenant/evaluations/${evaluation.id_evaluation_sujet}`),
        API.post(`/apprenant/evaluations/${evaluation.id_evaluation_sujet}/tentatives`)
      ]);
      setDetail(detailResponse.data);
      setAttempt(attemptResponse.data);
    } catch (openError) {
      setError(openError.response?.data?.message || 'Impossible d’ouvrir cette évaluation.');
    } finally {
      setOpeningId(null);
    }
  };

  const handleSubmitForm = (event) => {
    event.preventDefault();
    submitAttempt(false);
  };

  const leaveEvaluation = () => {
    setDetail(null);
    setAttempt(null);
    setAnswers({});
    setResult(null);
    setTimeLeft(null);
    setError('');
  };

  if (loading) return <p className="py-8 text-sm text-black/50 dark:text-white/50">Chargement des évaluations...</p>;

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end dark:border-white/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Espace apprenant</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Mes évaluations</h1>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Passez les évaluations publiées pour vos formations.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-black/55 dark:text-white/55">
          <ClipboardCheck size={18} className="text-orange-500" />
          {evaluations.length} évaluation{evaluations.length === 1 ? '' : 's'} disponible{evaluations.length === 1 ? '' : 's'}
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

      {detail ? (
        <section className="mx-auto max-w-3xl">
          <button type="button" onClick={leaveEvaluation} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-black/60 hover:text-orange-600 dark:text-white/60 dark:hover:text-orange-400">
            <ArrowLeft size={16} /> Retour aux évaluations
          </button>
          {result ? (
            <div className="border-y border-black/10 py-10 text-center dark:border-white/10">
              <CheckCircle2 size={42} className="mx-auto text-orange-500" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">Évaluation terminée</p>
              <h2 className="mt-2 text-2xl font-black">{detail.titre}</h2>
              <p className="mt-3 text-4xl font-black">{result.note} <span className="text-lg text-black/40 dark:text-white/40">/ 20</span></p>
              <button type="button" onClick={leaveEvaluation} className="mt-6 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-orange-400">Retour à la liste</button>
            </div>
          ) : (
            <form onSubmit={handleSubmitForm} className="space-y-5">
              <div className="flex flex-col justify-between gap-4 border-b border-black/10 pb-5 sm:flex-row sm:items-start dark:border-white/10">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">{detail.formation_titre}</p>
                  <h2 className="mt-1 text-2xl font-black">{detail.titre}</h2>
                  {detail.description && <p className="mt-2 text-sm text-black/55 dark:text-white/55">{detail.description}</p>}
                  <p className="mt-3 text-xs font-semibold text-black/50 dark:text-white/50">{detail.questions.length} questions · {detail.total_points}/20 points</p>
                </div>
                
                {detail.duree_minutes && (
                  <div className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${
                    timeLeft !== null && timeLeft <= 60 
                      ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 animate-pulse' 
                      : 'border-black/10 dark:border-white/10'
                  }`}>
                    {timeLeft !== null && timeLeft <= 60 ? <AlertTriangle size={16} /> : <Clock3 size={16} />}
                    {timeLeft !== null ? formatSeconds(timeLeft) : formatDuration(detail.duree_minutes)}
                  </div>
                )}
              </div>

              {detail.questions.map((question) => (
                <fieldset key={question.id_question} className="border-b border-black/10 pb-5 dark:border-white/10">
                  <legend className="w-full pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Question {question.numero_question} · {question.points} points</span>
                    <span className="mt-1 block font-semibold">{question.enonce}</span>
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.choix.map((choice) => (
                      <label key={choice.id_choix} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${Number(answers[question.id_question]) === choice.id_choix ? 'border-orange-500 bg-orange-500/10' : 'border-black/10 hover:border-orange-500/50 dark:border-white/10'}`}>
                        <input
                          type="radio"
                          name={`question-${question.id_question}`}
                          value={choice.id_choix}
                          checked={Number(answers[question.id_question]) === choice.id_choix}
                          onChange={() => setAnswers((current) => ({ ...current, [question.id_question]: choice.id_choix }))}
                          className="mt-0.5 accent-orange-500"
                        />
                        <span>{choice.libelle}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}

              <div className="flex flex-col justify-between gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center dark:border-white/10">
                <p className="text-xs text-black/50 dark:text-white/50">Les questions sans réponse valent zéro point.</p>
                <button type="submit" disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-bold text-black hover:bg-orange-400 disabled:cursor-wait disabled:opacity-50">
                  <Send size={16} /> {submitting ? 'Envoi...' : 'Terminer l’évaluation'}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : evaluations.length === 0 ? (
        <div className="border-y border-dashed border-black/15 py-14 text-center dark:border-white/15">
          <ClipboardCheck size={36} className="mx-auto text-orange-500" />
          <h2 className="mt-3 font-bold">Aucune évaluation disponible</h2>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">Les évaluations publiées par vos formateurs apparaîtront ici.</p>
        </div>
      ) : (
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {evaluations.map((evaluation) => {
            const completed = evaluation.tentative_statut === 'TERMINEE';
            const inProgress = evaluation.tentative_statut === 'EN_COURS';
            return (
              <article key={evaluation.id_evaluation_sujet} className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400"><BookOpen size={14} /> {evaluation.formation_titre}</p>
                  <h2 className="mt-1 text-lg font-bold">{evaluation.titre}</h2>
                  {evaluation.description && <p className="mt-1 line-clamp-2 text-sm text-black/55 dark:text-white/55">{evaluation.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-black/50 dark:text-white/50">
                    <span>{evaluation.questions_count} questions</span>
                    <span>{evaluation.total_points}/20 points</span>
                    <span>{formatDuration(evaluation.duree_minutes)}</span>
                    {evaluation.obligatoire && <span className="font-bold text-black/70 dark:text-white/70">Obligatoire</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  {completed ? (
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={14} /> Terminé
                      </span>
                      <span className="text-sm font-bold text-black/70 dark:text-white/70">Note : {evaluation.note}/20</span>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => openEvaluation(evaluation)} 
                      disabled={openingId === evaluation.id_evaluation_sujet} 
                      className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-orange-400 disabled:opacity-50"
                    >
                      {inProgress ? <RotateCcw size={16} /> : <Play size={16} />}
                      {openingId === evaluation.id_evaluation_sujet ? 'Ouverture...' : inProgress ? 'Reprendre' : 'Commencer'}
                    </button>
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