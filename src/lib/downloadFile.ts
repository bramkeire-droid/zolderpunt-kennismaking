export type PreparedDownloadWindow = Window | null;

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const escapeHtml = (value: string) => value.replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char] || char));
const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const forceAnchorDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
};

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

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const downloadBlob = new Blob([bytes as BlobPart], { type: 'application/octet-stream' });
  const previewBlob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const base64 = bytesToBase64(bytes);

  try {
    forceAnchorDownload(downloadBlob, filename);

    if (preparedWindow && !preparedWindow.closed) {
      const safeFilename = escapeHtml(filename);
      const previewUrl = URL.createObjectURL(previewBlob);
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
              button, a { display: inline-block; margin: 10px 6px 0; padding: 12px 18px; border: 0; color: #ffffff; background: #008CFF; text-decoration: none; font-weight: 700; font: inherit; cursor: pointer; }
              a.secondary { color: #008CFF; background: transparent; }
            </style>
          </head>
          <body>
            <main>
              <strong>PDF is klaar</strong>
              <p>Als de download niet automatisch startte, klik op downloaden. Deze knop schrijft het bestand opnieuw weg als echte download, niet als viewer-link.</p>
              <button id="download-link" type="button">PDF downloaden</button>
              <a class="secondary" href="${previewUrl}" target="_blank" rel="noopener">PDF bekijken</a>
            </main>
            <script>
              const filename = ${JSON.stringify(filename)};
              const base64 = '${base64}';
              function toBytes(value) {
                const binary = atob(value);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                return bytes;
              }
              async function savePdf() {
                const bytes = toBytes(base64);
                if (window.showSaveFilePicker) {
                  try {
                    const handle = await window.showSaveFilePicker({ suggestedName: filename, types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }] });
                    const writable = await handle.createWritable();
                    await writable.write(new Blob([bytes], { type: 'application/pdf' }));
                    await writable.close();
                    return;
                  } catch (error) {
                    if (error && error.name === 'AbortError') return;
                  }
                }
                const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
              }
              document.getElementById('download-link').addEventListener('click', savePdf);
            </script>
          </body>
        </html>`);
      preparedWindow.document.close();
    }
  } finally {
    // Object URLs created for the fallback preview must remain valid while the download window is open.
  }
};

export const downloadPdfBytes = (bytes: Uint8Array, filename: string, preparedWindow?: PreparedDownloadWindow) => {
  return downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), filename, preparedWindow);
};