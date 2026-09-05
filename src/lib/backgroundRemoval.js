/**
 * Background removal for user-uploaded garment images.
 *
 * Strategy: assumes product photos with a solid/white background.
 * Samples the background color from the image corners, then makes
 * pixels within `tolerance` of that color transparent (with soft feathering).
 *
 * After removal, the canvas is cropped to the tight alpha bounding box so that
 * garment images with large whitespace margins align correctly to body landmarks.
 */

/**
 * Remove background from an uploaded File or image URL.
 *
 * @param {File|string} source - A File object from <input type="file"> or a URL string
 * @param {Object}      opts
 * @param {number}      opts.tolerance   - Color distance threshold 0-441 (default 55)
 * @param {boolean}     opts.feather     - Soft edges (default true)
 * @param {number}      opts.maxSize     - Resize limit in pixels (default 900)
 * @returns {Promise<HTMLCanvasElement>} - Canvas with transparent background, tightly cropped
 */
export async function removeBackground(source, opts = {}) {
  const { tolerance = 55, feather = true, maxSize = 900 } = opts;

  const img = await _loadImage(source);

  // Downscale large images for performance
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const w = Math.round((img.naturalWidth || img.width) * scale);
  const h = Math.round((img.naturalHeight || img.height) * scale);

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  _processPixels(imageData.data, w, h, tolerance, feather);
  ctx.putImageData(imageData, 0, 0);

  // Crop to tight alpha bounding box — removes whitespace so garment fills
  // the template correctly and doesn't appear tiny or off-center.
  return _cropToAlphaBounds(canvas);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _loadImage(source) {
  if (source instanceof HTMLImageElement) return Promise.resolve(source);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve(img);
      if (img._objectUrl) URL.revokeObjectURL(img._objectUrl);
    };
    img.onerror = () => reject(new Error('Failed to load garment image'));

    if (source instanceof File || source instanceof Blob) {
      const url = URL.createObjectURL(source);
      img._objectUrl = url;
      img.src = url;
    } else {
      img.src = source;
    }
  });
}

function _processPixels(data, w, h, tolerance, feather) {
  const bg = _sampleBackground(data, w, h);
  const tSq = tolerance * tolerance * 3;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i]     - bg[0];
    const dg = data[i + 1] - bg[1];
    const db = data[i + 2] - bg[2];
    const distSq = dr * dr + dg * dg + db * db;

    if (distSq < tSq) {
      if (feather) {
        const outerZone = tSq * 0.36;
        if (distSq < outerZone) {
          data[i + 3] = 0;
        } else {
          const t = (distSq - outerZone) / (tSq - outerZone);
          data[i + 3] = Math.round(t * data[i + 3]);
        }
      } else {
        data[i + 3] = 0;
      }
    }
  }
}

function _sampleBackground(data, w, h) {
  // Sample 8 edge points to estimate background color
  const sampleCoords = [
    [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
    [Math.floor(w / 2), 0], [0, Math.floor(h / 2)],
    [w - 1, Math.floor(h / 2)], [Math.floor(w / 2), h - 1],
  ];

  let r = 0, g = 0, b = 0;
  for (const [x, y] of sampleCoords) {
    const idx = (y * w + x) * 4;
    r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
  }
  const n = sampleCoords.length;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/**
 * Crop a canvas to the smallest rectangle that contains all non-transparent pixels.
 * Adds a small padding so edge anti-aliasing isn't clipped.
 */
function _cropToAlphaBounds(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;

  let minX = w, maxX = 0, minY = h, maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Alpha channel at this pixel
      const a = data[(y * w + x) * 4 + 3];
      if (a > 8) {  // Ignore near-invisible pixels from feathering
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return canvas;  // All transparent — return as-is

  // Add a small padding so anti-aliased edges aren't clipped
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const cropped = document.createElement('canvas');
  cropped.width  = cropW;
  cropped.height = cropH;
  cropped.getContext('2d').drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return cropped;
}
