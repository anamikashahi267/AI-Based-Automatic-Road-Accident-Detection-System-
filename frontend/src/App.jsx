import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileVideo2,
  LayoutDashboard,
  MapPin,
  Menu,
  Radio,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { analyzeVideo, getCameras, getIncidents, getStats } from "./api.js";

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analysis", label: "Video Analysis", icon: FileVideo2 },
  { id: "monitoring", label: "Live Monitoring", icon: Radio },
  { id: "history", label: "Incident History", icon: Clock3 },
];

const sampleCameras = [
  { id: "CAM-01", name: "Downtown Junction", area: "Central District", status: "Online", color: "blue" },
  { id: "CAM-02", name: "North Highway", area: "North Outer Ring Road", status: "Online", color: "green" },
  { id: "CAM-03", name: "Market Street", area: "Old Town", status: "Maintenance", color: "amber" },
  { id: "CAM-04", name: "Riverside Bridge", area: "East Riverside", status: "Online", color: "blue" },
];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatOffset(seconds) {
  const wholeSeconds = Math.floor(seconds || 0);
  return `${String(Math.floor(wholeSeconds / 60)).padStart(2, "0")}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function StatusBadge({ status }) {
  const incident = status === "possible_incident";
  return (
    <span className={`status-badge ${incident ? "danger" : "safe"}`}>
      {incident ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
      {incident ? "Possible incident" : "No incident signal"}
    </span>
  );
}

function IncidentTable({ incidents, compact = false }) {
  if (!incidents.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><FileVideo2 size={21} /></div>
        <strong>No videos analyzed yet</strong>
        <span>Upload a surveillance clip to start your first demo analysis.</span>
      </div>
    );
  }
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Incident ID</th>
            <th>Detection time</th>
            {!compact && <th>Camera / location</th>}
            <th>Status</th>
            {!compact && <th>Confidence</th>}
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id}>
              <td><span className="id-cell">#{incident.id.slice(0, 8).toUpperCase()}</span></td>
              <td>{formatDate(incident.analyzed_at)}</td>
              {!compact && (
                <td>
                  <div className="location-cell">
                    <strong>{incident.camera_id} · {incident.camera_name}</strong>
                    <span>{incident.location}</span>
                  </div>
                </td>
              )}
              <td><StatusBadge status={incident.status} /></td>
              {!compact && <td className="muted-cell">{incident.confidence == null ? "Not available" : `${incident.confidence}%`}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dashboard({ stats, incidents, onNavigate }) {
  const [dismissedAlertId, setDismissedAlertId] = useState(null);
  const metrics = [
    { title: "Videos analyzed", value: stats.analyzed, icon: FileVideo2, color: "blue", trend: "All-time total" },
    { title: "Possible incidents", value: stats.accidents, icon: AlertTriangle, color: "red", trend: "Demo heuristic signals" },
    { title: "No incident signal", value: stats.safe, icon: ShieldCheck, color: "green", trend: "All-time total" },
  ];
  const latestAlert = incidents.find((incident) => incident.status === "possible_incident" && incident.id !== dismissedAlertId);

  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Good afternoon</h1>
          <p className="welcome-copy">Here’s what’s happening across your video analysis workspace.</p>
        </div>
        <button className="primary-button" onClick={() => onNavigate("analysis")}><Upload size={16} /> Analyze a video</button>
      </section>
      <div className="demo-banner">
        <Activity size={17} />
        <span><strong>Student prototype · Demo mode.</strong> Results use an unvalidated OpenCV motion heuristic. No trained accident model or real CCTV feeds are connected.</span>
      </div>
      <section className="stats-grid">
        {metrics.map(({ title, value, icon: Icon, color, trend }) => (
          <article className="stat-card" key={title}>
            <div className={`stat-icon ${color}`}><Icon size={19} /></div>
            <p className="stat-title">{title}</p>
            <div className="stat-value">{value}<span className="stat-trend"><ArrowUpRight size={13} /> live</span></div>
            <p className="stat-foot">{trend}</p>
          </article>
        ))}
        <article className="stat-card uptime-card">
          <div className="stat-icon slate"><Camera size={19} /></div>
          <p className="stat-title">Sample cameras</p>
          <div className="stat-value">04<span className="stat-trend"><span className="online-dot" /> demo</span></div>
          <p className="stat-foot">Simulated feeds only</p>
        </article>
      </section>
      {latestAlert && (
        <section className="alert-card">
          <div className="alert-symbol"><AlertTriangle size={19} /></div>
          <div className="alert-content">
            <div className="alert-title-row"><strong>Possible incident detected</strong><span className="alert-live">DEMO ALERT</span></div>
            <p>{formatDate(latestAlert.analyzed_at)} · {latestAlert.camera_id} · {latestAlert.location}</p>
            <span className="alert-detail">Video timestamp {formatOffset(latestAlert.video_offset_seconds)} · simulated alert only; no authorities notified</span>
          </div>
          <button className="icon-button alert-close" aria-label="Dismiss alert" onClick={() => setDismissedAlertId(latestAlert.id)}><X size={17} /></button>
        </section>
      )}
      <section className="panel">
        <div className="panel-heading">
          <div><h2>Recent analysis</h2><p>Your latest uploaded video results</p></div>
          <button className="text-button" onClick={() => onNavigate("history")}>View history <ChevronRight size={15} /></button>
        </div>
        <IncidentTable incidents={incidents.slice(0, 5)} compact />
      </section>
      <p className="footnote"><ArrowDownRight size={13} /> Confidence scores are not available: this prototype does not use a trained model.</p>
    </>
  );
}

function VideoAnalysis({ cameras, onAnalyzed }) {
  const [file, setFile] = useState(null);
  const [cameraId, setCameraId] = useState(cameras[0]?.id || "CAM-01");
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(nextFile) {
    setError("");
    setResult(null);
    if (!nextFile) return;
    if (!/\.(mp4|avi)$/i.test(nextFile.name)) {
      setFile(null);
      setError("Please choose a video in MP4 or AVI format.");
      return;
    }
    if (nextFile.size > 200 * 1024 * 1024) {
      setFile(null);
      setError("Video exceeds the 200 MB upload limit.");
      return;
    }
    setFile(nextFile);
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) {
      setError("Choose an MP4 or AVI video before starting analysis.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const analysis = await analyzeVideo(file, cameraId);
      setResult(analysis);
      await onAnalyzed();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="page-intro"><p className="eyebrow">VIDEO ANALYSIS</p><h1>Analyze a video</h1><p>Upload an MP4 or AVI surveillance clip for a local, motion-based demo analysis.</p></section>
      <div className="demo-banner"><Activity size={17} /><span><strong>Demo heuristic only.</strong> This prototype has no trained accident detection model; motion changes can produce false positives or miss real incidents.</span></div>
      <div className="analysis-layout">
        <form className="panel analysis-form" onSubmit={submit}>
          <div className="panel-heading"><div><h2>Video source</h2><p>Select a clip and its sample camera</p></div><span className="step-label">STEP 01</span></div>
          <label className={`drop-zone ${file ? "has-file" : ""}`}>
            <input type="file" accept=".mp4,.avi,video/mp4,video/x-msvideo" onChange={(event) => chooseFile(event.target.files?.[0])} />
            <div className="upload-icon"><Upload size={21} /></div>
            <strong>{file ? file.name : "Drop a video here, or browse"}</strong>
            <span>{file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · Ready to analyze` : "MP4 or AVI · Maximum file size 200 MB"}</span>
            <span className="browse-link">{file ? "Choose a different video" : "Browse files"}</span>
          </label>
          <div className="field-group">
            <label htmlFor="camera-select">Associated sample camera</label>
            <select id="camera-select" value={cameraId} onChange={(event) => setCameraId(event.target.value)}>
              {cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.id} · {camera.name} ({camera.area})</option>)}
            </select>
            <span className="field-hint"><MapPin size={13} /> Location is a predefined camera location, not GPS extracted from the video.</span>
          </div>
          {error && <div className="inline-error" role="alert"><AlertTriangle size={15} />{error}</div>}
          <button className="primary-button analyze-button" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Analyzing video…</> : <><Activity size={17} /> Analyze video</>}
          </button>
          {loading && <p className="loading-note">OpenCV is sampling video frames locally. Larger clips may take a little longer.</p>}
        </form>
        <div className="preview-column">
          <section className="panel preview-panel">
            <div className="panel-heading"><div><h2>Video preview</h2><p>Review your clip before analysis</p></div></div>
            <div className={`video-preview ${previewUrl ? "has-preview" : ""}`}>
              {previewUrl ? <video src={previewUrl} controls /> : <div className="preview-empty"><div className="preview-empty-icon"><FileVideo2 size={24} /></div><strong>Preview appears here</strong><span>Choose a video to view it before analysis</span></div>}
            </div>
          </section>
          {result && (
            <section className={`result-card ${result.status === "possible_incident" ? "result-danger" : "result-safe"}`} aria-live="polite">
              <div className="result-heading">
                <div className={`result-icon ${result.status === "possible_incident" ? "danger" : "safe"}`}>{result.status === "possible_incident" ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}</div>
                <div><span className="eyebrow">ANALYSIS COMPLETE · DEMO</span><h2>{result.status === "possible_incident" ? "Possible incident signal" : "No incident signal found"}</h2></div>
              </div>
              <div className="result-details">
                <div><span>Camera</span><strong>{result.camera_id} · {result.camera_name}</strong></div>
                <div><span>Predefined location</span><strong>{result.location}</strong></div>
                <div><span>Video timestamp</span><strong>{formatOffset(result.video_offset_seconds)}</strong></div>
                <div><span>Confidence</span><strong>Not available</strong></div>
              </div>
              <p className="method-note">OpenCV motion heuristic (demo only; no trained model). Motion score: {result.motion_score.toFixed(4)}.</p>
              {result.alert && <div className="simulated-alert"><AlertTriangle size={15} /><span><strong>Simulated emergency alert</strong><br />{result.alert.message}</span></div>}
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Monitoring() {
  return (
    <>
      <section className="page-intro"><p className="eyebrow">CAMERA NETWORK</p><h1>Live monitoring</h1><p>Sample camera status cards for the prototype demonstration.</p></section>
      <div className="demo-banner"><Radio size={17} /><span><strong>Demonstration only.</strong> These are sample camera cards, not real-time CCTV feeds or connected devices.</span></div>
      <section className="camera-grid">
        {sampleCameras.map((camera) => (
          <article className="panel camera-card" key={camera.id}>
            <div className="camera-preview">
              <div className="camera-grid-lines" />
              <div className="camera-overlay"><span className="sample-label">SAMPLE FEED</span><span className={`camera-state ${camera.color}`}><span />{camera.status}</span></div>
              <div className="camera-placeholder"><Camera size={30} /><span>DEMO FEED</span></div>
              <span className="camera-time">--:--:--</span>
            </div>
            <div className="camera-card-body"><div><span className="camera-id">{camera.id}</span><h2>{camera.name}</h2><p><MapPin size={13} />{camera.area}</p></div><span className={`camera-dot ${camera.color}`} /></div>
          </article>
        ))}
      </section>
    </>
  );
}

function History({ incidents }) {
  return (
    <>
      <section className="page-intro"><p className="eyebrow">ANALYSIS RECORDS</p><h1>Incident history</h1><p>Previously analyzed clips and their demo heuristic results.</p></section>
      <section className="panel history-panel">
        <div className="panel-heading"><div><h2>All analyzed videos</h2><p>{incidents.length} {incidents.length === 1 ? "record" : "records"} · Confidence scores are not available in demo mode</p></div><span className="history-count">{incidents.length} total</span></div>
        <IncidentTable incidents={incidents} />
      </section>
    </>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [stats, setStats] = useState({ analyzed: 0, accidents: 0, safe: 0 });
  const [incidents, setIncidents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const refreshData = useCallback(async () => {
    const [nextStats, nextIncidents] = await Promise.all([getStats(), getIncidents()]);
    setStats(nextStats);
    setIncidents(nextIncidents);
  }, []);

  useEffect(() => {
    Promise.all([refreshData(), getCameras()])
      .then(([, nextCameras]) => setCameras(nextCameras))
      .catch((error) => setLoadError(`${error.message} Make sure the Flask backend is running.`));
  }, [refreshData]);

  function navigate(nextPage) {
    setPage(nextPage);
    setMobileMenuOpen(false);
  }

  const activeNav = navigation.find((item) => item.id === page);
  const ActiveIcon = activeNav.icon;

  return (
    <div className="app-shell">
      {mobileMenuOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Activity size={20} /></div><div><strong>roadwatch<span>.</span></strong><small>ACCIDENT DETECTION</small></div></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button className={`nav-item ${page === id ? "active" : ""}`} key={id} onClick={() => navigate(id)}>
              <Icon size={18} /><span>{label}</span>{page === id && <span className="active-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="model-card"><div className="model-icon"><Activity size={15} /></div><div><strong>Demo mode</strong><span>Motion heuristic · no trained model</span></div><span className="model-dot" /></div>
          <div className="user-profile"><div className="avatar">RW</div><div><strong>Prototype workspace</strong><span>Local environment</span></div></div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation"><Menu size={19} /></button><span>Roadwatch</span><ChevronRight size={14} /><strong><ActiveIcon size={15} />{activeNav.label}</strong></div>
          <div className="topbar-right"><span className="environment-pill"><span />LOCAL DEMO</span><div className="topbar-avatar">RW</div></div>
        </header>
        <div className="page-content">
          {loadError && <div className="connection-error" role="alert"><AlertTriangle size={16} /><span>{loadError}</span></div>}
          {page === "dashboard" && <Dashboard stats={stats} incidents={incidents} onNavigate={navigate} />}
          {page === "analysis" && <VideoAnalysis cameras={cameras} onAnalyzed={refreshData} />}
          {page === "monitoring" && <Monitoring />}
          {page === "history" && <History incidents={incidents} />}
          <footer className="page-footer"><span>ROADWATCH PROTOTYPE</span><span>For educational demonstration only · Not for emergency response</span></footer>
        </div>
      </main>
    </div>
  );
}
