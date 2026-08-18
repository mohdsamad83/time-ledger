import { google } from "googleapis";

/** Shared Sheets client – cached per cold-start */
let _sheets: ReturnType<typeof google.sheets> | null = null;

export function getSheetsClient() {
  if (_sheets) return _sheets;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars"
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  _sheets = google.sheets({ version: "v4", auth });
  return _sheets;
}

export const SHEET_ID = () => {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEET_ID env var");
  return id;
};

// ─── Helper: append rows ──────────────────────────────────────────────────────
export async function appendRows(range: string, values: (string | number | boolean | null)[]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range,
    valueInputOption: "RAW",
    insertDataOption: "OVERWRITE",
    requestBody: { values: [values] },
  });
}

// ─── Helper: update a named range / cell ──────────────────────────────────────
export async function updateRange(range: string, values: (string | number | boolean | null)[][]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

// ─── Helper: find a row and update it (or append if not found) ───────────────
export async function upsertRow(
  sheetName: string,
  matchCol: number, // 0-indexed column to match
  matchValue: string,
  rowValues: (string | number | boolean | null)[]
) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: `${sheetName}!A:A`,
  });
  const rows = res.data.values ?? [];
  const rowIdx = rows.findIndex((r) => r[matchCol] === matchValue);

  if (rowIdx > 0) {
    // Update existing (rowIdx is 0-indexed; Sheets rows are 1-indexed + 1 header)
    await updateRange(`${sheetName}!A${rowIdx + 1}`, [rowValues]);
  } else {
    await appendRows(`${sheetName}!A:Z`, rowValues);
  }
}
