// frontend/src/pages/Formateur/GsEvaluation.jsx
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
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
    <div className="fe-container [display:flex] [flex-direction:column] [gap:24px] [padding:12px_12px_48px_12px] [max-width:1280px] [margin:0_auto] [font-family:inherit] [color:var(--fe-text)] [background-color:var(--fe-bg)] [box-sizing:border-box] [min-height:100vh] [transition:background-color_0.3s_ease,_color_0.3s_ease]">
      
      {/* En-tête */}
      <div className="fe-header [display:flex] [flex-direction:column] [gap:16px] [border-bottom:1px_solid_var(--fe-border)] [padding-bottom:24px]">
        <div>
          <p className="fe-header-tag [margin:0] [font-size:11px] [font-weight:700] [text-transform:uppercase] [letter-spacing:0.2em] [color:var(--orange-primary)]">Évaluations</p>
          <h1 className="fe-header-title [margin:8px_0_0_0] [font-size:22px] [font-weight:900] [letter-spacing:-0.025em] [color:var(--fe-text)]">Gestion des évaluations</h1>
          <p className="fe-header-subtitle [margin:6px_0_0_0] [font-size:12px] [color:var(--fe-muted)]">Créez les sujets, composez les questions et suivez les résultats par évaluation.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)} 
          className="fe-create-btn [display:flex] [align-items:center] [justify-content:center] [gap:8px] [border-radius:16px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:10px_18px] [font-size:12px] [font-weight:800] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [box-sizing:border-box] [&:hover]:[opacity:0.9]"
        >
          <i className="bi bi-plus-lg text-sm"></i> Nouvelle évaluation
        </button>
      </div>

      {message.text && (
        <div className={`fe-alert-box ${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      {/* PARTIE STATISTIQUE EN HAUT (AreaChart par Évaluation) */}
      <section className="fe-stats-card [border-radius:24px] [background-color:var(--fe-panel)] [padding:20px] [border:1px_solid_var(--fe-border)] [box-shadow:0_1px_3px_var(--shadow-color)] [box-sizing:border-box]">
        <div className="fe-stats-header [margin-bottom:16px] [display:flex] [flex-direction:column] [gap:8px]">
          <div className="fe-stats-title-row [display:flex] [align-items:center] [gap:8px]">
            <div className="fe-stats-icon-wrap [display:flex] [height:32px] [width:32px] [align-items:center] [justify-content:center] [border-radius:12px] [background-color:var(--orange-bg-light)] [color:var(--orange-primary)]">
              <i className="bi bi-graph-up text-sm"></i>
            </div>
            <h2 className="fe-stats-title [margin:0] [font-size:13px] [font-weight:800] [color:var(--fe-text)]">Taux de réussite par évaluation</h2>
          </div>
          <span className="fe-stats-subtitle [font-size:11px] [color:var(--fe-muted)]">Moyenne globale des notes (%)</span>
        </div>

        {evaluationChartData.length === 0 ? (
          <p className="fe-empty-stats [padding:32px_0] [text-align:center] [font-size:12px] [color:var(--fe-muted)]">Aucune donnée statistique disponible.</p>
        ) : (
          <div className="fe-chart-box [height:220px] [width:100%]">
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

      <section className="fe-ranking-section [display:flex] [flex-direction:column] [gap:16px]">
        <h2 className="fe-section-heading [margin:0] [font-size:15px] [font-weight:800] [color:var(--fe-text)]">Classements</h2>
        <div className="fe-ranking-grid [display:grid] [gap:16px]">
          <div className="fe-ranking-card [border:1px_solid_var(--fe-border)] [border-radius:24px] [background:var(--fe-panel)] [padding:20px]">
            <h3>Classement par formation</h3>
            {rankedFormationResults.map((group) => (
              <div key={group.formation} className="fe-ranking-group [border-radius:16px] [background:var(--fe-subbox)] [margin-top:10px] [padding:14px]">
                <h4>{group.formation}</h4>
                {!group.learners.length ? <p className="fe-empty-results [border-radius:16px] [border:1px_dashed_var(--fe-border)] [padding:20px] [text-align:center] [font-size:12px] [color:var(--fe-muted)]">Aucun résultat.</p> : (
                  <ol>
                    {group.learners.map((learner, index) => (
                      <li key={learner.id}>
                        <span><b>{index + 1}.</b> {learner.name}</span>
                        <strong>{learner.average.toFixed(2)} / 20</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>

          <div className="fe-ranking-card [border:1px_solid_var(--fe-border)] [border-radius:24px] [background:var(--fe-panel)] [padding:20px]">
            <h3>Classement par évaluation</h3>
            {rankedEvaluationResults.map((evaluation) => (
              <div key={evaluation.id_evaluation_sujet} className="fe-ranking-group [border-radius:16px] [background:var(--fe-subbox)] [margin-top:10px] [padding:14px]">
                <h4>{evaluation.titre}</h4>
                <small>{evaluation.formation_titre}</small>
                {!evaluation.learners.length ? <p className="fe-empty-results [border-radius:16px] [border:1px_dashed_var(--fe-border)] [padding:20px] [text-align:center] [font-size:12px] [color:var(--fe-muted)]">Aucun résultat.</p> : (
                  <ol>
                    {evaluation.learners.map((learner, index) => (
                      <li key={learner.id_tentative}>
                        <span><b>{index + 1}.</b> {learner.displayName}</span>
                        <strong>{learner.numericNote.toFixed(2)} / 20</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LISTE DES ÉVALUATIONS + ACCORDÉON */}
      <section className="fe-evaluations-section [display:flex] [flex-direction:column] [gap:16px]">
        <h2 className="fe-section-heading [margin:0] [font-size:15px] [font-weight:800] [color:var(--fe-text)]">Vos sujets d'évaluation</h2>
        
        {evaluations.length === 0 ? (
          <div className="fe-empty-evals [border-radius:24px] [border:2px_dashed_var(--fe-border)] [background-color:var(--fe-panel)] [padding:32px] [text-align:center] [font-size:12px] [color:var(--fe-muted)]">
            Aucune évaluation créée.
          </div>
        ) : (
          <div className="fe-evals-list [display:flex] [flex-direction:column] [gap:12px]">
            {evaluations.map((item) => {
              const isSelected = selectedId === item.id_evaluation_sujet;

              return (
                <div 
                  key={item.id_evaluation_sujet} 
                  className="fe-eval-card [border-radius:24px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-panel)] [box-shadow:0_1px_3px_var(--shadow-color)] [overflow:hidden] [transition:box-shadow_0.2s] [box-sizing:border-box] [&:hover]:[box-shadow:0_8px_20px_var(--shadow-color)]"
                >
                  {/* En-tête de l'évaluation (Cliquable pour dérouler) */}
                  <button 
                    onClick={() => setSelectedId(isSelected ? null : item.id_evaluation_sujet)}
                    className="fe-eval-accordion-btn [width:100%] [padding:20px] [text-align:left] [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [background:none] [border:none] [cursor:pointer] [transition:background-color_0.2s] [box-sizing:border-box] [&:hover]:[background-color:var(--fe-hover)]"
                  >
                    <div>
                      <div className="fe-eval-title-row [display:flex] [align-items:center] [gap:8px]">
                        <span className="fe-eval-name [font-size:13px] [font-weight:800] [color:var(--fe-text)]">{item.titre}</span>
                        <span className="fe-eval-status-badge [border-radius:9999px] [background-color:var(--fe-subbox)] [padding:2px_8px] [font-size:9px] [font-weight:800] [text-transform:uppercase] [color:var(--fe-muted)]">
                          {item.statut}
                        </span>
                      </div>
                      <p className="fe-eval-formation [margin:4px_0_0_0] [font-size:11px] [color:var(--fe-muted)]">{item.formation_titre}</p>
                      {item.statut === 'BROUILLON' && item.date_publication_utc && (
                        <p className="fe-eval-pub-date [margin:4px_0_0_0] [font-size:10px] [font-weight:700] [color:var(--orange-primary)]">
                          Publication programmée : {new Date(item.date_publication_utc).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="fe-eval-right-info [display:flex] [align-items:center] [gap:16px]">
                      <div className="fe-eval-meta-badges [display:none] [gap:12px] [font-size:11px] [font-weight:600] [color:var(--fe-muted)]">
                        <span>{item.questions_count} question(s)</span>
                        <span>{item.total_points}/20 pts</span>
                        <span>{item.tentatives_count} tentative(s)</span>
                      </div>
                      <i className={`bi bi-chevron-down fe-chevron-icon ${isSelected ? 'rotated' : ''}`}></i>
                    </div>
                  </button>

                  {/* CONTENU DÉROULANT DES DÉTAILS */}
                  {isSelected && detail && (
                    <div className="fe-eval-details-box [border-top:1px_solid_var(--fe-border)] [padding:20px] [background-color:var(--fe-subbox)] [display:flex] [flex-direction:column] [gap:20px] [box-sizing:border-box]">
                      
                      <div className="fe-details-top-row [display:flex] [flex-direction:column] [gap:16px]">
                        <div>
                          <p className="fe-details-tag [margin:0] [font-size:11px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--orange-primary)]">{detail.formation_titre}</p>
                          <h3 className="fe-details-title [margin:4px_0_0_0] [font-size:16px] [font-weight:900] [color:var(--fe-text)]">{detail.titre}</h3>
                          <p className="fe-details-desc [margin:4px_0_0_0] [font-size:12px] [color:var(--fe-muted)] [line-height:1.4]">{detail.description || 'Aucune description.'}</p>
                          {detail.statut === 'BROUILLON' && detail.date_publication_utc && (
                            <p className="fe-eval-pub-date [margin:4px_0_0_0] [font-size:10px] [font-weight:700] [color:var(--orange-primary)] mt-2">
                              Publication programmée : {new Date(detail.date_publication_utc).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="fe-details-actions [display:flex] [flex-wrap:wrap] [gap:8px]">
                          {detail.statut === 'BROUILLON' && (
                            <button
                              type="button"
                              onClick={openEdit}
                              className="fe-action-btn [display:flex] [align-items:center] [gap:6px] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-panel)] [padding:8px_12px] [font-size:11px] [font-weight:700] [color:var(--fe-text)] [cursor:pointer] [transition:background-color_0.2s]"
                            >
                              <i className="bi bi-pencil text-sm"></i> Modifier
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={deleteEvaluation}
                            className="fe-action-btn [display:flex] [align-items:center] [gap:6px] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-panel)] [padding:8px_12px] [font-size:11px] [font-weight:700] [color:var(--fe-text)] [cursor:pointer] [transition:background-color_0.2s]"
                          >
                            <i className="bi bi-trash text-sm"></i> Supprimer
                          </button>
                          {detail.statut === 'BROUILLON' && (
                            <button 
                              onClick={publish} 
                              className="fe-action-btn [display:flex] [align-items:center] [gap:6px] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-panel)] [padding:8px_12px] [font-size:11px] [font-weight:700] [color:var(--fe-text)] [cursor:pointer] [transition:background-color_0.2s] primary"
                            >
                              <i className="bi bi-check-circle text-sm"></i> Publier maintenant
                            </button>
                          )}
                          <button 
                            onClick={() => setShowQuestion(true)} 
                            disabled={detail.statut !== 'BROUILLON'} 
                            className="fe-action-btn [display:flex] [align-items:center] [gap:6px] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-panel)] [padding:8px_12px] [font-size:11px] [font-weight:700] [color:var(--fe-text)] [cursor:pointer] [transition:background-color_0.2s]"
                          >
                            <i className="bi bi-plus-lg text-sm"></i> Question
                          </button>
                        </div>
                      </div>

                      {detail.statut === 'BROUILLON' && (
                        <form onSubmit={schedulePublication} className="fe-schedule-form [display:flex] [flex-direction:column] [gap:12px] [border-radius:16px] [background-color:var(--fe-panel)] [padding:16px] [border:1px_solid_var(--fe-border)]">
                          <label className="fe-label-flex [flex:1] [font-size:11px] [font-weight:700] [color:var(--fe-text)]">
                            Date et heure de publication
                            <input className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] mt-1" type="datetime-local" value={publicationAt} onChange={(event) => setPublicationAt(event.target.value)} required />
                          </label>
                          <button type="submit" className="fe-schedule-btn [border-radius:12px] [border:1px_solid_var(--orange-primary)] [background:none] [padding:8px_16px] [font-size:11px] [font-weight:800] [color:var(--orange-primary)] [cursor:pointer] [transition:background-color_0.2s] [&:hover]:[background-color:var(--orange-bg-light)]">
                            Programmer la publication
                          </button>
                        </form>
                      )}

                      {/* Liste des questions */}
                      <div className="fe-questions-section [display:flex] [flex-direction:column] [gap:12px]">
                        <h4 className="fe-subheading [margin:0] [font-size:12px] [font-weight:800] [color:var(--fe-text)]">Questions composées</h4>
                        {detail.questions?.length === 0 ? (
                          <p className="fe-empty-questions [border-radius:16px] [border:1px_dashed_var(--fe-border)] [padding:20px] [text-align:center] [font-size:12px] [color:var(--fe-muted)]">
                            Ajoutez des questions pour atteindre 20 points.
                          </p>
                        ) : (
                          detail.questions.map((item) => (
                            <div key={item.id_question} className="fe-question-item [border-radius:16px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-panel)] [padding:16px] [box-sizing:border-box]">
                              <div className="fe-question-header [display:flex] [justify-content:space-between] [align-items:flex-start] [gap:12px]">
                                <div>
                                  <span className="fe-question-num [font-size:11px] [font-weight:700] [color:var(--orange-primary)]">
                                    Question {item.numero_question} · {item.points} points
                                  </span>
                                  <p className="fe-question-enonce [margin:4px_0_0_0] [font-size:12px] [font-weight:700] [color:var(--fe-text)] [line-height:1.4]">{item.enonce}</p>
                                </div>
                                {detail.statut === 'BROUILLON' && (
                                  <button onClick={() => removeQuestion(item.id_question)} title="Supprimer" className="fe-delete-question-btn [background:none] [border:none] [cursor:pointer] [color:var(--fe-muted)] [transition:color_0.2s] [&:hover]:[color:\#e11d48]">
                                    <i className="bi bi-trash text-sm"></i>
                                  </button>
                                )}
                              </div>
                              <div className="fe-choices-grid [margin-top:12px] [display:grid] [gap:8px] [grid-template-columns:1fr]">
                                {item.choix.map((choice) => (
                                  <div key={choice.id_choix} className={`fe-choice-pill ${choice.est_correct ? 'correct' : ''}`}>
                                    {choice.est_correct ? '✓ ' : ''}{choice.libelle}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Résultats associés */}
                      <div className="fe-results-box [border-top:1px_solid_var(--fe-border)] [padding-top:16px]">
                        <h4 className="fe-subheading [margin:0] [font-size:12px] [font-weight:800] [color:var(--fe-text)] mb-3">Résultats des apprenants</h4>
                        {selectedResults.length === 0 ? (
                          <p className="fe-empty-results [border-radius:16px] [border:1px_dashed_var(--fe-border)] [padding:20px] [text-align:center] [font-size:12px] [color:var(--fe-muted)]">Aucun résultat pour le moment.</p>
                        ) : (
                          <div className="fe-table-wrapper [overflow-x:auto]">
                            <table className="fe-results-table [width:100%] [text-align:left] [font-size:12px] [border-collapse:collapse]">
                              <thead>
                                <tr>
                                  <th>Apprenant</th>
                                  <th>Note</th>
                                  <th>Statut</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedResults.map((result) => (
                                  <Fragment key={result.id_tentative}>
                                    <tr key={result.id_tentative}>
                                      <td>{result.prenom} {result.nom}</td>
                                      <td>{result.note ?? '—'} / 20</td>
                                      <td>
                                        <span>{result.statut}</span>
                                        <button
                                          type="button"
                                          className="fe-btn-secondary"
                                          onClick={() => setExpandedResultId((current) => current === result.id_tentative ? null : result.id_tentative)}
                                        >
                                          {expandedResultId === result.id_tentative ? 'Masquer' : 'Voir les réponses'}
                                        </button>
                                      </td>
                                    </tr>
                                    {expandedResultId === result.id_tentative && (
                                      <tr key={`${result.id_tentative}-correction`}>
                                        <td colSpan="3">
                                          {!result.correction?.length ? (
                                            <p>Aucune réponse enregistrée.</p>
                                          ) : (
                                            result.correction.map((answer) => (
                                              <div key={answer.id_question} className={`fe-choice-pill ${answer.correcte ? 'correct' : ''}`}>
                                                <strong>Question {answer.numero_question} : {answer.enonce}</strong>
                                                <div>Réponse de l’apprenant : {answer.reponse_choisie || 'Aucune réponse'}</div>
                                                {!answer.correcte && <div>Bonne réponse : {answer.reponse_correcte || '—'}</div>}
                                                <div>{answer.correcte ? '✓ Correcte' : '✗ Incorrecte'} — {answer.points_obtenus}/{answer.points} pt</div>
                                              </div>
                                            ))
                                          )}
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
      </section>

      {/* Modal Création de sujet */}
      {showCreate && (
        <div className="fe-modal-backdrop [position:fixed] [inset:0] [z-index:50] [display:flex] [align-items:center] [justify-content:center] [background-color:rgba(0,_0,_0,_0.7)] [backdrop-filter:blur(4px)] [padding:16px] [box-sizing:border-box]" onClick={() => setShowCreate(false)}>
          <form onSubmit={createSubject} onClick={(e) => e.stopPropagation()} className="fe-modal-card [width:100%] [max-width:520px] [border-radius:24px] [background-color:var(--fe-panel)] [border:1px_solid_var(--fe-border)] [padding:24px] [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.5)] [display:flex] [flex-direction:column] [gap:16px] [box-sizing:border-box]">
            <div className="fe-modal-header [display:flex] [align-items:center] [justify-content:space-between]">
              <h2 className="fe-modal-title [margin:0] [font-size:16px] [font-weight:900] [color:var(--fe-text)]">Nouvelle évaluation</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="fe-modal-close [background:none] [border:none] [cursor:pointer] [color:var(--fe-muted)] [padding:4px] [&:hover]:[color:var(--fe-text)]">
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <select className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" value={subject.id_formation} onChange={(event) => setSubject({ ...subject, id_formation: event.target.value })} required>
              <option value="">Choisir une formation</option>
              {formations.map((formation) => (
                <option key={formation.id_formation} value={formation.id_formation}>{formation.titre}</option>
              ))}
            </select>

            <input className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" placeholder="Titre de l’évaluation" value={subject.titre} onChange={(event) => setSubject({ ...subject, titre: event.target.value })} required />
            
            <textarea className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] resize-none" placeholder="Description" value={subject.description} onChange={(event) => setSubject({ ...subject, description: event.target.value })} rows="3" />

            <div className="fe-modal-grid-2 [display:grid] [grid-template-columns:1fr] [gap:12px]">
              <div>
                <label className="fe-field-label [display:block] [font-size:11px] [color:var(--fe-muted)] [margin-bottom:4px] [font-weight:700]">Durée (Indicateur)</label>
                <div className="relative">
                  <input className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" type="number" min="1" step="1" placeholder="Durée en minutes" value={subject.duree_minutes} onChange={(event) => setSubject({ ...subject, duree_minutes: event.target.value })} required />
                  <span className="fe-input-suffix [position:absolute] [right:14px] [top:50%] [transform:translateY(-50%)] [font-size:11px] [color:var(--fe-muted)] [pointer-events:none]">min</span>
                </div>
              </div>

              <label className="fe-checkbox-label [display:flex] [align-items:center] [gap:8px] [border-radius:12px] [border:1px_solid_var(--fe-border)] [padding:0_14px] [font-size:11px] [font-weight:700] [color:var(--fe-text)] [background-color:var(--fe-subbox)] [align-self:flex-end] [height:42px] [box-sizing:border-box]">
                <input type="checkbox" checked={subject.obligatoire} onChange={(event) => setSubject({ ...subject, obligatoire: event.target.checked })} /> Obligatoire
              </label>
            </div>

            <label className="fe-field-label [display:block] [font-size:11px] [color:var(--fe-muted)] [margin-bottom:4px] [font-weight:700]">
              Date et heure de fermeture
              <input className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] mt-1" type="datetime-local" value={subject.date_fermeture} onChange={(event) => setSubject({ ...subject, date_fermeture: event.target.value })} required />
            </label>

            <p className="fe-modal-hint [margin:0] [font-size:10px] [color:var(--fe-muted)] [line-height:1.4]">Après la création, ajoutez les questions puis publiez immédiatement ou programmez la date et l’heure.</p>

            <button className="fe-submit-btn [width:100%] [border-radius:12px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:12px] [font-size:12px] [font-weight:800] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [box-sizing:border-box] [&:hover]:[opacity:0.9]">
              Créer le sujet
            </button>
          </form>
        </div>
      )}

      {/* Modal Modification du brouillon */}
      {editDraft && (
        <div className="fe-modal-backdrop [position:fixed] [inset:0] [z-index:50] [display:flex] [align-items:center] [justify-content:center] [background-color:rgba(0,_0,_0,_0.7)] [backdrop-filter:blur(4px)] [padding:16px] [box-sizing:border-box]" onClick={() => setEditDraft(null)}>
          <form onSubmit={updateSubject} onClick={(e) => e.stopPropagation()} className="fe-modal-card [width:100%] [max-width:520px] [border-radius:24px] [background-color:var(--fe-panel)] [border:1px_solid_var(--fe-border)] [padding:24px] [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.5)] [display:flex] [flex-direction:column] [gap:16px] [box-sizing:border-box]">
            <div className="fe-modal-header [display:flex] [align-items:center] [justify-content:space-between]">
              <h2 className="fe-modal-title [margin:0] [font-size:16px] [font-weight:900] [color:var(--fe-text)]">Modifier l’évaluation</h2>
              <button type="button" onClick={() => setEditDraft(null)} className="fe-modal-close [background:none] [border:none] [cursor:pointer] [color:var(--fe-muted)] [padding:4px] [&:hover]:[color:var(--fe-text)]">
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <input className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" placeholder="Titre de l’évaluation" value={editDraft.titre} onChange={(event) => setEditDraft({ ...editDraft, titre: event.target.value })} required />
            <textarea className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] resize-none" placeholder="Description" value={editDraft.description} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })} rows="3" />
            <div className="fe-modal-grid-2 [display:grid] [grid-template-columns:1fr] [gap:12px]">
              <div>
                <label className="fe-field-label [display:block] [font-size:11px] [color:var(--fe-muted)] [margin-bottom:4px] [font-weight:700]">Durée</label>
                <input className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" type="number" min="1" step="1" value={editDraft.duree_minutes} onChange={(event) => setEditDraft({ ...editDraft, duree_minutes: event.target.value })} required />
              </div>
              <label className="fe-checkbox-label [display:flex] [align-items:center] [gap:8px] [border-radius:12px] [border:1px_solid_var(--fe-border)] [padding:0_14px] [font-size:11px] [font-weight:700] [color:var(--fe-text)] [background-color:var(--fe-subbox)] [align-self:flex-end] [height:42px] [box-sizing:border-box]">
                <input type="checkbox" checked={editDraft.obligatoire} onChange={(event) => setEditDraft({ ...editDraft, obligatoire: event.target.checked })} /> Obligatoire
              </label>
            </div>
            <label className="fe-field-label [display:block] [font-size:11px] [color:var(--fe-muted)] [margin-bottom:4px] [font-weight:700]">
              Date et heure de fermeture
              <input className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] mt-1" type="datetime-local" value={editDraft.date_fermeture} onChange={(event) => setEditDraft({ ...editDraft, date_fermeture: event.target.value })} required />
            </label>
            <button className="fe-submit-btn [width:100%] [border-radius:12px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:12px] [font-size:12px] [font-weight:800] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [box-sizing:border-box] [&:hover]:[opacity:0.9]">Enregistrer les modifications</button>
          </form>
        </div>
      )}

      {/* Modal Ajout de Question */}
      {showQuestion && (
        <div className="fe-modal-backdrop [position:fixed] [inset:0] [z-index:50] [display:flex] [align-items:center] [justify-content:center] [background-color:rgba(0,_0,_0,_0.7)] [backdrop-filter:blur(4px)] [padding:16px] [box-sizing:border-box]" onClick={() => setShowQuestion(false)}>
          <form onSubmit={addQuestion} onClick={(e) => e.stopPropagation()} className="fe-modal-card [width:100%] [max-width:520px] [border-radius:24px] [background-color:var(--fe-panel)] [border:1px_solid_var(--fe-border)] [padding:24px] [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.5)] [display:flex] [flex-direction:column] [gap:16px] [box-sizing:border-box] max-h-[90vh] overflow-y-auto">
            <div className="fe-modal-header [display:flex] [align-items:center] [justify-content:space-between]">
              <h2 className="fe-modal-title [margin:0] [font-size:16px] [font-weight:900] [color:var(--fe-text)]">Ajouter une question</h2>
              <button type="button" onClick={() => setShowQuestion(false)} className="fe-modal-close [background:none] [border:none] [cursor:pointer] [color:var(--fe-muted)] [padding:4px] [&:hover]:[color:var(--fe-text)]">
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <textarea className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s] resize-none" placeholder="Énoncé de la question" value={question.enonce} onChange={(event) => setQuestion({ ...question, enonce: event.target.value })} rows="3" required />
            
            <input className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" type="number" min="0.01" max="20" step="0.01" placeholder="Points" value={question.points} onChange={(event) => setQuestion({ ...question, points: event.target.value })} required />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="fe-subheading [margin:0] [font-size:12px] [font-weight:800] [color:var(--fe-text)]">Choix de réponse</h3>
                <button type="button" onClick={() => setQuestion({ ...question, choix: [...question.choix, { libelle: '', est_correct: false }] })} className="fe-add-choice-link [background:none] [border:none] [cursor:pointer] [font-size:11px] [font-weight:700] [color:var(--orange-primary)] [&:hover]:[text-decoration:underline]">
                  Ajouter un choix
                </button>
              </div>

              {question.choix.map((choice, index) => (
                <div key={index} className="fe-choice-row [display:flex] [align-items:center] [gap:8px]">
                  <input className="fe-input [width:100%] [border-radius:12px] [border:1px_solid_var(--fe-border)] [background-color:var(--fe-subbox)] [padding:10px_14px] [font-size:12px] [color:var(--fe-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]" placeholder={`Choix ${index + 1}`} value={choice.libelle} onChange={(event) => updateChoice(index, 'libelle', event.target.value)} required />
                  <label className="fe-radio-label [display:flex] [flex-shrink:0] [align-items:center] [gap:4px] [font-size:11px] [font-weight:700] [color:var(--fe-text)]">
                    <input type="radio" name="correct-choice" checked={choice.est_correct} onChange={() => updateChoice(index, 'est_correct', true)} /> Correct
                  </label>
                </div>
              ))}
            </div>

            <button className="fe-submit-btn [width:100%] [border-radius:12px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:12px] [font-size:12px] [font-weight:800] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [box-sizing:border-box] [&:hover]:[opacity:0.9]">
              Ajouter la question
            </button>
          </form>
        </div>
      )}

    </div>
  );
}