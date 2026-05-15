import React, { useEffect, useMemo, useState } from "react";
import { exportReports, getReports } from "../services/api";

const emptyKpis = [
  { label: "Total Containers", val: "—", sub: "Active in the system" },
  { label: "Average Fullness", val: "—", sub: "Average fill level" },
  { label: "Need Attention", val: "—", sub: "Containers requiring action" },
  { label: "Total Weight", val: "—", sub: "Total waste weight" },
];

const css = `
  

  .rp-root {
    min-height: 100vh;
    background: #f0f4f8;
    font-family: 'Geist', 'DM Sans', sans-serif;
    color: #1a2035;
    padding: 32px;
  }

  /* HEADER */
  .rp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
  .rp-header h1 { font-size: 1.9rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
  .rp-header p  { color: #5e6a85; font-size: 0.9rem; }
  .rp-header-btns { display: flex; gap: 10px; flex-wrap: wrap; }

  .rp-btn {
    padding: 8px 16px; border-radius: 8px; border: 1px solid #e4e9f0;
    background: #fff; font-size: 0.85rem; font-weight: 500; color: #1a2035;
    cursor: pointer; transition: all .2s; font-family: inherit;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .rp-btn:hover { background: #f0f4f8; }
  .rp-btn-green { background: #00D68F; color: #0B1A14; border-color: #00D68F; }
  .rp-btn-green:hover { background: #00A870; }
  .rp-btn-blue  { background: #1A6EFF; color: #fff; border-color: #1A6EFF; }
  .rp-btn-blue:hover { background: #0F4ECC; }

  /* CARD */
  .rp-card {
    background: #fff; border-radius: 14px;
    border: 1px solid #e4e9f0; padding: 22px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,.04);
  }
  .rp-card-title {
    font-size: 1rem; font-weight: 700; margin-bottom: 18px; color: #1a2035;
  }

  /* PARAMS */
  .rp-params-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
  .rp-field label { font-size: 0.78rem; font-weight: 500; color: #5e6a85; display: block; margin-bottom: 6px; }
  .rp-field input,
  .rp-field select {
    width: 100%; padding: 9px 12px; border: 1px solid #e4e9f0; border-radius: 8px;
    font-family: inherit; font-size: 0.88rem; color: #1a2035; background: #f8fafc;
    outline: none; transition: border-color .2s;
  }
  .rp-field input:focus,
  .rp-field select:focus { border-color: #1A6EFF; background: #fff; }

  /* KPI GRID */
  .rp-kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 16px; }
  .rp-kpi-card {
    background: #fff; border-radius: 14px; border: 1px solid #e4e9f0;
    padding: 20px; position: relative; overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,.04); transition: transform .2s;
  }
  .rp-kpi-card:hover { transform: translateY(-3px); }
  .rp-kpi-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #1A6EFF, #00D68F);
  }
  .rp-kpi-label { font-size: 0.78rem; font-weight: 600; color: #5e6a85; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
  .rp-kpi-val   { font-size: 2rem; font-weight: 800; color: #1a2035; line-height: 1; margin-bottom: 6px; }
  .rp-kpi-sub   { font-size: 0.72rem; color: #a0aec0; }

  /* BAR CHART */
  .rp-chart-wrap { margin-top: 8px; }
  .rp-chart-row  { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .rp-chart-dept { font-size: 0.8rem; font-weight: 500; color: #5e6a85; width: 120px; flex-shrink: 0; text-align: right; }
  .rp-chart-bars { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .rp-chart-track { height: 7px; background: #e8edf5; border-radius: 99px; overflow: hidden; }
  .rp-chart-fill  { height: 100%; border-radius: 99px; transition: width .6s; }
  .rp-chart-pct   { font-size: 0.78rem; font-weight: 700; color: #1a2035; width: 36px; flex-shrink: 0; }
  .rp-chart-legend { display: flex; gap: 16px; margin-top: 14px; }
  .rp-legend-item  { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: #5e6a85; }
  .rp-legend-dot   { width: 8px; height: 8px; border-radius: 50%; }

  /* Y AXIS LABELS */
  .rp-chart-yaxis { display: flex; justify-content: space-between; font-size: 0.68rem; color: #a0aec0; margin-bottom: 4px; padding-left: 130px; padding-right: 46px; }

  /* DONUT */
  .rp-donut-wrap { display: flex; align-items: center; gap: 32px; }
  .rp-donut {
    width: 120px; height: 120px; border-radius: 50%; flex-shrink: 0;
    background: conic-gradient(#1A6EFF 0deg 360deg, #e4e9f0 360deg);
    display: flex; align-items: center; justify-content: center;
  }
  .rp-donut-inner {
    width: 80px; height: 80px; border-radius: 50%; background: #fff;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .rp-donut-pct { font-size: 1.1rem; font-weight: 800; color: #1a2035; }
  .rp-donut-sub { font-size: 0.6rem; color: #5e6a85; }
  .rp-waste-list { flex: 1; display: flex; flex-direction: column; gap: 10px; }
  .rp-waste-row  { display: flex; align-items: center; gap: 10px; }
  .rp-waste-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .rp-waste-name { font-size: 0.85rem; font-weight: 500; flex: 1; }
  .rp-waste-bar-track { width: 100px; height: 5px; background: #e8edf5; border-radius: 99px; overflow: hidden; }
  .rp-waste-bar-fill  { height: 100%; border-radius: 99px; }
  .rp-waste-pct  { font-size: 0.8rem; font-weight: 700; color: #1a2035; min-width: 36px; text-align: right; }

  /* TABLE */
  .rp-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .rp-table thead tr { border-bottom: 2px solid #f0f4f8; }
  .rp-table th { padding: 10px 14px; text-align: left; font-size: 0.72rem; font-weight: 700; color: #5e6a85; text-transform: uppercase; letter-spacing: .06em; }
  .rp-table tbody tr { border-bottom: 1px solid #f0f4f8; transition: background .15s; }
  .rp-table tbody tr:hover { background: #f8fbff; }
  .rp-table td { padding: 12px 14px; color: #1a2035; vertical-align: middle; }
  .rp-fullness-cell { display: flex; align-items: center; gap: 8px; }
  .rp-fullness-mini { width: 60px; height: 5px; background: #e8edf5; border-radius: 99px; overflow: hidden; }
  .rp-fullness-mini-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #1A6EFF, #00D68F); }
  .rp-attention-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 9px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
  }
  .rp-badge-warn { background: #fff7e6; color: #D97706; }
  .rp-badge-ok   { background: #e6faf3; color: #00A870; }

  @media (max-width: 900px) {
    .rp-kpi-grid, .rp-params-grid { grid-template-columns: repeat(2,1fr); }
  }
`;

function Reports() {
  const [reportType, setReportType]   = useState("overview");
  const [aggregation, setAggregation] = useState("month");
  const [period, setPeriod]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [kpis, setKpis]               = useState(emptyKpis);
  const [departmentRows, setDepartmentRows] = useState([]);
  const [departmentBars, setDepartmentBars] = useState([]);
  const [wasteTypes, setWasteTypes]   = useState([]);

  const params = useMemo(() => ({
    reportType,
    aggregation,
    period,
  }), [reportType, aggregation, period]);

  const loadReport = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getReports(params);
      const apiKpis = data.kpis || {};

      setKpis([
        { label: "Total Containers", val: String(apiKpis.totalContainers ?? 0), sub: "Active in the system" },
        { label: "Average Fullness", val: `${apiKpis.averageFullness ?? 0}%`, sub: "Average fill level" },
        { label: "Need Attention", val: String(apiKpis.needsAttention ?? 0), sub: "Containers requiring action" },
        { label: "Total Weight", val: `${Number(apiKpis.totalWeight ?? 0).toFixed(1)} kg`, sub: "Total waste weight" },
      ]);
      setDepartmentRows(data.departments?.length ? data.departments : []);
      setDepartmentBars(data.barData?.length ? data.barData : []);
      setWasteTypes(data.wasteTypeDistribution?.length ? data.wasteTypeDistribution : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to load reports");
      setKpis(emptyKpis);
      setDepartmentRows([]);
      setDepartmentBars([]);
      setWasteTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setError("");
    try {
      const { data } = await exportReports(params);
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "medwaste-report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to export report");
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, aggregation]);

  const donutBackground = useMemo(() => {
    if (!wasteTypes.length) return "conic-gradient(#e4e9f0 0deg 360deg)";

    let current = 0;
    const stops = wasteTypes.map((w) => {
      const start = current;
      current += (Number(w.pct) || 0) * 3.6;
      return `${w.color} ${start}deg ${current}deg`;
    });
    if (current < 360) stops.push(`#e4e9f0 ${current}deg 360deg`);
    return `conic-gradient(${stops.join(", ")})`;
  }, [wasteTypes]);

  const primaryWaste = wasteTypes[0] || { name: "No Data", pct: 0 };

  return (
    <>
      <style>{css}</style>
      <div className="rp-root">

        {/* HEADER */}
        <div className="rp-header">
          <div>
            <h1>Reports & Analytics</h1>
            <p>Data analysis and statistics for the waste management system</p>
          </div>
          <div className="rp-header-btns">
            <button className="rp-btn" onClick={() => window.print()} disabled={loading}> Print</button>
            <button className="rp-btn" onClick={handleExport} disabled={loading}> Export</button>
            <button className="rp-btn rp-btn-blue" onClick={loadReport} disabled={loading}>+ Generate Report</button>
          </div>
        </div>

        {/* REPORT PARAMETERS */}
        <div className="rp-card">
          <div className="rp-card-title">Report Parameters</div>
          <div className="rp-params-grid">
            <div className="rp-field">
              <label>Period</label>
              <input type="text" placeholder="e.g. Feb 2026" value={period} onChange={e => setPeriod(e.target.value)} />
            </div>
            <div className="rp-field">
              <label>Report type</label>
              <select value={reportType} onChange={e => setReportType(e.target.value)}>
                <option value="overview">General overview</option>
                <option value="dept">By department</option>
                <option value="type">By waste type</option>
                <option value="alerts">Alerts</option>
              </select>
            </div>
            <div className="rp-field">
              <label>Time aggregation</label>
              <select value={aggregation} onChange={e => setAggregation(e.target.value)}>
                <option value="day">By day</option>
                <option value="week">By week</option>
                <option value="month">By month</option>
              </select>
            </div>
            <div className="rp-field" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <button className="rp-btn rp-btn-blue" style={{ width: "100%", justifyContent: "center" }} onClick={loadReport} disabled={loading}>
                 {loading ? "Loading..." : "Refresh Data"}
              </button>
            </div>
          </div>
          {error && <div style={{ marginTop: 12, color: "#B91C1C", fontSize: "0.82rem" }}>{error}</div>}
        </div>

        {/* KPI */}
        <div className="rp-kpi-grid">
          {kpis.map((k) => (
            <div className="rp-kpi-card" key={k.label}>
              <div className="rp-kpi-label">{k.label}</div>
              <div className="rp-kpi-val">{k.val}</div>
              <div className="rp-kpi-sub">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* FULLNESS BY DEPARTMENT */}
        <div className="rp-card">
          <div className="rp-card-title">Fullness by Department</div>
          <div className="rp-chart-yaxis">
            {[0, 20, 40, 60, 80, 100].map(v => <span key={v}>{v}</span>)}
          </div>
          <div className="rp-chart-wrap">
            {departmentBars.length === 0 ? (
              <div style={{ padding: 20, color: "#a0aec0", textAlign: "center" }}>
                {loading ? "Loading report data..." : "No department data available."}
              </div>
            ) : departmentBars.map((d) => (
              <div className="rp-chart-row" key={d.label}>
                <div className="rp-chart-dept">{d.label}</div>
                <div className="rp-chart-bars">
                  <div className="rp-chart-track">
                    <div className="rp-chart-fill" style={{ width: `${d.fullness}%`, background: "linear-gradient(90deg,#1A6EFF,#00D68F)" }} />
                  </div>
                  <div className="rp-chart-track">
                    <div className="rp-chart-fill" style={{ width: `${d.countPct ?? 0}%`, background: "#8B5CF6" }} />
                  </div>
                  <div className="rp-chart-track">
                    <div className="rp-chart-fill" style={{ width: `${d.weight}%`, background: "#F59E0B" }} />
                  </div>
                </div>
                <div className="rp-chart-pct">{d.fullness}%</div>
              </div>
            ))}
          </div>
          <div className="rp-chart-legend">
            <div className="rp-legend-item"><div className="rp-legend-dot" style={{ background: "#1A6EFF" }} /> Avg. fullness</div>
            <div className="rp-legend-item"><div className="rp-legend-dot" style={{ background: "#8B5CF6" }} /> Container count</div>
            <div className="rp-legend-item"><div className="rp-legend-dot" style={{ background: "#F59E0B" }} /> Total weight</div>
          </div>
        </div>

        {/* WASTE TYPE DISTRIBUTION */}
        <div className="rp-card">
          <div className="rp-card-title">Waste Type Distribution</div>
          <div className="rp-donut-wrap">
            <div className="rp-donut" style={{ background: donutBackground }}>
              <div className="rp-donut-inner">
                <div className="rp-donut-pct">{primaryWaste.pct}%</div>
                <div className="rp-donut-sub">{primaryWaste.name.split(" ")[0]}</div>
              </div>
            </div>
            <div className="rp-waste-list">
              {wasteTypes.length === 0 ? (
                <div style={{ color: "#a0aec0", fontSize: "0.85rem" }}>
                  {loading ? "Loading waste type data..." : "No waste type data available."}
                </div>
              ) : wasteTypes.map((w) => (
                <div className="rp-waste-row" key={w.name}>
                  <div className="rp-waste-dot" style={{ background: w.color }} />
                  <span className="rp-waste-name">{w.name} ({w.pct}%)</span>
                  <div className="rp-waste-bar-track">
                    <div className="rp-waste-bar-fill" style={{ width: `${w.pct}%`, background: w.color }} />
                  </div>
                  <span className="rp-waste-pct">{w.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="rp-card">
          <div className="rp-card-title">Department Statistics</div>
          <table className="rp-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Containers</th>
                <th>Avg. Fullness</th>
                <th>Total Weight (kg)</th>
                <th>Need Attention</th>
              </tr>
            </thead>
            <tbody>
              {departmentRows.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "#a0aec0", padding: 24 }}>
                    {loading ? "Loading department statistics..." : "No department statistics available."}
                  </td>
                </tr>
              ) : departmentRows.map((dep) => (
                <tr key={dep.name}>
                  <td style={{ fontWeight: 600 }}>{dep.name}</td>
                  <td>{dep.bins}</td>
                  <td>
                    <div className="rp-fullness-cell">
                      <div className="rp-fullness-mini">
                        <div className="rp-fullness-mini-fill" style={{ width: `${dep.avgFullness}%` }} />
                      </div>
                      {dep.avgFullness}%
                    </div>
                  </td>
                  <td>{dep.totalWeight.toFixed(1)}</td>
                  <td>
                    <span className={`rp-attention-badge ${dep.needsAttention > 0 ? "rp-badge-warn" : "rp-badge-ok"}`}>
                      {dep.needsAttention > 0 ? `⚠ ${dep.needsAttention}` : "✓ All clear"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </>
  );
}

export default Reports;
