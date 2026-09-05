import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * PoseTracker — wraps MediaPipe PoseLandmarker.
 *
 * Landmark indices (MediaPipe Pose 33-point model):
 *   0:  nose
 *   11: left shoulder,  12: right shoulder
 *   13: left elbow,     14: right elbow
 *   15: left wrist,     16: right wrist
 *   23: left hip,       24: right hip
 *   25: left knee,      26: right knee
 *   27: left ankle,     28: right ankle
 *
 * Coordinates from MediaPipe are NORMALIZED (0–1).
 * We flip X for front-camera mirror, then map to canvas pixels
 * accounting for object-fit: cover cropping.
 *
 * Tracking State Machine:
 *   SEARCHING         → waiting for initial pose lock
 *   TRACKING          → pose detected with sufficient confidence
 *   TEMPORARILY_LOST  → pose lost briefly; hold last known position
 *   LOST              → pose lost too long; stop rendering garment
 */
export class PoseTracker {
  constructor() {
    this.landmarker = null;
    this.isReady    = false;
    this.isLoading  = false;
    this.loadError  = null;

    // ── Smoothing ──────────────────────────────────────────────────────────
    this.smoothLandmarks  = null;
    this.prevLandmarks    = null;  // One frame back, for velocity calc
    this.baseSmoothAlpha  = 0.35;  // Default EMA alpha (0=freeze, 1=raw)

    // ── Tracking state ─────────────────────────────────────────────────────
    this.trackingState   = 'SEARCHING';   // 'SEARCHING' | 'TRACKING' | 'TEMPORARILY_LOST' | 'LOST'
    this.lastValidPose   = null;
    this.lastValidTs     = 0;
    this.poseHoldMs      = 600;          // How long to hold pose before LOST
    this.confidenceThreshold = 0.25;

    // ── Metrics for debug HUD ──────────────────────────────────────────────
    this.lastVisibility    = 0;
    this.lastLandmarkCount = 0;
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async initialize() {
    if (this.isLoading || this.isReady) return this.isReady;
    this.isLoading = true;
    this.loadError = null;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      this.landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence:  0.45,
        minTrackingConfidence:      0.45,
      });
      this.isReady   = true;
      this.isLoading = false;
      console.log('[PoseTracker] MediaPipe initialized ✓');
      return true;
    } catch (err) {
      this.loadError = err?.message || 'Unknown error';
      this.isLoading = false;
      console.error('[PoseTracker] Failed to initialize MediaPipe:', err);
      return false;
    }
  }

  /**
   * Run pose detection on a video frame.
   * Returns a pose metrics object, or null if tracking is lost/unavailable.
   */
  detectPose(videoElement, canvasWidth, canvasHeight, timestamp = performance.now()) {
    if (
      !this.isReady ||
      !this.landmarker ||
      !videoElement ||
      videoElement.readyState < 2 ||
      videoElement.videoWidth === 0
    ) return null;

    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;

    let rawLandmarks = null;
    try {
      const results = this.landmarker.detectForVideo(videoElement, timestamp);
      if (results?.landmarks?.length > 0) {
        rawLandmarks = results.landmarks[0];
      }
    } catch {
      // Frame glitch — fall through to pose hold
    }

    if (!rawLandmarks || rawLandmarks.length < 29) {
      return this._handlePoseLoss(timestamp);
    }

    const pose = this._toLandmarkObject(rawLandmarks, canvasWidth, canvasHeight, vw, vh);

    if (pose.confidence < this.confidenceThreshold) {
      return this._handlePoseLoss(timestamp);
    }

    // ── Outlier rejection: ignore single-frame jumps > 28% of screen width ──
    if (this.lastValidPose) {
      const jump = Math.hypot(
        pose.leftShoulder.x - this.lastValidPose.leftShoulder.x,
        pose.leftShoulder.y - this.lastValidPose.leftShoulder.y
      );
      if (jump > canvasWidth * 0.28) {
        return this._handlePoseLoss(timestamp);
      }
    }

    // ── Velocity-aware EMA smoothing ──────────────────────────────────────────
    const smoothed = this._applySmoothing(pose);

    // ── Update state ──────────────────────────────────────────────────────────
    this.lastValidPose = { ...smoothed };
    this.lastValidTs   = timestamp;
    this._setState('TRACKING');

    return this._computeMetrics(smoothed);
  }

  resetSmoothing() {
    this.smoothLandmarks = null;
    this.prevLandmarks   = null;
    this.lastValidPose   = null;
    this._setState('SEARCHING');
  }

  destroy() {
    this.landmarker      = null;
    this.isReady         = false;
    this.smoothLandmarks = null;
    this.prevLandmarks   = null;
  }

  // ─── State machine ────────────────────────────────────────────────────────

  _setState(s) {
    if (this.trackingState !== s) this.trackingState = s;
  }

  _handlePoseLoss(timestamp) {
    const elapsed = timestamp - this.lastValidTs;

    if (this.lastValidPose && elapsed < this.poseHoldMs) {
      this._setState('TEMPORARILY_LOST');
      return this._computeMetrics(this.lastValidPose);
    }

    // Truly lost
    this._setState(this.lastValidPose ? 'LOST' : 'SEARCHING');
    if (elapsed > this.poseHoldMs * 3) {
      // After a long loss, reset smoothing so we don't jump when re-detected
      this.smoothLandmarks = null;
      this.prevLandmarks   = null;
      this.lastValidPose   = null;
    }
    return null;
  }

  // ─── Coordinate conversion ────────────────────────────────────────────────

  /**
   * Convert raw normalized MediaPipe landmarks → canvas-pixel coordinates.
   * Accounts for CSS object-fit: cover cropping of the video element.
   * X is mirrored for front-camera selfie mode.
   */
  _toLandmarkObject(raw, cw, ch, vw, vh) {
    // Compute the visible crop window of the video (object-fit: cover)
    const canvasRatio = cw / ch;
    const videoRatio  = vw / vh;
    let renderW, renderH, offsetX, offsetY;

    if (canvasRatio > videoRatio) {
      // Canvas is wider → video fills width, top/bottom are cropped
      renderW = cw;
      renderH = cw / videoRatio;
      offsetX = 0;
      offsetY = (ch - renderH) / 2;
    } else {
      // Canvas is taller → video fills height, sides are cropped
      renderH = ch;
      renderW = ch * videoRatio;
      offsetX = (cw - renderW) / 2;
      offsetY = 0;
    }

    const pt = (idx) => {
      const lm = raw[idx];
      return {
        x:          offsetX + (1 - lm.x) * renderW,  // Mirror X for selfie camera
        y:          offsetY + lm.y * renderH,
        z:          lm.z,
        visibility: lm.visibility ?? 1,
      };
    };

    const ls = pt(11);  const rs = pt(12);
    const le = pt(13);  const re = pt(14);
    const lw = pt(15);  const rw = pt(16);
    const lh = pt(23);  const rh = pt(24);
    const lk = pt(25);  const rk = pt(26);
    const la = raw.length > 27 ? pt(27) : null;
    const ra = raw.length > 28 ? pt(28) : null;

    // Confidence = average shoulder visibility (hips often out of frame)
    const confidence = (ls.visibility + rs.visibility) / 2;
    this.lastVisibility    = confidence;
    this.lastLandmarkCount = raw.length;

    return {
      detected: true, confidence,
      leftShoulder: ls, rightShoulder: rs,
      leftElbow: le,    rightElbow: re,
      leftWrist: lw,    rightWrist: rw,
      leftHip: lh,      rightHip: rh,
      leftKnee: lk,     rightKnee: rk,
      leftAnkle: la,    rightAnkle: ra,
    };
  }

  // ─── Velocity-aware EMA smoothing ────────────────────────────────────────

  _applySmoothing(current) {
    if (!this.smoothLandmarks) {
      this.smoothLandmarks = current;
      this.prevLandmarks   = current;
      return { ...current };
    }

    // Compute inter-frame velocity from shoulders (px/frame)
    const vel = Math.hypot(
      current.leftShoulder.x - this.smoothLandmarks.leftShoulder.x,
      current.leftShoulder.y - this.smoothLandmarks.leftShoulder.y
    );

    // Adaptive alpha: high velocity → less smoothing (more responsive)
    // vel ≈ 0px  → alpha=0.15 (very smooth, stable)
    // vel ≈ 15px → alpha=0.40 (balanced)
    // vel ≈ 40px → alpha=0.75 (snappy, follows fast movement)
    const alpha = Math.min(0.80, Math.max(0.15, vel / 50));

    const smoothPt = (curr, prev) => {
      if (!curr || !prev) return curr;
      return {
        x:          prev.x + (curr.x - prev.x) * alpha,
        y:          prev.y + (curr.y - prev.y) * alpha,
        z:          curr.z,
        visibility: curr.visibility,
      };
    };

    const keys = [
      'leftShoulder', 'rightShoulder',
      'leftElbow',    'rightElbow',
      'leftWrist',    'rightWrist',
      'leftHip',      'rightHip',
      'leftKnee',     'rightKnee',
      'leftAnkle',    'rightAnkle',
    ];

    this.prevLandmarks = { ...this.smoothLandmarks };
    const smoothed = { detected: true, confidence: current.confidence };
    for (const key of keys) {
      smoothed[key] = smoothPt(current[key], this.smoothLandmarks[key]);
    }

    this.smoothLandmarks = smoothed;
    return smoothed;
  }

  // ─── Derived metrics ──────────────────────────────────────────────────────

  _computeMetrics(lm) {
    const ls = lm.leftShoulder,  rs = lm.rightShoulder;
    const lh = lm.leftHip,       rh = lm.rightHip;

    const shoulderWidth = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    const hipWidth      = Math.hypot(rh.x - lh.x, rh.y - lh.y);
    const chestCenter   = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
    const hipCenter     = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
    const torsoHeight   = Math.hypot(hipCenter.x - chestCenter.x, hipCenter.y - chestCenter.y);
    const torsoAngle    = Math.atan2(rs.y - ls.y, rs.x - ls.x);

    // Clamp torso height to prevent extreme stretching (e.g. user leaning into camera)
    const maxTorsoRatio = 1.8, minTorsoRatio = 0.9;
    const ratio = torsoHeight / shoulderWidth;
    const clampedTorsoH = shoulderWidth * Math.min(maxTorsoRatio, Math.max(minTorsoRatio, ratio));

    return {
      ...lm,
      trackingState: this.trackingState,
      shoulderWidth,
      hipWidth,
      chestCenter,
      hipCenter,
      torsoHeight:  clampedTorsoH,
      torsoAngle,
    };
  }
}
