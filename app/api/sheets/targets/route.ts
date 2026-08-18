import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID } from "@/lib/sheets-client";

export async function POST(req: NextRequest) {
  try {
    const { targets }: { targets: string[] } = await req.json();
    const sheets = getSheetsClient();
    const sheetId = SHEET_ID();

    // 1. Clear existing rows in Targets sheet (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: "🎯 Targets!A2:B",
    });

    if (targets.length === 0) {
      return NextResponse.json({ ok: true });
    }

    // 2. Write new targets
    const syncedAt = new Date().toISOString();
    const values = targets.map((t) => [t, syncedAt]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "🎯 Targets!A2",
      valueInputOption: "RAW",
      requestBody: { values },
    });

    return NextResponse.json({ ok: true, syncedAt });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
