// frontend/src/pages/Apprenant/ApprenantForum.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BookOpen, Download, MessageCircle,
  Search, Send, Users
} from 'lucide-react';
import API from '../../services/api';
import { getRealtimeSocket, subscribeToForum } from '../../services/realtime';
import '../css/ApprenantForum.css'; // Importation du CSS classique

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatMessageDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
};

const getInitials = (firstName, lastName) => `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';

export default function ApprenantForum() {
  const [forums, setForums] = useState([]);
  const [selectedForum, setSelectedForum] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      const [forumsRes, userRes] = await Promise.allSettled([
        API.get('/apprenant/forums'),
        API.get('/me')
      ]);

      if (!active) return;
      if (forumsRes.status === 'fulfilled') {
        setForums(Array.isArray(forumsRes.value.data) ? forumsRes.value.data : []);
      } else {
        setError(forumsRes.reason.response?.data?.message || 'Impossible de charger les forums.');
      }
      if (userRes.status === 'fulfilled') setCurrentUser(userRes.value.data);
      setLoading(false);
    };
    fetchData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const refreshForums = () => {
      API.get('/apprenant/forums')
        .then((response) => setForums(Array.isArray(response.data) ? response.data : []))
        .catch((requestError) => {
          setError(requestError.response?.data?.message || 'Impossible de charger les forums.');
        });
    };
    socket.on('formations:changed', refreshForums);
    return () => socket.off('formations:changed', refreshForums);
  }, []);

  useEffect(() => {
    if (!selectedForum) return undefined;

    const refreshMessages = () => {
      API.get(`/apprenant/forums/${selectedForum.id_forum}/messages`)
        .then((response) => setMessages(Array.isArray(response.data) ? response.data : []))
        .catch((requestError) => {
          setError(requestError.response?.data?.message || 'Impossible de charger les messages.');
        });
    };
    const unsubscribe = subscribeToForum(selectedForum.id_forum, refreshMessages);
    let active = true;
    API.get(`/apprenant/forums/${selectedForum.id_forum}/messages`)
      .then((response) => {
        if (active) setMessages(Array.isArray(response.data) ? response.data : []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Impossible de charger les messages.');
      })
      .finally(() => {
        if (active) setMessagesLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [selectedForum]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedForum]);

  const visibleForums = useMemo(() => {
    const query = search.trim().toLowerCase();
    return forums.filter((forum) => (
      `${forum.nom} ${forum.titre_formation || ''} ${forum.description || ''}`.toLowerCase().includes(query)
    ));
  }, [forums, search]);

  const groupedForums = useMemo(() => {
    const groups = new Map();
    visibleForums.forEach((forum) => {
      const title = forum.titre_formation || 'Autres formations';
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title).push(forum);
    });
    return [...groups.entries()];
  }, [visibleForums]);

  const openForum = (forum) => {
    setMessages([]);
    setMessagesLoading(true);
    setError('');
    setSelectedForum(forum);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (!newMessage.trim() || !selectedForum) return;

    setSending(true);
    setError('');
    try {
      await API.post(`/apprenant/forums/${selectedForum.id_forum}/messages`, { contenu: newMessage.trim() });
      const response = await API.get(`/apprenant/forums/${selectedForum.id_forum}/messages`);
      setMessages(Array.isArray(response.data) ? response.data : []);
      setNewMessage('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Erreur lors de l’envoi du message.');
    } finally {
      setSending(false);
    }
  };

  const handleDownload = async (message) => {
    setDownloading(message.id_message);
    setError('');
    try {
      const response = await API.get(
        `/apprenant/forums/${selectedForum.id_forum}/messages/${message.id_message}/download`,
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
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de télécharger ce fichier.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="forum-container">
      <header className="forum-header">
        <div>
          <p className="forum-header-tag">Communication</p>
          <h1 className="forum-header-title">Forum & discussions</h1>
          <p className="forum-header-desc">Retrouvez vos groupes et échangez avec votre promotion.</p>
        </div>
        <div className="forum-counter-badge">
          <Users size={16} className="counter-icon" /> {forums.length} espace(s) de discussion
        </div>
      </header>

      {error && (
        <p role="alert" className="forum-error-alert">
          {error}
        </p>
      )}

      <div className={`forum-layout-card ${selectedForum ? 'mobile-chat-active' : ''}`}>
        
        {/* ASIDE : Liste des forums */}
        <aside className="forum-sidebar">
          <div className="sidebar-top-box">
            <div className="sidebar-title-row">
              <div>
                <h2 className="sidebar-title">Vos discussions</h2>
                <p className="sidebar-subtitle">Choisissez un forum de formation</p>
              </div>
              <span className="sidebar-count-badge">{forums.length}</span>
            </div>
            <label className="sidebar-search-wrapper">
              <Search size={15} className="sidebar-search-icon" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une discussion"
                aria-label="Rechercher une discussion"
                className="sidebar-search-input"
              />
            </label>
          </div>

          <nav aria-label="Forums disponibles" className="sidebar-nav">
            {loading ? (
              <p className="sidebar-loading-text">Chargement des forums...</p>
            ) : groupedForums.length === 0 ? (
              <div className="sidebar-empty-box">
                <MessageCircle size={22} className="empty-icon" />
                <p className="empty-title">Aucune discussion trouvée</p>
                <p className="empty-subtitle">Les forums de vos formations apparaîtront ici.</p>
              </div>
            ) : groupedForums.map(([formation, formationForums]) => (
              <section key={formation} className="sidebar-section">
                <h3 className="sidebar-section-title">
                  <BookOpen size={13} className="section-title-icon" /> {formation}
                </h3>
                <div className="sidebar-items-list">
                  {formationForums.map((forum) => {
                    const isSelected = selectedForum?.id_forum === forum.id_forum;
                    return (
                      <button
                        type="button"
                        key={forum.id_forum}
                        onClick={() => openForum(forum)}
                        aria-current={isSelected ? 'page' : undefined}
                        className={`sidebar-item-btn ${isSelected ? 'selected' : ''}`}
                      >
                        <span className="sidebar-item-content">
                          <span className={`sidebar-item-icon-wrap ${isSelected ? 'active' : ''}`}>
                            <MessageCircle size={16} />
                          </span>
                          <span className="sidebar-item-text">
                            <span className={`item-name ${isSelected ? 'active' : ''}`}>{forum.nom}</span>
                            <span className="item-desc">{forum.description || 'Discussions et entraide du groupe'}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        {/* CONTENU : Discussion active */}
        <section className="forum-chat-pane">
          {selectedForum ? (
            <>
              <header className="chat-top-header">
                <button
                  type="button"
                  onClick={() => setSelectedForum(null)}
                  className="chat-back-btn"
                  aria-label="Retour à la liste des forums"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="chat-header-icon-wrap">
                  <MessageCircle size={18} />
                </div>
                <div className="chat-header-info">
                  <h2 className="chat-header-name">{selectedForum.nom}</h2>
                  <p className="chat-header-formation">
                    <BookOpen size={12} className="formation-icon" /> {selectedForum.titre_formation || 'Formation'}
                  </p>
                </div>
                <span className="chat-status-badge">
                  <span className="status-dot" /> Actif
                </span>
              </header>

              {selectedForum.description && (
                <div className="chat-banner-desc">
                  {selectedForum.description}
                </div>
              )}

              <div className="chat-messages-area">
                {messagesLoading ? (
                  <p className="messages-loading-text">Chargement de la conversation...</p>
                ) : messages.length === 0 ? (
                  <div className="chat-empty-state">
                    <span className="empty-state-icon-wrap">
                      <MessageCircle size={24} />
                    </span>
                    <h3 className="empty-state-title">La discussion commence ici</h3>
                    <p className="empty-state-desc">Posez la première question ou partagez une information avec votre groupe.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMe = Boolean(currentUser && Number(message.id_utilisateur) === Number(currentUser.id_utilisateur));
                    const firstName = message.prenom || '';
                    const lastName = message.nom_expediteur || '';
                    return (
                      <article key={message.id_message} className={`message-row ${isMe ? 'is-me' : ''}`}>
                        <span className={`message-avatar ${isMe ? 'me' : ''}`}>
                          {getInitials(firstName, lastName)}
                        </span>
                        <div className={`message-content-wrapper ${isMe ? 'is-me' : ''}`}>
                          <div className={`message-meta-row ${isMe ? 'is-me' : ''}`}>
                            <span className="message-sender-name">{isMe ? 'Vous' : `${firstName} ${lastName}`.trim() || 'Membre'}</span>
                            <time className="message-time">{formatMessageDate(message.created_at)}</time>
                          </div>
                          <div className={`message-bubble ${isMe ? 'is-me' : ''}`}>
                            {message.contenu && <p className="message-text">{message.contenu}</p>}
                            {message.chemin_fichier && (
                              <div className={`message-file-card ${isMe ? 'is-me' : ''}`}>
                                <div className="file-info-col">
                                  <p className="file-name">{message.nom_fichier}</p>
                                  <p className="file-size">
                                    {message.type_fichier || 'Fichier'}{message.taille_fichier ? ` · ${formatFileSize(Number(message.taille_fichier))}` : ''}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(message)}
                                  disabled={downloading === message.id_message}
                                  className={`file-download-btn ${isMe ? 'is-me' : ''}`}
                                >
                                  <Download size={13} /> {downloading === message.id_message ? '...' : 'Ouvrir'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="chat-input-form">
                <label htmlFor="forum-message" className="sr-only">Votre message</label>
                <div className="chat-input-wrapper">
                  <textarea
                    id="forum-message"
                    rows={1}
                    placeholder="Écrivez votre message..."
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    disabled={sending || messagesLoading}
                    className="chat-textarea"
                  />
                  <button
                    type="submit"
                    disabled={sending || messagesLoading || !newMessage.trim()}
                    className="chat-send-btn"
                    title="Envoyer le message"
                  >
                    <Send size={15} /> <span className="send-btn-label">{sending ? 'Envoi...' : 'Envoyer'}</span>
                  </button>
                </div>
                <p className="chat-input-hint">Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</p>
              </form>
            </>
          ) : (
            <div className="chat-placeholder-state">
              <span className="placeholder-icon-wrap">
                <MessageCircle size={28} />
              </span>
              <h2 className="placeholder-title">Bienvenue dans vos forums</h2>
              <p className="placeholder-desc">
                Sélectionnez une discussion dans la liste pour lire les messages et participer aux échanges.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}