// src/components/ScrapbookEditor/constants.ts

import { BackgroundOption, FrameOption, StickerCategory, TapePattern } from './types';

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
  // Solid colors
  { id: 'cream', label: 'Cream', type: 'color', value: '#FDF8F0' },
  { id: 'white', label: 'White', type: 'color', value: '#FFFFFF' },
  { id: 'pink', label: 'Blush', type: 'color', value: '#FDE8E8' },
  { id: 'sage', label: 'Sage', type: 'color', value: '#E8F0E8' },
  { id: 'sky', label: 'Sky', type: 'color', value: '#E8F4FD' },
  { id: 'lavender', label: 'Lavender', type: 'color', value: '#F0E8FD' },
  { id: 'peach', label: 'Peach', type: 'color', value: '#FDF0E8' },
  { id: 'mint', label: 'Mint', type: 'color', value: '#E8FDF4' },
  // Textures (CSS patterns)
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
];

export const FRAMES: FrameOption[] = [
  { id: 'polaroid', label: 'Polaroid', description: 'Classic instant photo style' },
  { id: 'simple', label: 'Simple', description: 'Clean thin border' },
  { id: 'vintage', label: 'Vintage', description: 'Aged photo look' },
  { id: 'circle', label: 'Circle', description: 'Circular crop' },
  { id: 'none', label: 'None', description: 'No frame' },
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
  { id: 'handwriting', label: 'Handwriting', family: 'Caveat, cursive' },
  { id: 'serif', label: 'Classic', family: 'Georgia, serif' },
  { id: 'sans', label: 'Modern', family: 'Inter, sans-serif' },
];

export const TEXT_COLORS = [
  '#1f2937', // Dark gray
  '#991b1b', // Red
  '#92400e', // Amber
  '#166534', // Green
  '#1e40af', // Blue
  '#6b21a8', // Purple
  '#be185d', // Pink
  '#ffffff', // White
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
