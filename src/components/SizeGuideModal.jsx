import React from 'react';
import { X } from 'lucide-react';

export const SizeGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="drawer-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', margin: 'auto', height: 'auto', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="drawer-header">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>VybeFit Size Guide</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="drawer-body">
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            All measurements in inches. Use our live camera try-on for personalized body pose fit confidence.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '8px' }}>Size</th>
                <th style={{ padding: '8px' }}>Chest</th>
                <th style={{ padding: '8px' }}>Waist</th>
                <th style={{ padding: '8px' }}>Shoulder</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 700 }}>S</td>
                <td>36" - 38"</td>
                <td>30" - 32"</td>
                <td>17.5"</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 700 }}>M</td>
                <td>39" - 41"</td>
                <td>33" - 35"</td>
                <td>18.5"</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 700 }}>L</td>
                <td>42" - 44"</td>
                <td>36" - 38"</td>
                <td>19.5"</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '10px 8px', fontWeight: 700 }}>XL</td>
                <td>45" - 47"</td>
                <td>39" - 41"</td>
                <td>20.5"</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="drawer-footer">
          <button className="btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
};
