import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, BookOpen, Download, MessageCircle, Send, Paperclip } from 'lucide-react';
import API from '../../services/api';

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export default function ApprenantForum() {
  const [forums, setForums] = useState([]);
  const [selectedForum, setSelectedForum] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Charger les forums et les infos de l'utilisateur
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [forumsRes, userRes] = await Promise.allSettled([
          API.get('/apprenant/forums'),
          API.get('/me')
        ]);

        if (forumsRes.status === 'fulfilled') {
          setForums(Array.isArray(forumsRes.value.data) ? forumsRes.value.data : []);
        } else {
          setError('Impossible de charger les forums.');
        }

        if (userRes.status === 'fulfilled') {
          setCurrentUser(userRes.value.data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 2. Charger les messages du forum sélectionné
  const handleOpenForum = async (forum) => {
    setSelectedForum(forum);
    setMessagesLoading(true);
    setError('');
    try {
      const res = await API.get(`/apprenant/forums/${forum.id_forum}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de charger les messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  // 3. Envoyer un message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedForum) return;

    setSending(true);
    setError('');
    try {
      await API.post(`/apprenant/forums/${selectedForum.id_forum}/messages`, { contenu: newMessage.trim() });
      const res = await API.get(`/apprenant/forums/${selectedForum.id_forum}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : []);
      setNewMessage('');
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'envoi du message.");
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
    } catch {
      setError('Impossible de télécharger ce fichier.');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <p className="py-8 text-sm text-black/50 dark:text-white/50">Chargement des espaces de discussion...</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 border-b border-black/10 pb-5 sm:flex-row sm:items-end dark:border-white/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Communication</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Forum & Discussions</h1>
          <p className="mt-1 text-sm text-black/55 dark:text-white/55">Échangez en direct avec vos formateurs et collègues de promotion.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

      {!selectedForum ? (
        /* VUE 1 : Liste des espaces de discussion */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forums.length === 0 ? (
            <div className="col-span-full border-y border-dashed border-black/15 py-14 text-center dark:border-white/15">
              <MessageCircle size={36} className="mx-auto text-orange-500" />
              <h2 className="mt-3 font-bold">Aucune discussion active</h2>
              <p className="mt-1 text-sm text-black/50 dark:text-white/50">Les forums ouverts pour vos formations s'afficheront ici.</p>
            </div>
          ) : (
            forums.map((f) => (
              <article key={f.id_forum} className="flex flex-col justify-between border-b border-black/10 pb-5 dark:border-white/10">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
                    <BookOpen size={14} />
                    {f.titre_formation || 'Formation'}
                  </span>
                  <h2 className="mt-2 text-lg font-bold">{f.nom}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-black/55 dark:text-white/55">{f.description || 'Discussions et entraide au sein du groupe.'}</p>
                </div>
                
                <button 
                  type="button"
                  onClick={() => handleOpenForum(f)}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-600 hover:underline dark:text-orange-400"
                >
                  <MessageCircle size={16} /> Rejoindre la conversation
                </button>
              </article>
            ))
          )}
        </div>
      ) : (
        /* VUE 2 : Discussion façon Messagerie */
        <div className="flex h-[calc(100vh-220px)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.015]">
          {/* Header conversation */}
          <div className="flex items-center justify-between border-b border-black/10 bg-white/50 px-5 py-3.5 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setSelectedForum(null)}
                className="rounded-lg p-1.5 text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
                title="Retour à la liste"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="font-bold leading-tight">{selectedForum.nom}</h2>
                <p className="text-xs text-black/50 dark:text-white/50">{selectedForum.titre_formation}</p>
              </div>
            </div>
          </div>

          {/* Zone de chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messagesLoading ? (
              <p className="py-12 text-center text-sm text-black/50 dark:text-white/50">Chargement de la conversation...</p>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center text-sm text-black/40 dark:text-white/40">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-40" />
                <p className="font-medium">Aucun message pour le moment.</p>
                <p className="text-xs">Posez la première question à votre groupe !</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = currentUser && (msg.id_utilisateur === currentUser.id_utilisateur || msg.id_expediteur === currentUser.id_utilisateur);

                return (
                  <div key={msg.id_message} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="mb-1 ml-1 text-[11px] font-semibold text-black/50 dark:text-white/50">
                        {msg.prenom} {msg.nom_expediteur}
                      </span>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMe 
                        ? 'bg-orange-500 text-black font-medium rounded-br-xs' 
                        : 'bg-white border border-black/10 dark:bg-zinc-900 dark:border-white/10 dark:text-white rounded-bl-xs shadow-xs'
                    }`}>
                      {msg.contenu && <p className="whitespace-pre-wrap leading-relaxed">{msg.contenu}</p>}

                      {msg.chemin_fichier && (
                        <div className={`mt-2 flex items-center justify-between gap-3 rounded-xl border p-2.5 ${
                          isMe 
                            ? 'border-black/10 bg-black/5 dark:border-black/20' 
                            : 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5'
                        }`}>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold">{msg.nom_fichier}</p>
                            <p className="text-[10px] opacity-70">
                              {msg.type_fichier || 'Fichier'}{msg.taille_fichier ? ` · ${formatFileSize(Number(msg.taille_fichier))}` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownload(msg)}
                            disabled={downloading === msg.id_message}
                            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                              isMe 
                                ? 'bg-black text-white hover:bg-black/80' 
                                : 'bg-orange-500 text-black hover:bg-orange-400'
                            } disabled:opacity-50`}
                          >
                            <Download size={13} />
                            {downloading === msg.id_message ? '...' : 'Ouvrir'}
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="mt-1 text-[10px] text-black/40 dark:text-white/40 px-1">
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulaire de saisie style Messenger */}
          <form onSubmit={handleSendMessage} className="border-t border-black/10 bg-white/50 p-3 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <input 
                type="text"
                placeholder="Écrivez un message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 rounded-full border border-black/15 bg-white/80 px-4 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:bg-white dark:border-white/20 dark:bg-zinc-950/80 dark:focus:bg-zinc-950"
              />
              <button 
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black transition hover:bg-orange-400 disabled:opacity-40"
                title="Envoyer"
              >
                <Send size={16} className={sending ? 'animate-pulse' : ''} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}