/**
 * Client-side image compression utilities.
 *
 * Why: iPhone/Android camera fotos zijn vaak 4-8 MB en 4000+ px breed.
 * Voor PDF-rendering en portal-display is dat overkill — en het breekt
 * @react-pdf/renderer (silent fetch failures bij grote payloads).
 *
 * Beleid:
 *   - Max 1600 px breedte (PDF rendert op A4 ~ 530 px breed bij 72 dpi,
 *     1600 px geeft retina-kwaliteit ruim voldoende)
 *   - JPEG kwaliteit 0.82 (visueel gelijk aan origineel, ~10x kleiner bestand)
 *   - Originele bestandsnaam behouden, extensie blijft .jpg
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

/**
 * Compress a File from a file input. Returns a new File ready for upload.
 * Niet-images worden ongewijzigd teruggegeven.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const { blob, width, height } = await downscaleBlob(file);
    if (!blob) return file;

    // Bouw een nieuwe File met dezelfde basisnaam maar .jpg extensie
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const newName = `${baseName}.jpg`;

    return new File([blob], newName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch (e) {
    console.warn('[imageCompression] Compressie mislukt, gebruik origineel:', e);
    return file;
  }
}

/**
 * Fetch a remote image URL en downscale naar een data-URL (base64).
 * Gebruikt voor het PDF-render-pad: laadt bestaande grote storage-foto's
 * en geeft ze als compacte base64 mee aan @react-pdf/renderer.
 */
export async function fetchAndDownscaleToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) {
      console.warn('[imageCompression] Fetch faalde:', url, res.status);
      return null;
    }
    const blob = await res.blob();
    const result = await downscaleBlob(blob);
    if (!result.blob) return null;
    return await blobToDataUrl(result.blob);
  } catch (e) {
    console.warn('[imageCompression] fetchAndDownscale mislukt voor', url, e);
    return null;
  }
}

// ─── Internal helpers ───────────────────────────────────────────────

async function downscaleBlob(input: Blob): Promise<{
  blob: Blob | null;
  width: number;
  height: number;
}> {
  const bitmap = await loadBitmap(input);
  const { width, height } = fitDimensions(bitmap.width, bitmap.height, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blob: null, width: 0, height: 0 };

  ctx.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap && typeof (bitmap as ImageBitmap).close === 'function') {
    (bitmap as ImageBitmap).close();
  }

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  );

  return { blob, width, height };
}

async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  // Voorkeur: createImageBitmap (sneller, geen DOM nodig). Fallback: <img>.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch {
      /* fall through */
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = e => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function fitDimensions(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
