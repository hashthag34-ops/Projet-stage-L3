import { useEffect, useState, useRef } from 'react';
import API from '../../services/api';
import { getRealtimeSocket, subscribeToForum } from '../../services/realtime';

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

  if (loading) return <div className="p-6 text-xs text-slate-400">Chargement des forums...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] p-2 sm:p-4 text-slate-800 dark:text-zinc-100 font-sans transition-colors duration-300">
      
      {/* En-tête */}
      <div className="flex flex-col gap-1 border-b border-slate-200 dark:border-zinc-800 pb-3 shrink-0">
        <p className="text-xs uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Communication</p>
        <h1 className="text-xl tracking-tight text-slate-900 dark:text-white">Messagerie & Forums</h1>
      </div>

      {error && (
        <p role="alert" className="my-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-2 text-xs text-orange-700 dark:text-orange-400 shrink-0">
          {error}
        </p>
      )}

      {/* CONTENEUR PRINCIPAL AVEC LARGEUR DE COLONNE GAUCHE RÉDUITE (240px) */}
      <div className="mt-3 grid flex-1 min-h-0 grid-cols-1 md:grid-cols-[240px_1fr] gap-4 overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        
        {/* PANNEAU GAUCHE : LISTE DES FORUMS (PLUS ÉTROIT) */}
        <aside className="flex flex-col min-h-0 border-r border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 p-3">
          <h2 className="px-3 py-2 text-xs text-slate-400 uppercase tracking-wider shrink-0">Forums</h2>
          
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {forums.map((forum) => {
              const isSelected = selected?.id_forum === forum.id_forum;
              return (
                <button
                  key={forum.id_forum}
                  onClick={() => setSelected(forum)}
                  className={`w-full rounded-2xl p-2.5 text-left transition ${
                    isSelected 
                      ? 'bg-orange-500 text-white' 
                      : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="block text-xs truncate">{forum.nom}</span>
                  <span className={`text-[10px] block truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                    {forum.formation_titre}
                  </span>
                </button>
              );
            })}
            {!forums.length && <p className="p-3 text-xs text-slate-400">Aucun forum associé.</p>}
          </div>
        </aside>

        {/* PANNEAU DROIT : CONTENU DU FORUM ACTIF */}
        <section className="flex flex-col min-h-0 min-w-0 bg-white dark:bg-zinc-900">
          
          {selected ? (
            <>
              {/* Entête du forum actif */}
              <div className="border-b border-slate-200 dark:border-zinc-800 p-3.5 flex items-center justify-between shrink-0">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs text-slate-900 dark:text-white truncate">{selected.nom}</h2>
                  <p className="text-[10px] text-slate-400 truncate">{selected.formation_titre}</p>
                </div>
              </div>

              {/* LISTE DES MESSAGES */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 dark:bg-zinc-950/20">
                {messagesLoading ? (
                  <p className="py-8 text-center text-xs text-slate-400">Chargement des messages...</p>
                ) : (
                  <>
                    {messages.map((message) => (
                      <article key={message.id_message} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 space-y-1.5 shadow-sm">
                        <p className="text-[11px] text-orange-600 dark:text-orange-400">
                          {message.prenom} {message.nom_expediteur} · {new Date(message.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        {message.contenu && <p className="whitespace-pre-wrap text-xs text-slate-800 dark:text-zinc-200">{message.contenu}</p>}
                        
                        {message.chemin_fichier && (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 p-2.5 mt-2">
                            <div className="min-w-0">
                              <p className="break-all text-xs text-slate-900 dark:text-white">{message.nom_fichier}</p>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {message.type_fichier || 'Fichier'}{message.taille_fichier ? ` · ${formatFileSize(Number(message.taille_fichier))}` : ''}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => download(message)}
                              disabled={downloading === message.id_message}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-3 py-1.5 text-xs text-white transition disabled:opacity-50"
                            >
                              <i className="bi bi-download text-xs"></i>
                              {downloading === message.id_message ? '...' : 'Télécharger'}
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                    {!messages.length && <p className="py-8 text-center text-xs text-slate-400">Aucun message pour le moment.</p>}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* SAISIE DE MESSAGE */}
              <form onSubmit={send} className="border-t border-slate-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900 space-y-2 shrink-0">
                {file && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-1.5 text-xs">
                    <span className="min-w-0 break-all text-slate-700 dark:text-zinc-300">
                      {file.name} <span className="text-[10px] text-slate-400">({formatFileSize(file.size)})</span>
                    </span>
                    <button type="button" onClick={() => setFile(null)} className="shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                      <i className="bi bi-x text-sm"></i>
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <label className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 dark:border-zinc-800 px-3 text-slate-500 dark:text-zinc-400 transition hover:border-orange-500 bg-slate-50 dark:bg-zinc-950" title="Joindre un fichier">
                    <i className="bi bi-paperclip text-sm"></i>
                    <input type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </label>

                  <input
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 px-3 py-2 text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-orange-500"
                    placeholder="Écrire un message..."
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    disabled={!selected || sending}
                  />

                  <button
                    type="submit"
                    disabled={sending || !selected || (!content.trim() && !file)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2 text-xs text-white transition disabled:opacity-50"
                  >
                    <i className="bi bi-send text-xs"></i> 
                    <span className="hidden sm:inline">{sending ? '...' : 'Envoyer'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-400">
              Sélectionnez un forum dans la liste pour démarrer la discussion.
            </div>
          )}

        </section>

      </div>
    </div>
  );
}