import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowRight, 
  CheckCircle2, 
  FilePenLine, 
  LoaderCircle, 
  User, 
  GraduationCap, 
  Target, 
  X, 
  AlertCircle 
} from 'lucide-react';
import API from '../services/api';

const emptyForm = {
  nom: '', prenom: '', email: '', telephone: '', age: '', genre: 'Homme',
  niveau_etude: '', situation_professionnelle: '', etablissement: '', filiere: '',
  motivation: '', objectif: '', projet_apres_formation: '', source_information: '',
  a_deja_suivi_formation: false, formation_precedente: '', retour_suggestion: '', conditions_acceptees: false
};

const inputClass = 'w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all duration-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-orange-500 dark:focus:bg-zinc-900 dark:focus:ring-orange-500/15';

const labelClass = 'block mb-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300';

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

  // Fermeture automatique de la notification après 6 secondes
  useEffect(() => {
    if (notice.text) {
      const timer = setTimeout(() => setNotice({ type: '', text: '' }), 6000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const handleEmailLookup = async () => {
    if (editToken || !formData.email.includes('@')) return;
    setLookupLoading(true);
    try {
      const res = await API.get('/candidats/profil', { params: { email: formData.email } });
      setFormData((current) => ({ 
        ...current, 
        ...res.data, 
        email: current.email, 
        motivation: '', 
        objectif: '', 
        projet_apres_formation: '', 
        source_information: '', 
        formation_precedente: '', 
        retour_suggestion: '' 
      }));
      setProfileFound(true);
    } catch (err) {
      if (err.response?.status !== 404) console.error('Erreur recherche profil :', err);
      setProfileFound(false);
    } finally { 
      setLookupLoading(false); 
    }
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
        setNotice({ type: 'success', text: 'Vos modifications ont été bien enregistrées.' });
      } else {
        const res = await API.post('/candidats/postuler', { ...formData, id_formation });
        setNotice({ type: 'success', text: res.data.message || 'Candidature envoyée ! Vérifiez votre boîte mail.' });
      }
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || "Oups... Impossible d'envoyer la candidature." });
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="relative min-h-screen py-10 px-4 text-zinc-900 dark:text-zinc-100">
      
      {/* Pop-up Flottante / Toast Notification */}
      {notice.text && (
        <div className="fixed top-6 right-6 z-50 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all ${
            notice.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200'
              : 'border-rose-500/20 bg-rose-500/10 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200'
          }`}>
            {notice.type === 'success' ? (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {notice.text}
            </div>
            <button 
              onClick={() => setNotice({ type: '', text: '' })} 
              className="rounded-lg p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        
        {/* En-tête de la page */}
        <div className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
            <FilePenLine size={14} />
            {editToken ? 'Mise à jour' : 'Inscription'}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {editToken ? 'Modifier ma candidature' : 'Rejoindre la formation'}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Remplissez ce formulaire en quelques étapes pour transmettre votre dossier à notre équipe.
          </p>
        </div>

        {/* Formulaire principal */}
        <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-xl shadow-zinc-200/50 dark:border-zinc-800/80 dark:bg-zinc-950 dark:shadow-none sm:p-10">
          
          {/* Étape 1 : Informations personnelles */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-sm font-bold text-orange-600 dark:text-orange-400">1</span>
              <h2 className="text-base font-bold flex items-center gap-2">
                <User size={18} className="text-zinc-400" />
                Informations personnelles
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Nom *</label>
                <input name="nom" placeholder="ex: Dupont" required value={formData.nom} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Prénom *</label>
                <input name="prenom" placeholder="ex: Thomas" required value={formData.prenom} onChange={handleChange} className={inputClass} />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Adresse Email *</label>
                <div className="relative">
                  <input type="email" name="email" placeholder="nom@exemple.com" required value={formData.email} onChange={handleChange} onBlur={handleEmailLookup} className={inputClass} />
                  {lookupLoading && <LoaderCircle size={18} className="absolute right-3.5 top-3.5 animate-spin text-orange-500" />}
                </div>
                {profileFound && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                    <CheckCircle2 size={14} /> Profil existant retrouvé : vos données personnelles ont été préremplies.
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Téléphone</label>
                <input name="telephone" placeholder="06 00 00 00 00" value={formData.telephone} onChange={handleChange} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Âge</label>
                  <input type="number" name="age" placeholder="22" value={formData.age} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Genre</label>
                  <select name="genre" value={formData.genre} onChange={handleChange} className={inputClass}>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Étape 2 : Parcours académique et pro */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-sm font-bold text-orange-600 dark:text-orange-400">2</span>
              <h2 className="text-base font-bold flex items-center gap-2">
                <GraduationCap size={18} className="text-zinc-400" />
                Parcours et situation
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Niveau d'étude</label>
                <input name="niveau_etude" placeholder="ex: Licence 3, Master..." value={formData.niveau_etude} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Situation actuelle</label>
                <input name="situation_professionnelle" placeholder="ex: Étudiant, En recherche..." value={formData.situation_professionnelle} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Établissement / Université</label>
                <input name="etablissement" placeholder="Nom de votre école/fac" value={formData.etablissement} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Filière d'origine</label>
                <input name="filiere" placeholder="ex: Informatique, Gestion..." value={formData.filiere} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Étape 3 : Motivations & Objectifs */}
          <section className="space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-sm font-bold text-orange-600 dark:text-orange-400">3</span>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Target size={18} className="text-zinc-400" />
                Motivations et projet
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Quelles sont vos motivations ? *</label>
                <textarea name="motivation" placeholder="Expliquez en quelques phrases pourquoi vous souhaitez suivre cette formation..." required value={formData.motivation} onChange={handleChange} className={`${inputClass} resize-none`} rows="3" />
              </div>

              <div>
                <label className={labelClass}>Quels sont vos objectifs principaux ?</label>
                <textarea name="objectif" placeholder="Ce que vous souhaitez maîtriser à la fin du programme..." value={formData.objectif} onChange={handleChange} className={`${inputClass} resize-none`} rows="2" />
              </div>

              <div>
                <label className={labelClass}>Quel est votre projet après cette formation ?</label>
                <textarea name="projet_apres_formation" placeholder="Emploi, création de projet, poursuite d'études..." value={formData.projet_apres_formation} onChange={handleChange} className={`${inputClass} resize-none`} rows="2" />
              </div>
            </div>
          </section>

          {/* Validation & Conditions */}
          <div className="space-y-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                name="conditions_acceptees" 
                required 
                checked={formData.conditions_acceptees} 
                onChange={handleChange} 
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-orange-500 focus:ring-orange-500/20 accent-orange-500" 
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition">
                J'atteste de l'exactitude des informations fournies et j'accepte les conditions d'inscription au programme.
              </span>
            </label>

            <button 
              type="submit" 
              disabled={loading} 
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-black shadow-lg shadow-orange-500/25 transition-all duration-200 hover:bg-orange-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : editToken ? (
                <CheckCircle2 size={18} />
              ) : (
                <ArrowRight size={18} />
              )}
              {loading ? 'Traitement en cours...' : editToken ? 'Enregistrer les modifications' : 'Soumettre ma candidature'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}