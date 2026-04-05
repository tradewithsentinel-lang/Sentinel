"use client";

import { FormEvent, useMemo, useState } from "react";

type CategoryScore = {
  category: string;
  score: number;
  maxScore: number;
  observation: string;
};

type AccountMilestone = {
  date: string;
  event: string;
  balance: string;
  changeFromStart: string;
};

type SymbolBreakdown = {
  ticker: string;
  trades: number;
  totalPnl: string;
  notes: string;
  profitable: boolean;
};

type MethodologyPrinciple = {
  principle: string;
  description: string;
};

type CriticalTrade = {
  trade: string;
  loss: string;
  percentOfTotalLosses: string;
  whatWentWrong: string;
};

type PhaseAnalysis = {
  phase: string;
  period: string;
  trades: number;
  winLoss: string;
  winRate: string;
  pnl: string;
};

type BenchmarkRow = {
  traderType: string;
  typicalWinRate: string;
  annualReturn: string;
  vsThisTrader: string;
};

type AnalysisReport = {
  traderName: string;
  reportTitle: string;
  dateRange: string;
  overview: {
    startingCapital: string;
    finalBalance: string;
    totalReturn: string;
    duration: string;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
  overallScore: number;
  categoryScores: CategoryScore[];
  performanceStats: {
    winRate: string;
    avgWinningTrade: string;
    avgLosingTrade: string;
    bestSingleTrade: string;
    worstSingleTrade: string;
    largestSingleDay: string;
    maxDrawdown: string;
    recoveryFromLow: string;
  };
  accountMilestones: AccountMilestone[];
  symbolBreakdown: SymbolBreakdown[];
  tradingMethodology: {
    summary: string;
    principles: MethodologyPrinciple[];
  };
  behavioralStrengths: string[];
  behavioralWeaknesses: string[];
  criticalTrades: CriticalTrade[];
  phaseAnalysis: PhaseAnalysis[];
  benchmarkComparison: BenchmarkRow[];
  finalVerdict: string;
  sentinelRule: string;
};

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = (score / max) * 100;
  const color = score >= 7 ? "#10b981" : score >= 5 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right" style={{ color }}>{score}/{max}</span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 whitespace-nowrap">{children}</h2>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  );
}

function PnlText({ value }: { value: string }) {
  const v = String(value ?? "");
  const isNeg = v.startsWith("-");
  const isPos = v.startsWith("+");
  return (
    <span className={isNeg ? "text-rose-400" : isPos ? "text-emerald-400" : "text-zinc-300"}>
      {v}
    </span>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);

  const fileLabel = useMemo(() => {
    if (!file) return "Choose CSV file";
    return file.name.length > 42 ? `${file.name.slice(0, 42)}...` : file.name;
  }, [file]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setReport(null);
    if (!file) { setError("Please select a CSV file first."); return; }

    const text = await file.text();
    const lines = text.split("\n");
    const header = lines[0];
    const dataLines = lines.slice(1).filter((l) => l.trim());
    const trimmed = dataLines.slice(0, 2000);
    const trimmedCsv = [header, ...trimmed].join("\n");
    const trimmedFile = new File([trimmedCsv], file.name, { type: "text/csv" });

    const formData = new FormData();
    formData.append("file", trimmedFile);
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

  const scoreColor = (s: number) => s >= 7 ? "text-emerald-400" : s >= 5 ? "text-amber-400" : "text-rose-400";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">

      {!report && (
        <div className="max-w-2xl mx-auto px-6 py-24">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">Sentinel</span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Your trading<br />
              <span className="text-zinc-500">has a mirror.</span>
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed mb-3">
              Upload your trade history. Get a professional-grade behavioral analysis — the kind a hedge fund analyst would write — in 60 seconds.
            </p>
            <p className="text-zinc-600 text-xs italic">
              &ldquo;The speculator&rsquo;s chief enemies are always boring from within.&rdquo; — Livermore
            </p>
          </div>

          <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/40 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">Privacy First</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Your data never touches human hands. Processed directly by AI. Deleted immediately after analysis. Nobody sees it. Not even us.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1 flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-3.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white">
              <input type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <span className="truncate">{fileLabel}</span>
            </label>
            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3.5 text-sm font-bold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analyzing...
                </>
              ) : "Run Analysis"}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        </div>
      )}

      {report && (
        <div className="max-w-4xl mx-auto px-6 py-12">

          {/* Header */}
          <div className="mb-12 pb-8 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">Sentinel</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.print()}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition border border-zinc-700 rounded px-3 py-1.5">
                  Save as PDF
                </button>
                <button onClick={() => setReport(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition border border-zinc-700 rounded px-3 py-1.5">
                  New Analysis
                </button>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">{report.traderName} — {report.reportTitle}</h1>
            <p className="text-zinc-500 text-sm">{report.dateRange}</p>
          </div>

          {/* Overview */}
          <div className="mb-10">
            <SectionHeader>Challenge Overview</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-800/80">
                    {["Starting Capital","Final Balance","Total Return","Duration","Total Trades"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 border border-zinc-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-zinc-900/40">
                    <td className="px-4 py-3 border border-zinc-800 text-zinc-200">{report.overview.startingCapital}</td>
                    <td className="px-4 py-3 border border-zinc-800 text-zinc-200">{report.overview.finalBalance}</td>
                    <td className="px-4 py-3 border border-zinc-800 font-bold"><PnlText value={report.overview.totalReturn} /></td>
                    <td className="px-4 py-3 border border-zinc-800 text-zinc-200">{report.overview.duration}</td>
                    <td className="px-4 py-3 border border-zinc-800 text-zinc-200">{report.overview.totalTrades} trades</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Score */}
          <div className="mb-10">
            <SectionHeader>Overall Rating</SectionHeader>
            <div className="flex items-start gap-10">
              <div className="text-center shrink-0">
                <div className={`text-7xl font-bold tabular-nums ${scoreColor(report.overallScore)}`}>
                  {Number(report.overallScore).toFixed(1)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">/ 10</div>
              </div>
              <div className="flex-1 space-y-3.5">
                {(report.categoryScores ?? []).map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-zinc-400">{cat.category}</span>
                      <span className="text-xs text-zinc-600 max-w-xs text-right truncate">{cat.observation}</span>
                    </div>
                    <ScoreBar score={cat.score} max={cat.maxScore} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="mb-10">
            <SectionHeader>Performance Statistics</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {[
                    ["Total Trades", report.overview.totalTrades, "Win Rate", report.performanceStats?.winRate],
                    ["Winning Trades", report.overview.winningTrades, "Avg Winning Trade", report.performanceStats?.avgWinningTrade],
                    ["Losing Trades", report.overview.losingTrades, "Avg Losing Trade", report.performanceStats?.avgLosingTrade],
                    ["Best Single Trade", report.performanceStats?.bestSingleTrade, "Worst Single Trade", report.performanceStats?.worstSingleTrade],
                    ["Largest Single Day", report.performanceStats?.largestSingleDay, "Max Drawdown", report.performanceStats?.maxDrawdown],
                    ["Recovery from Low", report.performanceStats?.recoveryFromLow, "Net P&L", report.overview.totalReturn],
                  ].map(([l1,v1,l2,v2], i) => (
                    <tr key={i} className={i%2===0?"bg-zinc-900/40":"bg-zinc-900/20"}>
                      <td className="px-4 py-2.5 border border-zinc-800 text-xs text-zinc-500 w-1/4">{l1}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-sm text-zinc-200 w-1/4">{String(v1??'—')}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-xs text-zinc-500 w-1/4">{l2}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-sm w-1/4"><PnlText value={String(v2??'—')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Milestones */}
          <div className="mb-10">
            <SectionHeader>Account Balance Milestones</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-800/80">
                    {["Date","Balance","Change from Start","Context"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 border border-zinc-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(report.accountMilestones??[]).map((m,i) => (
                    <tr key={i} className={i%2===0?"bg-zinc-900/40":"bg-zinc-900/20"}>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-300 whitespace-nowrap">{m.date}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-200">{m.balance}</td>
                      <td className="px-4 py-2.5 border border-zinc-800"><PnlText value={m.changeFromStart} /></td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400 text-xs">{m.event}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Symbol Breakdown */}
          <div className="mb-10">
            <SectionHeader>Performance by Ticker</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-800/80">
                    {["Ticker","Trades","Total P&L","Notes"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 border border-zinc-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(report.symbolBreakdown??[]).map((s,i) => (
                    <tr key={i} className={i%2===0?"bg-zinc-900/40":"bg-zinc-900/20"}>
                      <td className="px-4 py-2.5 border border-zinc-800 font-bold font-mono text-zinc-100">{s.ticker}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400">{s.trades}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 font-bold"><PnlText value={s.totalPnl} /></td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400 text-xs">{s.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology */}
          <div className="mb-10">
            <SectionHeader>Trading Methodology & Key Observations</SectionHeader>
            <blockquote className="border-l-2 border-emerald-500 pl-5 mb-6">
              <p className="text-zinc-300 text-sm leading-relaxed italic">{report.tradingMethodology?.summary}</p>
            </blockquote>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-800/80">
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 border border-zinc-700 w-1/3">Principle</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 border border-zinc-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.tradingMethodology?.principles??[]).map((p,i) => (
                    <tr key={i} className={i%2===0?"bg-zinc-900/40":"bg-zinc-900/20"}>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-300 font-medium">{p.principle}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400 text-xs leading-relaxed">{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Behavioral Patterns */}
          <div className="mb-10">
            <SectionHeader>Behavioral Patterns</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-wider">Strengths</p>
                <div className="space-y-2.5">
                  {(report.behavioralStrengths??[]).map((s,i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 text-sm font-bold">+</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-rose-400 mb-3 uppercase tracking-wider">Areas to Watch</p>
                <div className="space-y-2.5">
                  {(report.behavioralWeaknesses??[]).map((w,i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-rose-400 mt-0.5 text-sm font-bold">−</span>
                      <p className="text-xs text-zinc-300 leading-relaxed">{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Critical Trades */}
          {(report.criticalTrades??[]).length > 0 && (
            <div className="mb-10">
              <SectionHeader>What Holds the Score Back</SectionHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-800/80">
                      {["Trade","Loss","% of Total Losses","What Went Wrong"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 border border-zinc-700">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.criticalTrades.map((t,i) => (
                      <tr key={i} className={i%2===0?"bg-zinc-900/40":"bg-zinc-900/20"}>
                        <td className="px-4 py-2.5 border border-zinc-800 text-zinc-300">{t.trade}</td>
                        <td className="px-4 py-2.5 border border-zinc-800 text-rose-400 font-bold">{t.loss}</td>
                        <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400">{t.percentOfTotalLosses}</td>
                        <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400 text-xs">{t.whatWentWrong}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Phase Analysis */}
          <div className="mb-10">
            <SectionHeader>Phase Analysis</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-800/80">
                    {["Phase","Period","Trades","W/L","Win Rate","P&L"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 border border-zinc-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(report.phaseAnalysis??[]).map((p,i) => (
                    <tr key={i} className={i===(report.phaseAnalysis.length-1)?"bg-zinc-800/60 font-semibold":i%2===0?"bg-zinc-900/40":"bg-zinc-900/20"}>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-200">{p.phase}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400 text-xs whitespace-nowrap">{p.period}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400">{p.trades}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400">{p.winLoss}</td>
                      <td className="px-4 py-2.5 border border-zinc-800"><PnlText value={p.winRate} /></td>
                      <td className="px-4 py-2.5 border border-zinc-800 font-bold"><PnlText value={p.pnl} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Benchmark */}
          <div className="mb-10">
            <SectionHeader>Benchmark Comparison</SectionHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-800/80">
                    {["Trader Type","Typical Win Rate","Annual Return","vs This Trader"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-300 border border-zinc-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(report.benchmarkComparison??[]).map((b,i) => (
                    <tr key={i} className={b.traderType.toLowerCase().includes("this trader")?"bg-emerald-900/20":i%2===0?"bg-zinc-900/40":"bg-zinc-900/20"}>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-200 font-medium">{b.traderType}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400">{b.typicalWinRate}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400">{b.annualReturn}</td>
                      <td className="px-4 py-2.5 border border-zinc-800 text-zinc-400">{b.vsThisTrader}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Final Verdict */}
          <div className="mb-10">
            <SectionHeader>Final Verdict</SectionHeader>
            <div className="border border-zinc-700 rounded-xl p-6 bg-zinc-900/40">
              <p className="text-zinc-300 text-sm leading-relaxed">{report.finalVerdict}</p>
            </div>
          </div>

          {/* Sentinel Rule */}
          <div className="mb-10">
            <SectionHeader>The Sentinel Rule</SectionHeader>
            <div className="border border-emerald-500/30 rounded-xl p-6 bg-emerald-500/5">
              <p className="text-emerald-300 text-sm leading-relaxed font-medium">{report.sentinelRule}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-zinc-800">
            <p className="text-zinc-600 text-xs italic text-center">
              &ldquo;The speculator&rsquo;s chief enemies are always boring from within.&rdquo; — Livermore. Sentinel is watching.
            </p>
          </div>

        </div>
      )}
    </main>
  );
}
