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

    try {
      // Clear existing data (but keep header)
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: "🏆 Challenges!A2:J",
      });
    } catch (e: any) {
      if (e.message && e.message.includes("Unable to parse range")) {
        // Sheet does not exist. Create it on the fly.
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{
              addSheet: { properties: { title: "🏆 Challenges", gridProperties: { frozenRowCount: 1 } } }
            }]
          }
        });
        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: "🏆 Challenges!A1",
          valueInputOption: "RAW",
          requestBody: { values: [["ID", "Name", "Start Date", "Duration", "Goals", "Preferences", "Action Plan", "Status", "Logs (JSON)", "Target Mapping (JSON)"]] }
        });
      } else {
        throw e;
      }
    }

    if (challenges.length > 0) {
      const rows = challenges.map((c: Challenge) => [
        c.id,
        c.name,
        c.startDate,
        c.durationDays.toString(),
        c.goals.join("\n"),
        c.preferences,
        c.actionPlan,
        c.status,
        c.logs ? JSON.stringify(c.logs) : "[]",
        c.targetMapping ? JSON.stringify(c.targetMapping) : "{}"
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
