import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const csvText = await file.text();
    const limitedCsv = csvText.slice(0, 20000);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `You are Sentinel, an elite trading behavioral analyst. Analyze this trade history CSV and write a detailed report.

Use EXACTLY these section headers with the pipe character:

WIN_RATE| Write 3-4 sentences about win rate, which symbols win vs lose, quality of wins vs losses. Be specific with percentages and dollar amounts from the data.

REVENGE_TRADING| Write 3-4 sentences identifying specific dates and sequences where revenge trading occurred. Include exact dollar cost of this pattern.

OVERTRADING| Write 3-4 sentences about days with too many trades. Compare win rate on single trade days vs multi trade days. Include dollar cost.

HIDDEN_EDGE| Write 3-4 sentences about what this trader actually does well. Which symbols, which setups, what conditions produce wins.

SINGLE_RULE| Write 2-3 sentences describing the one rule that would save the most money. Include the exact dollar amount it would have saved.

CSV DATA:
${limitedCsv}`
      }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("No text response");

    const text = content.text;

    function extractSection(key: string): string {
      const pattern = new RegExp(`${key}\\|([\\s\\S]*?)(?=WIN_RATE\\||REVENGE_TRADING\\||OVERTRADING\\||HIDDEN_EDGE\\||SINGLE_RULE\\||$)`);
      const match = text.match(pattern);
      return match ? match[1].trim() : "Analysis unavailable for this section.";
    }

    const report = {
      winRate: extractSection("WIN_RATE"),
      revengeTradingPatterns: extractSection("REVENGE_TRADING"),
      overtradingPatterns: extractSection("OVERTRADING"),
      hiddenEdge: extractSection("HIDDEN_EDGE"),
      singleSavingRule: extractSection("SINGLE_RULE"),
    };

    return NextResponse.json({ report });

  } catch (error) {
    console.error("Sentinel error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
