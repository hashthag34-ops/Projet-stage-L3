// frontend/src/pages/Formateur/Forum_2.jsx
import { useEffect, useState, useRef } from 'react';
import API from '../../services/api';
import { getRealtimeSocket, subscribeToForum } from '../../services/realtime';


const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export default function FormateurForum({ responsable = false }) {
  const [forums, setForums] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  
  const messagesEndRef = useRef(null);

  const rolePath = responsable ? '/responsable' : '/formateur';
  useEffect(() => {
    API.get(rolePath + '/forums')
      .then((response) => {
        const availableForums = Array.isArray(response.data) ? response.data : [];
        setForums(availableForums);
        setSelected(availableForums[0] || null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger les forums.'))
      .finally(() => setLoading(false));
    API.get('/me').then((response) => setCurrentUser(response.data)).catch(() => {});
  }, [rolePath]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const refreshForums = () => {
      API.get(rolePath + '/forums')
        .then((response) => {
          const availableForums = Array.isArray(response.data) ? response.data : [];
          setForums(availableForums);
          setSelected((current) => (
            availableForums.find((forum) => forum.id_forum === current?.id_forum)
            || availableForums[0]
            || null
          ));
        })
        .catch((requestError) => {
          setError(requestError.response?.data?.message || 'Impossible de charger les forums.');
        });
    };
    socket.on('formations:changed', refreshForums);
    return () => socket.off('formations:changed', refreshForums);
  }, [rolePath]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }

    let active = true;
    setMessagesLoading(true);
    setError('');
    const unsubscribe = subscribeToForum(selected.id_forum, () => {
      API.get(`${rolePath}/forums/${selected.id_forum}/messages`)
        .then((response) => setMessages(Array.isArray(response.data) ? response.data : []))
        .catch((requestError) => {
          setError(requestError.response?.data?.message || 'Impossible de charger les messages.');
        });
    });
    API.get(`${rolePath}/forums/${selected.id_forum}/messages`)
      .then((response) => {
        if (active) setMessages(Array.isArray(response.data) ? response.data : []);
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Impossible de charger les messages.');
      })
      .finally(() => {
        if (active) setMessagesLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [selected, rolePath]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    if ((!content.trim() && !file) || !selected) return;

    const payload = new FormData();
    payload.append('contenu', content.trim());
    if (file) payload.append('fichier', file);

    setSending(true);
    setError('');
    try {
      await API.post(`${rolePath}/forums/${selected.id_forum}/messages`, payload);
      const response = await API.get(`${rolePath}/forums/${selected.id_forum}/messages`);
      setMessages(Array.isArray(response.data) ? response.data : []);
      setContent('');
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'envoi du message.");
    } finally {
      setSending(false);
    }
  };

  const download = async (message) => {
    setDownloading(message.id_message);
    setError('');
    try {
      const response = await API.get(
        `${rolePath}/forums/${selected.id_forum}/messages/${message.id_message}/download`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = message.nom_fichier || 'piece-jointe';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Impossible de télécharger ce fichier.');
    } finally {
      setDownloading(null);
    }
  };

  const saveMessage = async (messageId) => {
    if (!editingContent.trim()) return;
    try {
      await API.patch(`${rolePath}/forums/${selected.id_forum}/messages/${messageId}`, { contenu: editingContent.trim() });
      const response = await API.get(`${rolePath}/forums/${selected.id_forum}/messages`);
      setMessages(Array.isArray(response.data) ? response.data : []);
      setEditingId(null);
      setEditingContent('');
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de modifier le message.');
    }
  };

  const removeMessage = async (messageId) => {
    if (!window.confirm('Supprimer définitivement ce message ?')) return;
    try {
      await API.delete(`${rolePath}/forums/${selected.id_forum}/messages/${messageId}`);
      setMessages((current) => current.filter((message) => message.id_message !== messageId));
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de supprimer le message.');
    }
  };

  if (loading) return <div className="ff-loading [padding:32px] [text-align:center] [font-size:12px] [color:var(--ff-muted)]">Chargement des forums...</div>;

  return (
    <div className="ff-container [display:flex] [flex-direction:column] [height:calc(100vh_-_90px)] [padding:8px_8px_24px_8px] [max-width:1280px] [margin:0_auto] [font-family:inherit] [color:var(--ff-text)] [background-color:var(--ff-bg)] [box-sizing:border-box] [transition:background-color_0.3s_ease,_color_0.3s_ease]">
      
      {/* En-tête */}
      <div className="ff-header [border-bottom:1px_solid_var(--ff-border)] [padding-bottom:12px] [flex-shrink:0]">
        <p className="ff-header-tag [margin:0] [font-size:11px] [font-weight:700] [text-transform:uppercase] [letter-spacing:0.15em] [color:var(--orange-primary)]">Communication</p>
        <h1 className="ff-header-title [margin:4px_0_0_0] [font-size:20px] [font-weight:900] [letter-spacing:-0.025em] [color:var(--ff-text)]">Messagerie & Forums</h1>
      </div>

      {error && (
        <p role="alert" className="ff-error-alert [margin:8px_0] [border-radius:12px] [border:1px_solid_rgba(249,_115,_22,_0.3)] [background-color:var(--orange-bg-light)] [padding:10px_14px] [font-size:12px] [color:var(--orange-primary)] [flex-shrink:0]">
          {error}
        </p>
      )}

      {/* CONTENEUR PRINCIPAL */}
      <div className={`ff-layout-card ${selected ? 'mobile-chat-active' : ''}`}>
        
        {/* PANNEAU GAUCHE : LISTE DES FORUMS */}
        <aside className="ff-sidebar [display:flex] [flex-direction:column] [min-height:0] [border-right:1px_solid_var(--ff-border)] [background-color:var(--ff-sidebar-bg)] [padding:12px]">
          <h2 className="ff-sidebar-heading [margin:0] [padding:8px_12px] [font-size:11px] [font-weight:800] [text-transform:uppercase] [letter-spacing:0.05em] [color:var(--ff-muted)] [flex-shrink:0]">Forums</h2>
          
          <div className="ff-sidebar-list [flex:1] [overflow-y:auto] [display:flex] [flex-direction:column] [gap:4px] [padding-right:4px]">
            {forums.map((forum) => {
              const isSelected = selected?.id_forum === forum.id_forum;
              return (
                <button
                  key={forum.id_forum}
                  onClick={() => setSelected(forum)}
                  className={`ff-forum-btn ${isSelected ? 'selected' : ''}`}
                >
                  <span className="ff-forum-name [display:block] [font-size:12px] [font-weight:800] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]">{forum.nom}</span>
                  <span className={`ff-forum-formation ${isSelected ? 'selected' : ''}`}>
                    {forum.formation_titre}
                  </span>
                </button>
              );
            })}
            {!forums.length && <p className="ff-no-forums [padding:16px] [font-size:12px] [color:var(--ff-muted)] [text-align:center]">Aucun forum associé.</p>}
          </div>
        </aside>

        {/* PANNEAU DROIT : CONTENU DU FORUM ACTIF */}
        <section className="ff-chat-pane [display:flex] [flex-direction:column] [min-height:0] [min-width:0] [background-color:var(--ff-panel)] [flex:1]">
          
          {selected ? (
            <>
              {/* Entête du forum actif */}
              <div className="ff-chat-topbar [border-bottom:1px_solid_var(--ff-border)] [padding:12px_16px] [display:flex] [align-items:center] [gap:12px] [flex-shrink:0] [box-sizing:border-box]">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="ff-back-btn [display:flex] [align-items:center] [justify-content:center] [border-radius:10px] [padding:6px_10px] [background:none] [border:1px_solid_var(--ff-border)] [color:var(--ff-text)] [cursor:pointer]"
                  aria-label="Retour à la liste des forums"
                >
                  <i className="bi bi-arrow-left"></i>
                </button>
                <div className="ff-chat-title-info [min-width:0] [flex:1]">
                  <h2 className="ff-chat-name [margin:0] [font-size:13px] [font-weight:800] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis] [color:var(--ff-text)]">{selected.nom}</h2>
                  <p className="ff-chat-formation [margin:2px_0_0_0] [font-size:10px] [color:var(--ff-muted)] [white-space:nowrap] [overflow:hidden] [text-overflow:ellipsis]">{selected.formation_titre}</p>
                </div>
              </div>

              {/* LISTE DES MESSAGES */}
              <div className="ff-messages-scroll [flex:1] [overflow-y:auto] [padding:16px] [display:flex] [flex-direction:column] [gap:12px] [background-color:var(--ff-sidebar-bg)] [box-sizing:border-box]">
                {messagesLoading ? (
                  <p className="ff-messages-loading [text-align:center] [padding:32px_0] [font-size:12px] [color:var(--ff-muted)]">Chargement des messages...</p>
                ) : (
                  <>
                    {messages.map((message) => (
                      <article key={message.id_message} className="ff-message-card [border-radius:16px] [border:1px_solid_var(--ff-border)] [background-color:var(--ff-panel)] [padding:12px] [display:flex] [flex-direction:column] [gap:6px] [box-shadow:0_1px_2px_var(--shadow-color)] [box-sizing:border-box]">
                        <p className="ff-message-author [margin:0] [font-size:11px] [font-weight:700] [color:var(--orange-primary)]">
                          {message.prenom} {message.nom_expediteur} · {new Date(message.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        {editingId === message.id_message ? (
                          <div>
                            <input value={editingContent} onChange={(event) => setEditingContent(event.target.value)} />
                            <button type="button" onClick={() => saveMessage(message.id_message)}>Enregistrer</button>
                            <button type="button" onClick={() => { setEditingId(null); setEditingContent(''); }}>Annuler</button>
                          </div>
                        ) : (
                          <>
                            {message.contenu && <p className="ff-message-text [margin:0] [white-space:pre-wrap] [word-break:break-word] [font-size:12px] [color:var(--ff-text)] [line-height:1.4]">{message.contenu}</p>}
                            {(Number(message.id_utilisateur) === Number(currentUser?.id_utilisateur) || !responsable || responsable) && (
                              <div>
                                {Number(message.id_utilisateur) === Number(currentUser?.id_utilisateur) && (
                                  <button type="button" onClick={() => { setEditingId(message.id_message); setEditingContent(message.contenu || ''); }}>Modifier</button>
                                )}
                                <button type="button" onClick={() => removeMessage(message.id_message)}>Supprimer</button>
                              </div>
                            )}
                          </>
                        )}
                        
                        {message.chemin_fichier && (
                          <div className="ff-file-box [margin-top:4px] [display:flex] [flex-wrap:wrap] [align-items:center] [justify-content:space-between] [gap:12px] [border-radius:12px] [border:1px_solid_var(--ff-border)] [background-color:var(--ff-bg)] [padding:10px_12px] [box-sizing:border-box]">
                            <div className="ff-file-info [min-width:0] [flex:1]">
                              <p className="ff-file-name [margin:0] [font-size:12px] [font-weight:800] [word-break:break-all] [color:var(--ff-text)]">{message.nom_fichier}</p>
                              <p className="ff-file-meta [margin:2px_0_0_0] [font-size:10px] [color:var(--ff-muted)]">
                                {message.type_fichier || 'Fichier'}{message.taille_fichier ? ` · ${formatFileSize(Number(message.taille_fichier))}` : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => download(message)}
                              disabled={downloading === message.id_message}
                              className="ff-download-btn [display:inline-flex] [flex-shrink:0] [align-items:center] [gap:6px] [border-radius:10px] [border:none] [background-color:var(--orange-primary)] [color:\#18181b] [padding:6px_12px] [font-size:11px] [font-weight:800] [cursor:pointer] [transition:opacity_0.2s]"
                            >
                              <i className="bi bi-download text-xs"></i>
                              {downloading === message.id_message ? '...' : 'Télécharger'}
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                    {!messages.length && <p className="ff-no-messages [text-align:center] [padding:32px_0] [font-size:12px] [color:var(--ff-muted)]">Aucun message pour le moment.</p>}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* SAISIE DE MESSAGE */}
              <form onSubmit={send} className="ff-input-form [border-top:1px_solid_var(--ff-border)] [padding:12px] [background-color:var(--ff-panel)] [display:flex] [flex-direction:column] [gap:8px] [flex-shrink:0] [box-sizing:border-box]">
                {file && (
                  <div className="ff-attachment-preview [display:flex] [align-items:center] [justify-content:space-between] [gap:12px] [border-radius:12px] [border:1px_solid_var(--ff-border)] [background-color:var(--ff-bg)] [padding:8px_12px] [font-size:12px]">
                    <span className="ff-attachment-name [min-width:0] [word-break:break-all] [color:var(--ff-text)]">
                      {file.name} <span className="ff-attachment-size [font-size:10px] [color:var(--ff-muted)]">({formatFileSize(file.size)})</span>
                    </span>
                    <button type="button" onClick={() => setFile(null)} className="ff-attachment-remove [background:none] [border:none] [cursor:pointer] [color:var(--ff-muted)] [&:hover]:[color:var(--ff-text)]">
                      <i className="bi bi-x text-sm"></i>
                    </button>
                  </div>
                )}
                
                <div className="ff-input-row [display:flex] [align-items:center] [gap:8px]">
                  <label className="ff-clip-btn [display:inline-flex] [flex-shrink:0] [cursor:pointer] [align-items:center] [justify-content:center] [border-radius:12px] [border:1px_solid_var(--ff-border)] [padding:8px_12px] [color:var(--ff-muted)] [background-color:var(--ff-bg)] [transition:border-color_0.2s,_color_0.2s] [box-sizing:border-box] [&:hover]:[border-color:var(--orange-primary)] [&:hover]:[color:var(--orange-primary)]" title="Joindre un fichier">
                    <i className="bi bi-paperclip text-sm"></i>
                    <input type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </label>

                  <input
                    className="ff-text-input [min-width:0] [flex:1] [border-radius:12px] [border:1px_solid_var(--ff-border)] [background-color:var(--ff-bg)] [padding:8px_12px] [font-size:12px] [color:var(--ff-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s]"
                    placeholder="Écrire un message..."
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    disabled={!selected || sending || ['TERMINEE', 'ARCHIVEE'].includes(selected?.formation_statut)}
                  />

                  <button
                    type="submit"
                    disabled={sending || !selected || ['TERMINEE', 'ARCHIVEE'].includes(selected?.formation_statut) || (!content.trim() && !file)}
                    className="ff-send-btn [display:inline-flex] [flex-shrink:0] [align-items:center] [justify-content:center] [gap:6px] [border-radius:12px] [background-color:var(--orange-primary)] [color:\#18181b] [padding:8px_14px] [font-size:12px] [font-weight:800] [border:none] [cursor:pointer] [box-shadow:0_2px_6px_rgba(249,_115,_22,_0.25)] [transition:opacity_0.2s] [box-sizing:border-box]"
                  >
                    <i className="bi bi-send text-xs"></i> 
                    <span className="ff-send-label [display:none]">{sending ? '...' : 'Envoyer'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="ff-placeholder-state [display:flex] [flex:1] [align-items:center] [justify-content:center] [padding:32px] [text-align:center] [font-size:12px] [color:var(--ff-muted)]">
              Sélectionnez un forum dans la liste pour démarrer la discussion.
            </div>
          )}

        </section>

      </div>
    </div>
  );
}