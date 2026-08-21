import { NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID } from "@/lib/sheets-client";
import { CustomCategory } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const { categories } = (await req.json()) as { categories: CustomCategory[] };
    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ ok: false, error: "Invalid data" }, { status: 400 });
    }

    const sheets = getSheetsClient();
    const sheetId = SHEET_ID();

    // Prepare rows
    const rows = categories.map((c) => [c.value, c.label, c.color, c.bg, c.emoji]);

    // Clear existing data (keeping header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: "🏷️ Categories!A2:E",
    });

    // Write new data
    if (rows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "🏷️ Categories!A2",
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
