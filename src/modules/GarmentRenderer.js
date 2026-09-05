import { getTemplate, overlayTypeToTemplateId } from '../lib/garmentTemplates.js';
import { MeshDeformer } from './MeshDeformer.js';

/**
 * GarmentRenderer
 *
 * Responsibilities:
 *  1. Render uploaded garment images using MeshDeformer (bilinear triangle mesh)
 *  2. Apply arm occlusion — arms appear IN FRONT of garments
 *  3. Render debug skeleton HUD
 *
 * IMPORTANT: If no garment image is available, NOTHING is drawn.
 * There is NO default/fallback vector shirt rendered. The camera feed shows
 * through unaltered until the user selects a real garment.
 *
 * ARM OCCLUSION TECHNIQUE:
 *  - Garments are drawn on an internal off-screen canvas
 *  - Arm regions are erased from the off-screen canvas (destination-out composite)
 *  - Result is composited onto the main canvas
 *  - Erased regions reveal the underlying video element, so arms appear
 *    in front of the garment without needing a separate segmentation model.
 */
export class GarmentRenderer {
  constructor() {
    this.showSkeleton        = true;   // On by default so tracking is always visible
    this.showOcclusion       = true;
    this.showTrackingOutline = true;   // Glowing bounding box to assess fit quality

    // Off-screen canvas reused across frames for garment compositing
    this._offscreen = null;
    this._offCtx    = null;

    // Mesh deformer singleton
    this._deformer = new MeshDeformer(6, 9);

    // Image cache: garmentId → HTMLCanvasElement (bg-removed, alpha-cropped)
    this._imageCache = new Map();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Main render call — invoke once per animation frame.
   *
   * @param {CanvasRenderingContext2D} ctx         Main canvas context
   * @param {Object}                  pose         Output of PoseTracker._computeMetrics()
   * @param {Array}                   activeGarments
   * @param {string|null}             selectedColor  Hex color override (unused for image garments)
   * @param {number}                  canvasW
   * @param {number}                  canvasH
   */
  render(ctx, pose, activeGarments = [], selectedColor = null, canvasW = 0, canvasH = 0) {
    if (!ctx || !pose || !pose.detected) return;

    const w = canvasW || ctx.canvas.width;
    const h = canvasH || ctx.canvas.height;

    this._ensureOffscreen(w, h);
    const oCtx = this._offCtx;
    oCtx.clearRect(0, 0, w, h);

    let garmentDrawn = false;

    // ── Render garment layers (in array order — respects LayerPanel ordering) ─
    for (const garment of activeGarments) {
      if (garment.visible === false) continue;

      const processedCanvas = garment.garmentCanvas || this._imageCache.get(garment.id);
      if (!processedCanvas) continue;  // No image → draw NOTHING (P0: no black base tee)

      const templateId = garment.templateId || overlayTypeToTemplateId(garment.overlayType);
      const template   = getTemplate(templateId);

      oCtx.save();
      oCtx.globalAlpha = garment.opacity ?? 1;
      this._deformer.draw(oCtx, processedCanvas, pose, template);
      oCtx.restore();

      garmentDrawn = true;
    }

    // ── Arm occlusion (only if a garment was actually drawn) ─────────────────
    if (garmentDrawn && this.showOcclusion && pose.leftShoulder && pose.rightShoulder) {
      oCtx.save();
      oCtx.globalCompositeOperation = 'destination-out';
      this._drawArmMask(oCtx, pose);
      oCtx.restore();
    }

    // ── Composite garment layer onto main canvas ──────────────────────────────
    ctx.drawImage(this._offscreen, 0, 0);

    // ── Tracking outline (drawn above garments, below skeleton) ───────────────
    if (this.showTrackingOutline && activeGarments.some(g => g.visible !== false)) {
      this._renderTrackingOutline(ctx, pose);
    }

    // ── Debug skeleton (drawn directly on main canvas, always on top) ─────────
    if (this.showSkeleton) {
      this._renderDebugSkeleton(ctx, pose);
    }
  }

  /**
   * Cache a processed (bg-removed, alpha-cropped) canvas for a garment id.
   */
  cacheGarmentImage(garmentId, canvas) {
    this._imageCache.set(garmentId, canvas);
  }

  getCachedImage(garmentId) {
    return this._imageCache.get(garmentId) ?? null;
  }

  // ─── Arm Occlusion ────────────────────────────────────────────────────────

  /**
   * Cut arm-shaped holes in the garment layer so arms appear in front.
   * Arms are approximated as connected capsules: shoulder → elbow → wrist.
   */
  _drawArmMask(ctx, pose) {
    const uw = pose.shoulderWidth * 0.14; // upper arm half-width
    const fw = pose.shoulderWidth * 0.11; // forearm half-width

    // Depth-aware: skip occlusion if joint is clearly behind the torso (Z > 0.05)
    const isBehind = (p) => p && p.z > 0.05;

    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();

    // Left arm: shoulder → elbow
    if (pose.leftShoulder && pose.leftElbow && !isBehind(pose.leftElbow)) {
      this._capsulePath(ctx, pose.leftShoulder, pose.leftElbow, uw, uw);
    }
    // Left arm: elbow → wrist
    if (pose.leftElbow && pose.leftWrist && !isBehind(pose.leftWrist) && !isBehind(pose.leftElbow)) {
      this._capsulePath(ctx, pose.leftElbow, pose.leftWrist, uw, fw);
    }
    // Right arm: shoulder → elbow
    if (pose.rightShoulder && pose.rightElbow && !isBehind(pose.rightElbow)) {
      this._capsulePath(ctx, pose.rightShoulder, pose.rightElbow, uw, uw);
    }
    // Right arm: elbow → wrist
    if (pose.rightElbow && pose.rightWrist && !isBehind(pose.rightWrist) && !isBehind(pose.rightElbow)) {
      this._capsulePath(ctx, pose.rightElbow, pose.rightWrist, uw, fw);
    }

    ctx.fill();
  }

  _capsulePath(ctx, p1, p2, r1, r2) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const nx = -dy / len, ny = dx / len;
    const a1 = Math.atan2(dy, dx);
    ctx.moveTo(p1.x + nx * r1, p1.y + ny * r1);
    ctx.lineTo(p2.x + nx * r2, p2.y + ny * r2);
    ctx.arc(p2.x, p2.y, r2, a1 - Math.PI / 2, a1 + Math.PI / 2);
    ctx.lineTo(p1.x - nx * r1, p1.y - ny * r1);
    ctx.arc(p1.x, p1.y, r1, a1 + Math.PI / 2, a1 - Math.PI / 2);
    ctx.closePath();
  }

  // ─── Tracking Outline ─────────────────────────────────────────────────────

  /**
   * Draw a confidence-coded glowing bounding outline around the garment region.
   *
   *  Green  (conf > 0.75) → solid tracking
   *  Amber  (conf 0.45–0.75) → acceptable
   *  Red    (conf < 0.45) → poor / barely locked on
   */
  _renderTrackingOutline(ctx, pose) {
    const conf = pose.confidence ?? 0;
    let color;
    if (conf > 0.75)      color = 'rgba(16, 201, 130, 0.85)';  // vivid green
    else if (conf > 0.45) color = 'rgba(251, 191, 36, 0.85)';  // amber
    else                  color = 'rgba(248, 113, 113, 0.85)'; // soft red

    const { leftShoulder: ls, rightShoulder: rs, leftHip: lh, rightHip: rh,
            shoulderWidth: sw, torsoHeight: th, torsoAngle, chestCenter } = pose;

    if (!ls || !rs || !lh || !rh || !chestCenter) return;

    ctx.save();

    // ── Shoulder / Hip anchor dots ────────────────────────────────────────────
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    for (const pt of [ls, rs, lh, rh]) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Torso bounding trapezoid (in garment-local space) ────────────────────
    ctx.translate(chestCenter.x, chestCenter.y);
    ctx.rotate(torsoAngle);

    // Use the same torso clamp as the mesh deformer to keep outline matching
    const clampedTh = Math.min(Math.max(th, sw * 1.0), sw * 1.8);

    // Padding slightly wider than the widest garment (jacket ≈ 1.42×)
    const halfW = sw * 0.76;
    const top   = -clampedTh * 0.30;
    const bot   =  clampedTh * 0.92;
    const topW  =  halfW * 1.05;
    const botW  =  halfW * 0.92;

    ctx.beginPath();
    ctx.moveTo(-topW, top);
    ctx.lineTo( topW, top);
    ctx.lineTo( botW, bot);
    ctx.lineTo(-botW, bot);
    ctx.closePath();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.shadowBlur = 14;
    ctx.stroke();

    // ── Corner tick marks ─────────────────────────────────────────────────────
    ctx.setLineDash([]);
    ctx.lineWidth = 3;
    const tick = 14;
    const corners = [
      { x: -topW, y: top, dx: [1, 0],  dy: [0,  1] },
      { x:  topW, y: top, dx: [-1, 0], dy: [0,  1] },
      { x:  botW, y: bot, dx: [-1, 0], dy: [0, -1] },
      { x: -botW, y: bot, dx: [1, 0],  dy: [0, -1] },
    ];
    for (const { x, y, dx, dy } of corners) {
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + dx[0] * tick, y + dx[1] * tick);
      ctx.moveTo(x, y); ctx.lineTo(x + dy[0] * tick, y + dy[1] * tick);
      ctx.stroke();
    }

    // ── TRACK XX% confidence pill (world-space, undo transform first) ─────────
    ctx.rotate(-torsoAngle);
    ctx.translate(-chestCenter.x, -chestCenter.y);

    const pct   = Math.round(conf * 100);
    const label = `TRACK ${pct}%`;
    const lx    = (ls.x + rs.x) / 2;
    const ly    = Math.min(ls.y, rs.y) - 18;

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tw = ctx.measureText(label).width + 14;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(lx - tw / 2, ly - 9, tw, 18, 5);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.shadowBlur = 0;
    ctx.fillText(label, lx, ly);

    ctx.restore();
  }

  // ─── Debug Skeleton ───────────────────────────────────────────────────────

  _renderDebugSkeleton(ctx, pose) {
    ctx.save();

    const GREEN  = '#10B981';
    const YELLOW = '#FBBF24';
    const BLUE   = '#60A5FA';
    const RED    = '#F87171';

    // ── Bone connections ──────────────────────────────────────────────────────
    const bones = [
      ['leftShoulder', 'rightShoulder'],
      ['leftShoulder', 'leftHip'],
      ['rightShoulder', 'rightHip'],
      ['leftHip', 'rightHip'],
      ['leftShoulder', 'leftElbow'],
      ['leftElbow', 'leftWrist'],
      ['rightShoulder', 'rightElbow'],
      ['rightElbow', 'rightWrist'],
      ['leftHip', 'leftKnee'],
      ['leftKnee', 'leftAnkle'],
      ['rightHip', 'rightKnee'],
      ['rightKnee', 'rightAnkle'],
    ];

    ctx.lineWidth = 3;
    for (const [a, b] of bones) {
      const pA = pose[a], pB = pose[b];
      if (!pA || !pB) continue;
      const vis = ((pA.visibility ?? 1) + (pB.visibility ?? 1)) / 2;
      // Color bones by confidence: green = high, yellow = mid, red = low
      const hue = vis > 0.7 ? GREEN : vis > 0.4 ? YELLOW : RED;
      ctx.strokeStyle = hue;
      ctx.globalAlpha = Math.max(0.3, vis);
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── Shoulder line (dashed) ────────────────────────────────────────────────
    ctx.setLineDash([6, 4]);
    if (pose.leftShoulder && pose.rightShoulder) {
      ctx.strokeStyle = YELLOW; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pose.leftShoulder.x, pose.leftShoulder.y);
      ctx.lineTo(pose.rightShoulder.x, pose.rightShoulder.y);
      ctx.stroke();
    }
    if (pose.leftHip && pose.rightHip) {
      ctx.strokeStyle = BLUE; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pose.leftHip.x, pose.leftHip.y);
      ctx.lineTo(pose.rightHip.x, pose.rightHip.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── Landmark dots with confidence-color coding ────────────────────────────
    const pts = [
      { k: 'leftShoulder',  l: 'LS', c: GREEN  },
      { k: 'rightShoulder', l: 'RS', c: GREEN  },
      { k: 'leftElbow',     l: 'LE', c: YELLOW },
      { k: 'rightElbow',    l: 'RE', c: YELLOW },
      { k: 'leftWrist',     l: 'LW', c: YELLOW },
      { k: 'rightWrist',    l: 'RW', c: YELLOW },
      { k: 'leftHip',       l: 'LH', c: BLUE   },
      { k: 'rightHip',      l: 'RH', c: BLUE   },
      { k: 'leftKnee',      l: 'LK', c: RED    },
      { k: 'rightKnee',     l: 'RK', c: RED    },
    ];

    for (const { k, l, c } of pts) {
      const pt = pose[k]; if (!pt) continue;
      const conf = pt.visibility ?? 1;
      ctx.globalAlpha = Math.max(0.3, conf);

      // Outer ring
      ctx.strokeStyle = c; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2); ctx.stroke();

      // Inner dot
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();

      // Label
      ctx.globalAlpha = Math.max(0.5, conf);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(l, pt.x, pt.y - 10);
    }

    ctx.globalAlpha = 1;

    // ── Chest crosshair ───────────────────────────────────────────────────────
    if (pose.chestCenter) {
      const { x, y } = pose.chestCenter;
      ctx.strokeStyle = 'rgba(255,42,95,0.95)'; ctx.lineWidth = 2;
      const r = 10;
      ctx.beginPath();
      ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
      ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
      ctx.stroke();
      // Confidence ring around chest
      const conf = pose.confidence ?? 1;
      const ringColor = conf > 0.6 ? GREEN : conf > 0.35 ? YELLOW : RED;
      ctx.strokeStyle = ringColor; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2 * conf);
      ctx.stroke();
    }

    // ── Tracking state label ──────────────────────────────────────────────────
    const state = pose.trackingState || 'TRACKING';
    const stateColor = state === 'TRACKING' ? GREEN : state === 'TEMPORARILY_LOST' ? YELLOW : RED;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 160, 28, 6);
    ctx.fill();
    ctx.fillStyle = stateColor;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`◉ ${state}`, 16, 22);

    ctx.restore();
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  _ensureOffscreen(w, h) {
    if (!this._offscreen) {
      this._offscreen = document.createElement('canvas');
      this._offCtx    = this._offscreen.getContext('2d');
    }
    if (this._offscreen.width !== w || this._offscreen.height !== h) {
      this._offscreen.width  = w;
      this._offscreen.height = h;
    }
  }

  dispose() {
    this._offscreen = null;
    this._offCtx    = null;
    this._imageCache.clear();
  }
}
