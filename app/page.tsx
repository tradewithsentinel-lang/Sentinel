"use client";

import { FormEvent, useMemo, useState } from "react";

type AnalysisReport = {
  winRate: string;
  revengeTradingPatterns: string;
  overtradingPatterns: string;
  hiddenEdge: string;
  singleSavingRule: string;
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

  const daySymbolMap: Record<string, {
    date: string;
    symbol: string;
    totalAmount: number;
    transactions: number;
  }> = {};

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
    if (!daySymbolMap[key]) {
      daySymbolMap[key] = { date, symbol, totalAmount: 0, transactions: 0 };
    }
    daySymbolMap[key].totalAmount += finalAmt;
    daySymbolMap[key].transactions += 1;
  }

  const trades = Object.values(daySymbolMap)
    .filter(t => t.transactions > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const dailyCounts: Record<string, number> = {};
  const dailyPnl: Record<string, number> = {};
  trades.forEach(t => {
    dailyCounts[t.date] = (dailyCounts[t.date] || 0) + 1;
    dailyPnl[t.date] = (dailyPnl[t.date] || 0) + t.totalAmount;
  });

  const summaryLines = ["date,symbol,net_pnl,transactions,win_loss,overtrading_day"];
  trades.slice(0, 150).forEach(t => {
    const winLoss = t.totalAmount >= 0 ? "WIN" : "LOSS";
    const overtradingDay = dailyCounts[t.date] >= 5 ? "YES" : "NO";
    summaryLines.push(`${t.date},${t.symbol},${t.totalAmount.toFixed(2)},${t.transactions},${winLoss},${overtradingDay}`);
  });

  summaryLines.push("");
  summaryLines.push("DAILY_SUMMARY,date,total_pnl,symbols_traded");
  Object.entries(dailyPnl)
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .slice(0, 50)
    .forEach(([date, pnl]) => {
      summaryLines.push(`DAILY_SUMMARY,${date},${pnl.toFixed(2)},${dailyCounts[date] || 0}`);
    });

  return summaryLines.join("\n");
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

  const buttonText = processing ? "Processing data..." : loading ? "Analyzing..." : "Analyze Behavior";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10 md:py-16">
      <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8">
        <div className="mb-5 inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          Sentinel
        </div>
        <h1 className="text-3xl font-bold leading-tight text-zinc-100 md:text-5xl">
          AI Trading Co-pilot
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-zinc-300">
          Cars have autopilot. Why doesn&apos;t your trading?
        </p>
        <p className="mt-2 text-sm text-zinc-500 italic">
          &ldquo;The speculator&rsquo;s chief enemies are always boring from within.&rdquo; — Livermore
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
        <h2 className="text-xl font-semibold text-zinc-100">Upload Trade CSV</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Works with any size file. Your data is summarized privately in your browser before analysis.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Your data never touches human hands. Nobody sees it. Not even us.
        </p>
        <form onSubmit={onSubmit} className="mt-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white">
              <input type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {fileLabel}
            </label>
            <button type="submit" disabled={loading || processing}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed">
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

      {report && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
          <h2 className="text-2xl font-semibold text-zinc-100 mb-5">Behavioral Analysis Report</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Win Rate" content={report.winRate} />
            <Card title="Revenge Trading" content={report.revengeTradingPatterns} danger />
            <Card title="Overtrading" content={report.overtradingPatterns} danger />
            <Card title="Hidden Edge" content={report.hiddenEdge} positive />
          </div>
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300 mb-2">
              The One Rule That Saves Everything
            </h3>
            <p className="text-zinc-100 text-sm leading-relaxed">{report.singleSavingRule}</p>
          </div>
        </section>
      )}
    </main>
  );
}

function Card({ title, content, danger, positive }: { title: string; content: string; danger?: boolean; positive?: boolean }) {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <h3 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${danger ? "text-rose-400" : positive ? "text-emerald-400" : "text-zinc-300"}`}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-zinc-100">{content}</p>
    </article>
  );
}
