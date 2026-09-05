import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const SizeConfidence = ({ size = 'M', fitPercentage = 82 }) => {
  return (
    <div className="confidence-card">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, color: '#34D399' }}>
          <Sparkles size={14} />
          <span>FIT CONFIDENCE</span>
        </div>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, marginTop: '2px', color: 'white' }}>
          Selected size: <span style={{ color: '#F59E0B' }}>{size}</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
          Based on selected size {size} & detected body proportions.
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399' }}>
          {fitPercentage}%
        </div>
        <div className="confidence-bar-bg">
          <div
            className="confidence-bar-fill"
            style={{ width: `${fitPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
