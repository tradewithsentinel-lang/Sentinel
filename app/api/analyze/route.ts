import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 60;

type AnalysisReport = {
  winRate: string;
  revengeTradingPatterns: string;
  overtradingPatterns: string;
  hiddenEdge: string;
  singleSavingRule: string;
};

const REPORT_SCHEMA = `{
  "winRate": "string",
  "revengeTradingPatterns": "string",
  "overtradingPatterns": "string",
  "hiddenEdge": "string",
  "singleSavingRule": "string"
}`;

function extractJson(text: string): AnalysisReport {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : cleaned;
  return JSON.parse(jsonText) as AnalysisReport;
}

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a valid CSV file." },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const limitedCsv = csvText.slice(0, 120_000);

    const prompt = `You are Sentinel, an elite AI trading co-pilot built to identify the behavioral patterns destroying a trader's performance. You are direct, honest, and ruthlessly specific. Every claim must reference actual data from the CSV. No generic advice.

Analyze this trade history CSV and return ONLY valid JSON using this exact schema:
${REPORT_SCHEMA}

Requirements:
- winRate: exact percentage, which symbols win vs lose, quality of wins vs losses
- revengeTradingPatterns: specific dates and times when revenge trading occurred, exact dollar cost of this pattern
- overtradingPatterns: specific days with too many trades, win rate on those days vs single trade days, exact dollar cost
- hiddenEdge: what this trader actually does well based purely on the data, specific symbols or conditions where they win
- singleSavingRule: one specific rule based on their data that would have saved the most money, with the exact dollar amount it would have saved

CSV DATA:
${limitedCsv}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content.find((item) => item.type === "text");
    if (!content || content.type !== "text") {
      throw new Error("No text response returned from Anthropic.");
    }

    const report = extractJson(content.text);
    return NextResponse.json({ report });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analysis failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
