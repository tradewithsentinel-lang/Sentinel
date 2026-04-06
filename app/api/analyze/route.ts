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
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `You are Sentinel — an elite trading behavioral analyst and co-pilot. Your job is not to describe what happened. Your job is to identify the exact patterns destroying this trader and give them specific, actionable rules to become profitable. Be ruthlessly honest. Reference exact dates and dollar amounts from the data. Do not use markdown asterisks or bullet points. Write in clear direct sentences.

Use EXACTLY these section headers followed by a pipe character:

BEHAVIORAL_FINGERPRINT| Every trader has a specific destruction pattern. Identify this trader's named pattern — what specifically triggers their worst behavior, what the sequence looks like, how many times it repeated, and the total dollar cost of this one pattern. Give it a name. Example: "The MSTR Spiral." Be specific with dates and amounts. End with: PATTERN COST: $X across Y incidents.

TREND_ANALYSIS| Analyze whether each major symbol was traded with or against the prevailing trend by looking at win rate patterns. If a trader consistently loses on a symbol despite many attempts, they are likely trading counter-trend. If they win consistently on a symbol, they likely have trend alignment. For each major symbol state: WITH-TREND or COUNTER-TREND based on the evidence, their win rate on it, and what the data suggests about their directional bias. End with: TREND EDGE: the symbols where trend alignment is clear and profitable.

CONTRAST_REPORT| Show two versions of this trader. First: The Emotional Trader — what actually happened, total P&L, worst behaviors. Second: The Disciplined Trader — what would have happened if they applied three simple rules derived from their own data. Calculate the exact dollar difference between these two traders. This is the most important number in the report. End with: THE DIFFERENCE: $X — this is what discipline is worth to you specifically.

EDGE_MAP| Map exactly where this trader's edge lives. Green Zone: specific symbols, specific conditions, specific position sizes, specific days where they consistently win. Red Zone: specific symbols, conditions, and behaviors that consistently destroy money. Be precise. End with: TOMORROW'S FOCUS: exactly where to trade and where never to go.

TILT_DETECTOR| Identify the specific trigger conditions that precede this trader's worst losing sequences. Look for patterns: what happened in the 24-48 hours before their biggest drawdowns? Was it a large loss on a specific symbol? A winning streak followed by overconfidence? Identify the tilt trigger precisely. End with: TILT RULE: if X happens, mandatory Y action. Make it specific and non-negotiable.

RECOVERY_BLUEPRINT| Find the period in this data where the trader performed at their absolute best. Analyze exactly what was different — fewer symbols, lower transaction counts, specific setups, specific symbols. Build a replicable blueprint from their own best performance. End with: YOUR WINNING FORMULA: the exact conditions to replicate.

SENTINEL_SCORE| Give this trader a score from 0 to 100 based on: discipline (do they follow consistent rules), edge (do they have a profitable strategy when disciplined), recovery (do they stop losses or let them spiral), selectivity (do they wait for good setups or overtrade). Break down the score by category. End with: TO REACH [score+20]: the two specific changes that would most improve this score.

DAILY_BRIEF| Based on everything above, write a personalized pre-market brief for this trader. Maximum 5 sentences. What to focus on today. What to avoid. How many trades maximum. What to do if they take a loss. This should read like a coach speaking directly to them before they open their platform.

CSV DATA:
${limitedCsv}`
      }],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("No text response");

    const text = content.text;

    const sections = [
      "BEHAVIORAL_FINGERPRINT",
      "TREND_ANALYSIS",
      "CONTRAST_REPORT",
      "EDGE_MAP",
      "TILT_DETECTOR",
      "RECOVERY_BLUEPRINT",
      "SENTINEL_SCORE",
      "DAILY_BRIEF",
    ];

    function extractSection(key: string): string {
      const idx = text.indexOf(`${key}|`);
      if (idx === -1) return "Analysis unavailable.";
      const start = idx + key.length + 1;
      let end = text.length;
      for (const other of sections) {
        if (other === key) continue;
        const otherIdx = text.indexOf(`${other}|`, start);
        if (otherIdx !== -1 && otherIdx < end) end = otherIdx;
      }
      return text.slice(start, end).trim();
    }

    const report = {
      behavioralFingerprint: extractSection("BEHAVIORAL_FINGERPRINT"),
      trendAnalysis: extractSection("TREND_ANALYSIS"),
      contrastReport: extractSection("CONTRAST_REPORT"),
      edgeMap: extractSection("EDGE_MAP"),
      tiltDetector: extractSection("TILT_DETECTOR"),
      recoveryBlueprint: extractSection("RECOVERY_BLUEPRINT"),
      sentinelScore: extractSection("SENTINEL_SCORE"),
      dailyBrief: extractSection("DAILY_BRIEF"),
    };

    return NextResponse.json({ report });

  } catch (error) {
    console.error("Sentinel error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
