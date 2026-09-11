import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FilePenLine, LoaderCircle, MailCheck } from 'lucide-react';
import API from '../services/api';

const emptyForm = {
  nom: '', prenom: '', email: '', telephone: '', age: '', genre: 'Homme',
  niveau_etude: '', situation_professionnelle: '', etablissement: '', filiere: '',
  motivation: '', objectif: '', projet_apres_formation: '', source_information: '',
  a_deja_suivi_formation: false, formation_precedente: '', retour_suggestion: '', conditions_acceptees: false
};

const inputClass = 'w-full rounded-xl border border-black/15 bg-transparent p-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-white/20';

export default function Postuler() {
  const { id_formation } = useParams();
  const [searchParams] = useSearchParams();
  const editToken = searchParams.get('edit_token');
  const [formData, setFormData] = useState(emptyForm);
  const [profileFound, setProfileFound] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!editToken) return;
    API.get('/candidats/candidature/modifier', { params: { token: editToken } })
      .then((res) => setFormData((current) => ({ ...current, ...res.data, conditions_acceptees: true })))
      .catch((err) => setNotice({ type: 'error', text: err.response?.data?.message || 'Ce lien de modification est invalide.' }));
  }, [editToken]);

  const handleEmailLookup = async () => {
    if (editToken || !formData.email.includes('@')) return;
    setLookupLoading(true);
    try {
      const res = await API.get('/candidats/profil', { params: { email: formData.email } });
      setFormData((current) => ({ ...current, ...res.data, email: current.email, motivation: '', objectif: '', projet_apres_formation: '', source_information: '', formation_precedente: '', retour_suggestion: '' }));
      setProfileFound(true);
    } catch (err) {
      if (err.response?.status !== 404) console.error('Erreur recherche profil :', err);
      setProfileFound(false);
    } finally { setLookupLoading(false); }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((current) => ({ ...current, [e.target.name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice({ type: '', text: '' });
    try {
      if (editToken) {
        await API.put('/candidats/candidature/modifier', formData, { params: { token: editToken } });
        setNotice({ type: 'success', text: 'Votre candidature a été mise à jour avec succès.' });
      } else {
        const res = await API.post('/candidats/postuler', { ...formData, id_formation });
        setNotice({ type: 'success', text: res.data.message || 'Candidature reçue. Consultez votre email.' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || "Erreur lors de l'envoi de la candidature." });
    } finally { setLoading(false); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 text-black dark:text-white">
      <div className="mb-8 border-b border-black/10 pb-6 dark:border-white/10">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">{editToken ? 'Modification' : 'Candidature'}</p>
        <h1 className="text-3xl font-black tracking-tight">{editToken ? 'Modifier ma candidature' : 'Rejoindre une formation'}</h1>
        <p className="mt-2 text-sm text-black/55 dark:text-white/55">Présentez votre parcours et vos objectifs à notre équipe.</p>
      </div>
      {notice.text && <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 text-sm ${notice.type === 'success' ? 'border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-300' : 'border-black/20 bg-black/5 text-black/70 dark:border-white/20 dark:bg-white/5 dark:text-white/70'}`}><MailCheck size={19} /> {notice.text}</div>}
      <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-black/10 bg-white p-6 shadow-[0_15px_45px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-zinc-950 sm:p-8">
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 border-b border-black/10 pb-3 text-lg font-black dark:border-white/10"><span className="rounded-lg bg-orange-500 p-2 text-black"><FilePenLine size={16} /></span> Informations personnelles</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input name="nom" placeholder="Nom" required value={formData.nom} onChange={handleChange} className={inputClass} />
            <input name="prenom" placeholder="Prénom" required value={formData.prenom} onChange={handleChange} className={inputClass} />
            <div className="relative"><input type="email" name="email" placeholder="Email" required value={formData.email} onChange={handleChange} onBlur={handleEmailLookup} className={inputClass} />{lookupLoading && <LoaderCircle size={16} className="absolute right-3 top-3.5 animate-spin text-orange-500" />}{profileFound && <p className="mt-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400">Profil existant prérempli. Vérifiez vos informations.</p>}</div>
            <input name="telephone" placeholder="Téléphone" value={formData.telephone} onChange={handleChange} className={inputClass} />
            <input type="number" name="age" placeholder="Âge" value={formData.age} onChange={handleChange} className={inputClass} />
            <select name="genre" value={formData.genre} onChange={handleChange} className={inputClass}><option value="Homme">Homme</option><option value="Femme">Femme</option></select>
          </div>
        </section>
        <section className="space-y-4"><h2 className="border-b border-black/10 pb-3 text-lg font-black dark:border-white/10">Parcours et situation</h2><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><input name="niveau_etude" placeholder="Niveau d'étude" value={formData.niveau_etude} onChange={handleChange} className={inputClass} /><input name="situation_professionnelle" placeholder="Situation professionnelle" value={formData.situation_professionnelle} onChange={handleChange} className={inputClass} /><input name="etablissement" placeholder="Établissement / Université" value={formData.etablissement} onChange={handleChange} className={inputClass} /><input name="filiere" placeholder="Filière" value={formData.filiere} onChange={handleChange} className={inputClass} /></div></section>
        <section className="space-y-4"><h2 className="border-b border-black/10 pb-3 text-lg font-black dark:border-white/10">Motivations et objectifs</h2><textarea name="motivation" placeholder="Quelles sont vos motivations ?" required value={formData.motivation} onChange={handleChange} className={`${inputClass} resize-none`} rows="4" /><textarea name="objectif" placeholder="Quels sont vos objectifs pour cette formation ?" value={formData.objectif} onChange={handleChange} className={`${inputClass} resize-none`} rows="3" /><textarea name="projet_apres_formation" placeholder="Quel est votre projet après la formation ?" value={formData.projet_apres_formation} onChange={handleChange} className={`${inputClass} resize-none`} rows="3" /></section>
        <label className="flex items-start gap-3 border-t border-black/10 pt-5 text-sm dark:border-white/10"><input type="checkbox" name="conditions_acceptees" required checked={formData.conditions_acceptees} onChange={handleChange} className="mt-1 accent-orange-500" /><span>J'accepte les conditions d'inscription.</span></label>
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-black shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60">{loading ? <LoaderCircle size={17} className="animate-spin" /> : editToken ? <CheckCircle2 size={17} /> : <ArrowRight size={17} />}{loading ? 'Enregistrement...' : editToken ? 'Enregistrer les modifications' : 'Envoyer ma candidature'}</button>
      </form>
    </div>
  );
}