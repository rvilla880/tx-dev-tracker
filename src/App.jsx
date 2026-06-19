import { useState, useEffect, useCallback } from "react";

// ─── County / Hub Data ────────────────────────────────────────────────────────
const HUBS = [
  {
    id: "fort_worth", name: "Fort Worth / DFW", color: "#1a6bb5", emoji: "🏙️",
    counties: [
      "Tarrant","Dallas","Denton","Collin","Johnson","Parker","Hood","Wise",
      "Ellis","Kaufman","Rockwall","Hunt","McLennan","Palo Pinto","Erath",
      "Navarro","Henderson","Somervell","Bosque","Hamilton","Comanche",
      "Cooke","Montague","Clay","Wichita","Archer","Young","Jack","Van Zandt","Rains"
    ]
  },
  {
    id: "georgetown", name: "Georgetown / Austin", color: "#2d8a4e", emoji: "🌿",
    counties: [
      "Williamson","Travis","Hays","Bastrop","Bell","Burnet","Lampasas",
      "Milam","Robertson","Caldwell","Llano","Blanco","Gillespie","Kendall",
      "Comal","Lee","San Saba","McCulloch","Mason","Coryell","Falls","Burleson","Gonzales"
    ]
  },
  {
    id: "san_antonio", name: "San Antonio", color: "#b5451a", emoji: "🌵",
    counties: [
      "Bexar","Comal","Guadalupe","Wilson","Atascosa","Medina","Bandera",
      "Kendall","Kerr","Hays","Caldwell","Gonzales","Karnes","Frio","Uvalde",
      "Real","Zavala","Live Oak","McMullen","DeWitt","Gillespie","Llano","Mason"
    ]
  }
];

const STATUS_CONFIG = {
  approved:     { label:"Approved",      color:"#16a34a", bg:"#dcfce7" },
  pending:      { label:"Pending",       color:"#d97706", bg:"#fef3c7" },
  under_review: { label:"Under Review",  color:"#2563eb", bg:"#dbeafe" },
  denied:       { label:"Denied",        color:"#dc2626", bg:"#fee2e2" },
};

// ─── Sample / fallback data ───────────────────────────────────────────────────
const SAMPLE_FILINGS = [
  { id:1, date:"2026-05-28", county:"Tarrant", hub:"fort_worth", developer:"Westridge Communities LLC",
    project:"Stonegate Ranch Phase III", type:"Final Plat", acres:47.2, units:186,
    address:"7200 Randol Mill Rd, Fort Worth TX 76120", permit:"26-14892",
    status:"approved", notes:"186-lot SF residential subdivision, private streets" },
  { id:2, date:"2026-05-26", county:"Denton", hub:"fort_worth", developer:"Pulte Homes of Texas LP",
    project:"Harvest Crossing – Section 8", type:"Preliminary Plat", acres:31.5, units:124,
    address:"FM 407 & Simmons Rd, Justin TX 76247", permit:"26-09341",
    status:"pending", notes:"124 single-family lots, HOA required" },
  { id:3, date:"2026-05-24", county:"Williamson", hub:"georgetown", developer:"Masonwood HP LTD",
    project:"Hills at Provence Condominiums", type:"Construction Agreement", acres:23.35, units:210,
    address:"SH 29 & Ronald Reagan Blvd, Georgetown TX 78628", permit:"25-50968",
    status:"approved", notes:"Condominium regime, private roadway & drainage improvements" },
  { id:4, date:"2026-05-22", county:"Travis", hub:"georgetown", developer:"Oden Hughes Development",
    project:"Mueller North Apartments", type:"Site Development", acres:8.1, units:342,
    address:"2200 Aldrich St, Austin TX 78723", permit:"26-07733",
    status:"under_review", notes:"342-unit multifamily, 5-story wrap, includes retail ground floor" },
  { id:5, date:"2026-05-21", county:"Bexar", hub:"san_antonio", developer:"NRP Group",
    project:"Vantage at Brooks", type:"Construction Agreement", acres:14.8, units:288,
    address:"6200 Billy Mitchell Dr, San Antonio TX 78235", permit:"26-22104",
    status:"approved", notes:"288-unit luxury apartment community, Brooks development district" },
  { id:6, date:"2026-05-19", county:"Hays", hub:"georgetown", developer:"D.R. Horton Texas Ltd",
    project:"Caliterra – Unit 15", type:"Final Plat", acres:56.3, units:198,
    address:"Ranch Rd 12 & Lehman Rd, Wimberley TX 78676", permit:"26-05512",
    status:"approved", notes:"Hill country residential, deed-restricted, 198 SF lots" },
  { id:7, date:"2026-05-17", county:"Collin", hub:"fort_worth", developer:"Toll Brothers Inc",
    project:"The Reserve at Stonebridge Ranch", type:"Preliminary Plat", acres:88.4, units:265,
    address:"Coit Rd & Stonebridge Dr, McKinney TX 75072", permit:"26-18871",
    status:"pending", notes:"265 luxury SF lots, gated community, amenity center planned" },
  { id:8, date:"2026-05-15", county:"Comal", hub:"san_antonio", developer:"Empire Communities",
    project:"Veramendi – Phase 7", type:"Final Plat", acres:42.1, units:167,
    address:"FM 306 & Hueco Springs Loop, New Braunfels TX 78132", permit:"26-31045",
    status:"approved", notes:"Master-planned community expansion, 167 SF lots" },
  { id:9, date:"2026-05-12", county:"Guadalupe", hub:"san_antonio", developer:"Lennar Homes of Texas",
    project:"Whisper Ranch – Section 4", type:"Final Plat", acres:38.7, units:152,
    address:"Loop 337 & FM 3009, Schertz TX 78154", permit:"26-28891",
    status:"approved", notes:"152-lot subdivision, pocket park & detention pond" },
  { id:10, date:"2026-05-10", county:"Bell", hub:"georgetown", developer:"Scott Felder Homes",
    project:"Chisholm Trail Crossing", type:"Preliminary Plat", acres:62.0, units:241,
    address:"US-190 & Stagecoach Rd, Harker Heights TX 76548", permit:"26-04417",
    status:"under_review", notes:"241 SF lots, phased development, military market" },
  { id:11, date:"2026-05-08", county:"Johnson", hub:"fort_worth", developer:"Meritage Homes",
    project:"Deer Creek Estates", type:"Construction Agreement", acres:29.6, units:118,
    address:"US-67 & Crowley Rd, Burleson TX 76028", permit:"26-15503",
    status:"approved", notes:"118-lot SF development, natural gas stub-outs, fiber-ready" },
  { id:12, date:"2026-05-06", county:"Atascosa", hub:"san_antonio", developer:"Highland Homes",
    project:"Lytle Crossing", type:"Preliminary Plat", acres:74.5, units:296,
    address:"SH 132 & FM 476, Lytle TX 78052", permit:"26-40072",
    status:"pending", notes:"296-lot master-planned community, first phase 98 lots" },
  { id:13, date:"2026-05-03", county:"Bastrop", hub:"georgetown", developer:"KB Home",
    project:"Pecan Park – Section 6", type:"Final Plat", acres:27.8, units:112,
    address:"SH 71 & McDade Rd, Bastrop TX 78602", permit:"26-06651",
    status:"approved", notes:"112 entry-level SF homes, wildfire-resistant construction" },
  { id:14, date:"2026-05-01", county:"Parker", hub:"fort_worth", developer:"Grand Homes",
    project:"Aledo Meadows", type:"Variance Request", acres:19.2, units:76,
    address:"FM 1187 & Annetta Rd, Aledo TX 76008", permit:"26-16204",
    status:"under_review", notes:"76 lots, lot-size variance requested for corner lots" },
  { id:15, date:"2026-04-28", county:"Kerr", hub:"san_antonio", developer:"Forestar Group",
    project:"The Springs at Kerrville", type:"Preliminary Plat", acres:55.0, units:220,
    address:"TX-27 & River Rd, Kerrville TX 78028", permit:"26-50011",
    status:"pending", notes:"220-lot Hill Country community, river access amenity" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric"
  });
}

function toCSV(rows) {
  const cols = ["date","county","hub","developer","project","type","acres","units","address","permit","status","notes"];
  const header = cols.join(",");
  const lines = rows.map(r =>
    cols.map(c => `"${String(r[c] || "").replace(/"/g, '""')}"`).join(",")
  );
  return [header, ...lines].join("\n");
}

function downloadCSV(rows) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `tx_dev_filings_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function hubColor(hubId) {
  return HUBS.find(h => h.id === hubId)?.color || "#666";
}

// ─── AI via Claude API ────────────────────────────────────────────────────────
async function analyzeWithClaude(filing) {
  const prompt = `You are a real estate development analyst. Analyze this Texas county clerk residential filing and provide market intelligence.

Filing:
- Project: ${filing.project}
- Developer: ${filing.developer}
- County: ${filing.county} County, TX
- Type: ${filing.type}
- Acreage: ${filing.acres} acres
- Units/Lots: ${filing.units}
- Address: ${filing.address}
- Status: ${filing.status}
- Notes: ${filing.notes}

Return ONLY valid JSON (no markdown):
{
  "market_signal": "one sentence on what this signals for the local market",
  "developer_profile": "one sentence on this developer's typical market positioning",
  "opportunity": "one sentence on adjacent investment or business opportunities",
  "risk_flags": "one sentence on red flags, or 'None identified'",
  "price_range_estimate": "estimated price range e.g. '$280K–$380K'",
  "timeline_estimate": "rough completion estimate e.g. '18–24 months'"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await res.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { return null; }
}

async function generateWeeklySummary(filings) {
  const list = filings.slice(0, 20).map(f =>
    `- ${f.project} (${f.county} Co.) | ${f.developer} | ${f.units} units | ${f.status}`
  ).join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a real estate market intelligence analyst covering Texas residential development.

This week's new county clerk filings across Fort Worth, Georgetown/Austin, and San Antonio:

${list}

Write a concise weekly summary (plain text, no markdown, under 300 words) covering:
1. Overall market pulse (2-3 sentences)
2. Three most notable filings and why
3. Key trends across the three regions
4. What to watch next week

Professional tone, actionable insights.`
      }]
    })
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "Unable to generate summary.";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "14px 18px",
      flex: 1, minWidth: 110, border: "1px solid #e8e6e0"
    }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "#1a1a18", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function HubBadge({ hubId }) {
  const hub = HUBS.find(h => h.id === hubId);
  if (!hub) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: hub.color + "18", color: hub.color, letterSpacing: 0.3, whiteSpace: "nowrap"
    }}>
      {hub.emoji} {hub.name.split("/")[0].trim()}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#666", bg: "#eee" };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: cfg.bg, color: cfg.color, whiteSpace: "nowrap"
    }}>{cfg.label}</span>
  );
}

function FilingCard({ filing, onAnalyze, analysis, analyzing }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "#fff", border: "1px solid #e8e6e0", borderRadius: 12,
        padding: "16px 18px", marginBottom: 10, cursor: "pointer",
        borderLeft: `3px solid ${hubColor(filing.hub)}`,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#1a1a18" }}>
            {filing.project}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
            {filing.developer} · {filing.county} County
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <HubBadge hubId={filing.hub} />
            <StatusBadge status={filing.status} />
            <span style={{
              fontSize: 10, color: "#888", background: "#f5f4f0",
              padding: "2px 7px", borderRadius: 20
            }}>{filing.type}</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18" }}>{filing.units} units</div>
          <div style={{ fontSize: 11, color: "#888" }}>{filing.acres} acres</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{fmtDate(filing.date)}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f0ede8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>Address</div>
              <div style={{ fontSize: 12, color: "#555" }}>{filing.address || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>Permit #</div>
              <div style={{ fontSize: 12, color: "#555", fontFamily: "monospace" }}>{filing.permit || "—"}</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>Notes</div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>{filing.notes}</div>
          </div>

          {!analysis && (
            <button
              onClick={e => { e.stopPropagation(); onAnalyze(filing); }}
              disabled={analyzing}
              style={{
                fontSize: 12, padding: "7px 16px", borderRadius: 8,
                cursor: analyzing ? "wait" : "pointer",
                background: analyzing ? "#f0ede8" : "#1a6bb5",
                color: analyzing ? "#888" : "#fff",
                border: "none", fontWeight: 600, letterSpacing: 0.2
              }}
            >
              {analyzing ? "Analyzing…" : "✦ AI Market Analysis"}
            </button>
          )}

          {analysis && (
            <div style={{ background: "#f8f7f4", borderRadius: 10, padding: 14, border: "1px solid #e8e6e0" }}>
              <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 10, color: "#1a6bb5" }}>
                ✦ AI Market Intelligence
              </div>
              {[
                ["Market Signal", analysis.market_signal],
                ["Developer Profile", analysis.developer_profile],
                ["Opportunity", analysis.opportunity],
                ["Risk Flags", analysis.risk_flags],
                ["Price Range Est.", analysis.price_range_estimate],
                ["Timeline Est.", analysis.timeline_estimate],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{label} · </span>
                  <span style={{ fontSize: 12, color: "#444", lineHeight: 1.6 }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WeeklySummaryModal({ onClose, filings }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateWeeklySummary(filings).then(s => { setSummary(s); setLoading(false); });
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 28,
        maxWidth: 580, width: "100%", maxHeight: "80vh", overflowY: "auto",
        border: "1px solid #e8e6e0"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>📬 Weekly Summary Email</div>
          <button onClick={onClose} style={{ fontSize: 22, background: "none", border: "none", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
        </div>
        {loading ? (
          <div style={{ color: "#888", fontSize: 13, padding: "30px 0", textAlign: "center" }}>
            Generating with AI…
          </div>
        ) : (
          <>
            <pre style={{
              whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13,
              lineHeight: 1.75, color: "#333", marginBottom: 16,
              background: "#f8f7f4", padding: 16, borderRadius: 8
            }}>
              {summary}
            </pre>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copy} style={{
                fontSize: 12, padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                background: copied ? "#dcfce7" : "#1a6bb5", color: copied ? "#16a34a" : "#fff",
                border: "none", fontWeight: 600
              }}>
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
              <button onClick={onClose} style={{
                fontSize: 12, padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                background: "#f5f4f0", border: "1px solid #e8e6e0", color: "#666"
              }}>
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [filings, setFilings] = useState(SAMPLE_FILINGS);
  const [dataSource, setDataSource] = useState("sample");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedHub, setSelectedHub] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCounty, setSelectedCounty] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [analyses, setAnalyses] = useState({});
  const [analyzing, setAnalyzing] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("filings");

  // Try to load live data from filings.json (updated by GitHub Actions)
  useEffect(() => {
    fetch("/filings.json")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.filings?.length > 0) {
          setFilings(data.filings);
          setDataSource("live");
          setLastUpdated(data.generated_at);
        }
      })
      .catch(() => {}); // silently fall back to sample data
  }, []);

  const handleAnalyze = useCallback(async (filing) => {
    setAnalyzing(filing.id);
    const result = await analyzeWithClaude(filing);
    if (result) setAnalyses(prev => ({ ...prev, [filing.id]: result }));
    setAnalyzing(null);
  }, []);

  const allCounties = [...new Set(filings.map(f => f.county))].sort();

  const filtered = filings
    .filter(f => selectedHub === "all" || f.hub === selectedHub)
    .filter(f => selectedStatus === "all" || f.status === selectedStatus)
    .filter(f => selectedCounty === "all" || f.county === selectedCounty)
    .filter(f => {
      if (!search) return true;
      const q = search.toLowerCase();
      return f.project.toLowerCase().includes(q) ||
        f.developer.toLowerCase().includes(q) ||
        f.county.toLowerCase().includes(q) ||
        (f.notes || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.date) - new Date(a.date);
      if (sortBy === "units") return b.units - a.units;
      if (sortBy === "acres") return b.acres - a.acres;
      return 0;
    });

  const totalUnits = filtered.reduce((s, f) => s + (f.units || 0), 0);
  const totalAcres = filtered.reduce((s, f) => s + (f.acres || 0), 0).toFixed(1);
  const approvedPct = filtered.length
    ? Math.round(filtered.filter(f => f.status === "approved").length / filtered.length * 100)
    : 0;

  const tabBtn = (t, label) => (
    <button
      key={t}
      onClick={() => setActiveTab(t)}
      style={{
        padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
        borderRadius: 8, border: "none",
        background: activeTab === t ? "#1a6bb5" : "transparent",
        color: activeTab === t ? "#fff" : "#666"
      }}
    >{label}</button>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px", fontFamily: "inherit" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "#1a1a18", letterSpacing: -0.5 }}>
              🏗️ Texas Dev Tracker
            </h1>
            <div style={{ fontSize: 12, color: "#888" }}>
              Residential development filings · Fort Worth · Georgetown · San Antonio · 150-mile radius
            </div>
            <div style={{ marginTop: 4, fontSize: 11 }}>
              <span style={{
                padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: dataSource === "live" ? "#dcfce7" : "#fef3c7",
                color: dataSource === "live" ? "#16a34a" : "#d97706"
              }}>
                {dataSource === "live" ? "● LIVE DATA" : "● SAMPLE DATA"}
              </span>
              {lastUpdated && (
                <span style={{ fontSize: 10, color: "#aaa", marginLeft: 8 }}>
                  Updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => downloadCSV(filtered)}
              style={{
                fontSize: 12, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                background: "#fff", border: "1px solid #ddd", color: "#333", fontWeight: 600
              }}
            >⬇ Export CSV</button>
            <button
              onClick={() => setShowSummary(true)}
              style={{
                fontSize: 12, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                background: "#1a6bb5", border: "none", color: "#fff", fontWeight: 600
              }}
            >✦ Weekly Summary</button>
          </div>
        </div>

        {/* Hub tabs */}
        <div style={{
          display: "flex", gap: 6, marginTop: 16, padding: 4,
          background: "#f0ede8", borderRadius: 10, width: "fit-content", flexWrap: "wrap"
        }}>
          {[["all", "🗺️ All Regions"], ...HUBS.map(h => [h.id, `${h.emoji} ${h.name.split("/")[0].trim()}`])]
            .map(([id, label]) => (
              <button key={id} onClick={() => setSelectedHub(id)} style={{
                padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                borderRadius: 7, border: "none",
                background: selectedHub === id
                  ? (id === "all" ? "#333" : hubColor(id))
                  : "transparent",
                color: selectedHub === id ? "#fff" : "#666"
              }}>{label}</button>
            ))}
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{
        display: "flex", gap: 2, marginBottom: 16,
        borderBottom: "1px solid #e8e6e0", paddingBottom: 8
      }}>
        {tabBtn("filings", "📋 Filings")}
        {tabBtn("counties", "🗺️ Counties")}
        {tabBtn("setup", "⚙️ Setup")}
      </div>

      {/* Setup Tab */}
      {activeTab === "setup" && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, border: "1px solid #e8e6e0" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>⚙️ Going Live — Setup Guide</h2>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#1a6bb5" }}>
              Step 1 — Add your Anthropic API key to GitHub Secrets
            </div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>
              Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret<br />
              Name: <code style={{ background: "#f5f4f0", padding: "1px 5px", borderRadius: 4 }}>ANTHROPIC_API_KEY</code><br />
              Value: your key from <a href="https://console.anthropic.com" style={{ color: "#1a6bb5" }}>console.anthropic.com</a>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#1a6bb5" }}>
              Step 2 — The scraper runs automatically every Sunday at 6 AM
            </div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>
              GitHub Actions runs <code style={{ background: "#f5f4f0", padding: "1px 5px", borderRadius: 4 }}>tx_dev_scraper.py</code> weekly,
              saves results to <code style={{ background: "#f5f4f0", padding: "1px 5px", borderRadius: 4 }}>public/filings.json</code>,
              and Netlify auto-deploys. This dashboard automatically switches from sample data to live data.
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#1a6bb5" }}>
              Step 3 — Weekly email digest (optional)
            </div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.8 }}>
              Add these secrets to GitHub for automatic email delivery:<br />
              <code style={{ background: "#f5f4f0", padding: "1px 5px", borderRadius: 4 }}>EMAIL_TO</code> — your email address<br />
              <code style={{ background: "#f5f4f0", padding: "1px 5px", borderRadius: 4 }}>EMAIL_FROM</code> — a Gmail address to send from<br />
              <code style={{ background: "#f5f4f0", padding: "1px 5px", borderRadius: 4 }}>EMAIL_PASSWORD</code> — Gmail App Password (not your regular password)
            </div>
          </div>

          <div style={{
            background: "#f8f7f4", borderRadius: 8, padding: 12,
            fontSize: 11, color: "#888", fontFamily: "monospace", lineHeight: 1.9
          }}>
            How to get a Gmail App Password:<br />
            1. myaccount.google.com → Security → 2-Step Verification (must be ON)<br />
            2. Search "App passwords" → Select app: Mail → Generate<br />
            3. Copy the 16-character code → paste as EMAIL_PASSWORD secret
          </div>
        </div>
      )}

      {/* Counties Tab */}
      {activeTab === "counties" && (
        <div>
          {HUBS.map(hub => (
            <div key={hub.id} style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: hub.color, marginBottom: 10 }}>
                {hub.emoji} {hub.name} — {hub.counties.length} counties monitored
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {hub.counties.map(c => {
                  const count = filings.filter(f => f.county === c && f.hub === hub.id).length;
                  return (
                    <span key={c} style={{
                      fontSize: 11, padding: "4px 10px", borderRadius: 20,
                      background: count > 0 ? hub.color + "15" : "#f5f4f0",
                      color: count > 0 ? hub.color : "#aaa",
                      border: `1px solid ${count > 0 ? hub.color + "44" : "#e8e6e0"}`,
                      fontWeight: count > 0 ? 700 : 400
                    }}>
                      {c}{count > 0 ? ` (${count})` : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>
            Highlighted = filings in current dataset. All counties checked weekly.
          </div>
        </div>
      )}

      {/* Filings Tab */}
      {activeTab === "filings" && (
        <>
          {/* Stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <StatCard label="Filings" value={filtered.length} sub={`of ${filings.length} total`} />
            <StatCard label="Total Units" value={totalUnits.toLocaleString()} sub="residential" />
            <StatCard label="Total Acres" value={totalAcres} sub="under development" />
            <StatCard label="Approval Rate" value={`${approvedPct}%`} color="#16a34a" sub="of filtered" />
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <input
              placeholder="Search project, developer, county…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 2, minWidth: 180, fontSize: 13, padding: "8px 12px", borderRadius: 8,
                border: "1px solid #ddd", background: "#fff", color: "#333",
                outline: "none"
              }}
            />
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
              style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333" }}>
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select value={selectedCounty} onChange={e => setSelectedCounty(e.target.value)}
              style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333" }}>
              <option value="all">All Counties</option>
              {allCounties.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ fontSize: 12, padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333" }}>
              <option value="date">Newest First</option>
              <option value="units">Most Units</option>
              <option value="acres">Most Acres</option>
            </select>
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: 13 }}>
              No filings match your current filters.
            </div>
          ) : filtered.map(f => (
            <FilingCard
              key={f.id} filing={f}
              onAnalyze={handleAnalyze}
              analysis={analyses[f.id]}
              analyzing={analyzing === f.id}
            />
          ))}

          <div style={{ fontSize: 11, color: "#ccc", marginTop: 12, textAlign: "center", lineHeight: 1.8 }}>
            {dataSource === "sample"
              ? "Showing sample data — connect GitHub Actions to see live county clerk filings (see Setup tab)"
              : `Live data from ${filings.length} filings across 3 regions`}
            <br />Click any card to expand · Click "✦ AI Market Analysis" for Claude-powered insights
          </div>
        </>
      )}

      {showSummary && (
        <WeeklySummaryModal filings={filtered} onClose={() => setShowSummary(false)} />
      )}
    </div>
  );
}
