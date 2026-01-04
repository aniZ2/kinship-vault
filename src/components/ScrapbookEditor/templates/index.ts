// src/components/ScrapbookEditor/templates/index.ts

export * from './types';
export * from './definitions';

import { LayoutTemplate, TemplateSlot, ResolvedSlot } from './types';

/**
 * Convert percentage-based template slots to pixel values
 */
export function resolveTemplate(
  template: LayoutTemplate,
  canvasWidth: number,
  canvasHeight: number
): ResolvedSlot[] {
  return template.slots.map((slot) => ({
    ...slot,
    x: (slot.x / 100) * canvasWidth,
    y: (slot.y / 100) * canvasHeight,
    width: (slot.width / 100) * canvasWidth,
    height: (slot.height / 100) * canvasHeight,
  }));
}

/**
 * Check if a slot contains a point (for click detection)
 */
export function isPointInSlot(
  slot: ResolvedSlot,
  x: number,
  y: number
): boolean {
  return (
    x >= slot.x &&
    x <= slot.x + slot.width &&
    y >= slot.y &&
    y <= slot.y + slot.height
  );
}
