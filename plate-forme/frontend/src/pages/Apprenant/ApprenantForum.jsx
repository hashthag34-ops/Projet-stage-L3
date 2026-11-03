// frontend/src/pages/Apprenant/ApprenantForum.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BookOpen, Download, MessageCircle,
  Search, Send, Users, Edit2, Trash2, X, Check
} from 'lucide-react';
import API from '../../services/api';
import { getRealtimeSocket, subscribeToForum } from '../../services/realtime';

const cardClass = 'rounded-3xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900';
const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';

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
  const [editingId, setEditingId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
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

  const saveMessage = async (messageId) => {
    if (!editingContent.trim()) return;
    try {
      await API.patch(`/apprenant/forums/${selectedForum.id_forum}/messages/${messageId}`, { contenu: editingContent.trim() });
      const response = await API.get(`/apprenant/forums/${selectedForum.id_forum}/messages`);
      setMessages(Array.isArray(response.data) ? response.data : []);
      setEditingId(null);
      setEditingContent('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de modifier le message.');
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Supprimer définitivement ce message ?')) return;
    try {
      await API.delete(`/apprenant/forums/${selectedForum.id_forum}/messages/${messageId}`);
      setMessages((current) => current.filter((message) => message.id_message !== messageId));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Impossible de supprimer le message.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <div className={`${cardClass} w-full max-w-md p-8 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400`}>
          Chargement des forums...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-4 pb-28 font-sans text-zinc-900 dark:text-zinc-100 sm:space-y-6 sm:px-6 sm:py-6">
      
      {/* En-tête */}
      <header className="flex flex-col gap-3 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 sm:text-xs">Communication</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Forum & discussions</h1>
          <p className="mt-1 text-xs text-zinc-300 sm:text-sm">Retrouvez vos groupes et échangez avec votre promotion.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-500/20 bg-orange-500/10 px-3.5 py-2 text-xs font-bold text-orange-400">
          <Users size={15} />
          {forums.length} espace(s) de discussion
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Disposition principale adaptée mobile/desktop */}
      <div className={`${cardClass} grid min-h-[600px] overflow-hidden lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]`}>
        
        {/* ASIDE : Liste des forums (Masqué sur mobile si un forum est sélectionné) */}
        <aside className={`border-r border-zinc-100 dark:border-zinc-800 ${selectedForum ? 'hidden lg:flex' : 'flex'} flex-col h-full bg-zinc-50/50 dark:bg-zinc-900/50`}>
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-zinc-900 dark:text-white">Vos discussions</h2>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Choisissez un forum de formation</p>
              </div>
              <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-black text-orange-600 dark:text-orange-400">
                {forums.length}
              </span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une discussion..."
                aria-label="Rechercher une discussion"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <nav aria-label="Forums disponibles" className="flex-1 overflow-y-auto p-3 space-y-4">
            {groupedForums.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageCircle size={28} className="mx-auto text-zinc-400" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Aucune discussion trouvée</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Les forums de vos formations apparaîtront ici.</p>
              </div>
            ) : groupedForums.map(([formation, formationForums]) => (
              <section key={formation} className="space-y-1.5">
                <h3 className="flex items-center gap-1.5 px-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <BookOpen size={12} className="text-orange-500 shrink-0" />
                  <span className="truncate">{formation}</span>
                </h3>
                <div className="space-y-1">
                  {formationForums.map((forum) => {
                    const isSelected = selectedForum?.id_forum === forum.id_forum;
                    return (
                      <button
                        type="button"
                        key={forum.id_forum}
                        onClick={() => openForum(forum)}
                        aria-current={isSelected ? 'page' : undefined}
                        className={`w-full text-left p-3 rounded-2xl transition flex items-start gap-3 ${isSelected ? 'bg-orange-500 text-zinc-950 font-bold shadow-xs' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'}`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-zinc-950/10 text-zinc-950' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>
                          <MessageCircle size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs truncate ${isSelected ? 'font-black' : 'font-bold'}`}>{forum.nom}</p>
                          <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-zinc-900/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {forum.description || 'Discussions et entraide du groupe'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
        </aside>

        {/* CONTENU : Tchat active (S'affiche en plein écran sur mobile si un forum est ouvert) */}
        <section className={`flex-col h-full ${selectedForum ? 'flex' : 'hidden lg:flex'} bg-white dark:bg-zinc-900`}>
          {selectedForum ? (
            <>
              {/* En-tête de la discussion */}
              <header className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedForum(null)}
                    className="lg:hidden p-2 rounded-xl text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800 shrink-0"
                    aria-label="Retour à la liste des forums"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 hidden sm:block">
                    <MessageCircle size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-zinc-900 dark:text-white truncate">{selectedForum.nom}</h2>
                    <p className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      <BookOpen size={11} className="shrink-0 text-orange-500" />
                      <span className="truncate">{selectedForum.titre_formation || 'Formation'}</span>
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Actif
                </span>
              </header>

              {selectedForum.description && (
                <div className="bg-orange-500/5 border-b border-orange-500/10 px-4 py-2.5 text-xs text-orange-950 dark:text-orange-200 font-medium">
                  {selectedForum.description}
                </div>
              )}

              {/* Zone des messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[350px]">
                {messagesLoading ? (
                  <p className="text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 py-8">Chargement de la conversation...</p>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2 max-w-sm mx-auto">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <MessageCircle size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">La discussion commence ici</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Posez la première question ou partagez une information avec votre groupe.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMe = Boolean(currentUser && Number(message.id_utilisateur) === Number(currentUser.id_utilisateur));
                    const firstName = message.prenom || '';
                    const lastName = message.nom_expediteur || '';
                    return (
                      <article key={message.id_message} className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                        <span className={`h-8 w-8 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${isMe ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'}`}>
                          {getInitials(firstName, lastName)}
                        </span>
                        
                        <div className={`space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-center gap-2 text-[10px] font-bold text-zinc-400 ${isMe ? 'justify-end' : ''}`}>
                            <span>{isMe ? 'Vous' : `${firstName} ${lastName}`.trim() || 'Membre'}</span>
                            <span>•</span>
                            <time>{formatMessageDate(message.created_at)}</time>
                          </div>

                          <div className={`rounded-2xl p-3.5 text-xs ${isMe ? 'bg-orange-500 text-zinc-950 rounded-tr-none' : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 rounded-tl-none'}`}>
                            {editingId === message.id_message ? (
                              <div className="space-y-2 min-w-[200px]">
                                <textarea 
                                  value={editingContent} 
                                  onChange={(event) => setEditingContent(event.target.value)}
                                  className="w-full rounded-xl border border-zinc-300 bg-white p-2 text-xs text-zinc-900 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                  rows={2}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    type="button" 
                                    onClick={() => { setEditingId(null); setEditingContent(''); }}
                                    className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                                  >
                                    <X size={14} />
                                  </button>
                                  <button 
                                    type="button" 
                                    onClick={() => saveMessage(message.id_message)}
                                    className="p-1 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                  >
                                    <Check size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {message.contenu && <p className="leading-relaxed font-medium whitespace-pre-wrap">{message.contenu}</p>}
                                
                                {isMe && (
                                  <div className="mt-2 pt-1 border-t border-zinc-950/10 dark:border-zinc-100/10 flex gap-2 justify-end text-[10px] font-bold opacity-80">
                                    <button 
                                      type="button" 
                                      onClick={() => { setEditingId(message.id_message); setEditingContent(message.contenu || ''); }}
                                      className="hover:underline flex items-center gap-1"
                                    >
                                      <Edit2 size={10} /> Modifier
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => deleteMessage(message.id_message)}
                                      className="hover:underline flex items-center gap-1 text-rose-800 dark:text-rose-300"
                                    >
                                      <Trash2 size={10} /> Supprimer
                                    </button>
                                  </div>
                                )}
                              </>
                            )}

                            {message.chemin_fichier && (
                              <div className={`mt-2 flex items-center justify-between gap-3 rounded-xl p-2.5 border ${isMe ? 'bg-zinc-950/10 border-zinc-950/10' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'}`}>
                                <div className="min-w-0">
                                  <p className="font-bold truncate text-[11px]">{message.nom_fichier}</p>
                                  <p className="text-[10px] opacity-70">
                                    {message.type_fichier || 'Fichier'}{message.taille_fichier ? ` · ${formatFileSize(Number(message.taille_fichier))}` : ''}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(message)}
                                  disabled={downloading === message.id_message}
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition shrink-0 ${isMe ? 'bg-zinc-950 text-white' : 'bg-orange-500 text-zinc-950'}`}
                                >
                                  <Download size={12} /> {downloading === message.id_message ? '...' : 'Ouvrir'}
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

              {/* Formulaire d'envoi */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <label htmlFor="forum-message" className="sr-only">Votre message</label>
                <div className="flex gap-2">
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
                    disabled={sending || messagesLoading || ['TERMINEE', 'ARCHIVEE'].includes(selectedForum.formation_statut)}
                    className={`${inputClass} resize-none py-3`}
                  />
                  <button
                    type="submit"
                    disabled={sending || messagesLoading || ['TERMINEE', 'ARCHIVEE'].includes(selectedForum.formation_statut) || !newMessage.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-xs font-black text-zinc-950 transition hover:bg-orange-400 disabled:opacity-50 shrink-0"
                    title="Envoyer le message"
                  >
                    <Send size={15} />
                    <span className="hidden sm:inline">{sending ? 'Envoi...' : 'Envoyer'}</span>
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 px-1">
                  Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne
                </p>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
              <div className="h-16 w-16 rounded-3xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <MessageCircle size={32} />
              </div>
              <h2 className="text-base font-black text-zinc-900 dark:text-white">Bienvenue dans vos forums</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                Sélectionnez une discussion dans la liste pour lire les messages et participer aux échanges avec votre groupe.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}