// src/components/ScrapbookEditor/templates/types.ts

import { FrameStyle, PhotoShape, FontFamily, TapePattern } from '../types';

export type TemplateCategory =
  | 'single'    // 1 photo layouts
  | 'duo'       // 2 photo layouts
  | 'trio'      // 3 photo layouts
  | 'quad'      // 4 photo layouts
  | 'collage'   // 5+ photos
  | 'journal';  // Text-focused

export interface TemplateSlot {
  id: string;
  type: 'photo' | 'text';
  // Position as percentage of canvas (0-100)
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  // Photo styling defaults
  frame?: FrameStyle;
  shape?: PhotoShape;
  // Text defaults
  placeholder?: string;
  fontSize?: number;
  font?: FontFamily;
}

export interface TemplateDecoration {
  type: 'tape' | 'sticker';
  x: number;
  y: number;
  rotation?: number;
  pattern?: TapePattern;
  emoji?: string;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  photoCount: number;
  slots: TemplateSlot[];
  decorations?: TemplateDecoration[];
}

// Converted slot with pixel values
export interface ResolvedSlot extends Omit<TemplateSlot, 'x' | 'y' | 'width' | 'height'> {
  x: number;
  y: number;
  width: number;
  height: number;
}
