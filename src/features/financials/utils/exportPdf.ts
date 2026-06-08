/* Simple PDF export using the browser's print API — no external dependency needed */
export function exportPdf(title: string, headers: string[], rows: (string | number | null)[][]): void {
  const fmt = (v: string | number | null) => String(v ?? '—');

  const tableRows = rows.map(row =>
    `<tr>${row.map(cell => `<td>${fmt(cell)}</td>`).join('')}</tr>`
  ).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Helvetica Neue', sans-serif; padding: 24px; color: #0F172A; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p  { font-size: 12px; color: #64748B; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #F8FAFC; padding: 8px 12px; text-align: left; border-bottom: 2px solid #E2E8F0; font-weight: 600; }
        td { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; }
        tr:nth-child(even) td { background: #FAFAFA; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>Exported on ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</p>
      <table>
        <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>
  `;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 500);
}