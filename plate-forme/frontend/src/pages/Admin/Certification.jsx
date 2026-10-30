// frontend/src/pages/Certification.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Users
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import API from '../../services/api';
import '../css/Certification.css'; // Importation du CSS classique

const statusLabels = {
  CERTIFIE: 'Certifié',
  NON_CERTIFIE: 'Non certifié',
  EN_ATTENTE: 'En attente'
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const csvCell = (value) => {
  const text = String(value ?? '');
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
};

function SummaryCard({ label, value, icon: Icon, colorClass }) {
  return (
    <article className="cert-summary-card">
      <div className="cert-card-content">
        <div>
          <p className="cert-card-label">{label}</p>
          <p className="cert-card-value">{value}</p>
        </div>
        <div className={`cert-card-icon-wrapper ${colorClass}`}><Icon size={22} /></div>
      </div>
    </article>
  );
}

export default function AdminCertification() {
  const [formations, setFormations] = useState([]);
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [learners, setLearners] = useState([]);
  const [filter, setFilter] = useState('TOUS');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [learnersLoading, setLearnersLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    API.get('/admin/certifications/formations')
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error('Réponse invalide pour les statistiques de certification.');
        if (!cancelled) setFormations(response.data);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.response?.data?.message || requestError.message || 'Impossible de charger les statistiques.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const totalLearners = useMemo(
    () => formations.reduce((total, item) => total + Number(item.apprenants_count), 0),
    [formations]
  );
  const totalCertified = useMemo(
    () => formations.reduce((total, item) => total + Number(item.certifies_count), 0),
    [formations]
  );
  const chartData = useMemo(() => [...formations].reverse().map((item) => ({
    ...item,
    titre_court: item.titre.length > 22 ? `${item.titre.slice(0, 22)}…` : item.titre,
    apprenants_count: Number(item.apprenants_count),
    certifies_count: Number(item.certifies_count)
  })), [formations]);

  const openFormation = async (item) => {
    setSelectedFormation(item);
    setLearners([]);
    setFilter('TOUS');
    setSearch('');
    setLearnersLoading(true);
    setError('');
    try {
      const response = await API.get(`/admin/certifications/formations/${item.id_formation}/apprenants`);
      if (!response.data?.formation || !Array.isArray(response.data.learners)) {
        throw new Error('Réponse invalide pour la liste des apprenants.');
      }
      setSelectedFormation(response.data.formation);
      setLearners(response.data.learners);
    } catch (requestError) {
      setSelectedFormation(null);
      setError(requestError.response?.data?.message || requestError.message || 'Impossible de charger les apprenants.');
    } finally {
      setLearnersLoading(false);
    }
  };

  const filteredLearners = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return learners.filter((learner) => {
      const statusMatches = filter === 'TOUS' || learner.certification_statut === filter;
      const queryMatches = !query || `${learner.prenom} ${learner.nom} ${learner.email}`.toLocaleLowerCase('fr').includes(query);
      return statusMatches && queryMatches;
    });
  }, [learners, filter, search]);

  const exportCsv = () => {
    if (!selectedFormation) return;
    const rows = [
      ['Apprenant', 'E-mail', 'Statut de certification', 'Date de certification'],
      ...filteredLearners.map((learner) => [
        `${learner.prenom} ${learner.nom}`,
        learner.email,
        statusLabels[learner.certification_statut] || learner.certification_statut,
        formatDate(learner.date_certification)
      ])
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `certifications-${selectedFormation.titre.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    if (!selectedFormation) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Autorisez les fenêtres pop-up pour imprimer la liste.');
      return;
    }
    const rows = filteredLearners.map((learner) => `
      <tr>
        <td>${escapeHtml(`${learner.prenom} ${learner.nom}`)}</td>
        <td>${escapeHtml(learner.email)}</td>
        <td>${escapeHtml(statusLabels[learner.certification_statut] || learner.certification_statut)}</td>
        <td>${escapeHtml(formatDate(learner.date_certification))}</td>
      </tr>`).join('');
    printWindow.document.write(`<!doctype html>
      <html lang="fr"><head><meta charset="utf-8"><title>Certifications - ${escapeHtml(selectedFormation.titre)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#18181b;margin:36px}
        h1{margin-bottom:6px;color:#c2410c}p{color:#52525b;margin:4px 0 24px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #d4d4d8;padding:10px;text-align:left}
        th{background:#fff7ed;color:#9a3412}
        @media print{body{margin:12mm}}
      </style></head><body>
      <h1>Suivi des certifications</h1>
      <p>${escapeHtml(selectedFormation.titre)} · Formation clôturée le ${escapeHtml(formatDate(selectedFormation.date_fin))}</p>
      <table><thead><tr><th>Apprenant</th><th>E-mail</th><th>Statut</th><th>Date de certification</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">Aucun apprenant dans cette sélection.</td></tr>'}</tbody></table>
      <script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
    setError('');
  };

  return (
    <main className="cert-container">
      <header className="cert-hero-banner">
        <div className="cert-hero-content">
          <div className="cert-hero-icon"><Award size={28} /></div>
          <div>
            <p className="cert-hero-tag">Espace administrateur</p>
            <h1 className="cert-hero-title">Suivi des certifications</h1>
            <p className="cert-hero-desc">
              Consultez les statistiques de certification et les listes par formation. Cette page est en lecture seule.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="cert-error-banner">
          {error}
        </div>
      )}

      {selectedFormation ? (
        <section>
          <button
            onClick={() => { setSelectedFormation(null); setLearners([]); setError(''); }}
            className="cert-back-btn"
          >
            <ArrowLeft size={17} /> Retour aux statistiques
          </button>
          <div className="cert-detail-header-card">
            <div>
              <p className="cert-detail-date">Clôturée le {formatDate(selectedFormation.date_fin)}</p>
              <h2 className="cert-detail-title">{selectedFormation.titre}</h2>
              <p className="cert-detail-count">{filteredLearners.length} apprenant{filteredLearners.length > 1 ? 's' : ''} affiché{filteredLearners.length > 1 ? 's' : ''}</p>
            </div>
            <div className="cert-action-buttons">
              <button onClick={exportCsv} disabled={learnersLoading} className="cert-action-btn">
                <FileSpreadsheet size={17} /> Exporter Excel
              </button>
              <button onClick={printList} disabled={learnersLoading} className="cert-action-btn">
                <FileText size={17} /> Imprimer / PDF
              </button>
            </div>
          </div>

          <div className="cert-filters-bar">
            <div className="cert-filter-pills">
              {[
                ['TOUS', 'Tous'],
                ['CERTIFIE', 'Certifiés'],
                ['NON_CERTIFIE', 'Non certifiés'],
                ['EN_ATTENTE', 'En attente']
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`cert-pill ${filter === value ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="cert-search-wrapper">
              <Search className="cert-search-icon" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un apprenant"
                className="cert-search-input"
              />
            </label>
          </div>

          {learnersLoading ? (
            <div className="cert-state-box">Chargement des apprenants…</div>
          ) : filteredLearners.length === 0 ? (
            <div className="cert-state-box dashed">Aucun apprenant ne correspond à ce filtre.</div>
          ) : (
            <div className="cert-table-card">
              <div className="table-responsive">
                <table className="cert-table">
                  <thead>
                    <tr>
                      <th>Apprenant</th>
                      <th>E-mail</th>
                      <th>Statut</th>
                      <th>Date de certification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLearners.map((learner) => {
                      const status = learner.certification_statut;
                      const statusClass = status === 'CERTIFIE'
                        ? 'status-certifie'
                        : status === 'NON_CERTIFIE'
                          ? 'status-non-certifie'
                          : 'status-en-attente';
                      return (
                        <tr key={learner.id_apprenant} className="cert-tr">
                          <td className="cert-td font-bold">{learner.prenom} {learner.nom}</td>
                          <td className="cert-td text-muted">{learner.email}</td>
                          <td className="cert-td">
                            <span className={`cert-status-badge ${statusClass}`}>
                              {statusLabels[status] || status}
                            </span>
                          </td>
                          <td className="cert-td text-muted">{formatDate(learner.date_certification)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="cert-summary-grid">
            <SummaryCard
              label="Apprenants des formations clôturées"
              value={totalLearners}
              icon={Users}
              colorClass="icon-blue"
            />
            <SummaryCard
              label="Certifications accordées"
              value={totalCertified}
              icon={CheckCircle2}
              colorClass="icon-emerald"
            />
          </section>

          <section className="cert-chart-card">
            <div className="cert-chart-header">
              <h2 className="cert-section-title">Certifications par formation</h2>
              <p className="cert-section-desc">Nombre d’apprenants inscrits comparé au nombre de certifiés.</p>
            </div>
            {loading ? (
              <div className="cert-chart-state">Chargement des statistiques…</div>
            ) : chartData.length === 0 ? (
              <div className="cert-chart-state">Aucune formation terminée à afficher.</div>
            ) : (
              <div className="cert-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -16, bottom: 8 }}>
                    <defs>
                      <linearGradient id="certifiedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="learnersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.4} />
                    <XAxis dataKey="titre_court" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={56} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.titre || ''} />
                    <Area type="monotone" dataKey="apprenants_count" name="Apprenants" stroke="#64748b" fill="url(#learnersGradient)" strokeWidth={2} />
                    <Area type="monotone" dataKey="certifies_count" name="Certifiés" stroke="#f97316" fill="url(#certifiedGradient)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section>
            <div className="cert-grid-title-wrapper">
              <h2 className="cert-section-title large">Détail par formation</h2>
              <Download size={18} className="text-orange" />
            </div>
            {loading ? null : formations.length === 0 ? (
              <div className="cert-state-box dashed">Aucune formation clôturée.</div>
            ) : (
              <div className="cert-formations-grid">
                {formations.map((item) => (
                  <button
                    key={item.id_formation}
                    onClick={() => openFormation(item)}
                    className="cert-formation-card"
                  >
                    <div className="cert-formation-top">
                      <div className="cert-formation-icon"><Award size={22} /></div>
                      <span className="cert-formation-date-badge">Clôturée le {formatDate(item.date_fin)}</span>
                    </div>
                    <h3 className="cert-formation-name">{item.titre}</h3>
                    <div className="cert-formation-metrics">
                      <div>
                        <p className="metric-label">Apprenants</p>
                        <p className="metric-val">{item.apprenants_count}</p>
                      </div>
                      <div>
                        <p className="metric-label">Certifiés</p>
                        <p className="metric-val emerald">{item.certifies_count}</p>
                      </div>
                      <div>
                        <p className="metric-label">Non certifiés</p>
                        <p className="metric-val">{item.non_certifies_count}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}