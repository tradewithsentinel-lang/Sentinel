import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

type AnalysisReport = {
  winRate: string;
  revengeTradingPatterns: string;
  overtradingPatterns: string;
  hiddenEdge: string;
  singleSavingRule: string;
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const prompt = `You are Sentinel, an elite trading behavior analyst.
Analyze the following trade-history CSV and identify key behavioral patterns.

Return ONLY valid JSON using this exact schema:
${REPORT_SCHEMA}

Requirements:
- winRate: include rough percentage and quality comment.
- revengeTradingPatterns: identify timing/emotional sequence signals.
- overtradingPatterns: identify volume/frequency and context clues.
- hiddenEdge: infer what market conditions or setup appears strongest.
- singleSavingRule: one specific, concrete rule that likely saves most money.
- Keep each value concise but insightful (2-5 sentences).

CSV DATA:
${limitedCsv}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1200,
      temperature: 0.2,
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
