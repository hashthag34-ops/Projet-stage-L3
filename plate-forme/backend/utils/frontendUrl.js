const getFrontendBaseUrl = (req) => {
  const frontendUrl = req.body?.frontend_url || req.get('origin');
  if (typeof frontendUrl !== 'string' || !frontendUrl.trim()) {
    const error = new Error('Adresse du frontend manquante. Rechargez la page puis réessayez.');
    error.code = 'INVALID_FRONTEND_URL';
    throw error;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(frontendUrl);
  } catch {
    const error = new Error('Adresse du frontend invalide. Rechargez la page puis réessayez.');
    error.code = 'INVALID_FRONTEND_URL';
    throw error;
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol)
    || parsedUrl.username
    || parsedUrl.password
    || parsedUrl.pathname !== '/'
    || parsedUrl.search
    || parsedUrl.hash
  ) {
    const error = new Error('Adresse du frontend invalide. Rechargez la page puis réessayez.');
    error.code = 'INVALID_FRONTEND_URL';
    throw error;
  }

  const requestOrigin = req.get('origin');
  if (requestOrigin && new URL(requestOrigin).origin !== parsedUrl.origin) {
    const error = new Error('L’adresse du frontend ne correspond pas à la page de validation.');
    error.code = 'INVALID_FRONTEND_URL';
    throw error;
  }

  return parsedUrl.origin;
};

module.exports = getFrontendBaseUrl;
