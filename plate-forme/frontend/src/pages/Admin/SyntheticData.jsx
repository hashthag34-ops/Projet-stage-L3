import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, GraduationCap, LoaderCircle, Users } from 'lucide-react';
import API from '../../services/api';

const inputClass = 'w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export default function SyntheticData() {
  const [formations, setFormations] = useState([]);
  const [selectedFormations, setSelectedFormations] = useState([]);
  const [nombre, setNombre] = useState(20);
  const [maxFormations, setMaxFormations] = useState(2);
  const [mode, setMode] = useState('apprenant');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadFormations = async () => {
      try {
        const response = await API.get('/admin/synthetic-data/formations');
        const items = Array.isArray(response.data) ? response.data : [];
        setFormations(items);
        setSelectedFormations(items.length ? [items[0].id_formation] : []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Impossible de charger les formations.');
      } finally {
        setLoading(false);
      }
    };

    loadFormations();
  }, []);

  const toggleFormation = (formationId) => {
    setSelectedFormations((current) => {
      if (current.includes(formationId)) return current.filter((id) => id !== formationId);
      if (current.length >= 10) {
        setError('Vous pouvez sélectionner jusqu’à 10 formations.');
        return current;
      }
      setError('');
      return [...current, formationId];
    });
    setResult(null);
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (selectedFormations.length === 0) {
      setError('Sélectionnez au moins une formation.');
      return;
    }
    if (!Number.isInteger(Number(nombre)) || Number(nombre) < 1 || Number(nombre) > 500) {
      setError('Le nombre de candidats doit être compris entre 1 et 500.');
      return;
    }

    setSaving(true);
    try {
      const response = await API.post('/admin/synthetic-data/candidates', {
        nombre: Number(nombre),
        id_formations: selectedFormations,
        mode,
        max_formations: Math.min(Number(maxFormations), selectedFormations.length)
      });
      setResult(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Erreur lors de la création des données.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-2 sm:p-4">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <Database size={14} />
          Administration
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Générer des données de test
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          Créez des candidats et leurs candidatures liées à une ou plusieurs formations, sans utiliser d’adresses e-mail réelles.
        </p>
      </header>

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertCircle className="mt-0.5 shrink-0" size={18} />
        <p>
          Les adresses générées utilisent le domaine réservé <strong>example.invalid</strong>. Aucun e-mail n’est envoyé.
          Les comptes apprenants de test sont créés sans mot de passe et ne peuvent pas se connecter.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-7">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Type de données</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { setMode('attente'); setResult(null); }}
              className={`rounded-2xl border p-4 text-left transition ${mode === 'attente'
                ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 dark:border-zinc-100 dark:bg-zinc-900 dark:ring-zinc-100'
                : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                <Users size={17} /> Candidatures en attente
              </span>
              <span className="mt-2 block text-xs text-zinc-500 dark:text-zinc-400">
                Crée des candidats et des inscriptions en attente, sans compte apprenant.
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('apprenant'); setResult(null); }}
              className={`rounded-2xl border p-4 text-left transition ${mode === 'apprenant'
                ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900 dark:border-zinc-100 dark:bg-zinc-900 dark:ring-zinc-100'
                : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-white">
                <GraduationCap size={18} /> Apprenants inscrits
              </span>
              <span className="mt-2 block text-xs text-zinc-500 dark:text-zinc-400">
                Accepte les inscriptions et crée un compte apprenant de test pour chaque candidat.
              </span>
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nombre de candidats (1 à 500)
            <input
              type="number"
              min="1"
              max="500"
              value={nombre}
              onChange={(event) => { setNombre(event.target.value); setResult(null); }}
              className={inputClass}
              required
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Inscriptions par candidat (maximum)
            <input
              type="number"
              min="1"
              max={Math.max(1, Math.min(10, selectedFormations.length))}
              value={maxFormations}
              onChange={(event) => { setMaxFormations(event.target.value); setResult(null); }}
              className={inputClass}
              required
            />
          </label>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Formations concernées</h2>
            <span className="text-xs text-zinc-500">{selectedFormations.length} sélectionnée(s), 10 maximum</span>
          </div>
          {loading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-zinc-500"><LoaderCircle size={16} className="animate-spin" /> Chargement des formations…</p>
          ) : formations.length === 0 ? (
            <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-900">Aucune formation disponible. Créez d’abord une formation.</p>
          ) : (
            <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-2">
              {formations.map((formation) => (
                <label key={formation.id_formation} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={selectedFormations.includes(formation.id_formation)}
                    onChange={() => toggleFormation(formation.id_formation)}
                    className="mt-0.5 accent-zinc-900"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">{formation.titre}</span>
                    <span className="text-xs text-zinc-500">{formation.statut}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        )}
        {result && (
          <div role="status" className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="font-semibold">{result.message}</p>
              <p className="mt-1">
                {result.candidats_crees} candidat(s), {result.candidatures_creees} candidature(s)
                {mode === 'apprenant' && ` et ${result.apprenants_crees} apprenant(s) créé(s)`}.
              </p>
            </div>
          </div>
        )}

        <footer className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">La génération est transactionnelle : en cas d’erreur, aucune donnée partielle n’est conservée.</p>
          <button
            type="submit"
            disabled={loading || saving || formations.length === 0 || selectedFormations.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Database size={16} />}
            {saving ? 'Génération…' : 'Générer les données'}
          </button>
        </footer>
      </form>
    </main>
  );
}
