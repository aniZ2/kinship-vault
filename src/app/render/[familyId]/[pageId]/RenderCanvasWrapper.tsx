// src/app/render/[familyId]/[pageId]/RenderCanvasWrapper.tsx
// Wrapper for RenderCanvas that handles scaling and bleed offset for print
'use client';

import { useCallback } from 'react';
import { RenderCanvas } from '@/components/RenderCanvas/RenderCanvas';
import { EditorState, EditorItem } from '@/components/ScrapbookEditor/types';

interface Props {
  state: EditorState;
  width: number;
  height: number;
  scaleFactor: number;
  /** Bleed offset in pixels (already scaled). Items are shifted by this amount. */
  bleedOffset?: number;
  /** Whether this render is for print (enables print optimizations) */
  isForPrint?: boolean;
}

export function RenderCanvasWrapper({
  state,
  width,
  height,
  scaleFactor,
  bleedOffset = 0,
  isForPrint = false,
}: Props) {
  // Scale item positions and sizes
  // When bleed is enabled, offset all items by the bleed amount
  // This ensures content is positioned correctly on the extended canvas
  const scaledState: EditorState = {
    ...state,
    items: state.items.map((item: EditorItem) => ({
      ...item,
      // Scale and offset by bleed
      x: item.x * scaleFactor + bleedOffset,
      y: item.y * scaleFactor + bleedOffset,
      width: item.width * scaleFactor,
      height: item.height * scaleFactor,
      fontSize: item.fontSize ? item.fontSize * scaleFactor : undefined,
    })),
  };

  const handleReady = useCallback(() => {
    console.log('Render canvas ready', { isForPrint, bleedOffset });
  }, [isForPrint, bleedOffset]);

  return (
    <RenderCanvas
      state={scaledState}
      width={width}
      height={height}
      onReady={handleReady}
    />
  );
}
