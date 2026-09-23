// frontend/src/pages/Apprenant/ApprenantForum.jsx
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, MessageCircle, Send } from 'lucide-react';
import API from '../../services/api';

export default function ApprenantForum() {
  const [forums, setForums] = useState([]);
  const [selectedForum, setSelectedForum] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // 1. Charger les forums restreints aux formations de l'apprenant
  useEffect(() => {
    API.get('/apprenant/forums')
      .then((res) => {
        setForums(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => setError(err.response?.data?.message || 'Impossible de charger les forums.'))
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) return <div className="p-6 text-gray-500">Chargement des forums...</div>;

  return (
    <div className="space-y-7">
      <div className="border-b border-black/10 pb-6 dark:border-white/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">Communication</p>
          <h1 className="mt-2 text-3xl font-black">Forum de discussion</h1>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">Échangez avec vos formateurs et camarades de formation.</p>
        </div>
      </div>

      {error && <p className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-700 dark:text-orange-400">{error}</p>}

      {!selectedForum ? (
        /* VUE 1 : Liste des forums autorisés */
        <div className="grid gap-4 md:grid-cols-2">
          {forums.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-dashed border-black/15 bg-black/[0.03] p-12 text-center text-sm text-black/50 dark:border-white/15 dark:bg-white/[0.04] dark:text-white/50">
              <MessageCircle size={32} className="mx-auto mb-3 text-orange-500" />
              Aucun forum disponible pour tes formations.
            </div>
          ) : (
            forums.map((f) => (
              <div key={f.id_forum} className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:border-orange-500 dark:border-white/10 dark:bg-zinc-950">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-700 dark:text-orange-400">
                    <BookOpen size={13} />
                    {f.titre_formation || 'Formation'}
                  </span>
                  <h2 className="mt-3 text-lg font-black">{f.nom}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-black/55 dark:text-white/55">{f.description || 'Espace de discussion de la formation.'}</p>
                </div>
                
                <button 
                  onClick={() => handleOpenForum(f)}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-orange-400"
                >
                  <MessageCircle size={15} /> Accéder aux discussions
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        /* VUE 2 : Discussion dans le forum sélectionné */
        <div className="flex h-[600px] flex-col rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-950">
          {/* Header du Chat */}
          <div className="flex items-center justify-between border-b border-black/10 p-5 dark:border-white/10">
            <div>
              <h2 className="font-black">{selectedForum.nom}</h2>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">{selectedForum.titre_formation}</p>
            </div>
            <button 
              onClick={() => setSelectedForum(null)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-black/60 transition hover:bg-orange-500/10 hover:text-orange-600 dark:text-white/60 dark:hover:text-orange-400"
            >
              <ArrowLeft size={15} /> Retour
            </button>
          </div>

          {/* Zone des messages */}
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messagesLoading ? <p className="py-10 text-center text-sm text-black/50 dark:text-white/50">Chargement des messages...</p> : messages.length === 0 ? (
              <p className="py-10 text-center text-sm italic text-black/40 dark:text-white/40">Soyez le premier à poser une question.</p>
            ) : (
              messages.map((msg) => {
                return (
                  <div key={msg.id_message} className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.05]">
                    <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                      {msg.prenom} {msg.nom_expediteur} · {new Date(msg.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{msg.contenu}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Saisie du message */}
          <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-black/10 p-4 dark:border-white/10">
            <input 
              type="text"
              placeholder="Écrivez votre message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 rounded-xl border border-black/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-orange-500 dark:border-white/20"
            />
            <button 
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
            >
              <Send size={16} /> {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}