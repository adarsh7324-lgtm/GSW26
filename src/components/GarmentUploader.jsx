import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { removeBackground } from '../lib/backgroundRemoval';
import { GARMENT_TEMPLATES } from '../lib/garmentTemplates';
import { Upload, X, Loader, Check, Camera, Image } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { id: 'tshirt',   label: 'T-Shirt',           icon: '👕' },
  { id: 'oversized',label: 'Oversized Tee',      icon: '🧣' },
  { id: 'shirt',    label: 'Shirt',              icon: '👔' },
  { id: 'hoodie',   label: 'Hoodie',             icon: '🧥' },
  { id: 'jacket',   label: 'Jacket / Outerwear', icon: '🥼' },
];

const UPLOAD_STATE = {
  IDLE:       'idle',
  PREVIEW:    'preview',   // image selected, waiting for user to pick category
  PROCESSING: 'processing', // running bg removal
  DONE:       'done',
};

/**
 * GarmentUploader — full upload flow.
 *
 * Steps:
 *  1. Choose image file
 *  2. Preview image
 *  3. Pick garment category
 *  4. Click "Add to Try-On" → runs background removal → adds to outfit
 */
export const GarmentUploader = ({ isOpen, onClose }) => {
  const { addUploadedGarment } = useApp();

  const [uploadState, setUploadState] = useState(UPLOAD_STATE.IDLE);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('tshirt');
  const [garmentName, setGarmentName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [processingProgress, setProcessingProgress] = useState('');

  const fileInputRef = useRef(null);

  const handleFilePick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File too large (max 15 MB).');
      return;
    }
    setErrorMessage('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setGarmentName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    setUploadState(UPLOAD_STATE.PREVIEW);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Simulate file input change
      const ev = { target: { files: [file] } };
      handleFilePick(ev);
    }
  }, [handleFilePick]);

  const handleAddToTryOn = useCallback(async () => {
    if (!selectedFile) return;
    setUploadState(UPLOAD_STATE.PROCESSING);
    setProcessingProgress('Removing background…');
    setErrorMessage('');

    try {
      const processedCanvas = await removeBackground(selectedFile, {
        tolerance: 55,
        feather: true,
      });

      setProcessingProgress('Adding to outfit…');

      const id = `upload-${Date.now()}`;
      const template = GARMENT_TEMPLATES[selectedCategory];

      await addUploadedGarment({
        id,
        name: garmentName || 'My Garment',
        brand: 'Uploaded',
        price: 0,
        templateId: selectedCategory,
        overlayType: _templateToOverlayType(selectedCategory),
        overlayColor: '#333333',
        garmentCanvas: processedCanvas,
        visible: true,
        opacity: 1,
        garmentAsset: {
          shoulderWidth: template?.widthScale || 1.25,
          length: template?.heightRatio || 1.40,
        },
        image: previewUrl,
        sizes: ['S', 'M', 'L', 'XL'],
      });

      setUploadState(UPLOAD_STATE.DONE);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err) {
      console.error('[GarmentUploader]', err);
      setErrorMessage('Background removal failed. Try a photo with a plain background.');
      setUploadState(UPLOAD_STATE.PREVIEW);
    }
  }, [selectedFile, selectedCategory, garmentName, previewUrl, addUploadedGarment]);

  const handleClose = useCallback(() => {
    setUploadState(UPLOAD_STATE.IDLE);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setGarmentName('');
    setErrorMessage('');
    onClose();
  }, [previewUrl, onClose]);

  const handleReset = useCallback(() => {
    setUploadState(UPLOAD_STATE.IDLE);
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setGarmentName('');
    setErrorMessage('');
  }, [previewUrl]);

  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={handleClose} style={{ zIndex: 1300 }}>
      <div
        className="drawer-content"
        onClick={e => e.stopPropagation()}
        style={{ background: '#18181A', color: 'white', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="drawer-header" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Upload size={20} color="var(--accent)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>
              Upload Garment
            </h3>
          </div>
          <button className="tryon-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body" style={{ overflowY: 'auto' }}>

          {/* ── DONE state ── */}
          {uploadState === UPLOAD_STATE.DONE && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.2)', border: '2px solid #10B981',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Check size={28} color="#10B981" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>
                Garment Added!
              </h3>
              <p style={{ color: '#AAA', fontSize: '0.88rem' }}>
                You can now see it on the try-on canvas.
              </p>
            </div>
          )}

          {/* ── PROCESSING state ── */}
          {uploadState === UPLOAD_STATE.PROCESSING && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <Loader size={36} color="var(--accent)" className="spin-icon" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>
                Processing…
              </h3>
              <p style={{ color: '#AAA', fontSize: '0.85rem' }}>{processingProgress}</p>
            </div>
          )}

          {/* ── IDLE state — drag-and-drop zone ── */}
          {uploadState === UPLOAD_STATE.IDLE && (
            <div
              className="upload-drop-zone"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-drop-icon">
                <Image size={36} color="var(--accent)" />
              </div>
              <p className="upload-drop-title">Drop your garment photo here</p>
              <p className="upload-drop-sub">or tap to browse — PNG, JPG, WEBP</p>
              <p className="upload-drop-tip">
                💡 Works best with photos on a white or plain background
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFilePick}
              />
            </div>
          )}

          {/* ── PREVIEW state ── */}
          {uploadState === UPLOAD_STATE.PREVIEW && (
            <div>
              {/* Preview */}
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    width: '100%', maxHeight: '200px', objectFit: 'contain',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <button
                  onClick={handleReset}
                  style={{
                    position: 'absolute', top: '8px', right: '8px',
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#AAA', fontWeight: 600 }}>
                  Garment Name
                </label>
                <input
                  value={garmentName}
                  onChange={e => setGarmentName(e.target.value)}
                  placeholder="My Shirt"
                  style={{
                    width: '100%', marginTop: '4px', padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.08)', color: 'white',
                    fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Category picker */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#AAA', fontWeight: 600 }}>
                  Garment Type
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {CATEGORY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedCategory(opt.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${selectedCategory === opt.id ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`,
                        background: selectedCategory === opt.id ? 'rgba(255,42,95,0.15)' : 'rgba(255,255,255,0.05)',
                        color: 'white', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
                      <span>{opt.label}</span>
                      {selectedCategory === opt.id && (
                        <Check size={16} color="var(--accent)" style={{ marginLeft: 'auto' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {errorMessage && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '1rem'
                }}>
                  ⚠ {errorMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(uploadState === UPLOAD_STATE.IDLE || uploadState === UPLOAD_STATE.PREVIEW) && (
          <div className="drawer-footer" style={{ background: '#121212', borderColor: 'rgba(255,255,255,0.1)' }}>
            {uploadState === UPLOAD_STATE.IDLE ? (
              <button
                className="btn-accent"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={18} />
                <span>Choose Image</span>
              </button>
            ) : (
              <button
                className="btn-accent"
                onClick={handleAddToTryOn}
                disabled={!selectedFile}
              >
                <Upload size={18} />
                <span>Remove Background & Add</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function _templateToOverlayType(templateId) {
  const MAP = { tshirt: 'top', oversized: 'top', shirt: 'top', hoodie: 'hoodie', jacket: 'outerwear' };
  return MAP[templateId] || 'top';
}
