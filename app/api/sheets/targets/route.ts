import { NextRequest, NextResponse } from "next/server";
import { getSheetsClient, SHEET_ID } from "@/lib/sheets-client";

import { TargetMeta } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { monthlyTargets }: { monthlyTargets?: Record<string, TargetMeta[]> } = body;
    // Fallback if legacy UI sends 'targets: string[]' (though we will update UI)
    const { targets }: { targets?: string[] } = body;
    const sheets = getSheetsClient();
    const sheetId = SHEET_ID();

    // 1. Clear existing rows in Targets sheet (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: "🎯 Targets!A2:D",
    });

    // 2. Write new targets
    const syncedAt = new Date().toISOString();
    const values: string[][] = [];

    if (monthlyTargets) {
      for (const [month, metaList] of Object.entries(monthlyTargets)) {
        for (const meta of metaList) {
          values.push([month, meta.name, meta.accomplishedAt || "", syncedAt]);
        }
      }
    } else if (targets) {
      // Legacy fallback
      for (const t of targets) {
        values.push([t, syncedAt]);
      }
    }

    if (values.length === 0) {
      return NextResponse.json({ ok: true });
    }

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
