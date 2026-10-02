import { useEffect, useState } from 'react';
import { Download, Paperclip, Send, X } from 'lucide-react';
import API from '../../services/api';

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
    if (!selected) {
      setMessages([]);
      return;
    }

    let active = true;
    setMessagesLoading(true);
    setError('');
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

    return () => { active = false; };
  }, [selected]);

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

  if (loading) return <div className="p-6 text-sm text-black/50 dark:text-white/50">Chargement des forums...</div>;

  return (
    <div className="space-y-7">
      <header className="border-b border-black/10 pb-6 dark:border-white/10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Communication</p>
        <h1 className="mt-2 text-3xl font-black">Messagerie</h1>
        <p className="mt-2 text-sm text-black/55 dark:text-white/55">Échangez avec les apprenants de vos formations.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-700 dark:text-orange-400">{error}</p>}

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="px-3 py-2 text-sm font-black">Forums</h2>
          {forums.map((forum) => (
            <button
              key={forum.id_forum}
              onClick={() => setSelected(forum)}
              className={`w-full rounded-xl p-3 text-left transition ${selected?.id_forum === forum.id_forum ? 'bg-orange-500 text-black' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
            >
              <strong className="block text-sm">{forum.nom}</strong>
              <span className="text-xs opacity-60">{forum.formation_titre}</span>
            </button>
          ))}
          {!forums.length && <p className="p-3 text-sm text-black/50">Aucun forum associé.</p>}
        </aside>

        <section className="flex min-h-[520px] flex-col rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
          <div className="border-b border-black/10 p-5 dark:border-white/10">
            <h2 className="font-black">{selected?.nom || 'Sélectionnez un forum'}</h2>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">{selected?.formation_titre}</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messagesLoading ? <p className="py-8 text-center text-sm text-black/50">Chargement des messages...</p> : (
              <>
                {messages.map((message) => (
                  <article key={message.id_message} className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.05]">
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      {message.prenom} {message.nom_expediteur} · {new Date(message.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                    {message.contenu && <p className="mt-1 whitespace-pre-wrap text-sm">{message.contenu}</p>}
                    {message.chemin_fichier && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-black/20">
                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold">{message.nom_fichier}</p>
                          <p className="mt-0.5 text-xs text-black/50 dark:text-white/50">
                            {message.type_fichier || 'Fichier'}{message.taille_fichier ? ` · ${formatFileSize(Number(message.taille_fichier))}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => download(message)}
                          disabled={downloading === message.id_message}
                          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                        >
                          <Download size={15} />
                          {downloading === message.id_message ? 'Téléchargement...' : 'Télécharger'}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
                {!messages.length && <p className="py-8 text-center text-sm text-black/50">Aucun message pour le moment.</p>}
              </>
            )}
          </div>

          <form onSubmit={send} className="space-y-3 border-t border-black/10 p-4 dark:border-white/10">
            {file && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-black/[0.04] px-3 py-2 text-sm dark:bg-white/[0.06]">
                <span className="min-w-0 break-all">{file.name} <span className="text-xs text-black/50 dark:text-white/50">({formatFileSize(file.size)})</span></span>
                <button type="button" onClick={() => setFile(null)} aria-label="Retirer le fichier" className="shrink-0 rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/10">
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <label className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl border border-black/15 px-3 text-black/65 transition hover:border-orange-500 hover:text-orange-600 dark:border-white/20 dark:text-white/70" title="Joindre un fichier">
                <Paperclip size={18} />
                <span className="sr-only">Joindre un fichier</span>
                <input type="file" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </label>
              <input
                className="min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-white/20"
                placeholder="Écrire un message..."
                value={content}
                onChange={(event) => setContent(event.target.value)}
                disabled={!selected || sending}
              />
              <button
                type="submit"
                disabled={sending || !selected || (!content.trim() && !file)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
              >
                <Send size={16} /> <span className="hidden sm:inline">{sending ? 'Envoi...' : 'Envoyer'}</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}