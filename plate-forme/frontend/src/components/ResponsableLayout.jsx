// frontend/src/components/ResponsableLayout.jsx
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';

export default function ResponsableLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navLinks = [
    { path: '/Responsable/GsFormation', label: '📚 Formations', icon: '📚' },
    { path: '/Responsable/Candidature', label: '📑 Candidatures', icon: '📑' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Navbar supérieure */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo / Brand */}
            <div className="flex items-center space-x-3">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Espace Responsable
              </span>
            </div>

            {/* Navigation principale */}
            <nav className="flex space-x-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Profil / Déconnexion */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition font-medium"
              >
                Déconnexion
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Contenu dynamique des pages */}
      <main className="flex-1 py-6">
        <Outlet />
      </main>
    </div>
  );
}