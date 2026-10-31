import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function ForgotPassword({ embedded = false }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const requestCode = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const response = await API.post('/auth/password/forgot', { email });
      setCodeSent(true);
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Impossible d’envoyer le code pour le moment.'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    if (password !== passwordConfirmation) {
      setMessage({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/auth/password/reset', {
        email,
        code,
        new_password: password
      });
      navigate('/login', { state: { passwordResetMessage: response.data.message } });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Erreur lors de la réinitialisation du mot de passe.'
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-orange-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white';

  const content = (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <i className="bi bi-shield-lock text-xl"></i>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Mot de passe oublié</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
          {codeSent
            ? 'Saisissez le code reçu par e-mail et choisissez un nouveau mot de passe.'
            : 'Recevez un code de vérification par e-mail pour réinitialiser votre mot de passe ou terminer la configuration de votre compte.'}
        </p>
      </div>
      {renderedForm()}
    </>
  );

  function renderedForm() {
    return (
      <>
        {message.text && (
          <div
            role={message.type === 'error' ? 'alert' : 'status'}
            className={`mb-5 rounded-xl border p-3 text-sm ${
              message.type === 'error'
                ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {!codeSent ? (
          <form onSubmit={requestCode} className="space-y-4">
            <label className="block text-sm text-slate-700 dark:text-zinc-300" htmlFor="forgot-email">Adresse e-mail</label>
            <input id="forgot-email" className={inputClass} type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} />
            <button className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50" type="submit" disabled={loading}>
              {loading ? 'Envoi en cours…' : 'Envoyer un code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-zinc-400">Code envoyé à <span className="font-medium text-slate-700 dark:text-zinc-200">{email}</span></p>
            <label className="block text-sm text-slate-700 dark:text-zinc-300" htmlFor="reset-code">Code à 8 chiffres</label>
            <input id="reset-code" className={inputClass} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} />
            <label className="block text-sm text-slate-700 dark:text-zinc-300" htmlFor="reset-password">Nouveau mot de passe</label>
            <input id="reset-password" className={inputClass} type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} />
            <label className="block text-sm text-slate-700 dark:text-zinc-300" htmlFor="reset-password-confirmation">Confirmer le nouveau mot de passe</label>
            <input id="reset-password-confirmation" className={inputClass} type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
            <button className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50" type="submit" disabled={loading}>
              {loading ? 'Modification…' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        )}
      </>
    );
  }

  if (embedded) return content;

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-9">
        {content}

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-zinc-400">
          <Link className="font-medium text-orange-600 hover:underline dark:text-orange-400" to="/login">
            Retour à la connexion
          </Link>
        </p>
      </section>
    </main>
  );
}
