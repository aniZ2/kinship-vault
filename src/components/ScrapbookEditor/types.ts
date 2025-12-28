// src/components/ScrapbookEditor/types.ts

export type FrameStyle = 'polaroid' | 'simple' | 'vintage' | 'circle' | 'none';
export type ItemType = 'image' | 'text' | 'sticker' | 'tape';
export type FontFamily = 'handwriting' | 'serif' | 'sans';
export type PhotoFilter = 'none' | 'sepia' | 'grayscale' | 'vintage' | 'fade' | 'warm' | 'cool' | 'contrast';
export type TapePattern = 'solid-pink' | 'solid-mint' | 'solid-yellow' | 'solid-lavender' | 'stripes-red' | 'stripes-blue' | 'stripes-green' | 'dots-pink' | 'dots-gold' | 'hearts' | 'stars' | 'floral';

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
  frame?: FrameStyle;
  filter?: PhotoFilter;
  caption?: string;
  isUploading?: boolean;
  // Text specific
  text?: string;
  font?: FontFamily;
  color?: string;
  fontSize?: number;
  // Sticker specific
  emoji?: string;
  // Tape specific
  tapePattern?: TapePattern;
}

export interface EditorState {
  background: string;
  items: EditorItem[];
}

export interface ScrapbookEditorProps {
  mode?: 'edit' | 'view';
  initialState?: EditorState | null;
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
