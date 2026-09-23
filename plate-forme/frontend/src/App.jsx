// frontend/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
// En haut de App.jsx :

// Layout unique dynamique
import MainLayout from './components/MainLayout';

// Pages Visiteurs / Commun
import Catalogue from './pages/Catalogue';
import Login from './pages/Login';
import Profil from './pages/Profil';
import Postuler from './pages/Postuler';
import SetupAccount from './pages/SetupAccount';

// Apprenant
import ApprenantPlanning from './pages/Apprenant/ApprenantPlanning';
import ApprenantForum from './pages/Apprenant/ApprenantForum';

// Admin
import GsUsers from './pages/Admin/GsUsers';

// Responsable
import Candidatures from './pages/Responsable/Candidature';
import ResponsableFormations from './pages/Responsable/ResponsableFormations';
import Planning from './pages/Responsable/Planning';
import Scan from './pages/Responsable/Scan';

// Formateur
import FormateurDashboard from './pages/Formateur/dashboard';
import FormateurPlanning from './pages/Formateur/Planning';
import FormateurForum from './pages/Formateur/Forum';
import FormateurApprenants from './pages/Formateur/Apprenants';
import GsEvaluation from './pages/Formateur/GsEvaluation';

export default function App() {
  return (
      <Routes>
        {/* Tout passe désormais sous MainLayout */}
        <Route element={<MainLayout />}>

          {/* 1. Routes publiques / Visiteurs */}
          <Route path="/" element={<Catalogue />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/login" element={<Login />} />
          <Route path="/postuler/:id_formation" element={<Postuler />} />
          <Route path="/setup-account" element={<SetupAccount />} />
          <Route path="/profil" element={<Profil />} />

          {/* 2. Espace Apprenant */}
          <Route path="/apprenant">
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="planning" element={<ApprenantPlanning />} />
            <Route path="forum" element={<ApprenantForum />} />
            <Route path="profil" element={<Profil />} />
          </Route>

          {/* 3. Espace Admin */}
          <Route path="/Admin">
            <Route index element={<GsUsers />} />
            <Route path="dashboard" element={<GsUsers />} />
            <Route path="Profil" element={<Profil />} />
          </Route>

          {/* 4. Espace Responsable */}
          <Route path="/Responsable">
            <Route path="GsFormation" element={<ResponsableFormations />} />
            <Route path="Candidature" element={<Candidatures />} />
            <Route path="Planning" element={<Planning />} />
            <Route path="Profil" element={<Profil />} />
            <Route path="Scan" element={<Scan />} />
            <Route path="Catalogue" element={<Catalogue />} />
          </Route>

          {/* 5. Espace Formateur */}
          <Route path="/Formateur">
            <Route index element={<FormateurDashboard />} />
            <Route path="Planning" element={<FormateurPlanning />} />
            <Route path="Apprenants" element={<FormateurApprenants />} />
            <Route path="Evaluations" element={<GsEvaluation />} />
            <Route path="Forum" element={<FormateurForum />} />
            <Route path="Profil" element={<Profil />} />
            <Route path="Catalogue" element={<Catalogue />} />
          </Route>

        </Route>

        {/* Redirection si URL inconnue */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}