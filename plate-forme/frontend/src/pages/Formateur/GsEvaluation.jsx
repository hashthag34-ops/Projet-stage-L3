// frontend/src/pages/Formateur/GsEvaluation.jsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import API from '../../services/api';
import '../css/FormateurEvaluations.css'; // Importation du CSS classique

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

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
    <div className="fe-container">
      
      {/* En-tête */}
      <div className="fe-header">
        <div>
          <p className="fe-header-tag">Évaluations</p>
          <h1 className="fe-header-title">Gestion des évaluations</h1>
          <p className="fe-header-subtitle">Créez les sujets, composez les questions et suivez les résultats par évaluation.</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)} 
          className="fe-create-btn"
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
      <section className="fe-stats-card">
        <div className="fe-stats-header">
          <div className="fe-stats-title-row">
            <div className="fe-stats-icon-wrap">
              <i className="bi bi-graph-up text-sm"></i>
            </div>
            <h2 className="fe-stats-title">Taux de réussite par évaluation</h2>
          </div>
          <span className="fe-stats-subtitle">Moyenne globale des notes (%)</span>
        </div>

        {evaluationChartData.length === 0 ? (
          <p className="fe-empty-stats">Aucune donnée statistique disponible.</p>
        ) : (
          <div className="fe-chart-box">
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

      {/* LISTE DES ÉVALUATIONS + ACCORDÉON */}
      <section className="fe-evaluations-section">
        <h2 className="fe-section-heading">Vos sujets d'évaluation</h2>
        
        {evaluations.length === 0 ? (
          <div className="fe-empty-evals">
            Aucune évaluation créée.
          </div>
        ) : (
          <div className="fe-evals-list">
            {evaluations.map((item) => {
              const isSelected = selectedId === item.id_evaluation_sujet;

              return (
                <div 
                  key={item.id_evaluation_sujet} 
                  className="fe-eval-card"
                >
                  {/* En-tête de l'évaluation (Cliquable pour dérouler) */}
                  <button 
                    onClick={() => setSelectedId(isSelected ? null : item.id_evaluation_sujet)}
                    className="fe-eval-accordion-btn"
                  >
                    <div>
                      <div className="fe-eval-title-row">
                        <span className="fe-eval-name">{item.titre}</span>
                        <span className="fe-eval-status-badge">
                          {item.statut}
                        </span>
                      </div>
                      <p className="fe-eval-formation">{item.formation_titre}</p>
                      {item.statut === 'BROUILLON' && item.date_publication_utc && (
                        <p className="fe-eval-pub-date">
                          Publication programmée : {new Date(item.date_publication_utc).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="fe-eval-right-info">
                      <div className="fe-eval-meta-badges">
                        <span>{item.questions_count} question(s)</span>
                        <span>{item.total_points}/20 pts</span>
                        <span>{item.tentatives_count} tentative(s)</span>
                      </div>
                      <i className={`bi bi-chevron-down fe-chevron-icon ${isSelected ? 'rotated' : ''}`}></i>
                    </div>
                  </button>

                  {/* CONTENU DÉROULANT DES DÉTAILS */}
                  {isSelected && detail && (
                    <div className="fe-eval-details-box">
                      
                      <div className="fe-details-top-row">
                        <div>
                          <p className="fe-details-tag">{detail.formation_titre}</p>
                          <h3 className="fe-details-title">{detail.titre}</h3>
                          <p className="fe-details-desc">{detail.description || 'Aucune description.'}</p>
                          {detail.statut === 'BROUILLON' && detail.date_publication_utc && (
                            <p className="fe-eval-pub-date mt-2">
                              Publication programmée : {new Date(detail.date_publication_utc).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="fe-details-actions">
                          {detail.statut === 'BROUILLON' && (
                            <button
                              type="button"
                              onClick={openEdit}
                              className="fe-action-btn"
                            >
                              <i className="bi bi-pencil text-sm"></i> Modifier
                            </button>
                          )}
                          {detail.statut === 'BROUILLON' && (
                            <button 
                              onClick={publish} 
                              className="fe-action-btn primary"
                            >
                              <i className="bi bi-check-circle text-sm"></i> Publier maintenant
                            </button>
                          )}
                          <button 
                            onClick={() => setShowQuestion(true)} 
                            disabled={detail.statut !== 'BROUILLON'} 
                            className="fe-action-btn"
                          >
                            <i className="bi bi-plus-lg text-sm"></i> Question
                          </button>
                        </div>
                      </div>

                      {detail.statut === 'BROUILLON' && (
                        <form onSubmit={schedulePublication} className="fe-schedule-form">
                          <label className="fe-label-flex">
                            Date et heure de publication
                            <input className="fe-input mt-1" type="datetime-local" value={publicationAt} onChange={(event) => setPublicationAt(event.target.value)} required />
                          </label>
                          <button type="submit" className="fe-schedule-btn">
                            Programmer la publication
                          </button>
                        </form>
                      )}

                      {/* Liste des questions */}
                      <div className="fe-questions-section">
                        <h4 className="fe-subheading">Questions composées</h4>
                        {detail.questions?.length === 0 ? (
                          <p className="fe-empty-questions">
                            Ajoutez des questions pour atteindre 20 points.
                          </p>
                        ) : (
                          detail.questions.map((item) => (
                            <div key={item.id_question} className="fe-question-item">
                              <div className="fe-question-header">
                                <div>
                                  <span className="fe-question-num">
                                    Question {item.numero_question} · {item.points} points
                                  </span>
                                  <p className="fe-question-enonce">{item.enonce}</p>
                                </div>
                                {detail.statut === 'BROUILLON' && (
                                  <button onClick={() => removeQuestion(item.id_question)} title="Supprimer" className="fe-delete-question-btn">
                                    <i className="bi bi-trash text-sm"></i>
                                  </button>
                                )}
                              </div>
                              <div className="fe-choices-grid">
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
                      <div className="fe-results-box">
                        <h4 className="fe-subheading mb-3">Résultats des apprenants</h4>
                        {selectedResults.length === 0 ? (
                          <p className="fe-empty-results">Aucun résultat pour le moment.</p>
                        ) : (
                          <div className="fe-table-wrapper">
                            <table className="fe-results-table">
                              <thead>
                                <tr>
                                  <th>Apprenant</th>
                                  <th>Note</th>
                                  <th>Statut</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedResults.map((result) => (
                                  <tr key={result.id_tentative}>
                                    <td>{result.prenom} {result.nom}</td>
                                    <td>{result.note ?? '—'} / 20</td>
                                    <td>{result.statut}</td>
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

      {/* Modal Création de sujet */}
      {showCreate && (
        <div className="fe-modal-backdrop" onClick={() => setShowCreate(false)}>
          <form onSubmit={createSubject} onClick={(e) => e.stopPropagation()} className="fe-modal-card">
            <div className="fe-modal-header">
              <h2 className="fe-modal-title">Nouvelle évaluation</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="fe-modal-close">
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <select className="fe-input" value={subject.id_formation} onChange={(event) => setSubject({ ...subject, id_formation: event.target.value })} required>
              <option value="">Choisir une formation</option>
              {formations.map((formation) => (
                <option key={formation.id_formation} value={formation.id_formation}>{formation.titre}</option>
              ))}
            </select>

            <input className="fe-input" placeholder="Titre de l’évaluation" value={subject.titre} onChange={(event) => setSubject({ ...subject, titre: event.target.value })} required />
            
            <textarea className="fe-input resize-none" placeholder="Description" value={subject.description} onChange={(event) => setSubject({ ...subject, description: event.target.value })} rows="3" />

            <div className="fe-modal-grid-2">
              <div>
                <label className="fe-field-label">Durée (Indicateur)</label>
                <div className="relative">
                  <input className="fe-input" type="number" min="1" step="1" placeholder="Durée en minutes" value={subject.duree_minutes} onChange={(event) => setSubject({ ...subject, duree_minutes: event.target.value })} required />
                  <span className="fe-input-suffix">min</span>
                </div>
              </div>

              <label className="fe-checkbox-label">
                <input type="checkbox" checked={subject.obligatoire} onChange={(event) => setSubject({ ...subject, obligatoire: event.target.checked })} /> Obligatoire
              </label>
            </div>

            <label className="fe-field-label">
              Date et heure de fermeture
              <input className="fe-input mt-1" type="datetime-local" value={subject.date_fermeture} onChange={(event) => setSubject({ ...subject, date_fermeture: event.target.value })} required />
            </label>

            <p className="fe-modal-hint">Après la création, ajoutez les questions puis publiez immédiatement ou programmez la date et l’heure.</p>

            <button className="fe-submit-btn">
              Créer le sujet
            </button>
          </form>
        </div>
      )}

      {/* Modal Modification du brouillon */}
      {editDraft && (
        <div className="fe-modal-backdrop" onClick={() => setEditDraft(null)}>
          <form onSubmit={updateSubject} onClick={(e) => e.stopPropagation()} className="fe-modal-card">
            <div className="fe-modal-header">
              <h2 className="fe-modal-title">Modifier l’évaluation</h2>
              <button type="button" onClick={() => setEditDraft(null)} className="fe-modal-close">
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <input className="fe-input" placeholder="Titre de l’évaluation" value={editDraft.titre} onChange={(event) => setEditDraft({ ...editDraft, titre: event.target.value })} required />
            <textarea className="fe-input resize-none" placeholder="Description" value={editDraft.description} onChange={(event) => setEditDraft({ ...editDraft, description: event.target.value })} rows="3" />
            <div className="fe-modal-grid-2">
              <div>
                <label className="fe-field-label">Durée</label>
                <input className="fe-input" type="number" min="1" step="1" value={editDraft.duree_minutes} onChange={(event) => setEditDraft({ ...editDraft, duree_minutes: event.target.value })} required />
              </div>
              <label className="fe-checkbox-label">
                <input type="checkbox" checked={editDraft.obligatoire} onChange={(event) => setEditDraft({ ...editDraft, obligatoire: event.target.checked })} /> Obligatoire
              </label>
            </div>
            <label className="fe-field-label">
              Date et heure de fermeture
              <input className="fe-input mt-1" type="datetime-local" value={editDraft.date_fermeture} onChange={(event) => setEditDraft({ ...editDraft, date_fermeture: event.target.value })} required />
            </label>
            <button className="fe-submit-btn">Enregistrer les modifications</button>
          </form>
        </div>
      )}

      {/* Modal Ajout de Question */}
      {showQuestion && (
        <div className="fe-modal-backdrop" onClick={() => setShowQuestion(false)}>
          <form onSubmit={addQuestion} onClick={(e) => e.stopPropagation()} className="fe-modal-card max-h-[90vh] overflow-y-auto">
            <div className="fe-modal-header">
              <h2 className="fe-modal-title">Ajouter une question</h2>
              <button type="button" onClick={() => setShowQuestion(false)} className="fe-modal-close">
                <i className="bi bi-x-lg text-sm"></i>
              </button>
            </div>

            <textarea className="fe-input resize-none" placeholder="Énoncé de la question" value={question.enonce} onChange={(event) => setQuestion({ ...question, enonce: event.target.value })} rows="3" required />
            
            <input className="fe-input" type="number" min="0.01" max="20" step="0.01" placeholder="Points" value={question.points} onChange={(event) => setQuestion({ ...question, points: event.target.value })} required />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="fe-subheading">Choix de réponse</h3>
                <button type="button" onClick={() => setQuestion({ ...question, choix: [...question.choix, { libelle: '', est_correct: false }] })} className="fe-add-choice-link">
                  Ajouter un choix
                </button>
              </div>

              {question.choix.map((choice, index) => (
                <div key={index} className="fe-choice-row">
                  <input className="fe-input" placeholder={`Choix ${index + 1}`} value={choice.libelle} onChange={(event) => updateChoice(index, 'libelle', event.target.value)} required />
                  <label className="fe-radio-label">
                    <input type="radio" name="correct-choice" checked={choice.est_correct} onChange={() => updateChoice(index, 'est_correct', true)} /> Correct
                  </label>
                </div>
              ))}
            </div>

            <button className="fe-submit-btn">
              Ajouter la question
            </button>
          </form>
        </div>
      )}

    </div>
  );
}