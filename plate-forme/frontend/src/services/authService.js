// frontend/src/services/authService.js

// Enregistrer les données utilisateur au login
export const setAuthUser = (user, token) => {
  if (token) localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

// Récupérer l'utilisateur courant
export const getAuthUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Récupérer le token
export const getToken = () => localStorage.getItem('token');

// Déconnexion
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};