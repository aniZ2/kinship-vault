// src/components/ScrapbookEditor/templates/definitions.ts

import { LayoutTemplate } from './types';

// =============================================================================
// SINGLE PHOTO TEMPLATES
// =============================================================================

export const heroCenter: LayoutTemplate = {
  id: 'hero-center',
  name: 'Hero Center',
  category: 'single',
  description: 'Large centered photo with caption space',
  photoCount: 1,
  slots: [
    {
      id: 'photo-1',
      type: 'photo',
      x: 10,
      y: 8,
      width: 80,
      height: 65,
    },
    {
      id: 'text-1',
      type: 'text',
      x: 15,
      y: 78,
      width: 70,
      height: 15,
      placeholder: 'Add a caption...',
      fontSize: 24,
      font: 'handwriting',
    },
  ],
};

export const fullBleed: LayoutTemplate = {
  id: 'full-bleed',
  name: 'Full Bleed',
  category: 'single',
  description: 'Photo fills the entire page',
  photoCount: 1,
  slots: [
    {
      id: 'photo-1',
      type: 'photo',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    },
  ],
};

// =============================================================================
// DUO TEMPLATES (2 photos)
// =============================================================================

export const sideBySide: LayoutTemplate = {
  id: 'side-by-side',
  name: 'Side by Side',
  category: 'duo',
  description: 'Two photos horizontally aligned',
  photoCount: 2,
  slots: [
    {
      id: 'photo-1',
      type: 'photo',
      x: 4,
      y: 15,
      width: 44,
      height: 60,
    },
    {
      id: 'photo-2',
      type: 'photo',
      x: 52,
      y: 15,
      width: 44,
      height: 60,
    },
  ],
};

export const stacked: LayoutTemplate = {
  id: 'stacked',
  name: 'Stacked',
  category: 'duo',
  description: 'Two photos vertically stacked',
  photoCount: 2,
  slots: [
    {
      id: 'photo-1',
      type: 'photo',
      x: 12,
      y: 4,
      width: 76,
      height: 44,
    },
    {
      id: 'photo-2',
      type: 'photo',
      x: 12,
      y: 52,
      width: 76,
      height: 44,
    },
  ],
};

// =============================================================================
// TRIO TEMPLATES (3 photos)
// =============================================================================

export const featureTwo: LayoutTemplate = {
  id: 'feature-two',
  name: 'Feature + Two',
  category: 'trio',
  description: 'One large photo with two smaller on the side',
  photoCount: 3,
  slots: [
    {
      id: 'photo-1',
      type: 'photo',
      x: 4,
      y: 8,
      width: 58,
      height: 80,
    },
    {
      id: 'photo-2',
      type: 'photo',
      x: 66,
      y: 8,
      width: 30,
      height: 37,
    },
    {
      id: 'photo-3',
      type: 'photo',
      x: 66,
      y: 50,
      width: 30,
      height: 37,
    },
  ],
};

// =============================================================================
// QUAD TEMPLATES (4 photos)
// =============================================================================

export const grid2x2: LayoutTemplate = {
  id: 'grid-2x2',
  name: 'Grid 2x2',
  category: 'quad',
  description: 'Classic four-photo grid',
  photoCount: 4,
  slots: [
    {
      id: 'photo-1',
      type: 'photo',
      x: 4,
      y: 4,
      width: 44,
      height: 44,
    },
    {
      id: 'photo-2',
      type: 'photo',
      x: 52,
      y: 4,
      width: 44,
      height: 44,
    },
    {
      id: 'photo-3',
      type: 'photo',
      x: 4,
      y: 52,
      width: 44,
      height: 44,
    },
    {
      id: 'photo-4',
      type: 'photo',
      x: 52,
      y: 52,
      width: 44,
      height: 44,
    },
  ],
};

// =============================================================================
// COLLAGE TEMPLATES (5+ photos)
// =============================================================================

export const scatter: LayoutTemplate = {
  id: 'scatter',
  name: 'Scatter',
  category: 'collage',
  description: 'Five photos scattered naturally',
  photoCount: 5,
  slots: [
    {
      id: 'photo-1',
      type: 'photo',
      x: 4,
      y: 4,
      width: 32,
      height: 28,
      rotation: -5,
    },
    {
      id: 'photo-2',
      type: 'photo',
      x: 55,
      y: 2,
      width: 40,
      height: 32,
      rotation: 4,
    },
    {
      id: 'photo-3',
      type: 'photo',
      x: 25,
      y: 35,
      width: 45,
      height: 30,
      rotation: -2,
    },
    {
      id: 'photo-4',
      type: 'photo',
      x: 4,
      y: 62,
      width: 35,
      height: 32,
      rotation: 3,
    },
    {
      id: 'photo-5',
      type: 'photo',
      x: 58,
      y: 58,
      width: 38,
      height: 35,
      rotation: -4,
    },
  ],
};

// =============================================================================
// JOURNAL TEMPLATES (Text-focused)
// =============================================================================

export const storyPage: LayoutTemplate = {
  id: 'story-page',
  name: 'Story Page',
  category: 'journal',
  description: 'Photo with journaling space',
  photoCount: 1,
  slots: [
    {
      id: 'text-title',
      type: 'text',
      x: 8,
      y: 3,
      width: 84,
      height: 10,
      placeholder: 'Title',
      fontSize: 32,
      font: 'display',
    },
    {
      id: 'photo-1',
      type: 'photo',
      x: 4,
      y: 16,
      width: 45,
      height: 45,
    },
    {
      id: 'text-1',
      type: 'text',
      x: 52,
      y: 16,
      width: 44,
      height: 45,
      placeholder: 'Write your story here...',
      fontSize: 18,
      font: 'handwriting',
    },
    {
      id: 'text-2',
      type: 'text',
      x: 4,
      y: 65,
      width: 92,
      height: 30,
      placeholder: 'Continue your story...',
      fontSize: 18,
      font: 'handwriting',
    },
  ],
};

// =============================================================================
// EXPORT ALL TEMPLATES
// =============================================================================

export const ALL_TEMPLATES: LayoutTemplate[] = [
  // Single
  heroCenter,
  fullBleed,
  // Duo
  sideBySide,
  stacked,
  // Trio
  featureTwo,
  // Quad
  grid2x2,
  // Collage
  scatter,
  // Journal
  storyPage,
];

export const TEMPLATES_BY_CATEGORY = {
  single: [heroCenter, fullBleed],
  duo: [sideBySide, stacked],
  trio: [featureTwo],
  quad: [grid2x2],
  collage: [scatter],
  journal: [storyPage],
};

// Get templates that fit the number of photos
export function getTemplatesForPhotoCount(count: number): LayoutTemplate[] {
  if (count === 0) return ALL_TEMPLATES;
  if (count === 1) return [...TEMPLATES_BY_CATEGORY.single, storyPage];
  if (count === 2) return TEMPLATES_BY_CATEGORY.duo;
  if (count === 3) return TEMPLATES_BY_CATEGORY.trio;
  if (count === 4) return TEMPLATES_BY_CATEGORY.quad;
  return TEMPLATES_BY_CATEGORY.collage;
}
