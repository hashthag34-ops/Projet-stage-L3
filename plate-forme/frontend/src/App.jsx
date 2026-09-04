// frontend/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ApprenantLayout from './components/ApprenantLayout';
import Home from './pages/Home'; // Catalogue/Accueil
import ApprenantPlanning from './pages/apprenant/ApprenantPlanning';
import ApprenantForum from './pages/apprenant/ApprenantForum';
import Profil from './pages/Profil';

export default function App() {
  return (
    <Routes>
      {/* Route Apprenant structurée */}
      <Route path="/apprenant" element={<ApprenantLayout />}>
        <Route index element={<Navigate to="/apprenant/catalogue" replace />} />
        <Route path="catalogue" element={<Home />} />
        <Route path="planning" element={<ApprenantPlanning />} />
        <Route path="forum" element={<ApprenantForum />} />
        <Route path="profil" element={<Profil />} />
      </Route>

      {/* Autres routes globales */}
      <Route path="/" element={<Navigate to="/apprenant/catalogue" replace />} />
    </Routes>
  );
}