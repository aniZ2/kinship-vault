// src/app/render/[familyId]/[pageId]/RenderCanvasWrapper.tsx
'use client';

import { useCallback } from 'react';
import { RenderCanvas } from '@/components/RenderCanvas/RenderCanvas';
import { EditorState, EditorItem } from '@/components/ScrapbookEditor/types';

interface Props {
  state: EditorState;
  width: number;
  height: number;
  scaleFactor: number;
}

export function RenderCanvasWrapper({ state, width, height, scaleFactor }: Props) {
  // Scale item positions and sizes
  const scaledState: EditorState = {
    ...state,
    items: state.items.map((item: EditorItem) => ({
      ...item,
      x: item.x * scaleFactor,
      y: item.y * scaleFactor,
      width: item.width * scaleFactor,
      height: item.height * scaleFactor,
      fontSize: item.fontSize ? item.fontSize * scaleFactor : undefined,
    })),
  };

  const handleReady = useCallback(() => {
    console.log('Render canvas ready');
  }, []);

  return (
    <RenderCanvas
      state={scaledState}
      width={width}
      height={height}
      onReady={handleReady}
    />
  );
}
