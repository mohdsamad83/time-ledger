import { NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID } from "@/lib/sheets-client";
import { AcademicSubject } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { academics } = await req.json();
    if (!Array.isArray(academics)) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }

    const sheets = getSheetsClient();
    const sheetId = SHEET_ID();

    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: "🎓 Academics!A2:E",
      });
    } catch (e: any) {
      if (e.message && e.message.includes("Unable to parse range")) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{
              addSheet: { properties: { title: "🎓 Academics", gridProperties: { frozenRowCount: 1 } } }
            }]
          }
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: "🎓 Academics!A1",
          valueInputOption: "RAW",
          requestBody: { values: [["ID", "Name", "Color", "Hours/Topic", "Units (JSON)"]] }
        });
      } else {
        throw e;
      }
    }

    if (academics.length > 0) {
      const rows = academics.map((a: AcademicSubject) => [
        a.id,
        a.name,
        a.color,
        a.hoursPerTopic.toString(),
        JSON.stringify(a.units || [])
      ]);
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `🎓 Academics!A2:E${rows.length + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: rows }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Academics Sync Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
