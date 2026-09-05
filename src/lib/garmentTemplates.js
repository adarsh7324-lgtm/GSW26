/**
 * Garment Templates — define how each clothing category maps to body geometry.
 *
 * All scale factors are relative to `pose.shoulderWidth`.
 * Fractions describe where things sit relative to the garment bounding box.
 *
 * Adding a new category = add a new entry here. Nothing else needs to change.
 */

export const GARMENT_TEMPLATES = {
  tshirt: {
    id: 'tshirt',
    name: 'T-Shirt',
    category: 'upper_body',
    layerOrder: 10,
    // Garment width = shoulderWidth * widthScale
    widthScale: 1.25,
    // Garment height (MeshDeformer) = torsoHeight * heightScale
    heightScale: 1.15,
    // Legacy heightRatio (kept for any old image renderer refs)
    heightRatio: 1.40,
    // What fraction of garment height sits ABOVE the shoulder midpoint
    collarFraction: 0.05,
    neckWidthFraction: 0.30,
    sleeveLengthFraction: 0.36,
    style: 'tshirt',
    neckType: 'crew',
    sleeveType: 'short',
    hemType: 'straight',
    hasPocket: false,
    hasButtonPlacket: false,
    hasZipper: false,
    hasHood: false,
  },

  oversized: {
    id: 'oversized',
    name: 'Oversized T-Shirt',
    category: 'upper_body',
    layerOrder: 10,
    widthScale: 1.58,
    heightScale: 1.45,
    heightRatio: 1.65,
    collarFraction: 0.04,
    neckWidthFraction: 0.28,
    sleeveLengthFraction: 0.40,
    style: 'oversized',
    neckType: 'crew',
    sleeveType: 'short_dropped',
    hemType: 'curved',
    hasPocket: false,
    hasButtonPlacket: false,
  },

  shirt: {
    id: 'shirt',
    name: 'Shirt',
    category: 'upper_body',
    layerOrder: 10,
    widthScale: 1.30,
    heightScale: 1.30,
    heightRatio: 1.55,
    collarFraction: 0.06,
    neckWidthFraction: 0.22,
    sleeveLengthFraction: 0.34,
    style: 'shirt',
    neckType: 'collar',
    sleeveType: 'long',
    hemType: 'straight',
    hasPocket: true,
    hasButtonPlacket: true,
  },

  hoodie: {
    id: 'hoodie',
    name: 'Hoodie',
    category: 'upper_body',
    layerOrder: 20,
    widthScale: 1.48,
    heightScale: 1.40,
    heightRatio: 1.62,
    collarFraction: 0.08,
    neckWidthFraction: 0.32,
    sleeveLengthFraction: 0.44,
    style: 'hoodie',
    neckType: 'hood',
    sleeveType: 'long',
    hemType: 'ribbed',
    hasPocket: true,
    hasKangarooPocket: true,
    hasHood: true,
  },

  jacket: {
    id: 'jacket',
    name: 'Jacket / Outerwear',
    category: 'upper_body',
    layerOrder: 30,
    widthScale: 1.55,
    heightScale: 1.35,
    heightRatio: 1.52,
    collarFraction: 0.06,
    neckWidthFraction: 0.20,
    sleeveLengthFraction: 0.48,
    style: 'jacket',
    neckType: 'lapel',
    sleeveType: 'long',
    hemType: 'straight',
    hasPocket: true,
    hasZipper: true,
    hasButtonPlacket: false,
  },
};


/**
 * Resolve a templateId to a template object.
 * Falls back to 'tshirt' for unknown ids.
 */
export function getTemplate(templateId) {
  return GARMENT_TEMPLATES[templateId] ?? GARMENT_TEMPLATES.tshirt;
}

/**
 * Map legacy overlayType strings to template ids.
 */
export function overlayTypeToTemplateId(overlayType) {
  const MAP = {
    top:       'tshirt',
    hoodie:    'hoodie',
    outerwear: 'jacket',
    dress:     'tshirt',  // fallback
    bottom:    'tshirt',  // not supported in this system
  };
  return MAP[overlayType] ?? 'tshirt';
}
