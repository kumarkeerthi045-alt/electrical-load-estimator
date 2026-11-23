import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SETTINGS, estimate } from '@voltwise/engine';

import { api } from './api/client.js';
import { Sidebar } from './components/Sidebar.jsx';
import { LoadSchedule } from './components/LoadSchedule.jsx';
import { DemandChart, MetricCard, MiniMetric, SectionHead } from './components/MetricCard.jsx';
import { cableLabel, download, fmt, resultsCsv } from './lib/format.js';

const SAMPLE_LOADS = [
  { name: 'Borewell pumps', quantity: 4, ratedKw: 7.5, powerFactor: 0.82, demandFactor: 0.75, phases: 3 },
  { name: 'Air conditioners', quantity: 10, ratedKw: 2.2, powerFactor: 0.9, demandFactor: 0.8, phases: 1 },
  { name: 'Lighting', quantity: 1, ratedKw: 12, powerFactor: 0.95, demandFactor: 0.9, phases: 1 },
  { name: 'Lift', quantity: 2, ratedKw: 11, powerFactor: 0.8, demandFactor: 0.5, phases: 3 },
  { name: 'Workshop machines', quantity: 6, ratedKw: 5.5, powerFactor: 0.8, demandFactor: 0.6, phases: 3 },
  { name: 'Socket outlets', quantity: 1, ratedKw: 15, powerFactor: 0.9, demandFactor: 0.4, phases: 1 },
];

const INITIAL_SETTINGS = {
  ...DEFAULT_SETTINGS,
  diversityFactor: 1.1,
  derating: 0.8,
  cableLengthM: 120,
};

export default function App() {
  const [loads, setLoads] = useState(SAMPLE_LOADS);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [projectName, setProjectName] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // ---- live estimate (runs in the browser, identical engine as the API) ----
  const { report, calcError } = useMemo(() => {
    try {
      return { report: estimate({ loads, settings }), calcError: '' };
    } catch (err) {
      return { report: null, calcError: err.message };
    }
  }, [loads, settings]);

  const refreshProjects = useCallback(async () => {
    try {
      const { projects: list } = await api.listProjects();
      setProjects(list);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const setSetting = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));

  const onRowChange = (index, patch) =>
    setLoads((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const onAdd = () =>
    setLoads((prev) => [
      ...prev,
      { name: 'New load', quantity: 1, ratedKw: 5, powerFactor: 0.85, demandFactor: 1, phases: 3 },
    ]);

  const onRemove = (index) => setLoads((prev) => prev.filter((_, i) => i !== index));

  const onImport = (parsed) => {
    setLoads(parsed);
    setCurrentId(null);
    setStatus(`Imported ${parsed.length} loads from CSV`);
  };

  // ------------------------------------------------------------- projects --
  const onSave = async () => {
    const name = projectName.trim() || 'Untitled project';
    setSaving(true);
    setStatus('');
    try {
      const payload = { name, loads, settings };
      const saved = currentId
        ? await api.updateProject(currentId, payload)
        : await api.createProject(payload);
      setCurrentId(saved.id);
      setProjectName(saved.name);
      setStatus(`Saved “${saved.name}”`);
      await refreshProjects();
    } catch (err) {
      setStatus(`Could not save: ${err.message}`);
      if (err.status === undefined) setApiOnline(false);
    } finally {
      setSaving(false);
    }
  };

  const onLoad = (project) => {
    setLoads(project.loads?.length ? project.loads : SAMPLE_LOADS);
    setSettings({ ...INITIAL_SETTINGS, ...(project.settings || {}) });
    setProjectName(project.name);
    setCurrentId(project.id);
    setStatus(`Loaded “${project.name}”`);
  };

  const onDelete = async (project) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete “${project.name}”? This cannot be undone.`)) return;
    try {
      await api.deleteProject(project.id);
      if (project.id === currentId) {
        setCurrentId(null);
        setProjectName('');
      }
      setStatus(`Deleted “${project.name}”`);
      await refreshProjects();
    } catch (err) {
      setStatus(`Could not delete: ${err.message}`);
    }
  };

  // --------------------------------------------------------------- export --
  const onExport = () => {
    if (!report) return;
    const slug = (projectName.trim() || 'load-schedule').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    download(`${slug}-results.csv`, resultsCsv(report));
  };

  const onExportTemplate = () => {
    download(
      'load-schedule-template.csv',
      'name,quantity,rated_kw,power_factor,demand_factor,phases\nBorewell pumps,4,7.5,0.82,0.75,3\nLighting,1,12,0.95,0.9,1\n',
    );
  };

  const onCopySchedule = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ loads, settings }, null, 2));
      setStatus('Schedule JSON copied — paste it into the Flutter app');
    } catch {
      setStatus('Clipboard not available in this browser');
    }
  };

  return (
    <div className="shell">
      <Sidebar
        settings={settings}
        setSetting={setSetting}
        projectName={projectName}
        setProjectName={setProjectName}
        projects={projects}
        currentId={currentId}
        onSave={onSave}
        onLoad={onLoad}
        onDelete={onDelete}
        saving={saving}
        apiOnline={apiOnline}
        status={status}
      />

      <main className="main">
        <header className="hero">
          <div className="pill">Engineering workspace · LT distribution</div>
          <div className="eyebrow">Voltwise / Load Studio</div>
          <h1>
            Electrical Load
            <br />
            &amp; Cable Sizing
          </h1>
          <p>
            Build a clean load schedule, understand your maximum demand, and estimate feeder cable and
            transformer requirements — all in one engineering workspace.
          </p>
        </header>

        {error ? <div className="alert alert-error">{error}</div> : null}
        {calcError ? <div className="alert alert-error">{calcError}</div> : null}
        {!apiOnline ? (
          <div className="alert alert-info">
            The API is not reachable, so calculations run locally in the browser and saving is
            disabled. Start it with <span className="mono">npm run dev</span> in the project root.
          </div>
        ) : null}

        <SectionHead number="01" title="Load schedule" sub="Define the equipment connected to your system" />
        <LoadSchedule
          loads={loads}
          onRowChange={onRowChange}
          onAdd={onAdd}
          onRemove={onRemove}
          onImport={onImport}
          onError={setError}
        />

        {report ? (
          <>
            <SectionHead number="02" title="Demand overview" sub="Live calculations from your schedule" />
            <div className="metric-row">
              <MetricCard
                label="Connected load"
                value={fmt(report.summary.connectedKw, 1)}
                unit="kW"
                foot="installed equipment"
              />
              <MetricCard
                label="Maximum demand"
                value={fmt(report.summary.maxDemandKva, 1)}
                unit="kVA"
                foot="after diversity"
              />
              <MetricCard
                label="Overall power factor"
                value={fmt(report.summary.overallPf, 3)}
                foot="cos φ · combined schedule"
              />
              <MetricCard
                label="Feeder current"
                value={fmt(report.feeder.current, 1)}
                unit="A"
                foot={`${report.feeder.phases}-phase estimate`}
              />
            </div>

            <div className="grid-2-wide" style={{ marginTop: '1.1rem' }}>
              <div className="panel">
                <h4 style={{ marginBottom: '0.7rem' }}>Load contribution</h4>
                <table className="result-table">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Connected (kW)</th>
                      <th>Demand (kW)</th>
                      <th>Reactive (kVAr)</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.breakdown.map((row, i) => (
                      <tr key={`${row.name}-${i}`}>
                        <td>{row.name}</td>
                        <td>{fmt(row.connectedKw, 2)}</td>
                        <td>{fmt(row.demandKw, 2)}</td>
                        <td>{fmt(row.demandKvar, 2)}</td>
                        <td>{fmt(row.shareOfDemandPct, 1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel">
                <h4 style={{ marginBottom: '0.7rem' }}>Demand by equipment</h4>
                <DemandChart breakdown={report.breakdown} />
                <div className="caption">
                  The chart compares each equipment group&apos;s demand contribution in kW.
                </div>
              </div>
            </div>

            <SectionHead number="03" title="Equipment sizing" sub="Cable and transformer recommendations" />
            <div className="grid-2">
              <div className="panel">
                <h4 style={{ marginBottom: '0.7rem' }}>Main feeder cable</h4>
                {report.cable ? (
                  <>
                    <div className="result-good">
                      <div className="eyebrow" style={{ marginBottom: '0.2rem' }}>Recommended cable</div>
                      <div className="headline">{cableLabel(report.cable)}</div>
                      <div className="sub">Copper · XLPE · armoured</div>
                    </div>
                    <div className="mini-metrics">
                      <MiniMetric label="Derated capacity" value={`${fmt(report.cable.deratedCapacityA, 0)} A`} />
                      <MiniMetric label="Voltage drop" value={`${fmt(report.cable.voltageDropPct, 2)}%`} />
                    </div>
                    <div className="caption">
                      Current requirement: {fmt(report.feeder.current, 1)} A · Allowed voltage drop:{' '}
                      {fmt(settings.maxVdPct, 1)}% · Governing check: {report.cable.limitedBy}
                    </div>
                  </>
                ) : (
                  <div className="note">Add at least one valid load to size the feeder cable.</div>
                )}
              </div>

              <div className="panel">
                <h4 style={{ marginBottom: '0.7rem' }}>Transformer rating</h4>
                {report.transformer ? (
                  <>
                    <div className="result-good">
                      <div className="eyebrow" style={{ marginBottom: '0.2rem' }}>Next standard rating</div>
                      <div className="headline">{fmt(report.transformer.kva, 0)} kVA</div>
                      <div className="sub">Transformer capacity recommendation</div>
                    </div>
                    <div className="mini-metrics">
                      <MiniMetric label="Calculated requirement" value={`${fmt(report.transformer.requiredKva, 1)} kVA`} />
                      <MiniMetric label="Loading at max demand" value={`${fmt(report.transformer.loadingPct, 1)}%`} />
                    </div>
                    <div className="caption">
                      Includes {Math.round(settings.futureMargin * 100)}% future load allowance, capped at{' '}
                      {Math.round(settings.maxLoading * 100)}% loading.
                    </div>
                  </>
                ) : (
                  <div className="note">Add at least one valid load to size the transformer.</div>
                )}
              </div>
            </div>

            {report.warnings?.length ? (
              <div style={{ marginTop: '1rem' }}>
                {report.warnings.map((warning) => (
                  <div className="alert alert-warn" key={warning}>⚠ {warning}</div>
                ))}
              </div>
            ) : null}

            <SectionHead number="04" title="Export & engineering notes" />
            <div className="grid-2-wide">
              <div className="panel">
                <h4 style={{ marginBottom: '0.7rem' }}>Take the numbers with you</h4>
                <div className="btn-row">
                  <button type="button" className="btn" onClick={onExport}>
                    ↓ Download load results (CSV)
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={onExportTemplate}>
                    ↓ CSV template
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={onCopySchedule}>
                    ⧉ Copy schedule JSON
                  </button>
                </div>
                <div className="caption">
                  The JSON export pastes straight into the Flutter app&apos;s schedule import.
                </div>
              </div>
              <div className="panel">
                <h4 style={{ marginBottom: '0.5rem' }}>Engineering notes</h4>
                <div className="note">
                  This tool provides preliminary estimates using indicative cable ampacity and impedance
                  data. Confirm installation method, ambient temperature, grouping, short-circuit
                  withstand, protection coordination, earthing and applicable IS / IEC requirements with a
                  qualified electrical engineer before using these results for construction.
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="footer">
          <span>VOLTWISE · LOAD STUDIO</span>
          <span>MERN + FLUTTER BUILD · ENGINEERING ESTIMATES · VERIFY BEFORE IMPLEMENTATION</span>
        </div>
      </main>
    </div>
  );
}
