// src/components/RenderCanvas/RenderCanvas.tsx
// View-only canvas for server-side rendering with Puppeteer

'use client';

import { useState, useEffect, useCallback } from 'react';
import { EditorItem, EditorState } from '@/components/ScrapbookEditor/types';
import { BACKGROUNDS, PHOTO_FILTERS, FONTS, WASHI_TAPES } from '@/components/ScrapbookEditor/constants';
import styles from '@/components/ScrapbookEditor/ScrapbookEditor.module.css';

interface RenderCanvasProps {
  state: EditorState;
  width: number;
  height: number;
  onReady?: () => void;
}

export function RenderCanvas({ state, width, height, onReady }: RenderCanvasProps) {
  const { items, background, customBgUrl } = state;
  const [imagesLoaded, setImagesLoaded] = useState(0);

  // Count total images that need to load
  const totalImages = items.filter(i => i.type === 'image').length + (customBgUrl ? 1 : 0);

  // Track image load completion
  const handleImageLoad = useCallback(() => {
    setImagesLoaded(prev => prev + 1);
  }, []);

  // Signal ready when all images loaded
  useEffect(() => {
    if (totalImages === 0 || imagesLoaded >= totalImages) {
      // Small delay to ensure rendering is complete
      const timer = setTimeout(() => {
        document.body.setAttribute('data-render-ready', 'true');
        onReady?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [imagesLoaded, totalImages, onReady]);

  // Build background style
  const bgOption = BACKGROUNDS.find(b => b.id === background);
  const canvasStyle: React.CSSProperties = {
    width,
    height,
    position: 'relative',
    overflow: 'hidden',
    background: customBgUrl
      ? `url(${customBgUrl}) center/cover`
      : bgOption?.type === 'color'
        ? bgOption.value
        : bgOption?.value || '#FDF8F0',
    backgroundSize: background === 'dotgrid' ? '20px 20px' :
                    background === 'grid' ? '20px 20px' :
                    background?.includes('polka') ? '40px 40px' :
                    background?.includes('confetti') ? '100px 100px' :
                    background?.includes('hearts') ? '60px 60px' :
                    background?.includes('stars') ? '80px 80px' :
                    undefined,
  };

  // Render a single item
  const renderItem = (item: EditorItem) => {
    const scaleX = item.flipX ? -1 : 1;
    const scaleY = item.flipY ? -1 : 1;

    return (
      <div
        key={item.id}
        className={`${styles.item} ${item.frame ? styles[`frame_${item.frame}`] : ''}`}
        style={{
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.type === 'image' && item.frame === 'polaroid' ? item.height + 40 : item.height,
          transform: `rotate(${item.rotation}deg) scaleX(${scaleX}) scaleY(${scaleY})`,
          zIndex: item.zIndex,
        }}
      >
        {item.type === 'image' && (
          <div className={`${styles.imageWrapper} ${item.shape && item.shape !== 'rectangle' ? styles[`shape_${item.shape}`] : ''} ${item.shadow && item.shadow !== 'none' ? styles[`shadow_${item.shadow.replace('-', '_')}`] : ''} ${item.border && item.border !== 'none' ? styles[`border_${item.border.replace('-', '_')}`] : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt=""
              className={styles.image}
              draggable={false}
              onLoad={handleImageLoad}
              onError={handleImageLoad}
              style={{
                filter: PHOTO_FILTERS.find(f => f.id === item.filter)?.css || 'none'
              }}
            />
            {item.frame === 'polaroid' && (
              <div className={styles.polaroidCaption}>
                <span className={styles.captionText}>
                  {item.caption || 'Memory'}
                </span>
              </div>
            )}
          </div>
        )}

        {item.type === 'text' && (
          <div
            className={`${styles.textContent} ${item.textEffect && item.textEffect !== 'none' ? styles[`textEffect_${item.textEffect.replace('-', '_')}`] : ''} ${item.textDecoration && item.textDecoration !== 'none' ? styles[`textDecoration_${item.textDecoration}`] : ''} ${item.textAlign ? styles[`textAlign_${item.textAlign}`] : ''}`}
            style={{
              fontFamily: FONTS.find(f => f.id === item.font)?.family,
              fontSize: item.fontSize,
              color: item.color,
              fontWeight: item.fontWeight || 'normal',
              fontStyle: item.fontStyle || 'normal',
              letterSpacing: item.letterSpacing ? `${item.letterSpacing}px` : undefined,
              backgroundColor: item.bgColor && item.bgColor !== 'transparent' ? item.bgColor : undefined,
              ...(item.textDecoration === 'highlight' ? {
                background: `linear-gradient(to top, rgba(254, 240, 138, 0.7) 40%, transparent 40%)`,
                padding: '2px 6px',
              } : {}),
            }}
          >
            {item.text}
          </div>
        )}

        {item.type === 'sticker' && (
          <div className={styles.stickerContent}>{item.emoji}</div>
        )}

        {item.type === 'tape' && (
          <div
            className={styles.tapeContent}
            style={{
              background: WASHI_TAPES.find(t => t.id === item.tapePattern)?.background || '#f8b4c4',
              backgroundSize: item.tapePattern?.includes('dots') ? '12px 12px' : undefined,
            }}
          >
            {item.tapePattern === 'hearts' && <span className={styles.tapePattern}>♥ ♥ ♥ ♥ ♥</span>}
            {item.tapePattern === 'stars' && <span className={styles.tapePattern}>★ ★ ★ ★ ★</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={canvasStyle} className={styles.canvas}>
      {/* Preload custom background */}
      {customBgUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={customBgUrl}
          alt=""
          style={{ display: 'none' }}
          onLoad={handleImageLoad}
          onError={handleImageLoad}
        />
      )}
      {items.map(renderItem)}
    </div>
  );
}

export default RenderCanvas;
