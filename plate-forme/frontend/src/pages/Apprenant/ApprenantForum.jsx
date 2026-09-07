// frontend/src/pages/Apprenant/ApprenantForum.jsx
import { useEffect, useState } from 'react';
import API from '../../services/api';
import { getAuthUser } from '../../services/authService';

export default function ApprenantForum() {
  const [forums, setForums] = useState([]);
  const [selectedForum, setSelectedForum] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const currentUser = getAuthUser();

  // 1. Charger les forums restreints aux formations de l'apprenant
  useEffect(() => {
    API.get('/apprenant/forums')
      .then((res) => {
        setForums(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.error("Erreur forums:", err))
      .finally(() => setLoading(false));
  }, []);

  // 2. Charger les messages du forum sélectionné
  const handleOpenForum = async (forum) => {
    setSelectedForum(forum);
    try {
      const res = await API.get(`/forums/${forum.id_forum}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Erreur chargement messages:", err);
    }
  };

  // 3. Envoyer un message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedForum) return;

    try {
      const res = await API.post(`/forums/${selectedForum.id_forum}/messages`, {
        contenu: newMessage,
        id_utilisateur: currentUser?.id_utilisateur
      });

      // Ajouter le message à la liste
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (err) {
      alert("Erreur lors de l'envoi du message");
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Chargement des forums...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Forums de Discussion 💬</h1>
          <p className="text-sm text-gray-500">
            Échangez avec vos formateurs et camarades de promo.
          </p>
        </div>
      </div>

      {!selectedForum ? (
        /* VUE 1 : Liste des forums autorisés */
        <div className="grid gap-4 md:grid-cols-2">
          {forums.length === 0 ? (
            <div className="col-span-2 bg-white p-8 text-center rounded-xl border border-gray-100 text-gray-500">
              Aucun forum disponible. Tu dois être inscrit à une formation active.
            </div>
          ) : (
            forums.map((f) => (
              <div key={f.id_forum} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    {f.titre_formation || 'Formation'}
                  </span>
                  <h2 className="text-lg font-bold text-gray-800 mt-2">{f.nom}</h2>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{f.description}</p>
                </div>
                
                <button 
                  onClick={() => handleOpenForum(f)}
                  className="mt-6 w-full bg-blue-600 text-white text-xs px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Accéder aux discussions →
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        /* VUE 2 : Discussion dans le forum sélectionné */
        <div className="bg-white rounded-xl border shadow-sm flex flex-col h-[600px]">
          {/* Header du Chat */}
          <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
            <div>
              <h2 className="font-bold text-gray-800 text-base">{selectedForum.nom}</h2>
              <p className="text-xs text-gray-500">{selectedForum.titre_formation}</p>
            </div>
            <button 
              onClick={() => setSelectedForum(null)}
              className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg font-medium transition"
            >
              ← Retour aux forums
            </button>
          </div>

          {/* Zone des messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10 italic">Soyez le premier à poser une question !</p>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.id_utilisateur === currentUser?.id_utilisateur;
                return (
                  <div key={msg.id_message || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-400 mb-0.5 px-1">
                      {msg.nom_expediteur || 'Utilisateur'} • {new Date(msg.created_at || Date.now()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className={`max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}>
                      {msg.contenu}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Saisie du message */}
          <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2">
            <input 
              type="text"
              placeholder="Écrivez votre message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}