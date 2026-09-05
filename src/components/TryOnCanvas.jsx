import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CameraManager } from '../modules/CameraManager';
import { PoseTracker } from '../modules/PoseTracker';
import { GarmentRenderer } from '../modules/GarmentRenderer';
import { GarmentSelector } from './GarmentSelector';
import { OutfitBuilder } from './OutfitBuilder';
import { SizeConfidence } from './SizeConfidence';
import {
  X,
  Camera,
  RefreshCw,
  Layers,
  Sparkles,
  ShoppingBag,
  Share2,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';

export const TryOnCanvas = () => {
  const {
    isTryOnOpen,
    closeTryOn,
    tryOnGarments,
    selectedSize,
    setSelectedSize,
    selectedColor,
    setSelectedColor,
    addToCart
  } = useApp();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const cameraManagerRef = useRef(new CameraManager());
  const poseTrackerRef = useRef(new PoseTracker());
  const garmentRendererRef = useRef(new GarmentRenderer());

  const [facingMode, setFacingMode] = useState('user');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isPoseDetected, setIsPoseDetected] = useState(true);
  const [isSkeletonVisible, setIsSkeletonVisible] = useState(false);
  const [isOutfitBuilderOpen, setIsOutfitBuilderOpen] = useState(false);
  const [snapshotUrl, setSnapshotUrl] = useState(null);
  const [fitPercentage, setFitPercentage] = useState(82);

  const animFrameIdRef = useRef(null);

  // Initialize camera and pose tracker
  useEffect(() => {
    if (!isTryOnOpen) return;

    let isMounted = true;

    const initTracker = async () => {
      await poseTrackerRef.current.initialize();
    };
    initTracker();

    const startWebcam = async () => {
      if (videoRef.current) {
        const res = await cameraManagerRef.current.startCamera(videoRef.current, facingMode);
        if (isMounted) {
          setIsCameraActive(res.success);
        }
      }
    };
    startWebcam();

    return () => {
      isMounted = false;
      cameraManagerRef.current.stopCamera();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isTryOnOpen, facingMode]);

  // Main 60 FPS Render Loop
  useEffect(() => {
    if (!isTryOnOpen) return;

    const renderFrame = (timestamp) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (canvas) {
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        // Detect body pose landmarks
        const pose = poseTrackerRef.current.detectPose(video, width, height, timestamp);

        if (pose && pose.detected) {
          setIsPoseDetected(true);
          // Render dynamic garment overlay layers
          garmentRendererRef.current.showSkeleton = isSkeletonVisible;
          garmentRendererRef.current.render(ctx, pose, tryOnGarments, selectedColor);

          // Calculate fit confidence based on shoulder width ratio vs selected size
          const sizeRatios = { S: 0.9, M: 1.0, L: 1.1, XL: 1.2 };
          const targetRatio = sizeRatios[selectedSize] || 1.0;
          const detectedRatio = (pose.shoulderWidth / (width * 0.35)) || 1.0;
          const delta = Math.abs(detectedRatio - targetRatio);
          const conf = Math.max(65, Math.min(98, Math.round(92 - delta * 30)));
          setFitPercentage(conf);
        } else {
          setIsPoseDetected(false);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isTryOnOpen, tryOnGarments, selectedColor, selectedSize, isSkeletonVisible]);

  const toggleCameraFacing = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
  };

  const captureSnapshot = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas) return;

    // Create temporary snapshot canvas merging camera video + garment overlay
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = canvas.width;
    snapCanvas.height = canvas.height;
    const snapCtx = snapCanvas.getContext('2d');

    if (video && video.readyState >= 2) {
      snapCtx.save();
      if (facingMode === 'user') {
        snapCtx.translate(snapCanvas.width, 0);
        snapCtx.scale(-1, 1);
      }
      snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
      snapCtx.restore();
    } else {
      snapCtx.fillStyle = '#1A1A1A';
      snapCtx.fillRect(0, 0, snapCanvas.width, snapCanvas.height);
    }

    // Draw canvas garment overlay on top
    snapCtx.drawImage(canvas, 0, 0);

    // Add VybeFit Watermark
    snapCtx.fillStyle = '#FF2A5F';
    snapCtx.font = '800 24px Outfit, sans-serif';
    snapCtx.fillText('VybeFit Virtual Try-On', 20, snapCanvas.height - 30);

    const dataUrl = snapCanvas.toDataURL('image/png');
    setSnapshotUrl(dataUrl);
  };

  if (!isTryOnOpen) return null;

  return (
    <div className="tryon-overlay-screen">
      {/* Top Header Bar */}
      <div className="tryon-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800
            }}
          >
            V
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Live Virtual Try-On</h3>
            <span style={{ fontSize: '0.7rem', color: '#DDD' }}>
              {tryOnGarments.length} Layer{tryOnGarments.length > 1 ? 's' : ''} Active
            </span>
          </div>
        </div>

        <button className="tryon-close-btn" onClick={closeTryOn}>
          <X size={20} />
        </button>
      </div>

      {/* Main Camera & Canvas Viewport */}
      <div className="tryon-camera-viewport">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`tryon-video ${facingMode}`}
        />

        {/* Dynamic Pose Canvas Layer */}
        <canvas ref={canvasRef} className="tryon-canvas" />

        {/* Pose Status Badge HUD */}
        <div className="pose-status-badge">
          <span className={`status-dot ${isPoseDetected ? 'active' : ''}`} />
          <span>{isPoseDetected ? 'Body Pose Tracked' : 'Position Yourself in Camera'}</span>
        </div>

        {/* Bounding Guide Box */}
        <div className={`pose-alignment-guide ${isPoseDetected ? 'detected' : ''}`}>
          <div className="head-target" />
        </div>

        {/* Floating Side Action Controls */}
        <div className="tryon-floating-controls">
          <button
            className="control-circle-btn"
            onClick={toggleCameraFacing}
            title="Flip Camera"
          >
            <RefreshCw size={20} />
          </button>

          <button
            className="control-circle-btn"
            onClick={() => setIsSkeletonVisible(!isSkeletonVisible)}
            title="Toggle Skeleton HUD"
          >
            {isSkeletonVisible ? <EyeOff size={20} color="var(--accent)" /> : <Eye size={20} />}
          </button>

          <button
            className="control-circle-btn"
            onClick={() => setIsOutfitBuilderOpen(true)}
            title="Manage Outfit Layers"
            style={{ position: 'relative' }}
          >
            <Layers size={20} />
            {tryOnGarments.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: 'var(--accent)',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {tryOnGarments.length}
              </span>
            )}
          </button>
        </div>

        {/* Center Shutter Snapshot Button */}
        <div className="tryon-shutter-container">
          <button
            className="shutter-btn"
            onClick={captureSnapshot}
            title="Take Photo"
          >
            <div className="shutter-inner" />
          </button>
        </div>
      </div>

      {/* Bottom Sheet Control Drawer */}
      <div className="tryon-bottom-sheet">
        <div className="sheet-handle" />

        {/* Size Confidence Gauge */}
        <SizeConfidence size={selectedSize} fitPercentage={fitPercentage} />

        {/* Size & Color Swatches inside Try-On view */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Sizes */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['S', 'M', 'L', 'XL'].map(sz => (
              <button
                key={sz}
                onClick={() => setSelectedSize(sz)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: selectedSize === sz ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.8rem'
                }}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Quick Add Outfit to Bag */}
          <button
            onClick={() => {
              tryOnGarments.forEach(g => addToCart(g));
              closeTryOn();
            }}
            style={{
              background: 'var(--accent)',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.85rem',
              padding: '10px 18px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(255,42,95,0.4)'
            }}
          >
            <ShoppingBag size={16} />
            <span>Add Bag (${tryOnGarments.reduce((s, g) => s + g.price, 0)})</span>
          </button>
        </div>

        {/* Garment Selector Carousel */}
        <GarmentSelector />
      </div>

      {/* Outfit Builder Drawer */}
      <OutfitBuilder
        isOpen={isOutfitBuilderOpen}
        onClose={() => setIsOutfitBuilderOpen(false)}
      />

      {/* Snapshot Preview Modal */}
      {snapshotUrl && (
        <div className="drawer-backdrop" style={{ zIndex: 1500 }}>
          <div
            className="drawer-content"
            style={{
              maxWidth: '420px',
              margin: 'auto',
              height: 'auto',
              borderRadius: 'var(--radius-lg)',
              background: '#1A1A1A',
              color: 'white'
            }}
          >
            <div className="drawer-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>
                Your Virtual Try-On Photo 📸
              </h3>
              <button className="tryon-close-btn" onClick={() => setSnapshotUrl(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="drawer-body" style={{ textAlign: 'center' }}>
              <img
                src={snapshotUrl}
                alt="Try-On Snapshot"
                style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.2)' }}
              />
              <p style={{ fontSize: '0.8rem', color: '#AAA', marginTop: '8px' }}>
                Fit looks great on you!
              </p>
            </div>
            <div className="drawer-footer" style={{ background: '#121212', borderColor: 'rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'transparent' }}
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = snapshotUrl;
                  a.download = 'vybefit-tryon.png';
                  a.click();
                }}
              >
                Save Image
              </button>
              <button
                className="btn-accent"
                onClick={() => {
                  tryOnGarments.forEach(g => addToCart(g));
                  setSnapshotUrl(null);
                  closeTryOn();
                }}
              >
                Add Outfit to Bag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
