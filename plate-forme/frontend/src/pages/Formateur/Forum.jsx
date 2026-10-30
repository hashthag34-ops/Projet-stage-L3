// frontend/src/pages/Formateur/Forum_2.jsx
import { useEffect, useState, useRef } from 'react';
import API from '../../services/api';
import { getRealtimeSocket, subscribeToForum } from '../../services/realtime';
import '../css/FormateurForum.css'; // Importation du CSS classique

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export default function FormateurForum() {
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
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    API.get('/formateur/forums')
      .then((response) => {
        const availableForums = Array.isArray(response.data) ? response.data : [];
        setForums(availableForums);
        setSelected(availableForums[0] || null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger les forums.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const refreshForums = () => {
      API.get('/formateur/forums')
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
  }, []);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }

    let active = true;
    setMessagesLoading(true);
    setError('');
    const unsubscribe = subscribeToForum(selected.id_forum, () => {
      API.get(`/formateur/forums/${selected.id_forum}/messages`)
        .then((response) => setMessages(Array.isArray(response.data) ? response.data : []))
        .catch((requestError) => {
          setError(requestError.response?.data?.message || 'Impossible de charger les messages.');
        });
    });
    API.get(`/formateur/forums/${selected.id_forum}/messages`)
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
  }, [selected]);

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
      await API.post(`/formateur/forums/${selected.id_forum}/messages`, payload);
      const response = await API.get(`/formateur/forums/${selected.id_forum}/messages`);
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
        `/formateur/forums/${selected.id_forum}/messages/${message.id_message}/download`,
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

  if (loading) return <div className="ff-loading">Chargement des forums...</div>;

  return (
    <div className="ff-container">
      
      {/* En-tête */}
      <div className="ff-header">
        <p className="ff-header-tag">Communication</p>
        <h1 className="ff-header-title">Messagerie & Forums</h1>
      </div>

      {error && (
        <p role="alert" className="ff-error-alert">
          {error}
        </p>
      )}

      {/* CONTENEUR PRINCIPAL */}
      <div className={`ff-layout-card ${selected ? 'mobile-chat-active' : ''}`}>
        
        {/* PANNEAU GAUCHE : LISTE DES FORUMS */}
        <aside className="ff-sidebar">
          <h2 className="ff-sidebar-heading">Forums</h2>
          
          <div className="ff-sidebar-list">
            {forums.map((forum) => {
              const isSelected = selected?.id_forum === forum.id_forum;
              return (
                <button
                  key={forum.id_forum}
                  onClick={() => setSelected(forum)}
                  className={`ff-forum-btn ${isSelected ? 'selected' : ''}`}
                >
                  <span className="ff-forum-name">{forum.nom}</span>
                  <span className={`ff-forum-formation ${isSelected ? 'selected' : ''}`}>
                    {forum.formation_titre}
                  </span>
                </button>
              );
            })}
            {!forums.length && <p className="ff-no-forums">Aucun forum associé.</p>}
          </div>
        </aside>

        {/* PANNEAU DROIT : CONTENU DU FORUM ACTIF */}
        <section className="ff-chat-pane">
          
          {selected ? (
            <>
              {/* Entête du forum actif */}
              <div className="ff-chat-topbar">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="ff-back-btn"
                  aria-label="Retour à la liste des forums"
                >
                  <i className="bi bi-arrow-left"></i>
                </button>
                <div className="ff-chat-title-info">
                  <h2 className="ff-chat-name">{selected.nom}</h2>
                  <p className="ff-chat-formation">{selected.formation_titre}</p>
                </div>
              </div>

              {/* LISTE DES MESSAGES */}
              <div className="ff-messages-scroll">
                {messagesLoading ? (
                  <p className="ff-messages-loading">Chargement des messages...</p>
                ) : (
                  <>
                    {messages.map((message) => (
                      <article key={message.id_message} className="ff-message-card">
                        <p className="ff-message-author">
                          {message.prenom} {message.nom_expediteur} · {new Date(message.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        {message.contenu && <p className="ff-message-text">{message.contenu}</p>}
                        
                        {message.chemin_fichier && (
                          <div className="ff-file-box">
                            <div className="ff-file-info">
                              <p className="ff-file-name">{message.nom_fichier}</p>
                              <p className="ff-file-meta">
                                {message.type_fichier || 'Fichier'}{message.taille_fichier ? ` · ${formatFileSize(Number(message.taille_fichier))}` : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => download(message)}
                              disabled={downloading === message.id_message}
                              className="ff-download-btn"
                            >
                              <i className="bi bi-download text-xs"></i>
                              {downloading === message.id_message ? '...' : 'Télécharger'}
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                    {!messages.length && <p className="ff-no-messages">Aucun message pour le moment.</p>}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* SAISIE DE MESSAGE */}
              <form onSubmit={send} className="ff-input-form">
                {file && (
                  <div className="ff-attachment-preview">
                    <span className="ff-attachment-name">
                      {file.name} <span className="ff-attachment-size">({formatFileSize(file.size)})</span>
                    </span>
                    <button type="button" onClick={() => setFile(null)} className="ff-attachment-remove">
                      <i className="bi bi-x text-sm"></i>
                    </button>
                  </div>
                )}
                
                <div className="ff-input-row">
                  <label className="ff-clip-btn" title="Joindre un fichier">
                    <i className="bi bi-paperclip text-sm"></i>
                    <input type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </label>

                  <input
                    className="ff-text-input"
                    placeholder="Écrire un message..."
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    disabled={!selected || sending}
                  />

                  <button
                    type="submit"
                    disabled={sending || !selected || (!content.trim() && !file)}
                    className="ff-send-btn"
                  >
                    <i className="bi bi-send text-xs"></i> 
                    <span className="ff-send-label">{sending ? '...' : 'Envoyer'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="ff-placeholder-state">
              Sélectionnez un forum dans la liste pour démarrer la discussion.
            </div>
          )}

        </section>

      </div>
    </div>
  );
}