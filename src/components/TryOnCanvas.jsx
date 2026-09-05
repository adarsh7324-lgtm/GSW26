import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { CameraManager } from '../modules/CameraManager';
import { PoseTracker } from '../modules/PoseTracker';
import { GarmentRenderer } from '../modules/GarmentRenderer';
import { GarmentManager } from '../modules/GarmentManager';
import { GarmentLibrary } from './GarmentLibrary';
import { GarmentUploader } from './GarmentUploader';
import { LayerPanel } from './LayerPanel';
import {
  X, Camera, RefreshCw, Layers, Eye, EyeOff, Loader, Upload
} from 'lucide-react';

// ─── Camera states ─────────────────────────────────────────────────────────

const CAM = {
  IDLE:       'idle',
  REQUESTING: 'requesting',
  ACTIVE:     'active',
  DENIED:     'denied',
  ERROR:      'error',
};

const MODEL = {
  IDLE:    'idle',
  LOADING: 'loading',
  READY:   'ready',
  ERROR:   'error',
};

const GLB_STATUS = {
  IDLE:    'idle',
  LOADING: 'loading',
  READY:   'ready',
  ERROR:   'error',
};

// ─── Component ─────────────────────────────────────────────────────────────

export const TryOnCanvas = () => {
  const {
    isTryOnOpen,
    closeTryOn,
    tryOnGarments,
    selectedColor,
  } = useApp();

  // DOM refs
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);   // 2D overlay canvas (skeleton, debug)
  const threeCanvasRef = useRef(null);  // Three.js canvas (3D GLB garment)
  const rafRef        = useRef(null);

  // Module singletons
  const cameraRef        = useRef(null);
  const trackerRef       = useRef(null);
  const rendererRef      = useRef(null); // 2D GarmentRenderer
  const garmentMgrRef    = useRef(null); // Three.js GarmentManager

  if (!cameraRef.current)   cameraRef.current   = new CameraManager();
  if (!trackerRef.current)  trackerRef.current   = new PoseTracker();
  if (!rendererRef.current) rendererRef.current  = new GarmentRenderer();

  // Camera state
  const [facingMode,   setFacingMode]   = useState('user');
  const [camStatus,    setCamStatus]    = useState(CAM.IDLE);
  const [camError,     setCamError]     = useState('');

  // Pose model state
  const [modelStatus,  setModelStatus]  = useState(MODEL.IDLE);

  // UI state
  const [isPoseDetected,    setIsPoseDetected]    = useState(false);
  const [isSkeletonVisible, setIsSkeletonVisible] = useState(true);
  const [isOcclusionOn,     setIsOcclusionOn]     = useState(true);
  const [isOutlineVisible,  setIsOutlineVisible]  = useState(true);
  const [isDebugVisible,    setIsDebugVisible]    = useState(false);
  const [isLayerPanelOpen,  setIsLayerPanelOpen]  = useState(false);
  const [isUploaderOpen,    setIsUploaderOpen]    = useState(false);

  // 3D garment state
  const [selectedGarment, setSelectedGarment] = useState(null); // null | 'tshirt'
  const [glbStatus,       setGlbStatus]       = useState(GLB_STATUS.IDLE);

  // Debug metrics (refs to avoid re-renders)
  const debugRef   = useRef({ fps: 0, confidence: 0, landmarks: 0, trackingState: 'SEARCHING' });
  const fpsRef     = useRef({ frames: 0, last: performance.now() });
  const poseDetRef = useRef(false);
  const [debugSnap, setDebugSnap] = useState({ fps: 0, confidence: 0, landmarks: 0, trackingState: 'SEARCHING' });

  // ── Load pose model ────────────────────────────────────────────────────

  const loadModel = useCallback(async () => {
    if (modelStatus !== MODEL.IDLE) return;
    setModelStatus(MODEL.LOADING);
    const ok = await trackerRef.current.initialize();
    setModelStatus(ok ? MODEL.READY : MODEL.ERROR);
  }, [modelStatus]);

  // ── Start camera ───────────────────────────────────────────────────────

  const startCamera = useCallback(async (mode) => {
    const m = mode ?? facingMode;
    setCamStatus(CAM.REQUESTING);
    setCamError('');
    trackerRef.current.resetSmoothing();
    garmentMgrRef.current?.reset();

    const res = await cameraRef.current.startCamera(videoRef.current, m);
    if (res.success) {
      setCamStatus(CAM.ACTIVE);
    } else {
      const name = res.error?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCamStatus(CAM.DENIED);
        setCamError('Camera access was denied. Allow camera in your browser settings and retry.');
      } else if (name === 'NotFoundError') {
        setCamStatus(CAM.ERROR);
        setCamError('No camera found on this device.');
      } else {
        setCamStatus(CAM.ERROR);
        setCamError('Could not start camera: ' + (res.error?.message ?? 'Unknown error'));
      }
    }
  }, [facingMode]);

  // ── Enable camera handler (button tap) ────────────────────────────────

  const handleEnable = useCallback(() => {
    loadModel();
    startCamera(facingMode);
  }, [loadModel, startCamera, facingMode]);

  // ── Flip camera ────────────────────────────────────────────────────────

  const handleFlip = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    await startCamera(next);
  }, [facingMode, startCamera]);

  // ── Cleanup on modal close ─────────────────────────────────────────────

  useEffect(() => {
    if (!isTryOnOpen) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      cameraRef.current.stopCamera();
      setCamStatus(CAM.IDLE);
      setIsPoseDetected(false);
      poseDetRef.current = false;
      garmentMgrRef.current?.setVisible(false);
    }
  }, [isTryOnOpen]);

  // ── Three.js GarmentManager lifecycle ─────────────────────────────────
  // Create when camera goes active, dispose on cleanup.
  // The Three.js canvas must exist (threeCanvasRef.current) at this point.

  useEffect(() => {
    if (!isTryOnOpen || camStatus !== CAM.ACTIVE || !threeCanvasRef.current) return;

    const gm = new GarmentManager(threeCanvasRef.current);
    garmentMgrRef.current = gm;
    console.log('[TryOnCanvas] GarmentManager created');

    return () => {
      console.log('[TryOnCanvas] GarmentManager disposed');
      gm.dispose();
      garmentMgrRef.current = null;
    };
  }, [isTryOnOpen, camStatus]);

  // ── GLB load / unload when selectedGarment changes ───────────────────
  // Also fires when camStatus changes (so GLB loads after GarmentManager init).

  useEffect(() => {
    const gm = garmentMgrRef.current;
    if (!gm) return;

    if (selectedGarment === 'tshirt') {
      setGlbStatus(GLB_STATUS.LOADING);
      gm.loadGarment('/models/t_shirt.glb')
        .then(() => {
          setGlbStatus(GLB_STATUS.READY);
          gm.setVisible(true);
          console.log('[TryOnCanvas] t_shirt.glb ready — garment visible');
        })
        .catch((err) => {
          console.error('[TryOnCanvas] GLB load failed:', err);
          setGlbStatus(GLB_STATUS.ERROR);
        });
    } else {
      gm.setVisible(false);
      setGlbStatus(GLB_STATUS.IDLE);
    }
  // garmentMgrRef is a ref, not state — we include camStatus so this
  // re-fires after the GarmentManager init effect has run.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGarment, camStatus, isTryOnOpen]);

  // ── Main render loop ───────────────────────────────────────────────────

  useEffect(() => {
    if (!isTryOnOpen || camStatus !== CAM.ACTIVE) return;

    const canvas   = canvasRef.current;
    const video    = videoRef.current;
    const tracker  = trackerRef.current;
    const renderer = rendererRef.current;

    // Configure 2D renderer flags
    renderer.showSkeleton        = isSkeletonVisible;
    renderer.showOcclusion       = isOcclusionOn;
    renderer.showTrackingOutline = isOutlineVisible;

    const loop = (ts) => {
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }

      // Resize 2D canvas to CSS size
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width  = cw;
        canvas.height = ch;
      }

      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, cw, ch);

      // Pose detection (existing MediaPipe system — UNTOUCHED)
      const pose = tracker.detectPose(video, cw, ch, ts);
      const detected = !!(pose?.detected);

      if (detected !== poseDetRef.current) {
        poseDetRef.current = detected;
        setIsPoseDetected(detected);
      }

      // ── Three.js GLB update (every frame, including pose-loss frames) ──
      garmentMgrRef.current?.update(pose, cw, ch);

      // ── 2D skeleton / debug overlay ───────────────────────────────────
      if (pose?.detected) {
        renderer.render(ctx, pose, tryOnGarments, selectedColor, cw, ch);
      }

      // FPS counter
      const fps = fpsRef.current;
      fps.frames++;
      const now = performance.now();
      if (now - fps.last >= 600) {
        const fpsVal = Math.round((fps.frames * 1000) / (now - fps.last));
        debugRef.current.fps           = fpsVal;
        debugRef.current.confidence    = Math.round((tracker.lastVisibility ?? 0) * 100);
        debugRef.current.landmarks     = tracker.lastLandmarkCount ?? 0;
        debugRef.current.trackingState = tracker.trackingState ?? 'SEARCHING';
        fps.frames = 0;
        fps.last = now;
        if (isDebugVisible) setDebugSnap({ ...debugRef.current });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isTryOnOpen, camStatus, tryOnGarments, selectedColor, isSkeletonVisible, isOcclusionOn, isOutlineVisible, isDebugVisible]);

  // Keep debug panel live
  useEffect(() => {
    if (isDebugVisible) setDebugSnap({ ...debugRef.current });
  }, [isDebugVisible]);

  if (!isTryOnOpen) return null;

  const isLive = camStatus === CAM.ACTIVE;

  // ── Garment selector helpers ───────────────────────────────────────────

  const toggleTshirt = () => {
    setSelectedGarment(prev => prev === 'tshirt' ? null : 'tshirt');
  };

  const glbStatusLabel = () => {
    if (selectedGarment !== 'tshirt') return null;
    if (glbStatus === GLB_STATUS.LOADING) return '⏳ Loading 3D shirt…';
    if (glbStatus === GLB_STATUS.ERROR)   return '⚠ GLB load failed';
    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="tryon-overlay-screen">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="tryon-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '7px',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', color: 'white'
          }}>V</div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white' }}>Virtual Try-On</h3>
            <span style={{ fontSize: '0.7rem', color: '#AAA' }}>
              {modelStatus === MODEL.LOADING && '⏳ Loading pose model…'}
              {modelStatus === MODEL.READY   && `${tryOnGarments.filter(g => g.visible !== false).length} layers active`}
              {modelStatus === MODEL.ERROR   && '⚠ Pose model unavailable'}
              {modelStatus === MODEL.IDLE    && 'Powered by MediaPipe'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setIsDebugVisible(v => !v)}
            style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '4px 9px',
              borderRadius: '6px', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
              background: isDebugVisible ? 'rgba(255,42,95,0.3)' : 'rgba(255,255,255,0.1)',
            }}
          >DEBUG</button>

          <button className="tryon-close-btn" onClick={closeTryOn}>
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Camera viewport ───────────────────────────────────────────── */}
      <div className="tryon-camera-viewport">

        {/* Video feed — mirrored via CSS for front camera */}
        <video
          ref={videoRef}
          playsInline muted autoPlay
          className={`tryon-video${facingMode !== 'user' ? ' rear' : ''}`}
        />

        {/* Three.js canvas — transparent, 3D GLB garment rendered here.
            Sits above video but below the 2D debug overlay. */}
        <canvas ref={threeCanvasRef} className="tryon-three-canvas" />

        {/* 2D overlay canvas — skeleton, tracking outline, debug HUD */}
        <canvas ref={canvasRef} className="tryon-canvas" />

        {/* Permission gate */}
        {camStatus === CAM.IDLE && (
          <div className="tryon-permission-gate">
            <div className="permission-icon">
              <Camera size={48} color="white" />
            </div>
            <h2 className="permission-title">Enable Camera</h2>
            <p className="permission-subtitle">
              Allow camera access to virtually try on garments in real time
              using AI-powered pose tracking.
            </p>
            <button className="permission-btn" onClick={handleEnable}>
              <Camera size={18} />
              Enable Camera
            </button>
          </div>
        )}

        {/* Requesting */}
        {camStatus === CAM.REQUESTING && (
          <div className="tryon-permission-gate">
            <Loader size={42} color="white" className="spin-icon" />
            <p className="permission-subtitle" style={{ marginTop: '16px' }}>
              Requesting camera…
            </p>
          </div>
        )}

        {/* Error / Denied */}
        {(camStatus === CAM.DENIED || camStatus === CAM.ERROR) && (
          <div className="tryon-permission-gate">
            <div className="permission-icon" style={{ background: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }}>
              <Camera size={48} color="#FCA5A5" />
            </div>
            <h2 className="permission-title" style={{ color: '#FCA5A5' }}>Camera Unavailable</h2>
            <p className="permission-subtitle">{camError}</p>
            {camStatus === CAM.ERROR && (
              <button className="permission-btn" onClick={() => startCamera(facingMode)}>
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Pose model loading pill */}
        {isLive && modelStatus === MODEL.LOADING && (
          <div className="model-loading-pill">
            <Loader size={13} className="spin-icon" />
            Loading pose model…
          </div>
        )}

        {/* GLB loading pill */}
        {isLive && glbStatusLabel() && (
          <div className="model-loading-pill" style={{ top: '54px' }}>
            <Loader size={13} className="spin-icon" />
            {glbStatusLabel()}
          </div>
        )}

        {/* Pose status badge */}
        {isLive && (
          <div className="pose-status-badge">
            <span className={`status-dot ${isPoseDetected ? 'active' : ''}`} />
            <span>{isPoseDetected ? 'Body Tracked' : 'Step into frame'}</span>
          </div>
        )}

        {/* Body alignment silhouette guide */}
        {isLive && !isPoseDetected && (
          <div className="body-guide">
            <svg viewBox="0 0 100 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="50" cy="18" rx="14" ry="17" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeDasharray="5 4" />
              <path d="M25 45 L20 120 L38 120 L50 80 L62 120 L80 120 L75 45 C70 35 30 35 25 45Z"
                stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" strokeDasharray="5 4" fill="none" />
              <path d="M25 50 L8 95 M75 50 L92 95"
                stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" strokeDasharray="5 4" />
            </svg>
          </div>
        )}

        {/* Debug HUD */}
        {isDebugVisible && isLive && (
          <div className="debug-hud">
            <div className="debug-hud-title">⬡ VybeFit Debug</div>
            <div>FPS: <b>{debugSnap.fps}</b></div>
            <div>Conf: <b>{debugSnap.confidence}%</b></div>
            <div>Landmarks: <b>{debugSnap.landmarks}</b></div>
            <div>Model: <b style={{ color: modelStatus === MODEL.READY ? '#A3E635' : '#FBBF24' }}>{modelStatus}</b></div>
            <div>State: <b style={{ color: debugSnap.trackingState === 'TRACKING' ? '#A3E635' : debugSnap.trackingState === 'TEMPORARILY_LOST' ? '#FBBF24' : '#F87171' }}>{debugSnap.trackingState ?? 'SEARCHING'}</b></div>
            <div>Layers: <b>{tryOnGarments.length}</b></div>
            <div>Occlusion: <b style={{ color: isOcclusionOn ? '#A3E635' : '#F87171' }}>{isOcclusionOn ? 'ON' : 'OFF'}</b></div>
            <div style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
              <b style={{ color: '#60A5FA' }}>3D GARMENT</b>
            </div>
            <div>Type: <b style={{ color: '#fff' }}>{selectedGarment ?? '—'}</b></div>
            <div>GLB: <b style={{
              color: glbStatus === GLB_STATUS.READY ? '#A3E635'
                   : glbStatus === GLB_STATUS.LOADING ? '#FBBF24'
                   : glbStatus === GLB_STATUS.ERROR ? '#F87171' : '#888'
            }}>{glbStatus}</b></div>
          </div>
        )}

        {/* Floating side controls */}
        {isLive && (
          <div className="tryon-floating-controls">
            <button className="control-circle-btn" onClick={handleFlip} title="Flip Camera">
              <RefreshCw size={20} />
            </button>

            <button
              className="control-circle-btn"
              onClick={() => setIsSkeletonVisible(v => !v)}
              title="Toggle Skeleton"
            >
              {isSkeletonVisible
                ? <Eye size={20} color="var(--accent)" />
                : <Eye size={20} />
              }
            </button>

            <button
              className={`control-circle-btn${isOcclusionOn ? ' occlusion-active' : ''}`}
              onClick={() => setIsOcclusionOn(v => !v)}
              title="Toggle Arm Occlusion"
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>💪</span>
            </button>

            <button
              className={`control-circle-btn${isOutlineVisible ? ' occlusion-active' : ''}`}
              onClick={() => setIsOutlineVisible(v => !v)}
              title="Toggle Tracking Outline"
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🎯</span>
            </button>

            {/* ── 3D Garment selector ─────────────────────────────────── */}
            <button
              className={`control-circle-btn${selectedGarment === 'tshirt' ? ' occlusion-active' : ''}`}
              onClick={toggleTshirt}
              title={selectedGarment === 'tshirt' ? 'Hide 3D T-Shirt' : 'Show 3D T-Shirt'}
              style={{ position: 'relative' }}
            >
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>👕</span>
              {glbStatus === GLB_STATUS.LOADING && (
                <span style={{
                  position: 'absolute', bottom: '-2px', right: '-2px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: '#FBBF24', border: '2px solid #000',
                }} />
              )}
              {glbStatus === GLB_STATUS.READY && selectedGarment === 'tshirt' && (
                <span style={{
                  position: 'absolute', bottom: '-2px', right: '-2px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: '#10B981', border: '2px solid #000',
                }} />
              )}
            </button>

            <button
              className="control-circle-btn"
              onClick={() => setIsLayerPanelOpen(true)}
              title="Layer Manager"
              style={{ position: 'relative' }}
            >
              <Layers size={20} />
              {tryOnGarments.length > 0 && (
                <span className="layer-badge">{tryOnGarments.length}</span>
              )}
            </button>

            <button
              className="control-circle-btn"
              onClick={() => setIsUploaderOpen(true)}
              title="Upload Garment"
            >
              <Upload size={20} />
            </button>
          </div>
        )}

      </div>

      {/* ── Bottom sheet — garment library ────────────────────────────── */}
      {isLive && (
        <div className="tryon-bottom-sheet">
          <div className="sheet-handle" />
          <GarmentLibrary onUploadClick={() => setIsUploaderOpen(true)} />
        </div>
      )}

      {/* ── Drawers ────────────────────────────────────────────────────── */}
      <LayerPanel
        isOpen={isLayerPanelOpen}
        onClose={() => setIsLayerPanelOpen(false)}
      />

      <GarmentUploader
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
      />
    </div>
  );
};
