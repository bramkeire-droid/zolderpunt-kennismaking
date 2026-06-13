export type PreparedDownloadWindow = Window | null;

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

export const openDownloadWindow = (filename: string): PreparedDownloadWindow => {
  if (!isBrowser()) return null;

  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) return null;

  popup.document.write(`<!doctype html>
    <html lang="nl">
      <head>
        <meta charset="utf-8" />
        <title>${filename}</title>
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; background: #f8fafc; }
          main { text-align: center; max-width: 520px; padding: 32px; }
          strong { display: block; font-size: 20px; margin-bottom: 8px; }
          span { color: #475569; }
        </style>
      </head>
      <body><main><strong>PDF wordt gemaakt…</strong><span>${filename}</span></main></body>
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
      window.setTimeout(() => {
        try {
          preparedWindow.location.href = url;
        } catch {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }, 350);
    }
  } finally {
    window.setTimeout(() => {
      anchor.remove();
      URL.revokeObjectURL(url);
    }, 60_000);
  }
};

export const downloadPdfBytes = (bytes: Uint8Array, filename: string, preparedWindow?: PreparedDownloadWindow) => {
  return downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), filename, preparedWindow);
};