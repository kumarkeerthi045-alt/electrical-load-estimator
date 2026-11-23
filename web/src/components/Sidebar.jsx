const SLIDERS = [
  { key: 'derating', label: 'Overall derating', min: 0.4, max: 1, step: 0.05, format: (v) => v.toFixed(2) },
  { key: 'maxVdPct', label: 'Maximum voltage drop (%)', min: 1, max: 8, step: 0.5, format: (v) => `${v.toFixed(1)}%` },
  { key: 'maxLoading', label: 'Maximum transformer loading', min: 0.5, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: 'futureMargin', label: 'Future load allowance', min: 0, max: 0.5, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
];

function NumberField({ label, value, onChange, min, max, step, suffix }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
      {suffix ? <div className="caption" style={{ marginTop: '0.2rem' }}>{suffix}</div> : null}
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step, format }) {
  return (
    <div className="field">
      <div className="slider-head">
        <label>{label}</label>
        <span className="slider-value">{format(value)}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Sidebar({
  settings,
  setSetting,
  projectName,
  setProjectName,
  projects,
  currentId,
  onSave,
  onLoad,
  onDelete,
  saving,
  apiOnline,
  status,
}) {
  return (
    <aside className="sidebar">
      <div className="eyebrow">Project configuration</div>

      <div className="field" style={{ marginBottom: '1rem' }}>
        <label htmlFor="project-name">Project name</label>
        <input
          id="project-name"
          type="text"
          value={projectName}
          placeholder="e.g. Sample apartment block"
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

      <div className="btn-row" style={{ marginBottom: '0.4rem' }}>
        <button type="button" className="btn" onClick={onSave} disabled={saving || !apiOnline}>
          {saving ? 'Saving…' : currentId ? 'Save changes' : 'Save project'}
        </button>
        <span className="badge" title={apiOnline ? 'API reachable' : 'API not reachable — running in local-only mode'}>
          <span className={`dot ${apiOnline ? 'online' : 'offline'}`} />
          {apiOnline ? 'API' : 'local'}
        </span>
      </div>
      {status ? <div className="caption" style={{ color: '#8da2b9' }}>{status}</div> : null}

      <hr className="divider" />

      <h4 style={{ marginBottom: '0.7rem' }}>Supply parameters</h4>
      <NumberField
        label="Line voltage (V)"
        value={settings.voltage}
        min={100}
        max={33000}
        step={5}
        onChange={(v) => setSetting('voltage', v)}
      />
      <NumberField
        label="Diversity factor"
        value={settings.diversityFactor}
        min={1}
        max={3}
        step={0.05}
        suffix="Must be 1 or greater"
        onChange={(v) => setSetting('diversityFactor', v)}
      />

      <hr className="divider" />

      <h4 style={{ marginBottom: '0.7rem' }}>Feeder cable</h4>
      <NumberField
        label="Cable route length (m)"
        value={settings.cableLengthM}
        min={1}
        max={5000}
        step={10}
        onChange={(v) => setSetting('cableLengthM', v)}
      />
      <SliderField
        label="Overall derating"
        value={settings.derating}
        min={0.4}
        max={1}
        step={0.05}
        format={(v) => v.toFixed(2)}
        onChange={(v) => setSetting('derating', v)}
      />
      <SliderField
        label="Maximum voltage drop (%)"
        value={settings.maxVdPct}
        min={1}
        max={8}
        step={0.5}
        format={(v) => `${v.toFixed(1)}%`}
        onChange={(v) => setSetting('maxVdPct', v)}
      />

      <hr className="divider" />

      <h4 style={{ marginBottom: '0.7rem' }}>Transformer</h4>
      <SliderField
        label="Maximum loading"
        value={settings.maxLoading}
        min={0.5}
        max={1}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => setSetting('maxLoading', v)}
      />
      <SliderField
        label="Future load allowance"
        value={settings.futureMargin}
        min={0}
        max={0.5}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => setSetting('futureMargin', v)}
      />

      <hr className="divider" />

      <div className="eyebrow" style={{ marginBottom: '0.6rem' }}>Saved projects</div>
      <div className="project-list">
        {projects.length === 0 ? (
          <div className="note">{apiOnline ? 'No saved projects yet.' : 'Start the API to save projects.'}</div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className={`project-item ${project.id === currentId ? 'active' : ''}`}
              onClick={() => onLoad(project)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onLoad(project); }}
            >
              <div>
                <div className="pname">{project.name}</div>
                <div className="pmeta">
                  {project.loads?.length ?? 0} loads · {project.lastReport?.transformer?.kva ?? '—'} kVA
                </div>
              </div>
              <button
                type="button"
                className="btn-danger"
                title="Delete project"
                onClick={(e) => { e.stopPropagation(); onDelete(project); }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      <hr className="divider" />
      <div className="note">
        Indicative copper XLPE cable data only. Validate final selections against local codes and
        manufacturer datasheets before installation.
      </div>
    </aside>
  );
}

export { SLIDERS };
