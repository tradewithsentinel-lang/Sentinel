import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are Sentinel, an elite AI trading co-pilot. Analyze the trader's CSV data and identify behavioral patterns destroying their performance. Be brutally specific. Reference exact dates, times, and dollar amounts from their data. Never give generic advice. Everything must come from their actual trades.

Return ONLY a valid JSON object with exactly these keys:
{
  "winRate": "specific win rate percentage and which symbols win vs lose",
  "revengeTradingPatterns": "specific dates when revenge trading occurred and exact dollar cost",
  "overtradingPatterns": "specific days with too many trades and win rate comparison",
  "hiddenEdge": "what this trader actually does well based on the data",
  "singleSavingRule": "one specific rule with the exact dollar amount it would have saved"
}`;

export async function POST(request: Request) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const limitedCsv = csvText.slice(0, 25000);

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
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

    const cleaned = content.text.replace(/```json|```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in response");

    const report = JSON.parse(match[0]);
    return NextResponse.json({ report });

  } catch (error) {
    console.error("Sentinel error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
