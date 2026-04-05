"use client";

import { FormEvent, useMemo, useState } from "react";

type AnalysisReport = {
  winRate: string;
  revengeTradingPatterns: string;
  overtradingPatterns: string;
  hiddenEdge: string;
  singleSavingRule: string;
};

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
        <p className="mt-3 text-sm leading-relaxed text-zinc-300">
          Your data never touches human hands. Uploaded directly to AI. Deleted after analysis. Nobody sees it. Not even us.
        </p>
        <form onSubmit={onSubmit} className="mt-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white">
              <input type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {fileLabel}
            </label>
            <button type="submit" disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50">
              {loading ? "Analyzing..." : "Analyze Behavior"}
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
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
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
