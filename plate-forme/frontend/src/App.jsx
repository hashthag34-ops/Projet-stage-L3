// frontend/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';

//import pour tous/visiteurs
import Catalogue from './pages/Catalogue';
import Login from './pages/Login';
import Profil from './pages/Profil';
import Postuler from './pages/Postuler';
import SetupAccount from './pages/SetupAccount';

// Attention à la casse exacte des dossiers (apprenant vs Apprenant)
//Import pour les apprenants
import ApprenantLayout from './components/ApprenantLayout';
import ApprenantPlanning from './pages/Apprenant/ApprenantPlanning';
import ApprenantForum from './pages/Apprenant/ApprenantForum';
import ApprenantDashboard from './pages/Apprenant/ApprenantDashboard';

//Import pour les Admins
import AdminDashboard from './pages/Admin/AdminDashboard';
import GsUsers from './pages/Admin/GsUsers';
import AdminLayout from './components/AdminLayout';

//Import pour les responsables
import ResponsableLayout from './components/ResponsableLayout';
import Candidatures from './pages/Responsable/Candidature';
import ResponsableFormations from './pages/Responsable/ResponsableFormations';
import Planning from './pages/Responsable/Planning';
import Scan from './pages/Responsable/Scan';



export default function App() {
  return (
    <Routes>
      {/* 1. Routes publiques (Visiteurs & Candidats) */}
      <Route path="/" element={<Catalogue />} />
      <Route path="/catalogue" element={<Catalogue />} />
      <Route path="/login" element={<Login />} />
      <Route path="/postuler/:id_formation" element={<Postuler />} />
      <Route path="/setup-account" element={<SetupAccount />} />

      {/* 2. Espace Apprenant (Authentifié) */}
      <Route path="/apprenant" element={<ApprenantLayout />}>
        <Route path="catalogue" element={<Catalogue />} />
        <Route path="planning" element={<ApprenantPlanning />} />
        <Route path="forum" element={<ApprenantForum />} />
        <Route path="profil" element={<Profil />} />
      </Route>


      {/* 4. Routes pour l'Admin */}
      <Route path="/Admin" element={<AdminLayout />}>
        <Route index element={<GsUsers />} />
        <Route path="dashboard" element={<GsUsers />} />
      </Route>

      {/* 5. Routes pour les responsables */}
      <Route path="/Responsable" element={<ResponsableLayout />}>
        <Route path="GsFormation" element={<ResponsableFormations />} />
        <Route path="Candidature" element={<Candidatures />} />
        <Route path="Planning" element={<Planning />} />
        <Route path="Profil" element={<Profil />} />
        <Route path="Scan" element={<Scan />} />
        <Route path="Catalogue" element={<Catalogue />} />
      </Route>

      {/* 3. Fallback pour les liens inconnus */}
      <Route path="*" element={<Navigate to="/" replace />} />


    </Routes>
  );
}