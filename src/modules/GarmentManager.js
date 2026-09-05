import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * GarmentManager
 *
 * Owns the Three.js scene, camera, renderer, and the loaded GLB garment.
 * Is completely decoupled from the 2D canvas / GarmentRenderer pipeline.
 *
 * Architecture:
 *   scene
 *    ├── lights
 *    └── garmentRoot        ← pose transform (position, rotation.z, scale)
 *          └── _modelFix    ← corrective rotation for GLB orientation
 *                └── GLB scene
 *
 * Coordinate system:
 *   MediaPipe produces canvas-pixel landmarks (already mirrored + cover-cropped).
 *   We convert to Three.js world space via an OrthographicCamera whose frustum
 *   matches the canvas aspect ratio:
 *     worldX = ((px / cw) * 2 - 1) * aspect
 *     worldY = -((py / ch) * 2 - 1)
 *
 * The camera is at z=10 looking toward z=0. The GLB sits at z=0.
 */
export class GarmentManager {
  constructor(canvas) {
    this._canvas = canvas;

    // ── Three.js renderer ─────────────────────────────────────────────────
    this._renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,          // transparent background — video shows through
      antialias: true,
      powerPreference: 'high-performance',
    });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.setClearColor(0x000000, 0);
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;

    // ── Scene ─────────────────────────────────────────────────────────────
    this._scene = new THREE.Scene();

    // ── OrthographicCamera — sized per-frame to canvas aspect ─────────────
    // Frustum: left=-aspect, right=+aspect, top=+1, bottom=-1
    // This makes pixel-to-world conversion a simple linear mapping.
    this._camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this._camera.position.z = 10;

    // ── Lights ────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 1.8);
    const key     = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(1.5, 3, 5);
    const fill    = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-2, -1, 3);
    this._scene.add(ambient, key, fill);

    // ── Garment hierarchy ─────────────────────────────────────────────────
    this._garmentRoot = new THREE.Group();
    this._modelFix    = new THREE.Group(); // corrective rotation lives here
    this._garmentRoot.add(this._modelFix);
    this._scene.add(this._garmentRoot);
    this._garmentRoot.visible = false;

    // ── Canonical sizing (populated after GLB load) ───────────────────────
    this._canonicalW = 1;   // bounding-box X width of loaded model
    this._canonicalH = 1;   // bounding-box Y height of loaded model
    this._loaded     = false;

    // ── Smoothed transform (pre-allocated — no per-frame GC) ─────────────
    this._smoothPos   = new THREE.Vector3();
    this._smoothRotZ  = 0;
    this._smoothScale = 0.001;
    this._targetPos   = new THREE.Vector3(); // reused each frame
    this._hasSnapped  = false;

    // Smoothing factors — tunable
    this.alphaPos   = 0.20;
    this.alphaRot   = 0.18;
    this.alphaScale = 0.20;

    // ── Landmark-loss tracking ────────────────────────────────────────────
    this._frameCount     = 0;
    this._lastValidFrame = -9999;
    this._lossFrameLimit = 45;  // hide after N consecutive frames with no pose

    // ── Visibility intent ─────────────────────────────────────────────────
    this._wantVisible = false;

    // ── Debug mode ────────────────────────────────────────────────────────
    this._debugMode = false;

    // ── Last known canvas size (for resize detection) ─────────────────────
    this._lastCw = 0;
    this._lastCh = 0;

    this._loader = new GLTFLoader();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Load and inspect a GLB garment.
   * @param {string} url  e.g. '/models/t_shirt.glb'
   * @returns {Promise<GLTF>}
   */
  async loadGarment(url) {
    this._loaded = false;
    this._modelFix.clear();
    this._garmentRoot.visible = false;
    this._hasSnapped = false;

    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => {
          try {
            this._onLoaded(gltf, url);
            resolve(gltf);
          } catch (e) {
            reject(e);
          }
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            const pct = Math.round((xhr.loaded / xhr.total) * 100);
            console.log(`[GarmentManager] Loading ${pct}%`);
          }
        },
        (err) => {
          console.error('[GarmentManager] Load error:', err);
          reject(err);
        }
      );
    });
  }

  /**
   * Call every animation frame.
   * @param {Object|null} pose  - PoseTracker output (canvas-pixel space)
   * @param {number}      cw    - canvas width  in pixels
   * @param {number}      ch    - canvas height in pixels
   */
  update(pose, cw, ch) {
    this._frameCount++;
    if (!this._loaded || cw <= 0 || ch <= 0) return;

    // Keep renderer / camera in sync with canvas dimensions
    this._syncCamera(cw, ch);

    const aspect = cw / ch;

    // ── Handle pose loss ─────────────────────────────────────────────────
    if (!pose || !pose.detected) {
      const framesLost = this._frameCount - this._lastValidFrame;
      if (framesLost > this._lossFrameLimit) {
        this._garmentRoot.visible = false;
        this._hasSnapped = false;
      }
      this._renderer.render(this._scene, this._camera);
      return;
    }

    this._lastValidFrame = this._frameCount;

    // ── Convert canvas-pixel landmarks → Three.js world coordinates ───────
    //    worldX = ((px/cw)*2 - 1) * aspect   maps [0,cw] → [-aspect,+aspect]
    //    worldY = -(py/ch)*2 + 1              maps [0,ch] → [+1,-1]  (Y-flip)
    const px2w = (pt) => ({
      x: ((pt.x / cw) * 2 - 1) * aspect,
      y: -((pt.y / ch) * 2 - 1),
    });

    const ls = px2w(pose.leftShoulder);
    const rs = px2w(pose.rightShoulder);
    const lh = px2w(pose.leftHip);
    const rh = px2w(pose.rightHip);

    const shoulderMid = { x: (ls.x + rs.x) * 0.5, y: (ls.y + rs.y) * 0.5 };
    const hipMid      = { x: (lh.x + rh.x) * 0.5, y: (lh.y + rh.y) * 0.5 };

    // World-space shoulder width
    const worldShoulderW = Math.hypot(rs.x - ls.x, rs.y - ls.y);

    // ── Compute target scale ──────────────────────────────────────────────
    // Scale so garment's canonical width = shoulder span × width factor
    const WIDTH_FACTOR  = 1.22;  // garment slightly wider than shoulder span
    const targetScale   = (worldShoulderW * WIDTH_FACTOR) / this._canonicalW;

    // ── Compute target position ───────────────────────────────────────────
    // Place garmentRoot so the TOP of the model's bounding box aligns with
    // the shoulder line (collar at shoulder level).
    //   top-of-model in world = garmentRoot.y + (canonicalH/2) * scale
    //   we want this ≈ shoulderMid.y
    //   → garmentRoot.y = shoulderMid.y - (canonicalH/2) * targetScale
    const halfModelH = (this._canonicalH * 0.5) * targetScale;
    this._targetPos.set(
      shoulderMid.x,                     // horizontally centered on shoulder mid
      shoulderMid.y - halfModelH,        // top of shirt at shoulder line
      0
    );

    // ── Rotation ─────────────────────────────────────────────────────────
    // torsoAngle is atan2(rs.y_canvas - ls.y_canvas, rs.x_canvas - ls.x_canvas)
    // In world space (Y-up), we negate it because canvas Y goes down.
    const targetRotZ = -pose.torsoAngle;

    // ── Smooth ───────────────────────────────────────────────────────────
    if (!this._hasSnapped) {
      // First detection: snap immediately (no lerp)
      this._smoothPos.copy(this._targetPos);
      this._smoothRotZ  = targetRotZ;
      this._smoothScale = targetScale;
      this._hasSnapped  = true;
    } else {
      this._smoothPos.lerp(this._targetPos, this.alphaPos);
      // Simple angle lerp (avoids sign-flip for small shoulder tilts)
      this._smoothRotZ  += (targetRotZ - this._smoothRotZ) * this.alphaRot;
      this._smoothScale += (targetScale - this._smoothScale) * this.alphaScale;
    }

    // ── Apply to garmentRoot ──────────────────────────────────────────────
    this._garmentRoot.position.copy(this._smoothPos);
    this._garmentRoot.rotation.z = this._smoothRotZ;
    const s = Math.max(1e-4, this._smoothScale);
    this._garmentRoot.scale.set(s, s, s);
    this._garmentRoot.visible = this._wantVisible;

    // ── Render ───────────────────────────────────────────────────────────
    this._renderer.render(this._scene, this._camera);
  }

  /** Show or hide the garment. Hiding resets the smoothing state. */
  setVisible(v) {
    this._wantVisible = v;
    if (!v) {
      this._garmentRoot.visible = false;
      this._hasSnapped = false;
    }
  }

  /** Toggle garment debug mode (bounding box helper, axes, etc.). */
  setDebugMode(v) {
    this._debugMode = v;

    // Remove existing helpers
    this._garmentRoot.children
      .filter(c => c.isHelper || c.userData.debugHelper)
      .forEach(h => this._garmentRoot.remove(h));

    if (v && this._loaded) {
      const helper = new THREE.BoxHelper(this._modelFix, 0x00ff88);
      helper.userData.debugHelper = true;
      this._garmentRoot.add(helper);
    }
  }

  /** Force-reset smoothing (call after camera flip, etc.). */
  reset() {
    this._hasSnapped = false;
    this._garmentRoot.visible = false;
    this._lastValidFrame = -9999;
  }

  dispose() {
    this._modelFix.clear();
    this._garmentRoot.clear();
    this._scene.clear();
    this._renderer.dispose();
    this._loaded = false;
    this._hasSnapped = false;
  }

  // ─── Accessors ────────────────────────────────────────────────────────────

  get isLoaded() { return this._loaded; }
  get smoothScale() { return this._smoothScale; }

  // ─── Internal ─────────────────────────────────────────────────────────────

  _onLoaded(gltf, url) {
    const model = gltf.scene;

    // ── Inspect ──────────────────────────────────────────────────────────
    const box    = new THREE.Box3().setFromObject(model);
    const size   = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    console.group('%c[GarmentManager] GLB Inspection', 'color:#10B981;font-weight:bold');
    console.log('URL            :', url);
    console.log('Bounding size  : W=%s H=%s D=%s',
      size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3));
    console.log('Bounding center: x=%s y=%s z=%s',
      center.x.toFixed(3), center.y.toFixed(3), center.z.toFixed(3));

    // Bones
    const boneNames = [];
    model.traverse(o => { if (o.isBone) boneNames.push(o.name || '(unnamed)'); });
    console.log('Armature/Bones :', boneNames.length > 0 ? boneNames.join(', ') : 'None');

    // Meshes
    model.traverse(o => {
      if (o.isMesh) {
        console.log(
          'Mesh: %-20s | material: %-20s | verts: %d | uvs: %s',
          o.name || '(unnamed)',
          o.material?.type ?? '?',
          o.geometry?.attributes?.position?.count ?? 0,
          o.geometry?.attributes?.uv ? 'YES' : 'NO'
        );
        // Make sure the material renders on both sides (common GLB issue)
        if (o.material) {
          o.material.side = THREE.FrontSide;
          o.material.needsUpdate = true;
        }
      }
    });

    // Animations
    console.log('Animations     :',
      gltf.animations.length > 0
        ? gltf.animations.map(a => a.name || '(unnamed)').join(', ')
        : 'None');
    console.groupEnd();

    // ── Center model at origin ────────────────────────────────────────────
    // Shift so the bounding box center is exactly at (0, 0, 0)
    model.position.sub(center);

    // ── Orientation check ─────────────────────────────────────────────────
    // Standard GLB convention: Y=up, Z=toward camera (+Z = front).
    // If the model appears backward, uncomment:
    //   this._modelFix.rotation.y = Math.PI;
    // If it appears lying flat (Z as height), uncomment:
    //   this._modelFix.rotation.x = -Math.PI / 2;
    // We start with no correction and log what we find.
    const dominant = size.x >= size.y && size.x >= size.z ? 'X'
                   : size.y >= size.x && size.y >= size.z ? 'Y' : 'Z';
    console.log('[GarmentManager] Dominant axis (widest):', dominant,
      '— expected X for a front-facing shirt (width > height > depth)');

    if (size.z > size.y) {
      // Model appears to be lying flat — rotate so Z becomes Y
      console.warn('[GarmentManager] Model appears flat (Z > Y). Rotating -90° around X.');
      this._modelFix.rotation.x = -Math.PI / 2;
    }

    // ── Store canonical size ──────────────────────────────────────────────
    // After any corrective rotation, we need the world-space bounding box.
    // We recalculate it on the _modelFix group after adding the model.
    this._modelFix.clear();
    this._modelFix.add(model);

    // Recompute bounding box post-correction
    const boxFixed = new THREE.Box3().setFromObject(this._modelFix);
    const sizeFixed = new THREE.Vector3();
    boxFixed.getSize(sizeFixed);

    this._canonicalW = sizeFixed.x;  // shoulder span
    this._canonicalH = sizeFixed.y;  // garment height

    console.log('[GarmentManager] Canonical W (X):', this._canonicalW.toFixed(3),
      '| H (Y):', this._canonicalH.toFixed(3));

    this._loaded = true;
  }

  _syncCamera(cw, ch) {
    // Only update if dimensions changed
    if (cw === this._lastCw && ch === this._lastCh) return;
    this._lastCw = cw;
    this._lastCh = ch;

    this._renderer.setSize(cw, ch, false); // false = don't set CSS size

    const aspect = cw / ch;
    this._camera.left   = -aspect;
    this._camera.right  =  aspect;
    this._camera.top    =  1;
    this._camera.bottom = -1;
    this._camera.updateProjectionMatrix();
  }
}
