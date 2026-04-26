import { Injectable } from '@angular/core';

const escape_cell = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const rows_to_csv = (headers: string[], rows: (string | number | boolean | null | undefined)[][]): string => {
  const lines = [headers.map(escape_cell).join(',')];
  for (const row of rows) lines.push(row.map(escape_cell).join(','));
  return lines.join('\n');
};

const trigger_download = (text: string, filename: string, mime: string) => {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const parse_csv_line = (line: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let in_quotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (in_quotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"')                    { in_quotes = false; }
      else                                     { cur += ch; }
    } else {
      if (ch === ',')      { out.push(cur); cur = ''; }
      else if (ch === '"') { in_quotes = true; }
      else                  { cur += ch; }
    }
  }
  out.push(cur);
  return out;
};

@Injectable({ providedIn: 'root' })
export class CsvService {
  download<T>(filename: string, headers: string[], rows: T[], shape: (row: T) => (string | number | boolean | null | undefined)[]) {
    const text = rows_to_csv(headers, rows.map(shape));
    trigger_download(text, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv');
  }

  parse(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = parse_csv_line(lines[0]).map(h => h.trim());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = parse_csv_line(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = (cells[idx] ?? '').trim(); });
      rows.push(row);
    }
    return { headers, rows };
  }
}
