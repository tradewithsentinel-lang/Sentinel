import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Sentinel, an elite independent trading analyst. Produce a comprehensive professional analysis report from this trader's CSV history. Return ONLY valid JSON with exactly these keys:

{"traderName":"Trader","reportTitle":"Sentinel Trading Analysis Report","dateRange":"date range from data","overview":{"startingCapital":"estimate from first trades","finalBalance":"estimate from last trades","totalReturn":"+$X (Y%)","duration":"X months","totalTrades":0,"winningTrades":0,"losingTrades":0},"overallScore":6.5,"categoryScores":[{"category":"Win Rate","score":7,"maxScore":10,"observation":"specific observation"},{"category":"Loss Discipline","score":4,"maxScore":10,"observation":"specific"},{"category":"Position Sizing","score":6,"maxScore":10,"observation":"specific"},{"category":"Patience / Selectivity","score":5,"maxScore":10,"observation":"specific"},{"category":"Recovery Discipline","score":4,"maxScore":10,"observation":"specific"},{"category":"Risk / Reward Ratio","score":5,"maxScore":10,"observation":"specific"},{"category":"Consistency","score":5,"maxScore":10,"observation":"specific"}],"performanceStats":{"winRate":"X%","avgWinningTrade":"+$X","avgLosingTrade":"-$X","bestSingleTrade":"+$X (ticker date)","worstSingleTrade":"-$X (ticker date)","largestSingleDay":"+$X (date)","maxDrawdown":"-X%","recoveryFromLow":"+$X (+X%)"},"accountMilestones":[{"date":"date","event":"what happened","balance":"$X","changeFromStart":"X%"}],"symbolBreakdown":[{"ticker":"TSLA","trades":45,"totalPnl":"+$12000","notes":"specific observation","profitable":true}],"tradingMethodology":{"summary":"One paragraph describing what this trader actually does based on their data patterns","principles":[{"principle":"name","description":"specific description from their data"}]},"behavioralStrengths":["specific strength with evidence"],"behavioralWeaknesses":["specific weakness with dates and amounts"],"criticalTrades":[{"trade":"description","loss":"-$X","percentOfTotalLosses":"X%","whatWentWrong":"specific"}],"phaseAnalysis":[{"phase":"Phase Name","period":"dates","trades":0,"winLoss":"XW/YL","winRate":"X%","pnl":"+$X"}],"benchmarkComparison":[{"traderType":"Average retail trader","typicalWinRate":"40-50%","annualReturn":"Negative","vsThisTrader":"Below"},{"traderType":"This trader","typicalWinRate":"X%","annualReturn":"X%","vsThisTrader":"—"}],"finalVerdict":"Two honest paragraphs about this trader.","sentinelRule":"The single most important rule with exact dollar amount saved."}

Be brutally specific. Reference actual dates and dollar amounts from the CSV.`;

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
      max_tokens: 4000,
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
