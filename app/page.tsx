"use client";

import { FormEvent, useMemo, useState } from "react";

type AnalysisReport = {
  behavioralFingerprint: string;
  trendAnalysis: string;
  contrastReport: string;
  edgeMap: string;
  tiltDetector: string;
  recoveryBlueprint: string;
  sentinelScore: string;
  dailyBrief: string;
};

function preprocessRobinhoodCSV(csvText: string): string {
  const lines = csvText.split("\n").filter(l => l.trim());
  if (lines.length < 2) return csvText;

  function parseRow(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"));
  const dateIdx = headers.findIndex(h => h.includes("activity_date"));
  const instrIdx = headers.findIndex(h => h.includes("instrument"));
  const codeIdx = headers.findIndex(h => h.includes("trans_code"));
  const amtIdx = headers.findIndex(h => h.includes("amount"));

  if (dateIdx < 0 || amtIdx < 0) return csvText.slice(0, 15000);

  const daySymbolMap: Record<string, { date: string; symbol: string; totalAmount: number; transactions: number; }> = {};

  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    if (row.length < 4) continue;
    const date = row[dateIdx] || "";
    const symbol = row[instrIdx] || "";
    const code = row[codeIdx] || "";
    const amtStr = (row[amtIdx] || "0").replace(/[$,()]/g, "").trim();
    const amt = parseFloat(amtStr) || 0;
    const finalAmt = (row[amtIdx] || "").includes("(") ? -Math.abs(amt) : amt;
    if (!date || !symbol || !["BTO","STC","Buy","Sell"].includes(code)) continue;
    const key = `${date}__${symbol}`;
    if (!daySymbolMap[key]) daySymbolMap[key] = { date, symbol, totalAmount: 0, transactions: 0 };
    daySymbolMap[key].totalAmount += finalAmt;
    daySymbolMap[key].transactions += 1;
  }

  const trades = Object.values(daySymbolMap).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const dailyCounts: Record<string, number> = {};
  const dailyPnl: Record<string, number> = {};
  trades.forEach(t => {
    dailyCounts[t.date] = (dailyCounts[t.date] || 0) + 1;
    dailyPnl[t.date] = (dailyPnl[t.date] || 0) + t.totalAmount;
  });

  const summaryLines = ["date,symbol,net_pnl,transactions,win_loss,overtrading_day"];
  trades.slice(0, 150).forEach(t => {
    summaryLines.push(`${t.date},${t.symbol},${t.totalAmount.toFixed(2)},${t.transactions},${t.totalAmount >= 0 ? "WIN" : "LOSS"},${dailyCounts[t.date] >= 5 ? "YES" : "NO"}`);
  });
  summaryLines.push("");
  summaryLines.push("DAILY_SUMMARY,date,total_pnl,symbols_traded");
  Object.entries(dailyPnl).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).slice(0, 50).forEach(([date, pnl]) => {
    summaryLines.push(`DAILY_SUMMARY,${date},${pnl.toFixed(2)},${dailyCounts[date] || 0}`);
  });
  return summaryLines.join("\n");
}

function ReportSection({ title, content, variant = "default" }: {
  title: string;
  content: string;
  variant?: "default" | "danger" | "success" | "warning" | "highlight";
}) {
  const colors = {
    default: "border-zinc-800 bg-zinc-900/60",
    danger: "border-rose-500/20 bg-rose-500/5",
    success: "border-emerald-500/20 bg-emerald-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    highlight: "border-zinc-600 bg-zinc-800/60",
  };
  const titleColors = {
    default: "text-zinc-400",
    danger: "text-rose-400",
    success: "text-emerald-400",
    warning: "text-amber-400",
    highlight: "text-white",
  };

  const lines = content.split("\n").filter(l => l.trim());

  return (
    <div className={`rounded-xl border p-5 ${colors[variant]}`}>
      <h3 className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 ${titleColors[variant]}`}>{title}</h3>
      <div className="space-y-2">
        {lines.map((line, i) => {
          const isCallout = line.startsWith("PATTERN COST:") || line.startsWith("TREND EDGE:") ||
            line.startsWith("THE DIFFERENCE:") || line.startsWith("TOMORROW") ||
            line.startsWith("TILT RULE:") || line.startsWith("YOUR WINNING") ||
            line.startsWith("TO REACH");
          return (
            <p key={i} className={`text-sm leading-relaxed ${isCallout ? "font-semibold text-white border-l-2 border-emerald-400 pl-3 mt-3" : "text-zinc-300"}`}>
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [processing, setProcessing] = useState(false);

  const fileLabel = useMemo(() => {
    if (!file) return "Choose CSV file";
    return file.name.length > 42 ? `${file.name.slice(0, 42)}...` : file.name;
  }, [file]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setReport(null);
    if (!file) { setError("Please select a CSV file first."); return; }

    setProcessing(true);
    const rawText = await file.text();
    const processedCsv = preprocessRobinhoodCSV(rawText);
    const processedFile = new File([processedCsv], file.name, { type: "text/csv" });
    setProcessing(false);

    const formData = new FormData();
    formData.append("file", processedFile);
    setLoading(true);

    try {
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const payload = await response.json() as { report?: AnalysisReport; error?: string };
      if (!response.ok || !payload.report) throw new Error(payload.error || "Failed to analyze CSV.");
      setReport(payload.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  const buttonText = processing ? "Processing data..." : loading ? "Analyzing..." : "Run Sentinel Analysis";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 md:py-16 bg-zinc-950">

      {!report && (
        <>
          <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
            <div className="mb-5 inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              Sentinel
            </div>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-6xl mb-4">
              AI Trading Co-pilot
            </h1>
            <p className="text-xl text-zinc-300 mb-2">Cars have autopilot. Why doesn&apos;t your trading?</p>
            <p className="text-sm text-zinc-500 italic">
              &ldquo;The speculator&rsquo;s chief enemies are always boring from within.&rdquo; — Livermore
            </p>
          </section>

          <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">Upload Trade History</h2>
            <p className="text-sm text-zinc-400 mb-1">Works with any size file — Robinhood, Schwab, TD Ameritrade, and more.</p>
            <p className="text-xs text-zinc-600 mb-5">Your data is summarized privately in your browser. Nobody sees the raw data. Not even us.</p>
            <form onSubmit={onSubmit}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500">
                  <input type="file" accept=".csv,text/csv" className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  {fileLabel}
                </label>
                <button type="submit" disabled={loading || processing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed">
                  {(loading || processing) && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  )}
                  {buttonText}
                </button>
              </div>
              {error && <p className="mt-3 text-sm font-medium text-rose-400">{error}</p>}
            </form>
          </section>
        </>
      )}

      {report && (
        <div className="space-y-4">

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">Sentinel Analysis Complete</span>
            </div>
            <button onClick={() => setReport(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition border border-zinc-700 rounded px-3 py-1.5">
              New Analysis
            </button>
          </div>

          <ReportSection
            title="Daily Brief — Your Pre-Market Briefing"
            content={report.dailyBrief}
            variant="highlight"
          />

          <ReportSection
            title="Behavioral Fingerprint — Your Destruction Pattern"
            content={report.behavioralFingerprint}
            variant="danger"
          />

          <ReportSection
            title="Contrast Report — Emotional You vs Disciplined You"
            content={report.contrastReport}
            variant="warning"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportSection
              title="Trend Analysis — With vs Against the Market"
              content={report.trendAnalysis}
              variant="default"
            />
            <ReportSection
              title="Tilt Detector — What Triggers Your Worst Trading"
              content={report.tiltDetector}
              variant="danger"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReportSection
              title="Edge Map — Where Your Real Edge Lives"
              content={report.edgeMap}
              variant="success"
            />
            <ReportSection
              title="Recovery Blueprint — Your Best Trading Replicated"
              content={report.recoveryBlueprint}
              variant="success"
            />
          </div>

          <ReportSection
            title="Sentinel Score — Your Trading Discipline Rating"
            content={report.sentinelScore}
            variant="default"
          />

          <div className="pt-6 border-t border-zinc-800 text-center">
            <p className="text-zinc-600 text-xs italic">
              &ldquo;The speculator&rsquo;s chief enemies are always boring from within.&rdquo; — Livermore. Sentinel is watching.
            </p>
            <button onClick={() => setReport(null)}
              className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition">
              Run new analysis
            </button>
          </div>

        </div>
      )}
    </main>
  );
}
