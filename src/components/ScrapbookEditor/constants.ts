// src/components/ScrapbookEditor/constants.ts

import { BackgroundOption, FrameOption, StickerCategory, TapePattern, PhotoShape, PhotoShadow, PhotoBorder } from './types';

export interface TapeOption {
  id: TapePattern;
  label: string;
  background: string;
  borderColor?: string;
}

export const WASHI_TAPES: TapeOption[] = [
  // Solid colors
  { id: 'solid-pink', label: 'Pink', background: '#f8b4c4' },
  { id: 'solid-mint', label: 'Mint', background: '#a8e6cf' },
  { id: 'solid-yellow', label: 'Yellow', background: '#ffeaa7' },
  { id: 'solid-lavender', label: 'Lavender', background: '#c9b1ff' },
  // Stripes
  {
    id: 'stripes-red',
    label: 'Red Stripes',
    background: 'repeating-linear-gradient(90deg, #fff 0px, #fff 8px, #e74c3c 8px, #e74c3c 16px)'
  },
  {
    id: 'stripes-blue',
    label: 'Blue Stripes',
    background: 'repeating-linear-gradient(90deg, #fff 0px, #fff 8px, #3498db 8px, #3498db 16px)'
  },
  {
    id: 'stripes-green',
    label: 'Green Stripes',
    background: 'repeating-linear-gradient(90deg, #fff 0px, #fff 8px, #2ecc71 8px, #2ecc71 16px)'
  },
  // Dots
  {
    id: 'dots-pink',
    label: 'Pink Dots',
    background: 'radial-gradient(circle, #e91e63 3px, transparent 3px), #fce4ec',
  },
  {
    id: 'dots-gold',
    label: 'Gold Dots',
    background: 'radial-gradient(circle, #ffd700 3px, transparent 3px), #fff8e1',
  },
  // Patterns
  {
    id: 'hearts',
    label: 'Hearts',
    background: '#ffcdd2',
  },
  {
    id: 'stars',
    label: 'Stars',
    background: '#e1f5fe',
  },
  {
    id: 'floral',
    label: 'Floral',
    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  },
];

export const BACKGROUNDS: BackgroundOption[] = [
  // ============ MINIMAL / NEUTRAL ============
  { id: 'white', label: 'White', type: 'color', value: '#FFFFFF' },
  { id: 'cream', label: 'Cream', type: 'color', value: '#FDF8F0' },
  { id: 'ivory', label: 'Ivory', type: 'color', value: '#FFFFF0' },
  { id: 'snow', label: 'Snow', type: 'color', value: '#FFFAFA' },
  { id: 'light-gray', label: 'Light Gray', type: 'color', value: '#F5F5F5' },
  { id: 'warm-gray', label: 'Warm Gray', type: 'color', value: '#E8E6E3' },
  { id: 'cool-gray', label: 'Cool Gray', type: 'color', value: '#E3E6E8' },
  { id: 'taupe', label: 'Taupe', type: 'color', value: '#EDE8E3' },
  { id: 'greige', label: 'Greige', type: 'color', value: '#E5E0DA' },
  { id: 'charcoal', label: 'Charcoal', type: 'color', value: '#36454F' },
  { id: 'slate', label: 'Slate', type: 'color', value: '#708090' },
  { id: 'black', label: 'Black', type: 'color', value: '#1a1a1a' },

  // ============ SOFT PASTELS ============
  { id: 'pink', label: 'Blush', type: 'color', value: '#FDE8E8' },
  { id: 'sage', label: 'Sage', type: 'color', value: '#E8F0E8' },
  { id: 'sky', label: 'Sky', type: 'color', value: '#E8F4FD' },
  { id: 'lavender', label: 'Lavender', type: 'color', value: '#F0E8FD' },
  { id: 'peach', label: 'Peach', type: 'color', value: '#FDF0E8' },
  { id: 'mint', label: 'Mint', type: 'color', value: '#E8FDF4' },
  { id: 'butter', label: 'Butter', type: 'color', value: '#FFF9E6' },
  { id: 'rose', label: 'Rose', type: 'color', value: '#FFE4E6' },
  { id: 'periwinkle', label: 'Periwinkle', type: 'color', value: '#E8E8FD' },
  { id: 'seafoam', label: 'Seafoam', type: 'color', value: '#E0F5F0' },

  // ============ BOLD & VIBRANT ============
  { id: 'coral', label: 'Coral', type: 'color', value: '#FF7F7F' },
  { id: 'sunshine', label: 'Sunshine', type: 'color', value: '#FFD93D' },
  { id: 'ocean', label: 'Ocean', type: 'color', value: '#6BCFFF' },
  { id: 'lilac', label: 'Lilac', type: 'color', value: '#C8A2C8' },
  { id: 'lime', label: 'Lime', type: 'color', value: '#B8E986' },
  { id: 'tangerine', label: 'Tangerine', type: 'color', value: '#FFB347' },

  // ============ PAPER TEXTURES ============
  {
    id: 'kraft',
    label: 'Kraft Paper',
    type: 'texture',
    value: `linear-gradient(135deg, #d4a574 0%, #c4956a 50%, #d4a574 100%)`,
    preview: '#c4956a'
  },
  {
    id: 'lined',
    label: 'Lined Paper',
    type: 'texture',
    value: `repeating-linear-gradient(transparent, transparent 27px, #e5e5e5 28px), linear-gradient(#fff, #fff)`,
    preview: '#f5f5f5'
  },
  {
    id: 'cork',
    label: 'Cork Board',
    type: 'texture',
    value: `radial-gradient(ellipse at 20% 30%, #c9a86c 0%, transparent 50%),
            radial-gradient(ellipse at 80% 70%, #d4b87a 0%, transparent 40%),
            radial-gradient(ellipse at 50% 50%, #b89860 0%, transparent 60%),
            linear-gradient(#c4956a, #b08050)`,
    preview: '#c4956a'
  },
  {
    id: 'linen',
    label: 'Linen',
    type: 'texture',
    value: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px),
            linear-gradient(#f5f0e8, #f5f0e8)`,
    preview: '#f5f0e8'
  },
  {
    id: 'grid',
    label: 'Graph Paper',
    type: 'texture',
    value: `linear-gradient(#e8e8e8 1px, transparent 1px),
            linear-gradient(90deg, #e8e8e8 1px, transparent 1px),
            linear-gradient(#fff, #fff)`,
    preview: '#fafafa'
  },
  {
    id: 'dotgrid',
    label: 'Dot Grid',
    type: 'texture',
    value: `radial-gradient(circle, #ddd 1px, transparent 1px)`,
    preview: '#fafafa'
  },

  // ============ FUN PATTERNS ============
  {
    id: 'polka-pink',
    label: 'Pink Polka',
    type: 'texture',
    value: `radial-gradient(circle, #FFB6C1 8px, transparent 8px)`,
    preview: '#FFF0F3'
  },
  {
    id: 'polka-blue',
    label: 'Blue Polka',
    type: 'texture',
    value: `radial-gradient(circle, #87CEEB 8px, transparent 8px)`,
    preview: '#F0F8FF'
  },
  {
    id: 'polka-gold',
    label: 'Gold Polka',
    type: 'texture',
    value: `radial-gradient(circle, #FFD700 6px, transparent 6px)`,
    preview: '#FFFEF0'
  },
  {
    id: 'confetti',
    label: 'Confetti',
    type: 'texture',
    value: `radial-gradient(circle at 20% 30%, #FF6B6B 4px, transparent 4px),
            radial-gradient(circle at 60% 20%, #4ECDC4 4px, transparent 4px),
            radial-gradient(circle at 80% 60%, #FFE66D 4px, transparent 4px),
            radial-gradient(circle at 30% 70%, #95E1D3 4px, transparent 4px),
            radial-gradient(circle at 70% 80%, #DDA0DD 4px, transparent 4px),
            radial-gradient(circle at 10% 50%, #F38181 4px, transparent 4px),
            radial-gradient(circle at 90% 40%, #AA96DA 4px, transparent 4px),
            linear-gradient(#FFF9F0, #FFF9F0)`,
    preview: '#FFF9F0'
  },
  {
    id: 'stripes-candy',
    label: 'Candy Stripes',
    type: 'texture',
    value: `repeating-linear-gradient(45deg, #FFB6C1 0px, #FFB6C1 10px, #FFF 10px, #FFF 20px)`,
    preview: '#FFE4E8'
  },
  {
    id: 'stripes-mint',
    label: 'Mint Stripes',
    type: 'texture',
    value: `repeating-linear-gradient(45deg, #98D8C8 0px, #98D8C8 10px, #FFF 10px, #FFF 20px)`,
    preview: '#E8F8F0'
  },
  {
    id: 'stripes-rainbow',
    label: 'Rainbow',
    type: 'texture',
    value: `repeating-linear-gradient(90deg,
            #FF6B6B 0px, #FF6B6B 20px,
            #FFE66D 20px, #FFE66D 40px,
            #4ECDC4 40px, #4ECDC4 60px,
            #45B7D1 60px, #45B7D1 80px,
            #DDA0DD 80px, #DDA0DD 100px)`,
    preview: '#FFE4E8'
  },
  {
    id: 'checkerboard',
    label: 'Checkerboard',
    type: 'texture',
    value: `repeating-conic-gradient(#F5F5F5 0% 25%, #FFF 0% 50%) 50% / 40px 40px`,
    preview: '#FAFAFA'
  },
  {
    id: 'checkerboard-pink',
    label: 'Pink Check',
    type: 'texture',
    value: `repeating-conic-gradient(#FFE4EC 0% 25%, #FFF 0% 50%) 50% / 40px 40px`,
    preview: '#FFF0F5'
  },
  {
    id: 'hearts',
    label: 'Hearts',
    type: 'texture',
    value: `radial-gradient(circle at 50% 40%, #FFB6C1 6px, transparent 6px),
            radial-gradient(circle at 35% 35%, #FFB6C1 6px, transparent 6px),
            radial-gradient(circle at 65% 35%, #FFB6C1 6px, transparent 6px),
            linear-gradient(#FFF5F7, #FFF5F7)`,
    preview: '#FFF5F7'
  },
  {
    id: 'stars',
    label: 'Starry',
    type: 'texture',
    value: `radial-gradient(circle at 25% 25%, #FFD700 3px, transparent 3px),
            radial-gradient(circle at 75% 20%, #FFD700 2px, transparent 2px),
            radial-gradient(circle at 50% 50%, #FFD700 4px, transparent 4px),
            radial-gradient(circle at 20% 70%, #FFD700 2px, transparent 2px),
            radial-gradient(circle at 80% 75%, #FFD700 3px, transparent 3px),
            radial-gradient(circle at 40% 85%, #FFD700 2px, transparent 2px),
            linear-gradient(#1a1a2e, #16213e)`,
    preview: '#1a1a2e'
  },
  {
    id: 'clouds',
    label: 'Clouds',
    type: 'texture',
    value: `radial-gradient(ellipse at 30% 80%, rgba(255,255,255,0.9) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 70%, rgba(255,255,255,0.8) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 90%, rgba(255,255,255,0.9) 0%, transparent 45%),
            linear-gradient(180deg, #87CEEB 0%, #B0E0E6 100%)`,
    preview: '#87CEEB'
  },

  // ============ GRADIENTS ============
  {
    id: 'gradient-sunset',
    label: 'Sunset',
    type: 'texture',
    value: `linear-gradient(135deg, #FF9A8B 0%, #FF6A88 50%, #FF99AC 100%)`,
    preview: '#FF9A8B'
  },
  {
    id: 'gradient-ocean',
    label: 'Ocean Wave',
    type: 'texture',
    value: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
    preview: '#667eea'
  },
  {
    id: 'gradient-mint',
    label: 'Fresh Mint',
    type: 'texture',
    value: `linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)`,
    preview: '#a8edea'
  },
  {
    id: 'gradient-peach',
    label: 'Peach Dream',
    type: 'texture',
    value: `linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)`,
    preview: '#FFECD2'
  },
  {
    id: 'gradient-lavender',
    label: 'Lavender Mist',
    type: 'texture',
    value: `linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)`,
    preview: '#E0C3FC'
  },
  {
    id: 'gradient-forest',
    label: 'Forest',
    type: 'texture',
    value: `linear-gradient(135deg, #134E5E 0%, #71B280 100%)`,
    preview: '#134E5E'
  },
  {
    id: 'gradient-cotton-candy',
    label: 'Cotton Candy',
    type: 'texture',
    value: `linear-gradient(135deg, #f5d0fe 0%, #c4b5fd 50%, #a5f3fc 100%)`,
    preview: '#f5d0fe'
  },
  {
    id: 'gradient-golden',
    label: 'Golden Hour',
    type: 'texture',
    value: `linear-gradient(135deg, #F6D365 0%, #FDA085 100%)`,
    preview: '#F6D365'
  },
];

export const FRAMES: FrameOption[] = [
  { id: 'polaroid', label: 'Polaroid', description: 'Classic instant photo style' },
  { id: 'simple', label: 'Simple', description: 'Clean thin border' },
  { id: 'vintage', label: 'Vintage', description: 'Aged photo look' },
  { id: 'circle', label: 'Circle', description: 'Circular crop' },
  { id: 'none', label: 'None', description: 'No frame' },
];

export interface ShapeOption {
  id: PhotoShape;
  label: string;
  icon: string;
}

export const SHAPES: ShapeOption[] = [
  { id: 'rectangle', label: 'Rectangle', icon: '⬜' },
  { id: 'circle', label: 'Circle', icon: '⚪' },
  { id: 'oval', label: 'Oval', icon: '🥚' },
  { id: 'heart', label: 'Heart', icon: '💜' },
  { id: 'star', label: 'Star', icon: '⭐' },
  { id: 'hexagon', label: 'Hexagon', icon: '⬡' },
  { id: 'octagon', label: 'Octagon', icon: '🛑' },
  { id: 'diamond', label: 'Diamond', icon: '💠' },
  { id: 'triangle', label: 'Triangle', icon: '🔺' },
  { id: 'arch', label: 'Arch', icon: '🌈' },
  { id: 'scallop', label: 'Scallop', icon: '🌸' },
  { id: 'blob1', label: 'Blob 1', icon: '🫧' },
  { id: 'blob2', label: 'Blob 2', icon: '💧' },
  { id: 'blob3', label: 'Blob 3', icon: '☁️' },
];

export interface ShadowOption {
  id: PhotoShadow;
  label: string;
}

export const SHADOWS: ShadowOption[] = [
  { id: 'none', label: 'None' },
  { id: 'soft', label: 'Soft' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
  { id: 'float', label: 'Float' },
  { id: 'dreamy', label: 'Dreamy' },
  { id: 'sharp', label: 'Sharp' },
  { id: 'glow-white', label: 'White Glow' },
  { id: 'glow-pink', label: 'Pink Glow' },
  { id: 'glow-blue', label: 'Blue Glow' },
  { id: 'glow-gold', label: 'Gold Glow' },
  { id: 'retro', label: 'Retro' },
];

export interface BorderOption {
  id: PhotoBorder;
  label: string;
  preview?: string; // CSS border preview
}

export const BORDERS: BorderOption[] = [
  { id: 'none', label: 'None' },
  { id: 'thin-white', label: 'Thin White' },
  { id: 'thin-black', label: 'Thin Black' },
  { id: 'thick-white', label: 'Thick White' },
  { id: 'thick-black', label: 'Thick Black' },
  { id: 'double', label: 'Double' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
  { id: 'groovy', label: 'Groovy' },
  { id: 'rainbow', label: 'Rainbow' },
  { id: 'gold', label: 'Gold' },
  { id: 'silver', label: 'Silver' },
  { id: 'rose-gold', label: 'Rose Gold' },
];

export const STICKERS: StickerCategory[] = [
  {
    id: 'pins',
    label: 'Pins & Clips',
    items: ['📌', '📍', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '📎', '🖇️'],
  },
  {
    id: 'decorative',
    label: 'Decorative',
    items: ['✨', '💫', '⭐', '🌟', '💖', '💕', '🎀', '🌸', '🌺', '🌻', '🦋', '🍀'],
  },
  {
    id: 'arrows',
    label: 'Arrows & Pointers',
    items: ['➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '👆', '👇', '👈', '👉', '✋', '🫵'],
  },
  {
    id: 'emotions',
    label: 'Emotions',
    items: ['😊', '😂', '🥰', '😍', '🤗', '😎', '🥳', '😇', '🤩', '😘', '💋', '❤️'],
  },
  {
    id: 'celebrations',
    label: 'Celebrations',
    items: ['🎉', '🎊', '🎈', '🎁', '🎂', '🍰', '🥂', '🍾', '🎆', '🎇', '🪅', '🎏'],
  },
  {
    id: 'nature',
    label: 'Nature',
    items: ['🌈', '☀️', '🌙', '⛅', '🌴', '🌵', '🍀', '🌷', '🦋', '🐝', '🌊', '🏔️'],
  },
  {
    id: 'travel',
    label: 'Travel',
    items: ['✈️', '🚗', '🚢', '🏖️', '🗺️', '🧭', '🎒', '📸', '🏕️', '⛺', '🌍', '🗼'],
  },
];

export const FONTS = [
  // Handwritten & Script
  { id: 'handwriting', label: 'Handwriting', family: 'Caveat, cursive' },
  { id: 'script', label: 'Script', family: 'Dancing Script, cursive' },
  { id: 'playful', label: 'Playful', family: 'Pacifico, cursive' },
  { id: 'elegant', label: 'Elegant', family: 'Playfair Display, serif' },
  // Classic & Professional
  { id: 'serif', label: 'Classic', family: 'Georgia, serif' },
  { id: 'sans', label: 'Modern', family: 'Inter, sans-serif' },
  { id: 'display', label: 'Display', family: 'Poppins, sans-serif' },
  { id: 'rounded', label: 'Rounded', family: 'Nunito, sans-serif' },
  // Stylized
  { id: 'vintage', label: 'Vintage', family: 'Abril Fatface, serif' },
  { id: 'bold', label: 'Bold', family: 'Oswald, sans-serif' },
  { id: 'thin', label: 'Thin', family: 'Raleway, sans-serif' },
  { id: 'mono', label: 'Typewriter', family: 'Courier Prime, monospace' },
];

export const TEXT_EFFECTS = [
  { id: 'none', label: 'None' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'outline', label: 'Outline' },
  { id: 'glow-white', label: 'White Glow' },
  { id: 'glow-pink', label: 'Pink Glow' },
  { id: 'glow-blue', label: 'Blue Glow' },
  { id: 'glow-gold', label: 'Gold Glow' },
  { id: 'neon', label: 'Neon' },
  { id: 'retro', label: 'Retro' },
  { id: 'emboss', label: 'Emboss' },
  { id: 'stamp', label: 'Stamp' },
  { id: 'handwritten', label: 'Sketch' },
];

export const TEXT_DECORATIONS = [
  { id: 'none', label: 'None', icon: '—' },
  { id: 'underline', label: 'Underline', icon: 'U̲' },
  { id: 'strikethrough', label: 'Strike', icon: 'S̶' },
  { id: 'highlight', label: 'Highlight', icon: '🖍️' },
];

export const TEXT_ALIGNS = [
  { id: 'left', label: 'Left', icon: '⬅️' },
  { id: 'center', label: 'Center', icon: '↔️' },
  { id: 'right', label: 'Right', icon: '➡️' },
];

export const FONT_SIZES = [14, 18, 24, 32, 42, 56, 72, 96];

export const LETTER_SPACINGS = [
  { id: 'tight', label: 'Tight', value: -1 },
  { id: 'normal', label: 'Normal', value: 0 },
  { id: 'wide', label: 'Wide', value: 2 },
  { id: 'wider', label: 'Wider', value: 4 },
  { id: 'widest', label: 'Widest', value: 8 },
];

export const TEXT_COLORS = [
  '#1f2937', // Dark gray
  '#000000', // Black
  '#ffffff', // White
  '#991b1b', // Red
  '#dc2626', // Bright Red
  '#ea580c', // Orange
  '#92400e', // Amber
  '#eab308', // Yellow
  '#166534', // Green
  '#22c55e', // Bright Green
  '#0891b2', // Cyan
  '#1e40af', // Blue
  '#3b82f6', // Bright Blue
  '#6b21a8', // Purple
  '#a855f7', // Violet
  '#be185d', // Pink
  '#ec4899', // Hot Pink
  '#f472b6', // Light Pink
];

export const TEXT_BG_COLORS = [
  'transparent',
  '#ffffff',
  '#fef3c7', // Light yellow
  '#fce7f3', // Light pink
  '#dbeafe', // Light blue
  '#dcfce7', // Light green
  '#f3e8ff', // Light purple
  '#fed7aa', // Light orange
  '#1f2937', // Dark gray
  '#000000', // Black
];

export const PHOTO_FILTERS = [
  { id: 'none', label: 'Normal', css: 'none' },
  { id: 'grayscale', label: 'B&W', css: 'grayscale(100%)' },
  { id: 'sepia', label: 'Sepia', css: 'sepia(80%)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(40%) contrast(90%) brightness(95%)' },
  { id: 'fade', label: 'Fade', css: 'contrast(85%) brightness(110%) saturate(80%)' },
  { id: 'warm', label: 'Warm', css: 'sepia(20%) saturate(120%) brightness(105%)' },
  { id: 'cool', label: 'Cool', css: 'saturate(90%) brightness(105%) hue-rotate(10deg)' },
  { id: 'contrast', label: 'Vivid', css: 'contrast(120%) saturate(130%)' },
];

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
