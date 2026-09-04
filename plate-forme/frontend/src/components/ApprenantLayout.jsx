// frontend/src/components/ApprenantLayout.jsx
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';

export default function ApprenantLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { label: 'Accueil / Catalogue', path: '/apprenant/catalogue', icon: '📚' },
    { label: 'Mon Planning', path: '/apprenant/planning', icon: '📅' },
    { label: 'Forum', path: '/apprenant/forum', icon: '💬' },
    { label: 'Mon Profil', path: '/apprenant/profil', icon: '👤' },
  ];

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar Apprenant */}
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col justify-between">
        <div>
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-blue-600">Espace Apprenant 🎓</h1>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600 font-semibold' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bouton Déconnexion */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <span>🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal de la page */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}