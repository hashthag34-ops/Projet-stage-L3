// frontend/src/pages/Formateur/Forum.jsx
import { useEffect, useState, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Download,
  MessageCircle,
  Paperclip,
  Send,
  Users,
  Edit2,
  Trash2,
  X,
  Check,
  Search
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

const cardClass = 'rounded-3xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900';
const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs font-semibold text-zinc-800 outline-none transition focus:border-orange-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-orange-500';

export default function FormateurForum({ responsable = false }) {
  const [forums, setForums] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
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

  const rolePath = responsable ? '/responsable' : '/formateur';

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      const [forumsRes, userRes] = await Promise.allSettled([
        API.get(`${rolePath}/forums`),
        API.get('/me')
      ]);

      if (!active) return;
      if (forumsRes.status === 'fulfilled') {
        const availableForums = Array.isArray(forumsRes.value.data) ? forumsRes.value.data : [];
        setForums(availableForums);
        setSelected(availableForums[0] || null);
      } else {
        setError(forumsRes.reason.response?.data?.message || 'Impossible de charger les forums.');
      }
      if (userRes.status === 'fulfilled') setCurrentUser(userRes.value.data);
      setLoading(false);
    };
    fetchData();
    return () => { active = false; };
  }, [rolePath]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    const refreshForums = () => {
      API.get(`${rolePath}/forums`)
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
  }, [messages, selected]);

  const visibleForums = useMemo(() => {
    const query = search.trim().toLowerCase();
    return forums.filter((forum) => (
      `${forum.nom} ${forum.formation_titre || ''} ${forum.description || ''}`.toLowerCase().includes(query)
    ));
  }, [forums, search]);

  const groupedForums = useMemo(() => {
    const groups = new Map();
    visibleForums.forEach((forum) => {
      const title = forum.formation_titre || 'Autres formations';
      if (!groups.has(title)) groups.set(title, []);
      groups.get(title).push(forum);
    });
    return [...groups.entries()];
  }, [visibleForums]);

  const openForum = (forum) => {
    setMessages([]);
    setMessagesLoading(true);
    setError('');
    setSelected(forum);
  };

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
      
      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Disposition principale unifiée */}
      <div className={`${cardClass} grid min-h-[600px] overflow-hidden lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]`}>
        
        {/* PANNEAU GAUCHE : LISTE DES FORUMS AVEC RECHERCHE */}
        <aside className={`border-r border-zinc-100 dark:border-zinc-800 ${selected ? 'hidden lg:flex' : 'flex'} flex-col h-full bg-zinc-50/50 dark:bg-zinc-900/50`}>
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-zinc-900 dark:text-white">Forums d'échange</h2>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Sélectionnez une discussion</p>
              </div>
              <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-black text-orange-600 dark:text-orange-400">
                {forums.length}
              </span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un forum..."
                aria-label="Rechercher un forum"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <nav aria-label="Forums disponibles" className="flex-1 overflow-y-auto p-3 space-y-4">
            {groupedForums.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageCircle size={28} className="mx-auto text-zinc-400" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Aucun forum trouvé</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Vos espaces de discussion apparaîtront ici.</p>
              </div>
            ) : groupedForums.map(([formation, formationForums]) => (
              <section key={formation} className="space-y-1.5">
                <h3 className="flex items-center gap-1.5 px-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <BookOpen size={12} className="text-orange-500 shrink-0" />
                  <span className="truncate">{formation}</span>
                </h3>
                <div className="space-y-1">
                  {formationForums.map((forum) => {
                    const isSelected = selected?.id_forum === forum.id_forum;
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
                            {forum.formation_titre}
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

        {/* PANNEAU DROIT : MESSAGES ET CHAT ACTIF */}
        <section className={`flex-col h-full ${selected ? 'flex' : 'hidden lg:flex'} bg-white dark:bg-zinc-900`}>
          {selected ? (
            <>
              {/* Entête du forum actif */}
              <header className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="lg:hidden p-2 rounded-xl text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800 shrink-0"
                    aria-label="Retour à la liste des forums"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0 hidden sm:block">
                    <MessageCircle size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-zinc-900 dark:text-white truncate">{selected.nom}</h2>
                    <p className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      <BookOpen size={11} className="shrink-0 text-orange-500" />
                      <span className="truncate">{selected.formation_titre}</span>
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Actif
                </span>
              </header>

              {/* Liste des messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[350px]">
                {messagesLoading ? (
                  <p className="text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400 py-8">Chargement des messages...</p>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2 max-w-sm mx-auto">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                      <MessageCircle size={24} />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Aucun message pour le moment</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Lancez la discussion en envoyant un message à votre groupe.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isMe = Number(message.id_utilisateur) === Number(currentUser?.id_utilisateur);
                    const firstName = message.prenom || '';
                    const lastName = message.nom_expediteur || '';
                    const canDelete = isMe || responsable;

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
                                
                                {canDelete && (
                                  <div className={`mt-2 pt-1 border-t flex gap-2 justify-end text-[10px] font-bold opacity-80 ${isMe ? 'border-zinc-950/10' : 'border-zinc-200 dark:border-zinc-700'}`}>
                                    {isMe && (
                                      <button 
                                        type="button" 
                                        onClick={() => { setEditingId(message.id_message); setEditingContent(message.contenu || ''); }}
                                        className="hover:underline flex items-center gap-1"
                                      >
                                        <Edit2 size={10} /> Modifier
                                      </button>
                                    )}
                                    <button 
                                      type="button" 
                                      onClick={() => removeMessage(message.id_message)}
                                      className={`hover:underline flex items-center gap-1 ${isMe ? 'text-zinc-950' : 'text-rose-600 dark:text-rose-400'}`}
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
                                  onClick={() => download(message)}
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

              {/* Formulaire de saisie */}
              <form onSubmit={send} className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-2">
                {file && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-950 dark:text-orange-200">
                    <span className="truncate">
                      {file.name} <span className="text-[10px] opacity-70">({formatFileSize(file.size)})</span>
                    </span>
                    <button type="button" onClick={() => setFile(null)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100">
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2 items-center">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-500 transition hover:border-orange-500 hover:text-orange-500 dark:border-zinc-800 dark:bg-zinc-900/50 shrink-0" title="Joindre un fichier">
                    <Paperclip size={16} />
                    <input type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </label>

                  <input
                    className={`${inputClass} py-3`}
                    placeholder="Écrire un message..."
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    disabled={!selected || sending || ['TERMINEE', 'ARCHIVEE'].includes(selected?.formation_statut)}
                  />

                  <button
                    type="submit"
                    disabled={sending || !selected || ['TERMINEE', 'ARCHIVEE'].includes(selected?.formation_statut) || (!content.trim() && !file)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-xs font-black text-zinc-950 transition hover:bg-orange-400 disabled:opacity-50 shrink-0"
                  >
                    <Send size={15} />
                    <span className="hidden sm:inline">{sending ? '...' : 'Envoyer'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
              <div className="h-16 w-16 rounded-3xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <MessageCircle size={32} />
              </div>
              <h2 className="text-base font-black text-zinc-900 dark:text-white">Messagerie de discussion</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                Sélectionnez un forum dans la liste pour démarrer la discussion et échanger avec votre groupe.
              </p>
            </div>
          )}

        </section>

      </div>
    </div>
  );
}