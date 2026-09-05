export class GarmentRenderer {
  constructor() {
    this.showSkeleton = false;
  }

  render(ctx, pose, activeGarments = [], selectedColor = null) {
    if (!ctx || !pose || !pose.detected) return;

    const { chestCenter, hipCenter, shoulderWidth, hipWidth, torsoHeight, torsoAngle } = pose;

    // Draw active garment layers ordered from base to outerwear
    const layers = this.sortLayers(activeGarments);

    layers.forEach(item => {
      ctx.save();
      const color = selectedColor || item.overlayColor || '#1A1A1A';

      if (item.overlayType === 'top' || item.overlayType === 'hoodie') {
        this.renderTop(ctx, chestCenter, shoulderWidth, torsoHeight, torsoAngle, color, item);
      } else if (item.overlayType === 'outerwear') {
        this.renderOuterwear(ctx, chestCenter, shoulderWidth, torsoHeight, torsoAngle, color, item);
      } else if (item.overlayType === 'dress') {
        this.renderDress(ctx, chestCenter, shoulderWidth, torsoHeight, torsoAngle, color, item);
      } else if (item.overlayType === 'bottom') {
        this.renderBottom(ctx, hipCenter, hipWidth || shoulderWidth * 0.85, torsoHeight, torsoAngle, color, item);
      }
      ctx.restore();
    });

    // Optionally render tracking landmarks HUD overlay
    if (this.showSkeleton) {
      this.renderSkeleton(ctx, pose);
    }
  }

  sortLayers(garments) {
    const order = { bottom: 1, top: 2, dress: 2, outerwear: 3 };
    return [...garments].sort((a, b) => (order[a.overlayType] || 2) - (order[b.overlayType] || 2));
  }

  renderTop(ctx, center, shoulderW, torsoH, angle, color, item) {
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);

    const asset = item.garmentAsset || {};
    const w = shoulderWidthMultiplier(shoulderW, asset.shoulderWidth || 1.15);
    const h = torsoH * (asset.length || 1.15);
    const neckW = w * (asset.neckWidth || 0.35);

    // Drop shadow under garment
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    // Garment Body Silhouette Path
    ctx.beginPath();
    // Neckline left
    ctx.moveTo(-neckW / 2, -h * 0.22);
    // Crewneck curve
    ctx.quadraticCurveTo(0, -h * 0.12, neckW / 2, -h * 0.22);
    // Right shoulder seam
    ctx.lineTo(w / 2, -h * 0.18);
    // Right sleeve outer
    ctx.lineTo(w * 0.72, h * 0.18);
    // Right sleeve inner armpit
    ctx.lineTo(w * 0.46, h * 0.22);
    // Right side body
    ctx.lineTo(w * 0.44, h * 0.75);
    // Bottom hem curve
    ctx.quadraticCurveTo(0, h * 0.78, -w * 0.44, h * 0.75);
    // Left side body
    ctx.lineTo(-w * 0.46, h * 0.22);
    // Left sleeve inner armpit
    ctx.lineTo(-w * 0.72, h * 0.18);
    // Left shoulder seam
    ctx.lineTo(-w / 2, -h * 0.18);
    ctx.closePath();

    // Fabric Fill Gradient
    const grad = ctx.createLinearGradient(-w / 2, -h * 0.2, w / 2, h * 0.8);
    grad.addColorStop(0, adjustColor(color, 20));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, adjustColor(color, -25));
    ctx.fillStyle = grad;
    ctx.fill();

    // Collar detail
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3;
    ctx.strokeStyle = adjustColor(color, -40);
    ctx.stroke();

    // Neck ribbing line
    ctx.beginPath();
    ctx.arc(0, -h * 0.22, neckW / 2, 0, Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Brand Logo / Graphic Print on chest
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `800 ${Math.max(12, Math.round(w * 0.08))}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.brand || 'VYBE', 0, h * 0.15);
  }

  renderOuterwear(ctx, center, shoulderW, torsoH, angle, color, item) {
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);

    const w = shoulderW * 1.28;
    const h = torsoH * 1.22;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 20;

    // Jacket outline
    ctx.beginPath();
    ctx.moveTo(-w * 0.2, -h * 0.24);
    ctx.lineTo(0, -h * 0.08); // V-neck lapel center
    ctx.lineTo(w * 0.2, -h * 0.24);
    ctx.lineTo(w * 0.52, -h * 0.18);
    ctx.lineTo(w * 0.78, h * 0.45); // Right sleeve tip
    ctx.lineTo(w * 0.52, h * 0.48);
    ctx.lineTo(w * 0.48, h * 0.82);
    ctx.lineTo(0, h * 0.84); // Bottom jacket center zipper split
    ctx.lineTo(-w * 0.48, h * 0.82);
    ctx.lineTo(-w * 0.52, h * 0.48);
    ctx.lineTo(-w * 0.78, h * 0.45);
    ctx.lineTo(-w * 0.52, -h * 0.18);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, adjustColor(color, 25));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3;
    ctx.strokeStyle = adjustColor(color, -50);
    ctx.stroke();

    // Center Front Zipper Line
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.08);
    ctx.lineTo(0, h * 0.84);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#D4AF37'; // Brass zipper accent
    ctx.stroke();

    // Flap Chest Pockets
    const pocketW = w * 0.16;
    const pocketH = h * 0.14;
    ctx.fillStyle = adjustColor(color, -20);
    ctx.fillRect(-w * 0.3, h * 0.05, pocketW, pocketH);
    ctx.fillRect(w * 0.3 - pocketW, h * 0.05, pocketW, pocketH);
  }

  renderDress(ctx, center, shoulderW, torsoH, angle, color, item) {
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);

    const w = shoulderW * 1.05;
    const h = torsoH * 2.3;

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 18;

    ctx.beginPath();
    // Spaghetti straps
    ctx.moveTo(-w * 0.25, -h * 0.15);
    ctx.lineTo(-w * 0.35, -h * 0.05);
    ctx.lineTo(-w * 0.4, h * 0.2); // Waist flare
    ctx.lineTo(-w * 0.75, h * 0.95); // Hem left flare
    ctx.quadraticCurveTo(0, h, w * 0.75, h * 0.95); // Bottom hem
    ctx.lineTo(w * 0.4, h * 0.2);
    ctx.lineTo(w * 0.35, -h * 0.05);
    ctx.lineTo(w * 0.25, -h * 0.15);
    ctx.quadraticCurveTo(0, -h * 0.08, -w * 0.25, -h * 0.15);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, -h * 0.1, 0, h);
    grad.addColorStop(0, adjustColor(color, 30));
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, adjustColor(color, -30));
    ctx.fillStyle = grad;
    ctx.fill();
  }

  renderBottom(ctx, hipCenter, hipW, torsoH, angle, color, item) {
    ctx.translate(hipCenter.x, hipCenter.y);
    ctx.rotate(angle);

    const w = hipW * 1.15;
    const legLen = torsoH * 2.1;

    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 14;

    ctx.beginPath();
    // Waistband
    ctx.moveTo(-w * 0.5, 0);
    ctx.lineTo(w * 0.5, 0);
    // Right outer leg down
    ctx.lineTo(w * 0.55, legLen);
    // Right inner leg
    ctx.lineTo(w * 0.08, legLen);
    // Crotch junction
    ctx.lineTo(0, legLen * 0.32);
    // Left inner leg
    ctx.lineTo(-w * 0.08, legLen);
    // Left outer leg bottom
    ctx.lineTo(-w * 0.55, legLen);
    ctx.closePath();

    const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, legLen);
    grad.addColorStop(0, color);
    grad.addColorStop(0.5, adjustColor(color, 20));
    grad.addColorStop(1, adjustColor(color, -20));
    ctx.fillStyle = grad;
    ctx.fill();

    // Seam stitching & pockets
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.stroke();

    // Fly seam line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, legLen * 0.28);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  renderSkeleton(ctx, pose) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#10B981';
    ctx.fillStyle = '#10B981';

    const pts = [
      pose.leftShoulder, pose.rightShoulder,
      pose.leftHip, pose.rightHip,
      pose.leftElbow, pose.rightElbow,
      pose.leftWrist, pose.rightWrist
    ];

    pts.forEach(p => {
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Bone lines
    if (pose.leftShoulder && pose.rightShoulder) {
      ctx.beginPath();
      ctx.moveTo(pose.leftShoulder.x, pose.leftShoulder.y);
      ctx.lineTo(pose.rightShoulder.x, pose.rightShoulder.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function shoulderWidthMultiplier(baseW, mult) {
  return baseW * mult;
}

function adjustColor(hex, amt) {
  let usePound = false;
  if (hex[0] === '#') {
    hex = hex.slice(1);
    usePound = true;
  }
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  let num = parseInt(hex, 16);
  if (isNaN(num)) return '#1A1A1A';
  let r = (num >> 16) + amt;
  if (r > 255) r = 255; else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255; else if (b < 0) b = 0;
  let g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255; else if (g < 0) g = 0;
  return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}
