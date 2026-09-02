import { NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID } from "@/lib/sheets-client";
import { RoutineItem } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { routine } = (await req.json()) as { routine: RoutineItem[] };
    if (!routine || !Array.isArray(routine)) {
      return NextResponse.json({ ok: false, error: "Invalid data" }, { status: 400 });
    }

    const sheets = getSheetsClient();
    const sheetId = SHEET_ID();

    // Prepare rows
    const rows = routine.map((r) => [r.activity, r.startTime, r.endTime]);

    // Clear existing data (keeping header)
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: "⏱️ Routine!A2:C",
      });
    } catch (clearErr: any) {
      if (clearErr.message?.includes("Unable to parse range")) {
        // Sheet doesn't exist, create it
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: "⏱️ Routine" }
                }
              }
            ]
          }
        });
        // Add headers
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: "⏱️ Routine!A1",
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [["Activity", "Start Time", "End Time"]] },
        });
      } else {
        throw clearErr;
      }
    }

    // Write new data
    if (rows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "⏱️ Routine!A2",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
