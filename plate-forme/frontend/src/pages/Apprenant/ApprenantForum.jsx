import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, BookOpen, Download, MessageCircle,
  Search, Send, Users
} from 'lucide-react';
import API from '../../services/api';
import { getRealtimeSocket, subscribeToForum } from '../../services/realtime';

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
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 border-b border-black/10 pb-5 sm:flex-row sm:items-end dark:border-white/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Communication</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Forum & discussions</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">Retrouvez vos groupes et échangez avec votre promotion.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-black/55 dark:text-white/55">
          <Users size={17} className="text-orange-500" /> {forums.length} espace(s) de discussion
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm lg:h-[calc(100vh-255px)] lg:min-h-[560px] lg:grid-cols-[290px_minmax(0,1fr)] dark:border-white/10 dark:bg-zinc-950">
        <aside className={`${selectedForum ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-b border-black/10 bg-black/[0.015] lg:border-b-0 lg:border-r dark:border-white/10 dark:bg-white/[0.015]`}>
          <div className="border-b border-black/10 p-4 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black">Vos discussions</h2>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">Choisissez un forum de formation</p>
              </div>
              <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-700 dark:text-orange-400">{forums.length}</span>
            </div>
            <label className="relative mt-4 block">
              <Search size={16} className="absolute left-3 top-3 text-black/40 dark:text-white/40" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une discussion"
                aria-label="Rechercher une discussion"
                className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-black/40 focus:border-orange-500 dark:border-white/10 dark:bg-zinc-900 dark:placeholder:text-white/40"
              />
            </label>
          </div>

          <nav aria-label="Forums disponibles" className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
            {loading ? (
              <p className="p-3 text-sm text-black/50 dark:text-white/50">Chargement des forums...</p>
            ) : groupedForums.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/15 p-5 text-center dark:border-white/15">
                <MessageCircle size={23} className="mx-auto text-orange-500" />
                <p className="mt-2 text-sm font-semibold">Aucune discussion trouvée</p>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">Les forums de vos formations apparaîtront ici.</p>
              </div>
            ) : groupedForums.map(([formation, formationForums]) => (
              <section key={formation}>
                <h3 className="mb-2 flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-[0.15em] text-black/45 dark:text-white/45">
                  <BookOpen size={13} className="text-orange-500" /> {formation}
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
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? 'border-orange-500/25 bg-orange-500/10'
                            : 'border-transparent hover:border-black/5 hover:bg-black/[0.035] dark:hover:border-white/5 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-orange-500 text-black' : 'bg-black/[0.05] text-orange-600 dark:bg-white/[0.07] dark:text-orange-400'}`}>
                            <MessageCircle size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-sm font-bold ${isSelected ? 'text-orange-700 dark:text-orange-300' : ''}`}>{forum.nom}</span>
                            <span className="mt-1 block truncate text-xs text-black/50 dark:text-white/50">{forum.description || 'Discussions et entraide du groupe'}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>
          <div className="hidden border-t border-black/10 p-4 text-xs text-black/45 dark:border-white/10 dark:text-white/45 sm:block">
            <span className="font-semibold text-orange-600 dark:text-orange-400">Astuce</span>
            <p className="mt-1">Restez courtois et partagez vos questions avec le groupe.</p>
          </div>
        </aside>

        <section className={`${selectedForum ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col`}>
          {selectedForum ? (
            <>
              <header className="flex items-center gap-3 border-b border-black/10 px-4 py-4 sm:px-6 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedForum(null)}
                  className="rounded-lg p-2 text-black/55 transition hover:bg-black/5 lg:hidden dark:text-white/55 dark:hover:bg-white/10"
                  aria-label="Retour à la liste des forums"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                  <MessageCircle size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-black">{selectedForum.nom}</h2>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-black/50 dark:text-white/50">
                    <BookOpen size={13} className="shrink-0 text-orange-500" /> {selectedForum.titre_formation || 'Formation'}
                  </p>
                </div>
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-700 sm:inline-flex dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Espace de discussion
                </span>
              </header>

              {selectedForum.description && (
                <div className="border-b border-black/5 bg-orange-500/[0.035] px-5 py-2.5 text-xs text-black/60 dark:border-white/5 dark:text-white/60">
                  {selectedForum.description}
                </div>
              )}

              <div className="flex-1 space-y-5 overflow-y-auto bg-black/[0.012] p-4 sm:p-6 dark:bg-white/[0.012]">
                {messagesLoading ? (
                  <p className="py-12 text-center text-sm text-black/50 dark:text-white/50">Chargement de la conversation...</p>
                ) : messages.length === 0 ? (
                  <div className="flex h-full min-h-60 flex-col items-center justify-center text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                      <MessageCircle size={26} />
                    </span>
                    <h3 className="mt-4 font-black">La discussion commence ici</h3>
                    <p className="mt-1 max-w-xs text-sm text-black/50 dark:text-white/50">Posez la première question ou partagez une information avec votre groupe.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMe = Boolean(currentUser && Number(message.id_utilisateur) === Number(currentUser.id_utilisateur));
                    const firstName = message.prenom || '';
                    const lastName = message.nom_expediteur || '';
                    return (
                      <article key={message.id_message} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                          isMe ? 'bg-orange-500 text-black' : 'border border-black/10 bg-white text-orange-700 dark:border-white/10 dark:bg-zinc-900 dark:text-orange-300'
                        }`}>
                          {getInitials(firstName, lastName)}
                        </span>
                        <div className={`min-w-0 max-w-[88%] sm:max-w-[75%] ${isMe ? 'text-right' : ''}`}>
                          <div className={`mb-1 flex flex-wrap items-baseline gap-x-2 text-xs ${isMe ? 'justify-end' : ''}`}>
                            <span className="font-black">{isMe ? 'Vous' : `${firstName} ${lastName}`.trim() || 'Membre du groupe'}</span>
                            <time className="text-[10px] text-black/45 dark:text-white/45">{formatMessageDate(message.created_at)}</time>
                          </div>
                          <div className={`inline-block rounded-2xl border px-4 py-3 text-left text-sm shadow-sm ${
                            isMe
                              ? 'rounded-tr-sm border-orange-500/20 bg-orange-500 text-black'
                              : 'rounded-tl-sm border-black/5 bg-white dark:border-white/10 dark:bg-zinc-900'
                          }`}>
                            {message.contenu && <p className="whitespace-pre-wrap break-words leading-relaxed">{message.contenu}</p>}
                            {message.chemin_fichier && (
                              <div className={`mt-2 flex items-center justify-between gap-3 rounded-xl border p-3 ${
                                isMe ? 'border-black/10 bg-black/5' : 'border-black/10 bg-black/[0.025] dark:border-white/10 dark:bg-white/[0.04]'
                              }`}>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold">{message.nom_fichier}</p>
                                  <p className="mt-0.5 text-[10px] opacity-65">
                                    {message.type_fichier || 'Fichier'}{message.taille_fichier ? ` · ${formatFileSize(Number(message.taille_fichier))}` : ''}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(message)}
                                  disabled={downloading === message.id_message}
                                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                                    isMe ? 'bg-black text-white hover:bg-black/80' : 'bg-orange-500 text-black hover:bg-orange-400'
                                  }`}
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

              <form onSubmit={handleSendMessage} className="border-t border-black/10 bg-white p-3 sm:p-4 dark:border-white/10 dark:bg-zinc-950">
                <label htmlFor="forum-message" className="sr-only">Votre message</label>
                <div className="flex items-end gap-2 rounded-2xl border border-black/10 bg-black/[0.025] p-2 focus-within:border-orange-500/60 dark:border-white/10 dark:bg-white/[0.025]">
                  <textarea
                    id="forum-message"
                    rows={1}
                    placeholder="Écrivez votre message au groupe..."
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    disabled={sending || messagesLoading}
                    className="max-h-32 min-h-10 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-black/40 disabled:opacity-60 dark:placeholder:text-white/40"
                  />
                  <button
                    type="submit"
                    disabled={sending || messagesLoading || !newMessage.trim()}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-3.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-45"
                    title="Envoyer le message"
                  >
                    <Send size={16} /> <span className="hidden sm:inline">{sending ? 'Envoi...' : 'Envoyer'}</span>
                  </button>
                </div>
                <p className="mt-2 px-1 text-[10px] text-black/40 dark:text-white/40">Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</p>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
                <MessageCircle size={30} />
              </span>
              <h2 className="mt-4 text-lg font-black">Bienvenue dans vos forums</h2>
              <p className="mt-2 max-w-sm text-sm text-black/50 dark:text-white/50">
                Sélectionnez une discussion dans la liste pour lire les messages et participer aux échanges.
              </p>
              {forums.length === 0 && !loading && (
                <p className="mt-4 rounded-xl bg-black/[0.03] px-4 py-3 text-xs text-black/50 dark:bg-white/[0.04] dark:text-white/50">
                  Aucun forum actif n’est associé à vos formations pour le moment.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
