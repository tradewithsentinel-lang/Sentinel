import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Sentinel, an elite trading analyst. Analyze this CSV and return ONLY valid JSON. Keep all string values concise — under 100 words each.

Return this exact structure:
{"traderName":"Trader","reportTitle":"Sentinel Trading Analysis Report","dateRange":"X","overview":{"startingCapital":"$X","finalBalance":"$X","totalReturn":"+$X (Y%)","duration":"X months","totalTrades":0,"winningTrades":0,"losingTrades":0},"overallScore":5.0,"categoryScores":[{"category":"Win Rate","score":6,"maxScore":10,"observation":"brief note"},{"category":"Loss Discipline","score":5,"maxScore":10,"observation":"brief note"},{"category":"Position Sizing","score":5,"maxScore":10,"observation":"brief note"},{"category":"Patience","score":5,"maxScore":10,"observation":"brief note"},{"category":"Consistency","score":5,"maxScore":10,"observation":"brief note"}],"performanceStats":{"winRate":"X%","avgWinningTrade":"+$X","avgLosingTrade":"-$X","bestSingleTrade":"+$X","worstSingleTrade":"-$X","largestSingleDay":"+$X","maxDrawdown":"-X%","recoveryFromLow":"+$X"},"accountMilestones":[{"date":"X","event":"X","balance":"$X","changeFromStart":"X%"}],"symbolBreakdown":[{"ticker":"X","trades":0,"totalPnl":"+$X","notes":"brief","profitable":true}],"tradingMethodology":{"summary":"Two sentences max.","principles":[{"principle":"X","description":"brief"}]},"behavioralStrengths":["one sentence each"],"behavioralWeaknesses":["one sentence each"],"criticalTrades":[{"trade":"X","loss":"-$X","percentOfTotalLosses":"X%","whatWentWrong":"brief"}],"phaseAnalysis":[{"phase":"X","period":"X","trades":0,"winLoss":"XW/YL","winRate":"X%","pnl":"+$X"}],"benchmarkComparison":[{"traderType":"Average retail","typicalWinRate":"40-50%","annualReturn":"Negative","vsThisTrader":"Below"},{"traderType":"This trader","typicalWinRate":"X%","annualReturn":"X%","vsThisTrader":"—"}],"finalVerdict":"Two sentences max.","sentinelRule":"One specific rule with dollar amount."}

Be specific with numbers. Keep text fields brief.`;

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonText = match ? match[0] : cleaned;
  return JSON.parse(jsonText);
}

export async function POST(request: Request) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const csvText = await file.text();
    const limitedCsv = csvText.slice(0, 25000);

    const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this trade history and return JSON only:\n\n${limitedCsv}`
        }
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("No text response");
    }

    const report = extractJson(content.text);
    return NextResponse.json({ report });

  } catch (error) {
    console.error("Sentinel error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
