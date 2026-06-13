export type PreparedDownloadWindow = Window | null;

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const escapeHtml = (value: string) => value.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] || char));

export const openDownloadWindow = (filename: string): PreparedDownloadWindow => {
  if (!isBrowser()) return null;

  const popup = window.open('', '_blank');
  if (!popup) return null;
  popup.opener = null;
  const safeFilename = escapeHtml(filename);

  popup.document.write(`<!doctype html>
    <html lang="nl">
      <head>
        <meta charset="utf-8" />
        <title>${safeFilename}</title>
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; background: #f8fafc; }
          main { text-align: center; max-width: 520px; padding: 32px; }
          strong { display: block; font-size: 20px; margin-bottom: 8px; }
          span { color: #475569; }
        </style>
      </head>
      <body><main><strong>PDF wordt gemaakt…</strong><span>${safeFilename}</span></main></body>
    </html>`);
  popup.document.close();
  return popup;
};

export const downloadBlob = async (blob: Blob, filename: string, preparedWindow?: PreparedDownloadWindow): Promise<void> => {
  if (!isBrowser()) throw new Error('Downloaden kan alleen in de browser.');
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error('PDF is leeg en werd niet gedownload.');

  const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([await blob.arrayBuffer()], { type: 'application/pdf' });
  const url = URL.createObjectURL(pdfBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);

  try {
    anchor.click();

    if (preparedWindow && !preparedWindow.closed) {
      const safeFilename = escapeHtml(filename);
      preparedWindow.document.open();
      preparedWindow.document.write(`<!doctype html>
        <html lang="nl">
          <head>
            <meta charset="utf-8" />
            <title>${safeFilename}</title>
            <style>
              body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; background: #f8fafc; }
              main { text-align: center; max-width: 560px; padding: 32px; }
              strong { display: block; font-size: 22px; margin-bottom: 10px; }
              p { color: #475569; line-height: 1.5; }
              a { display: inline-block; margin-top: 18px; padding: 12px 18px; color: #ffffff; background: #008CFF; text-decoration: none; font-weight: 700; }
            </style>
          </head>
          <body>
            <main>
              <strong>PDF is klaar</strong>
              <p>Als de download niet automatisch startte, klik hieronder. Openen kan apart, maar deze pagina blijft beschikbaar om te downloaden.</p>
              <a id="download-link" href="${url}" download="${safeFilename}">PDF downloaden</a>
              <p><a href="${url}" target="_blank" rel="noopener">PDF openen</a></p>
            </main>
            <script>
              setTimeout(function(){ document.getElementById('download-link').click(); }, 100);
            </script>
          </body>
        </html>`);
      preparedWindow.document.close();
    }
  } finally {
    window.setTimeout(() => {
      anchor.remove();
      URL.revokeObjectURL(url);
    }, preparedWindow ? 900_000 : 60_000);
  }
};

export const downloadPdfBytes = (bytes: Uint8Array, filename: string, preparedWindow?: PreparedDownloadWindow) => {
  return downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), filename, preparedWindow);
};