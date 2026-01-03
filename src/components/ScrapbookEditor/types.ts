// src/components/ScrapbookEditor/types.ts

export type FrameStyle = 'polaroid' | 'simple' | 'vintage' | 'circle' | 'none';
export type ItemType = 'image' | 'text' | 'sticker' | 'tape';
export type FontFamily = 'handwriting' | 'serif' | 'sans' | 'display' | 'script' | 'mono' | 'rounded' | 'vintage' | 'playful' | 'elegant' | 'bold' | 'thin';
export type TextEffect = 'none' | 'shadow' | 'outline' | 'glow-white' | 'glow-pink' | 'glow-blue' | 'glow-gold' | 'neon' | 'retro' | 'emboss' | 'stamp' | 'handwritten';
export type TextAlign = 'left' | 'center' | 'right';
export type TextDecoration = 'none' | 'underline' | 'strikethrough' | 'highlight';
export type PhotoFilter = 'none' | 'sepia' | 'grayscale' | 'vintage' | 'fade' | 'warm' | 'cool' | 'contrast';
export type TapePattern = 'solid-pink' | 'solid-mint' | 'solid-yellow' | 'solid-lavender' | 'stripes-red' | 'stripes-blue' | 'stripes-green' | 'dots-pink' | 'dots-gold' | 'hearts' | 'stars' | 'floral';
export type PhotoShape = 'rectangle' | 'circle' | 'oval' | 'heart' | 'star' | 'hexagon' | 'octagon' | 'diamond' | 'triangle' | 'arch' | 'scallop' | 'blob1' | 'blob2' | 'blob3';
export type PhotoShadow = 'none' | 'soft' | 'medium' | 'hard' | 'float' | 'dreamy' | 'sharp' | 'glow-white' | 'glow-pink' | 'glow-blue' | 'glow-gold' | 'retro';
export type PhotoBorder = 'none' | 'thin-white' | 'thin-black' | 'thick-white' | 'thick-black' | 'double' | 'dashed' | 'dotted' | 'groovy' | 'rainbow' | 'gold' | 'silver' | 'rose-gold';

export interface EditorItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  flipX?: boolean;
  flipY?: boolean;
  // Image specific
  src?: string;
  cfId?: string;
  sizeBytes?: number;  // Track file size for storage limits
  frame?: FrameStyle;
  shape?: PhotoShape;
  shadow?: PhotoShadow;
  border?: PhotoBorder;
  filter?: PhotoFilter;
  caption?: string;
  isUploading?: boolean;
  // Text specific
  text?: string;
  font?: FontFamily;
  color?: string;
  fontSize?: number;
  textEffect?: TextEffect;
  textAlign?: TextAlign;
  textDecoration?: TextDecoration;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: number;
  bgColor?: string;
  // Sticker specific
  emoji?: string;
  // Tape specific
  tapePattern?: TapePattern;
}

export interface EditorState {
  background: string;
  items: EditorItem[];
  customBgUrl?: string;
}

export interface StorageInfo {
  usedBytes: number;
  limitBytes: number;
  isPro: boolean;
}

export interface ScrapbookEditorProps {
  mode?: 'edit' | 'view';
  initialState?: EditorState | null;
  storageInfo?: StorageInfo | null;
}

export interface BackgroundOption {
  id: string;
  label: string;
  type: 'color' | 'texture';
  value: string; // CSS color or gradient/pattern
  preview?: string; // Preview color for textures
}

export interface FrameOption {
  id: FrameStyle;
  label: string;
  description: string;
}

export interface StickerCategory {
  id: string;
  label: string;
  items: string[];
}
