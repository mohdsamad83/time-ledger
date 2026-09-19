import { NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID } from "@/lib/sheets-client";
import { Challenge } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { challenges } = await req.json();
    if (!Array.isArray(challenges)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const sheets = getSheetsClient();
    const sheetId = SHEET_ID();

    // Clear existing data (but keep header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: "🏆 Challenges!A2:H",
    });

    if (challenges.length > 0) {
      const rows = challenges.map((c: Challenge) => [
        c.id,
        c.name,
        c.startDate,
        c.durationDays.toString(),
        c.goals.join("\n"),
        c.preferences,
        c.actionPlan,
        c.status
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "🏆 Challenges!A2",
        valueInputOption: "RAW",
        requestBody: { values: rows },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
