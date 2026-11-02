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

const statusLabels = {
  CERTIFIE: 'Certifié',
  NON_CERTIFIE: 'Non certifié'
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
    <article className="cert-summary-card [border-radius:24px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [padding:20px] [box-shadow:0_1px_3px_var(--shadow-color)] [transition:all_0.2s] [&:hover]:[box-shadow:0_8px_20px_var(--shadow-color)]">
      <div className="cert-card-content [display:flex] [align-items:center] [justify-content:space-between] [gap:12px]">
        <div>
          <p className="cert-card-label [font-size:13px] [font-weight:600] [color:var(--cert-muted)] [margin:0]">{label}</p>
          <p className="cert-card-value [margin-top:8px] [font-size:28px] [font-weight:900] [color:var(--cert-text)] [font-variant-numeric:tabular-nums]">{value}</p>
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
    <main className="cert-container [margin:0_auto] [width:100%] [max-width:1280px] [display:flex] [flex-direction:column] [gap:24px] [padding:16px_16px_32px_16px] [font-family:inherit] [color:var(--cert-text)] [background-color:var(--cert-bg)] [box-sizing:border-box] [transition:background-color_0.3s_ease,_color_0.3s_ease] [min-height:100vh]">
      <header className="cert-hero-banner [border-radius:24px] [background:linear-gradient(135deg,_\#f97316_0%,_\#f59e0b_100%)] [padding:24px] [color:\#ffffff] [box-shadow:0_10px_25px_rgba(249,_115,_22,_0.2)] [box-sizing:border-box]">
        <div className="cert-hero-content [display:flex] [align-items:flex-start] [gap:16px]">
          <div className="cert-hero-icon [border-radius:16px] [background-color:rgba(255,_255,_255,_0.2)] [padding:12px] [display:flex] [align-items:center] [justify-content:center]"><Award size={28} /></div>
          <div>
            <p className="cert-hero-tag [font-size:11px] [font-weight:700] [text-transform:uppercase] [letter-spacing:0.1em] [color:\#ffedd5] [margin:0]">Espace administrateur</p>
            <h1 className="cert-hero-title [margin:4px_0_0_0] [font-size:26px] [font-weight:900] [letter-spacing:-0.025em]">Suivi des certifications</h1>
            <p className="cert-hero-desc [margin:8px_0_0_0] [max-width:650px] [font-size:13px] [color:\#fef3c7] [line-height:1.5]">
              Consultez les statistiques de certification et les listes par formation. Cette page est en lecture seule.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div role="alert" className="cert-error-banner [border-radius:16px] [border:1px_solid_rgba(239,_68,_68,_0.3)] [background-color:rgba(239,_68,_68,_0.1)] [padding:12px_16px] [font-size:13px] [font-weight:600] [color:\#ef4444]">
          {error}
        </div>
      )}

      {selectedFormation ? (
        <section>
          <button
            onClick={() => { setSelectedFormation(null); setLearners([]); setError(''); }}
            className="cert-back-btn [display:inline-flex] [align-items:center] [gap:8px] [border-radius:12px] [padding:8px_12px] [font-size:13px] [font-weight:700] [color:var(--cert-muted)] [background:none] [border:none] [cursor:pointer] [transition:background-color_0.2s,_color_0.2s] [margin-bottom:16px] [&:hover]:[background-color:var(--cert-hover)] [&:hover]:[color:var(--cert-text)]"
          >
            <ArrowLeft size={17} /> Retour aux statistiques
          </button>
          <div className="cert-detail-header-card [display:flex] [flex-direction:column] [justify-content:space-between] [gap:16px] [border-radius:24px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [padding:20px] [box-shadow:0_1px_3px_var(--shadow-color)] [margin-bottom:20px]">
            <div>
              <p className="cert-detail-date [font-size:12px] [font-weight:600] [color:var(--orange-primary)] [margin:0]">Clôturée le {formatDate(selectedFormation.date_fin)}</p>
              <h2 className="cert-detail-title [margin:4px_0_0_0] [font-size:20px] [font-weight:900] [color:var(--cert-text)]">{selectedFormation.titre}</h2>
              <p className="cert-detail-count [margin:6px_0_0_0] [font-size:12px] [color:var(--cert-muted)]">{filteredLearners.length} apprenant{filteredLearners.length > 1 ? 's' : ''} affiché{filteredLearners.length > 1 ? 's' : ''}</p>
            </div>
            <div className="cert-action-buttons [display:flex] [flex-wrap:wrap] [gap:8px]">
              <button onClick={exportCsv} disabled={learnersLoading} className="cert-action-btn [display:inline-flex] [align-items:center] [gap:8px] [border-radius:12px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [padding:8px_14px] [font-size:13px] [font-weight:700] [color:var(--cert-text)] [cursor:pointer] [transition:background-color_0.2s]">
                <FileSpreadsheet size={17} /> Exporter Excel
              </button>
              <button onClick={printList} disabled={learnersLoading} className="cert-action-btn [display:inline-flex] [align-items:center] [gap:8px] [border-radius:12px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [padding:8px_14px] [font-size:13px] [font-weight:700] [color:var(--cert-text)] [cursor:pointer] [transition:background-color_0.2s]">
                <FileText size={17} /> Imprimer / PDF
              </button>
            </div>
          </div>

          <div className="cert-filters-bar [display:flex] [flex-direction:column] [gap:12px] [margin-bottom:16px]">
            <div className="cert-filter-pills [display:flex] [flex-wrap:wrap] [gap:8px]">
              {[
                ['TOUS', 'Tous'],
                ['CERTIFIE', 'Certifiés'],
                ['NON_CERTIFIE', 'Non certifiés']
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
            <label className="cert-search-wrapper [position:relative] [display:block] [width:100%]">
              <Search className="cert-search-icon [position:absolute] [left:12px] [top:50%] [transform:translateY(-50%)] [color:var(--cert-muted)]" size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un apprenant"
                className="cert-search-input [width:100%] [border-radius:12px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-input-bg)] [padding:10px_12px_10px_38px] [font-size:13px] [color:var(--cert-text)] [outline:none] [box-sizing:border-box] [transition:border-color_0.2s,_box-shadow_0.2s]"
              />
            </label>
          </div>

          {learnersLoading ? (
            <div className="cert-state-box [border-radius:24px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [padding:40px] [text-align:center] [font-size:13px] [font-weight:600] [color:var(--cert-muted)]">Chargement des apprenants…</div>
          ) : filteredLearners.length === 0 ? (
            <div className="cert-state-box [border-radius:24px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [padding:40px] [text-align:center] [font-size:13px] [font-weight:600] [color:var(--cert-muted)] dashed">Aucun apprenant ne correspond à ce filtre.</div>
          ) : (
            <div className="cert-table-card [overflow:hidden] [border-radius:24px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [box-shadow:0_1px_3px_var(--shadow-color)]">
              <div className="table-responsive [overflow-x:auto]">
                <table className="cert-table [width:100%] [min-width:640px] [text-align:left] [font-size:13px] [border-collapse:collapse]">
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
                        <tr key={learner.id_apprenant} className="cert-tr [border-top:1px_solid_var(--cert-border)] [transition:background-color_0.2s] [&:hover]:[background-color:var(--cert-hover)]">
                          <td className="cert-td [color:var(--cert-text)] font-bold">{learner.prenom} {learner.nom}</td>
                          <td className="cert-td [color:var(--cert-text)] text-muted [color:var(--cert-muted)]">{learner.email}</td>
                          <td className="cert-td [color:var(--cert-text)]">
                            <span className={`cert-status-badge ${statusClass}`}>
                              {statusLabels[status] || status}
                            </span>
                          </td>
                          <td className="cert-td [color:var(--cert-text)] text-muted [color:var(--cert-muted)]">{formatDate(learner.date_certification)}</td>
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
          <section className="cert-summary-grid [display:grid] [gap:16px] [grid-template-columns:1fr]">
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

          <section className="cert-chart-card [border-radius:24px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [padding:20px] [box-shadow:0_1px_3px_var(--shadow-color)]">
            <div className="cert-chart-header [margin-bottom:20px]">
              <h2 className="cert-section-title [font-size:16px] [font-weight:900] [color:var(--cert-text)] [margin:0]">Certifications par formation</h2>
              <p className="cert-section-desc [margin:4px_0_0_0] [font-size:12px] [color:var(--cert-muted)]">Nombre d’apprenants inscrits comparé au nombre de certifiés.</p>
            </div>
            {loading ? (
              <div className="cert-chart-state [display:flex] [height:288px] [align-items:center] [justify-content:center] [font-size:13px] [font-weight:600] [color:var(--cert-muted)]">Chargement des statistiques…</div>
            ) : chartData.length === 0 ? (
              <div className="cert-chart-state [display:flex] [height:288px] [align-items:center] [justify-content:center] [font-size:13px] [font-weight:600] [color:var(--cert-muted)]">Aucune formation terminée à afficher.</div>
            ) : (
              <div className="cert-chart-container [height:320px] [width:100%]">
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
            <div className="cert-grid-title-wrapper [display:flex] [align-items:center] [gap:8px] [margin-bottom:16px]">
              <h2 className="cert-section-title [font-size:16px] [font-weight:900] [color:var(--cert-text)] [margin:0] large">Détail par formation</h2>
              <Download size={18} className="text-orange [color:var(--orange-primary)]" />
            </div>
            {loading ? null : formations.length === 0 ? (
              <div className="cert-state-box [border-radius:24px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [padding:40px] [text-align:center] [font-size:13px] [font-weight:600] [color:var(--cert-muted)] dashed">Aucune formation clôturée.</div>
            ) : (
              <div className="cert-formations-grid [display:grid] [gap:16px] [grid-template-columns:1fr]">
                {formations.map((item) => (
                  <button
                    key={item.id_formation}
                    onClick={() => openFormation(item)}
                    className="cert-formation-card [border-radius:24px] [border:1px_solid_var(--cert-border)] [background-color:var(--cert-panel)] [padding:20px] [text-align:left] [box-shadow:0_1px_3px_var(--shadow-color)] [cursor:pointer] [transition:all_0.25s_ease] [box-sizing:border-box] [&:hover]:[transform:translateY(-2px)] [&:hover]:[border-color:var(--orange-primary)] [&:hover]:[box-shadow:0_10px_25px_var(--shadow-color)]"
                  >
                    <div className="cert-formation-top [display:flex] [align-items:flex-start] [justify-content:space-between] [gap:12px]">
                      <div className="cert-formation-icon [display:flex] [height:44px] [width:44px] [align-items:center] [justify-content:center] [border-radius:16px] [background-color:var(--orange-bg-light)] [color:var(--orange-primary)]"><Award size={22} /></div>
                      <span className="cert-formation-date-badge [border-radius:9999px] [background-color:var(--cert-hover)] [padding:4px_10px] [font-size:10px] [font-weight:700] [color:var(--cert-muted)] [border:1px_solid_var(--cert-border)]">Clôturée le {formatDate(item.date_fin)}</span>
                    </div>
                    <h3 className="cert-formation-name [margin:16px_0_0_0] [font-size:16px] [font-weight:900] [color:var(--cert-text)] [line-height:1.3]">{item.titre}</h3>
                    <div className="cert-formation-metrics [margin-top:16px] [display:grid] [grid-template-columns:repeat(3,_1fr)] [gap:8px] [border-top:1px_solid_var(--cert-border)] [padding-top:16px]">
                      <div>
                        <p className="metric-label [font-size:11px] [color:var(--cert-muted)] [margin:0]">Apprenants</p>
                        <p className="metric-val [margin-top:4px] [font-size:14px] [font-weight:900] [color:var(--cert-text)]">{item.apprenants_count}</p>
                      </div>
                      <div>
                        <p className="metric-label [font-size:11px] [color:var(--cert-muted)] [margin:0]">Certifiés</p>
                        <p className="metric-val [margin-top:4px] [font-size:14px] [font-weight:900] [color:var(--cert-text)] emerald">{item.certifies_count}</p>
                      </div>
                      <div>
                        <p className="metric-label [font-size:11px] [color:var(--cert-muted)] [margin:0]">Non certifiés</p>
                        <p className="metric-val [margin-top:4px] [font-size:14px] [font-weight:900] [color:var(--cert-text)]">{item.non_certifies_count}</p>
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