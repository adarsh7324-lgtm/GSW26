/**
 * MeshDeformer
 *
 * Renders a garment image warped to body landmarks using a 2D bilinear mesh.
 *
 * Technique:
 *  1. Build a (COLS+1) × (ROWS+1) grid of vertices in garment image space (UV).
 *  2. Compute their deformed positions in canvas space using bilinear interpolation
 *     of the four garment quad corners (derived from shoulder + hip landmarks).
 *  3. Render each grid cell as 2 affine-textured triangles via ctx.clip + ctx.transform.
 *
 * Performance: 6 cols × 9 rows = 108 triangles/frame. Runs at 30-60 fps.
 */
export class MeshDeformer {
  constructor(cols = 6, rows = 9) {
    this.COLS = cols;
    this.ROWS = rows;
  }

  /**
   * Draw a garment canvas warped onto the body pose.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLCanvasElement}        garmentCanvas  - bg-removed garment image
   * @param {Object}                   pose           - from PoseTracker._computeMetrics()
   * @param {Object}                   template       - { widthScale, heightRatio, collarFraction }
   */
  draw(ctx, garmentCanvas, pose, template) {
    if (!garmentCanvas || !pose) return;

    const vertices = this._buildGrid(pose, template);
    const gw = garmentCanvas.width;
    const gh = garmentCanvas.height;
    const { COLS, ROWS } = this;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const tl = vertices[row][col];
        const tr = vertices[row][col + 1];
        const bl = vertices[row + 1][col];
        const br = vertices[row + 1][col + 1];

        // Source UV pixel positions in garment image
        const u0 = (col / COLS) * gw,       u1 = ((col + 1) / COLS) * gw;
        const v0 = (row / ROWS) * gh,        v1 = ((row + 1) / ROWS) * gh;

        // Upper triangle: TL – TR – BL
        this._drawTri(ctx, garmentCanvas,
          { x: u0, y: v0 }, { x: u1, y: v0 }, { x: u0, y: v1 },
          tl, tr, bl
        );
        // Lower triangle: TR – BR – BL
        this._drawTri(ctx, garmentCanvas,
          { x: u1, y: v0 }, { x: u1, y: v1 }, { x: u0, y: v1 },
          tr, br, bl
        );
      }
    }

    ctx.restore();
  }

  // ─── Build deformed mesh grid ───────────────────────────────────────────────

  _buildGrid(pose, template) {
    const {
      leftShoulder: ls, rightShoulder: rs,
      leftHip: lh,      rightHip: rh,
      shoulderWidth, torsoHeight, torsoAngle, hipWidth,
    } = pose;

    const widthScale  = template.widthScale     ?? 1.25;
    const heightScale = template.heightScale    ?? 1.15;  // multiplier of torsoHeight
    const collarFrac  = template.collarFraction ?? 0.05;

    // ── Coordinate system ────────────────────────────────────────────────────
    // Right direction = along shoulder line
    const cos = Math.cos(torsoAngle);
    const sin = Math.sin(torsoAngle);

    // Down direction = perpendicular to shoulder line, pointing toward hips
    let downX = -sin, downY = cos;
    const toHipX = (lh.x + rh.x) / 2 - (ls.x + rs.x) / 2;
    const toHipY = (lh.y + rh.y) / 2 - (ls.y + rs.y) / 2;
    if (downX * toHipX + downY * toHipY < 0) { downX = -downX; downY = -downY; }

    // ── Garment quad ─────────────────────────────────────────────────────────
    const halfW    = shoulderWidth * widthScale / 2;
    const garmentH = torsoHeight   * heightScale;

    // Shoulder midpoint
    const midX = (ls.x + rs.x) / 2;
    const midY = (ls.y + rs.y) / 2;

    // Top of garment: slightly above shoulder midpoint (collar fraction)
    const topX = midX - downX * garmentH * collarFrac;
    const topY = midY - downY * garmentH * collarFrac;

    const TL = { x: topX - halfW * cos, y: topY - halfW * sin };
    const TR = { x: topX + halfW * cos, y: topY + halfW * sin };
    const BL = { x: TL.x + garmentH * downX, y: TL.y + garmentH * downY };
    const BR = { x: TR.x + garmentH * downX, y: TR.y + garmentH * downY };

    // Hip taper: bottom of garment follows hip width
    const effHipHalfW = (hipWidth ?? shoulderWidth) * widthScale / 2;
    const taperDelta  = effHipHalfW - halfW; // positive = wider at bottom

    // ── Build vertices ────────────────────────────────────────────────────────
    const { COLS, ROWS } = this;
    const vertices = [];

    for (let row = 0; row <= ROWS; row++) {
      const rowVerts = [];
      const v = row / ROWS;

      // Left and right edge positions at this row (bilinear lerp)
      const leftX  = TL.x + v * (BL.x - TL.x);
      const leftY  = TL.y + v * (BL.y - TL.y);
      const rightX = TR.x + v * (BR.x - TR.x);
      const rightY = TR.y + v * (BR.y - TR.y);

      for (let col = 0; col <= COLS; col++) {
        const u = col / COLS;

        // Horizontal lerp between left and right edge
        let x = (1 - u) * leftX + u * rightX;
        let y = (1 - u) * leftY + u * rightY;

        // Apply symmetric hip taper
        const side = u - 0.5; // -0.5 (left) … +0.5 (right)
        x += side * 2 * v * taperDelta * cos;
        y += side * 2 * v * taperDelta * sin;

        rowVerts.push({ x, y });
      }
      vertices.push(rowVerts);
    }

    return vertices;
  }

  // ─── Affine textured triangle ───────────────────────────────────────────────

  /**
   * Render one textured triangle.
   * Maps (s0,s1,s2) in source image pixels → (d0,d1,d2) in canvas pixels.
   */
  _drawTri(ctx, img, s0, s1, s2, d0, d1, d2) {
    // Vectors in destination space
    const dA = d1.x - d0.x, dB = d2.x - d0.x;
    const dC = d1.y - d0.y, dD = d2.y - d0.y;
    const det = dA * dD - dB * dC;
    if (Math.abs(det) < 0.1) return;  // Degenerate triangle — skip

    // Vectors in source space
    const sA = s1.x - s0.x, sB = s2.x - s0.x;
    const sC = s1.y - s0.y, sD = s2.y - s0.y;

    // Affine matrix: destination → source
    const inv = 1 / det;
    const m11 = (sA * dD - sB * dC) * inv;
    const m12 = (sB * dA - sA * dB) * inv;
    const m21 = (sC * dD - sD * dC) * inv;
    const m22 = (sD * dA - sC * dB) * inv;
    const tx  = s0.x - (m11 * d0.x + m12 * d0.y);
    const ty  = s0.y - (m21 * d0.x + m22 * d0.y);

    ctx.save();
    // Clip to destination triangle
    ctx.beginPath();
    ctx.moveTo(d0.x, d0.y);
    ctx.lineTo(d1.x, d1.y);
    ctx.lineTo(d2.x, d2.y);
    ctx.closePath();
    ctx.clip();
    // Apply affine transform and blit source image
    ctx.transform(m11, m21, m12, m22, tx, ty);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}
