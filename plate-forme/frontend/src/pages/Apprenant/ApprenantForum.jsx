// frontend/src/pages/apprenant/ApprenantForum.jsx
import { useEffect, useState } from 'react';
import API from '../../services/api';

export default function ApprenantForum() {
  const [forums, setForums] = useState([]);

  useEffect(() => {
    API.get('/apprenant/forums')
      .then((res) => setForums(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Forums de Discussion 💬</h1>
      <div className="space-y-4">
        {forums.map((f) => (
          <div key={f.id_forum} className="bg-white p-6 rounded-xl shadow-sm border hover:border-blue-300 transition">
            <h2 className="text-lg font-bold text-blue-600">{f.nom}</h2>
            <p className="text-sm text-gray-600 mt-1">{f.description}</p>
            <button className="mt-4 bg-blue-600 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
              Accéder aux discussions
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}