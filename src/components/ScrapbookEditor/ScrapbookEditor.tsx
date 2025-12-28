// src/components/ScrapbookEditor/ScrapbookEditor.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase/client';
import { uploadToCloudflare } from '@/lib/cfImages';
import { EditorItem, EditorState, ScrapbookEditorProps, FrameStyle, PhotoFilter, TapePattern } from './types';
import { BACKGROUNDS, FRAMES, STICKERS, FONTS, TEXT_COLORS, PHOTO_FILTERS, WASHI_TAPES, generateId } from './constants';
import styles from './ScrapbookEditor.module.css';

export default function ScrapbookEditor({ mode = 'edit', initialState }: ScrapbookEditorProps) {
  const router = useRouter();
  const params = useParams();
  const familyId = params?.familyId as string;
  const pageId = params?.pageId as string;
  const isNew = pageId === 'new';
  const viewOnly = mode === 'view';

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [items, setItems] = useState<EditorItem[]>(initialState?.items || []);
  const [background, setBackground] = useState(initialState?.background || 'cream');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'photo' | 'text' | 'sticker' | 'tape' | 'frame' | 'background'>('photo');
  const [saving, setSaving] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<{ items: EditorItem[]; background: string }[]>([
    { items: initialState?.items || [], background: initialState?.background || 'cream' }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoingRef = useRef(false);

  // Drag state
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ id: string; startX: number; startY: number; itemX: number; itemY: number } | null>(null);

  // Resize state
  const [resizing, setResizing] = useState(false);
  const [aspectLock, setAspectLock] = useState(false);
  const resizeRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    corner: 'tl' | 'tr' | 'bl' | 'br';
    startItemX: number;
    startItemY: number;
    aspectRatio: number;
  } | null>(null);

  // Rotation state
  const [rotating, setRotating] = useState(false);
  const rotateRef = useRef<{
    id: string;
    centerX: number;
    centerY: number;
    startAngle: number;
    startRotation: number;
  } | null>(null);

  // Pinch gesture state (for mobile)
  const pinchRef = useRef<{
    id: string;
    initialDistance: number;
    initialAngle: number;
    initialWidth: number;
    initialHeight: number;
    initialRotation: number;
    touch1Id: number;
    touch2Id: number;
  } | null>(null);

  // Crop state
  const [cropMode, setCropMode] = useState(false);
  const [cropItemId, setCropItemId] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [cropImageSize, setCropImageSize] = useState({ width: 0, height: 0 });
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropDragRef = useRef<{ type: 'move' | 'resize'; startX: number; startY: number; startArea: typeof cropArea } | null>(null);

  // Filter picker state
  const [showFilterPicker, setShowFilterPicker] = useState(false);

  // Get selected item
  const selectedItem = items.find(i => i.id === selectedId);
  const cropItem = items.find(i => i.id === cropItemId);

  // Get background style
  const bgOption = BACKGROUNDS.find(b => b.id === background);
  const canvasStyle = bgOption ? { background: bgOption.value } : { background: '#FDF8F0' };

  // ============================================================================
  // HISTORY (UNDO/REDO)
  // ============================================================================

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Push state to history when items or background change
  useEffect(() => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false;
      return;
    }

    const currentState = history[historyIndex];
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(currentState?.items);
    const bgChanged = background !== currentState?.background;

    if (itemsChanged || bgChanged) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ items: [...items], background });
      // Limit history to 50 entries
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [items, background]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    isUndoingRef.current = true;
    const prevState = history[historyIndex - 1];
    setItems(prevState.items);
    setBackground(prevState.background);
    setHistoryIndex(historyIndex - 1);
    setSelectedId(null);
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    isUndoingRef.current = true;
    const nextState = history[historyIndex + 1];
    setItems(nextState.items);
    setBackground(nextState.background);
    setHistoryIndex(historyIndex + 1);
    setSelectedId(null);
  }, [canRedo, history, historyIndex]);

  // ============================================================================
  // ITEM OPERATIONS
  // ============================================================================

  const addItem = useCallback((item: Omit<EditorItem, 'id' | 'zIndex'>) => {
    const newItem: EditorItem = {
      ...item,
      id: generateId(),
      zIndex: items.length + 1,
    };
    setItems(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
    return newItem;
  }, [items.length]);

  const updateItem = useCallback((id: string, updates: Partial<EditorItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setSelectedId(null);
  }, []);

  const duplicateItem = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newItem: EditorItem = {
      ...item,
      id: generateId(),
      x: item.x + 20,
      y: item.y + 20,
      zIndex: items.length + 1,
    };
    setItems(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
  }, [items]);

  const rotateItem = useCallback((id: string, degrees: number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, rotation: (item.rotation + degrees) % 360 } : item
    ));
  }, []);

  const flipItem = useCallback((id: string, direction: 'horizontal' | 'vertical') => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (direction === 'horizontal') {
        return { ...item, flipX: !item.flipX };
      } else {
        return { ...item, flipY: !item.flipY };
      }
    }));
  }, []);

  const bringToFront = useCallback((id: string) => {
    const maxZ = Math.max(...items.map(i => i.zIndex));
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, zIndex: maxZ + 1 } : item
    ));
  }, [items]);

  const sendToBack = useCallback((id: string) => {
    const minZ = Math.min(...items.map(i => i.zIndex));
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, zIndex: minZ - 1 } : item
    ));
  }, [items]);

  const scaleItem = useCallback((id: string, factor: number) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      // Tape items cannot be resized
      if (item.type === 'tape') return item;
      const maxWidth = canvasRect ? canvasRect.width - item.x : 500;
      const maxHeight = canvasRect ? canvasRect.height - item.y : 500;
      const newWidth = Math.max(30, Math.min(maxWidth, item.width * factor));
      const newHeight = Math.max(30, Math.min(maxHeight, item.height * factor));
      return { ...item, width: newWidth, height: newHeight };
    }));
  }, []);

  // ============================================================================
  // CROP
  // ============================================================================

  const startCrop = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (!item || item.type !== 'image' || !item.src) return;
    setCropItemId(id);
    setCropMode(true);
  }, [items]);

  const handleCropImageLoad = useCallback(() => {
    if (!cropImageRef.current) return;
    const img = cropImageRef.current;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setCropImageSize({ width: w, height: h });
    // Default crop area: centered, 80% of image
    const size = Math.min(w, h) * 0.8;
    setCropArea({
      x: (w - size) / 2,
      y: (h - size) / 2,
      width: size,
      height: size,
    });
  }, []);

  const handleCropPointerDown = useCallback((e: React.PointerEvent, type: 'move' | 'tl' | 'tr' | 'bl' | 'br') => {
    e.preventDefault();
    e.stopPropagation();
    cropDragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startArea: { ...cropArea },
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [cropArea]);

  const handleCropPointerMove = useCallback((e: React.PointerEvent) => {
    if (!cropDragRef.current || !cropImageRef.current) return;
    const { type, startX, startY, startArea } = cropDragRef.current;
    const img = cropImageRef.current;
    const rect = img.getBoundingClientRect();
    const scaleX = cropImageSize.width / rect.width;
    const scaleY = cropImageSize.height / rect.height;
    const dx = (e.clientX - startX) * scaleX;
    const dy = (e.clientY - startY) * scaleY;

    if (type === 'move') {
      const newX = Math.max(0, Math.min(cropImageSize.width - startArea.width, startArea.x + dx));
      const newY = Math.max(0, Math.min(cropImageSize.height - startArea.height, startArea.y + dy));
      setCropArea({ ...startArea, x: newX, y: newY });
    } else if (type === 'br') {
      const newW = Math.max(50, Math.min(cropImageSize.width - startArea.x, startArea.width + dx));
      const newH = Math.max(50, Math.min(cropImageSize.height - startArea.y, startArea.height + dy));
      setCropArea({ ...startArea, width: newW, height: newH });
    } else if (type === 'bl') {
      const newW = Math.max(50, startArea.width - dx);
      const newH = Math.max(50, Math.min(cropImageSize.height - startArea.y, startArea.height + dy));
      const newX = Math.max(0, Math.min(startArea.x + startArea.width - 50, startArea.x + dx));
      setCropArea({ x: newX, y: startArea.y, width: newW, height: newH });
    } else if (type === 'tr') {
      const newW = Math.max(50, Math.min(cropImageSize.width - startArea.x, startArea.width + dx));
      const newH = Math.max(50, startArea.height - dy);
      const newY = Math.max(0, Math.min(startArea.y + startArea.height - 50, startArea.y + dy));
      setCropArea({ x: startArea.x, y: newY, width: newW, height: newH });
    } else if (type === 'tl') {
      const newW = Math.max(50, startArea.width - dx);
      const newH = Math.max(50, startArea.height - dy);
      const newX = Math.max(0, Math.min(startArea.x + startArea.width - 50, startArea.x + dx));
      const newY = Math.max(0, Math.min(startArea.y + startArea.height - 50, startArea.y + dy));
      setCropArea({ x: newX, y: newY, width: newW, height: newH });
    }
  }, [cropImageSize]);

  const handleCropPointerUp = useCallback(() => {
    cropDragRef.current = null;
  }, []);

  const applyCrop = useCallback(async () => {
    if (!cropItem?.src) {
      console.error('Crop: No source image');
      return;
    }

    try {
      // Fetch the image as a blob to avoid CORS issues
      const response = await fetch(cropItem.src);
      const imageBlob = await response.blob();
      const imageBlobUrl = URL.createObjectURL(imageBlob);

      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageBlobUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(imageBlobUrl);
        console.error('Crop: Could not get canvas context');
        return;
      }

      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );

      URL.revokeObjectURL(imageBlobUrl);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('Crop: Could not create blob');
          return;
        }

        const localURL = URL.createObjectURL(blob);
        updateItem(cropItem.id, { src: localURL, isUploading: true });
        setCropMode(false);
        setCropItemId(null);

        // Upload cropped image
        try {
          const auth = getAuth();
          const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
          const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });

          const res = await uploadToCloudflare(undefined, file, idToken, 'public', {
            apiBaseURL: process.env.NEXT_PUBLIC_IMAGES_API_BASE,
          });

          if (res?.deliveryURL && res?.imageId) {
            URL.revokeObjectURL(localURL);
            updateItem(cropItem.id, { src: res.deliveryURL, cfId: res.imageId, isUploading: false });
          } else {
            updateItem(cropItem.id, { isUploading: false });
          }
        } catch (uploadErr) {
          console.error('Crop: Upload failed', uploadErr);
          updateItem(cropItem.id, { isUploading: false });
        }
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Crop failed:', err);
      alert('Could not crop image. Please try again.');
    }
  }, [cropItem, cropArea, updateItem]);

  const cancelCrop = useCallback(() => {
    setCropMode(false);
    setCropItemId(null);
  }, []);

  // ============================================================================
  // PHOTO UPLOAD
  // ============================================================================

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    // Clone files BEFORE clearing input (some browsers clear FileList when input is cleared)
    const fileArray = Array.from(files);
    e.target.value = '';

    const rect = canvasRef.current?.getBoundingClientRect();
    const size = Math.min(rect?.width || 200, rect?.height || 200) * 0.5;

    for (const file of fileArray) {
      const localURL = URL.createObjectURL(file);
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const item = addItem({
        type: 'image',
        src: localURL,
        x: ((rect?.width || 300) - size) / 2,
        y: ((rect?.height || 400) - size) / 2,
        width: size,
        height: size,
        rotation: 0,
        frame: 'none',
        caption: `Memory · ${dateStr}`,
        isUploading: true,
      });

      // Upload to Cloudflare
      try {
        const auth = getAuth();
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;

        const res = await uploadToCloudflare(undefined, file, idToken, 'public', {
          apiBaseURL: process.env.NEXT_PUBLIC_IMAGES_API_BASE,
        });

        if (res?.deliveryURL && res?.imageId) {
          URL.revokeObjectURL(localURL);
          updateItem(item.id, { src: res.deliveryURL, cfId: res.imageId, isUploading: false });
        } else {
          updateItem(item.id, { isUploading: false });
        }
      } catch {
        updateItem(item.id, { isUploading: false });
      }
    }

    setDrawerOpen(false);
  };

  // ============================================================================
  // TEXT
  // ============================================================================

  const addText = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    addItem({
      type: 'text',
      text: 'Tap to edit',
      x: ((rect?.width || 300) - 150) / 2,
      y: ((rect?.height || 400) - 40) / 2,
      width: 150,
      height: 40,
      rotation: 0,
      font: 'handwriting',
      fontSize: 24,
      color: '#1f2937',
    });
    setDrawerOpen(false);
  };

  // ============================================================================
  // STICKERS
  // ============================================================================

  const addSticker = (emoji: string) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    addItem({
      type: 'sticker',
      emoji,
      x: ((rect?.width || 300) - 50) / 2,
      y: ((rect?.height || 400) - 50) / 2,
      width: 50,
      height: 50,
      rotation: 0,
    });
    setDrawerOpen(false);
  };

  // ============================================================================
  // WASHI TAPE
  // ============================================================================

  const addTape = (pattern: TapePattern) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    addItem({
      type: 'tape',
      tapePattern: pattern,
      x: ((rect?.width || 300) - 60) / 2,
      y: ((rect?.height || 400) - 12) / 2,
      width: 60,
      height: 12,
      rotation: Math.random() > 0.5 ? -8 : 8, // Slight random tilt
    });
    setDrawerOpen(false);
  };

  // ============================================================================
  // DRAG HANDLING
  // ============================================================================

  const handlePointerDown = (e: React.PointerEvent, item: EditorItem) => {
    if (viewOnly) return;
    e.preventDefault();
    e.stopPropagation();

    setSelectedId(item.id);
    setDragging(true);
    dragRef.current = {
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      itemX: item.x,
      itemY: item.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragRef.current) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    // Get canvas bounds
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Get the item being dragged
    const item = items.find(i => i.id === dragRef.current?.id);
    if (!item) return;

    // Calculate new position
    let newX = dragRef.current.itemX + dx;
    let newY = dragRef.current.itemY + dy;

    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(canvasRect.width - item.width, newX));
    newY = Math.max(0, Math.min(canvasRect.height - item.height, newY));

    updateItem(dragRef.current.id, { x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setDragging(false);
    dragRef.current = null;
  };

  // ============================================================================
  // RESIZE HANDLING
  // ============================================================================

  const handleResizeStart = (e: React.PointerEvent, item: EditorItem, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    if (viewOnly) return;
    // Tape items cannot be resized
    if (item.type === 'tape') return;
    e.preventDefault();
    e.stopPropagation();

    setResizing(true);
    resizeRef.current = {
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: item.width,
      startHeight: item.height,
      corner,
      startItemX: item.x,
      startItemY: item.y,
      aspectRatio: item.width / item.height,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizing || !resizeRef.current) return;

    const { id, startX, startY, startWidth, startHeight, corner, startItemX, startItemY, aspectRatio } = resizeRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Get canvas bounds
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newX = startItemX;
    let newY = startItemY;

    // Calculate new dimensions based on which corner is being dragged
    if (corner === 'br') {
      newWidth = Math.max(50, startWidth + dx);
      newHeight = aspectLock ? newWidth / aspectRatio : Math.max(50, startHeight + dy);
    } else if (corner === 'bl') {
      newWidth = Math.max(50, startWidth - dx);
      newHeight = aspectLock ? newWidth / aspectRatio : Math.max(50, startHeight + dy);
      newX = startItemX + (startWidth - newWidth);
    } else if (corner === 'tr') {
      newWidth = Math.max(50, startWidth + dx);
      newHeight = aspectLock ? newWidth / aspectRatio : Math.max(50, startHeight - dy);
      newY = aspectLock ? startItemY - (newHeight - startHeight) : startItemY + (startHeight - newHeight);
    } else if (corner === 'tl') {
      newWidth = Math.max(50, startWidth - dx);
      newHeight = aspectLock ? newWidth / aspectRatio : Math.max(50, startHeight - dy);
      newX = startItemX + (startWidth - newWidth);
      newY = aspectLock ? startItemY - (newHeight - startHeight) : startItemY + (startHeight - newHeight);
    }

    // Ensure minimum height when aspect locked
    if (aspectLock && newHeight < 50) {
      newHeight = 50;
      newWidth = newHeight * aspectRatio;
    }

    // Clamp position to canvas bounds
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    // Clamp size so item doesn't exceed canvas
    newWidth = Math.min(newWidth, canvasRect.width - newX);
    newHeight = Math.min(newHeight, canvasRect.height - newY);

    updateItem(id, { width: newWidth, height: newHeight, x: newX, y: newY });
  };

  const handleResizeEnd = () => {
    setResizing(false);
    resizeRef.current = null;
  };

  // ============================================================================
  // ROTATION HANDLING
  // ============================================================================

  const handleRotateStart = (e: React.PointerEvent, item: EditorItem) => {
    if (viewOnly) return;
    e.preventDefault();
    e.stopPropagation();

    // Calculate center of the item
    const itemEl = (e.target as HTMLElement).closest(`.${styles.item}`) as HTMLElement;
    if (!itemEl) return;

    const rect = itemEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate starting angle from center to pointer
    const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

    setRotating(true);
    rotateRef.current = {
      id: item.id,
      centerX,
      centerY,
      startAngle,
      startRotation: item.rotation,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRotateMove = (e: React.PointerEvent) => {
    if (!rotating || !rotateRef.current) return;

    const { id, centerX, centerY, startAngle, startRotation } = rotateRef.current;

    // Calculate current angle from center to pointer
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const deltaAngle = currentAngle - startAngle;

    let newRotation = startRotation + deltaAngle;
    // Normalize to 0-360
    while (newRotation < 0) newRotation += 360;
    while (newRotation >= 360) newRotation -= 360;

    updateItem(id, { rotation: newRotation });
  };

  const handleRotateEnd = () => {
    setRotating(false);
    rotateRef.current = null;
  };

  // ============================================================================
  // PINCH GESTURE (MOBILE)
  // ============================================================================

  const getDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAngle = (touch1: Touch, touch2: Touch) => {
    return Math.atan2(touch2.clientY - touch1.clientY, touch2.clientX - touch1.clientX) * (180 / Math.PI);
  };

  const handleTouchStart = (e: React.TouchEvent, item: EditorItem) => {
    if (viewOnly) return;

    // Only handle pinch with exactly 2 fingers
    if (e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      pinchRef.current = {
        id: item.id,
        initialDistance: getDistance(touch1, touch2),
        initialAngle: getAngle(touch1, touch2),
        initialWidth: item.width,
        initialHeight: item.height,
        initialRotation: item.rotation,
        touch1Id: touch1.identifier,
        touch2Id: touch2.identifier,
      };

      setSelectedId(item.id);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pinchRef.current || e.touches.length !== 2) return;

    e.preventDefault();

    const touch1 = Array.from(e.touches).find(t => t.identifier === pinchRef.current!.touch1Id);
    const touch2 = Array.from(e.touches).find(t => t.identifier === pinchRef.current!.touch2Id);

    if (!touch1 || !touch2) return;

    const { id, initialDistance, initialAngle, initialWidth, initialHeight, initialRotation } = pinchRef.current;

    // Get canvas bounds and item
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    const item = items.find(i => i.id === id);
    if (!canvasRect || !item) return;

    // Calculate rotation
    const currentAngle = getAngle(touch1, touch2);
    const deltaAngle = currentAngle - initialAngle;
    let newRotation = initialRotation + deltaAngle;

    // Normalize rotation
    while (newRotation < 0) newRotation += 360;
    while (newRotation >= 360) newRotation -= 360;

    // Tape items: rotation only, no resize
    if (item.type === 'tape') {
      updateItem(id, { rotation: newRotation });
      return;
    }

    // Calculate scale for non-tape items
    const currentDistance = getDistance(touch1, touch2);
    const scale = currentDistance / initialDistance;

    // Apply changes with canvas bounds
    const maxWidth = canvasRect.width - item.x;
    const maxHeight = canvasRect.height - item.y;
    const newWidth = Math.max(50, Math.min(maxWidth, initialWidth * scale));
    const newHeight = Math.max(50, Math.min(maxHeight, initialHeight * scale));

    updateItem(id, {
      width: newWidth,
      height: newHeight,
      rotation: newRotation
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // End pinch when less than 2 fingers
    if (e.touches.length < 2) {
      pinchRef.current = null;
    }
  };

  // ============================================================================
  // SAVE
  // ============================================================================

  const handleSave = async () => {
    if (!familyId) {
      console.error('Save: No familyId');
      alert('Cannot save: No family selected');
      return;
    }
    if (saving) return;

    // Check if any images are still uploading
    const uploadingItems = items.filter(item => item.isUploading);
    if (uploadingItems.length > 0) {
      alert('Please wait for images to finish uploading');
      return;
    }

    // Warn about blob URLs (images that failed to upload)
    const blobItems = items.filter(item => item.src?.startsWith('blob:'));
    if (blobItems.length > 0) {
      console.warn('Some images have local blob URLs and may not persist:', blobItems);
    }

    setSaving(true);

    try {
      const state: EditorState = { background, items };
      const pid = isNew ? generateId() : pageId;

      console.log('Saving page:', { familyId, pid, isNew, itemCount: items.length });

      const data = {
        familyId,
        state,
        updatedAt: serverTimestamp(),
      };

      if (isNew) {
        const auth = getAuth();
        await setDoc(doc(db, `families/${familyId}/pages/${pid}`), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || 'anon',
          order: Date.now(),
          title: 'Untitled',
          status: 'published',
        });
      } else {
        await updateDoc(doc(db, `families/${familyId}/pages/${pid}`), data);
      }

      console.log('Save successful');
      router.push(`/families/${familyId}/story`);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // RENDER ITEM
  // ============================================================================

  const renderItem = (item: EditorItem) => {
    const isSelected = item.id === selectedId;
    const scaleX = item.flipX ? -1 : 1;
    const scaleY = item.flipY ? -1 : 1;

    return (
      <div
        key={item.id}
        className={`${styles.item} ${isSelected ? styles.selected : ''} ${item.frame ? styles[`frame_${item.frame}`] : ''}`}
        style={{
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.type === 'image' && item.frame === 'polaroid' ? item.height + 40 : item.height,
          transform: `rotate(${item.rotation}deg) scaleX(${scaleX}) scaleY(${scaleY})`,
          zIndex: item.zIndex,
        }}
        onPointerDown={(e) => handlePointerDown(e, item)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={(e) => handleTouchStart(e, item)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {item.type === 'image' && (
          <div className={styles.imageWrapper}>
            {item.isUploading && <div className={styles.uploadingOverlay}>Uploading...</div>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt=""
              className={styles.image}
              draggable={false}
              style={{
                filter: PHOTO_FILTERS.find(f => f.id === item.filter)?.css || 'none'
              }}
            />
            {item.frame === 'polaroid' && (
              <div className={styles.polaroidCaption}>
                <span
                  className={styles.captionText}
                  contentEditable={!viewOnly}
                  suppressContentEditableWarning
                  onBlur={(e) => updateItem(item.id, { caption: e.currentTarget.textContent || '' })}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {item.caption || 'Memory'}
                </span>
              </div>
            )}
          </div>
        )}

        {item.type === 'text' && (
          <div
            className={styles.textContent}
            contentEditable={!viewOnly}
            suppressContentEditableWarning
            style={{
              fontFamily: FONTS.find(f => f.id === item.font)?.family,
              fontSize: item.fontSize,
              color: item.color,
            }}
            onFocus={(e) => {
              // Select all text on focus if it's the default placeholder
              if (item.text === 'Tap to edit') {
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(e.currentTarget);
                selection?.removeAllRanges();
                selection?.addRange(range);
              }
            }}
            onBlur={(e) => updateItem(item.id, { text: e.currentTarget.textContent || '' })}
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

        {isSelected && !viewOnly && (
          <>
            <button className={styles.deleteBtn} onClick={() => deleteItem(item.id)}>×</button>
            {/* Rotation handle */}
            <div className={styles.rotateHandleWrapper}>
              <div className={styles.rotateHandleLine} />
              <div
                className={styles.rotateHandle}
                onPointerDown={(e) => handleRotateStart(e, item)}
                onPointerMove={handleRotateMove}
                onPointerUp={handleRotateEnd}
                onPointerCancel={handleRotateEnd}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-9-9M21 3v6h-6" />
                </svg>
              </div>
            </div>
            {/* Resize handles - not for tape */}
            {item.type !== 'tape' && (
              <>
                <div
                  className={`${styles.resizeHandle} ${styles.resizeHandleTL}`}
                  onPointerDown={(e) => handleResizeStart(e, item, 'tl')}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  onPointerCancel={handleResizeEnd}
                />
                <div
                  className={`${styles.resizeHandle} ${styles.resizeHandleTR}`}
                  onPointerDown={(e) => handleResizeStart(e, item, 'tr')}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  onPointerCancel={handleResizeEnd}
                />
                <div
                  className={`${styles.resizeHandle} ${styles.resizeHandleBL}`}
                  onPointerDown={(e) => handleResizeStart(e, item, 'bl')}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  onPointerCancel={handleResizeEnd}
                />
                <div
                  className={`${styles.resizeHandle} ${styles.resizeHandleBR}`}
                  onPointerDown={(e) => handleResizeStart(e, item, 'br')}
                  onPointerMove={handleResizeMove}
                  onPointerUp={handleResizeEnd}
                  onPointerCancel={handleResizeEnd}
                />
              </>
            )}
          </>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setDrawerOpen(!drawerOpen)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            {!viewOnly && (
              <div className={styles.undoRedoBtns}>
                <button
                  className={styles.undoBtn}
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7v6h6M3 13a9 9 0 1 0 2.5-6.3L3 9" />
                  </svg>
                </button>
                <button
                  className={styles.redoBtn}
                  onClick={redo}
                  disabled={!canRedo}
                  title="Redo"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 7v6h-6M21 13a9 9 0 1 1-2.5-6.3L21 9" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <span className={styles.title}>{selectedItem ? (selectedItem.type === 'image' ? 'Edit Photo' : selectedItem.type === 'text' ? 'Edit Text' : selectedItem.type === 'tape' ? 'Edit Tape' : 'Edit Sticker') : 'Page Editor'}</span>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving || viewOnly}>
            {saving ? 'Saving...' : 'Done'}
          </button>
        </div>

        {/* Editing Tools Row - shows when item selected */}
        {selectedItem && !viewOnly && (
          <div className={styles.toolsRow}>
            {/* Rotate buttons - for all items */}
            <button className={styles.toolBtn} onClick={() => rotateItem(selectedItem.id, -90)} title="Rotate Left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38" />
              </svg>
            </button>
            <button className={styles.toolBtn} onClick={() => rotateItem(selectedItem.id, 90)} title="Rotate Right">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
              </svg>
            </button>
            {/* Flip buttons - NOT for tape */}
            {selectedItem.type !== 'tape' && (
              <>
                <div className={styles.toolDivider} />
                <button className={styles.toolBtn} onClick={() => flipItem(selectedItem.id, 'horizontal')} title="Flip H">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 3v18M16 7l4 5-4 5M8 7l-4 5 4 5" />
                  </svg>
                </button>
                <button className={styles.toolBtn} onClick={() => flipItem(selectedItem.id, 'vertical')} title="Flip V">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18M7 8l5-4 5 4M7 16l5 4 5-4" />
                  </svg>
                </button>
              </>
            )}
            {selectedItem.type === 'image' && (
              <>
                <div className={styles.toolDivider} />
                <button className={styles.toolBtn} onClick={() => startCrop(selectedItem.id)} title="Crop">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2v4H2M18 22v-4h4M2 6h16a2 2 0 0 1 2 2v12M22 18H6a2 2 0 0 1-2-2V4" />
                  </svg>
                </button>
                <button
                  className={`${styles.toolBtn} ${showFilterPicker ? styles.toolBtnActive : ''}`}
                  onClick={() => setShowFilterPicker(!showFilterPicker)}
                  title="Filter"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity="0.3" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </button>
              </>
            )}
            {/* Scale buttons - NOT for tape */}
            {selectedItem.type !== 'tape' && (
              <>
                <div className={styles.toolDivider} />
                <button className={styles.toolBtn} onClick={() => scaleItem(selectedItem.id, 0.9)} title="Smaller">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35M8 11h6" />
                  </svg>
                </button>
                <button className={styles.toolBtn} onClick={() => scaleItem(selectedItem.id, 1.1)} title="Larger">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                  </svg>
                </button>
                <button
                  className={`${styles.toolBtn} ${aspectLock ? styles.toolBtnActive : ''}`}
                  onClick={() => setAspectLock(!aspectLock)}
                  title={aspectLock ? "Unlock Ratio" : "Lock Ratio"}
                >
                  {aspectLock ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                    </svg>
                  )}
                </button>
              </>
            )}
            <div className={styles.toolDivider} />
            <button className={styles.toolBtn} onClick={() => bringToFront(selectedItem.id)} title="Front">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="8" y="8" width="12" height="12" rx="2" />
                <path d="M4 16V6a2 2 0 0 1 2-2h10" />
              </svg>
            </button>
            <button className={styles.toolBtn} onClick={() => sendToBack(selectedItem.id)} title="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="12" height="12" rx="2" />
                <path d="M20 8v10a2 2 0 0 1-2 2H8" />
              </svg>
            </button>
            <div className={styles.toolDivider} />
            <button className={styles.toolBtn} onClick={() => duplicateItem(selectedItem.id)} title="Copy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            </button>
            <button className={`${styles.toolBtn} ${styles.deleteToolBtn}`} onClick={() => deleteItem(selectedItem.id)} title="Delete">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>

            {/* Filter Picker Dropdown */}
            {selectedItem?.type === 'image' && showFilterPicker && (
              <div className={styles.filterPickerInline}>
                {PHOTO_FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    className={`${styles.filterBtn} ${selectedItem.filter === filter.id || (!selectedItem.filter && filter.id === 'none') ? styles.filterBtnActive : ''}`}
                    onClick={() => {
                      updateItem(selectedItem.id, { filter: filter.id as PhotoFilter });
                      setShowFilterPicker(false);
                    }}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Drawer Overlay */}
      {drawerOpen && <div className={styles.overlay} onClick={() => setDrawerOpen(false)} />}

      {/* Side Drawer */}
      <aside className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <span>Tools</span>
          <button onClick={() => setDrawerOpen(false)}>×</button>
        </div>

        <nav className={styles.drawerTabs}>
          {(['photo', 'text', 'sticker', 'tape', 'frame', 'background'] as const).map(tab => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${drawerTab === tab ? styles.activeTab : ''}`}
              onClick={() => setDrawerTab(tab)}
            >
              {tab === 'photo' && '📷'}
              {tab === 'text' && '✏️'}
              {tab === 'sticker' && '😊'}
              {tab === 'tape' && '🎀'}
              {tab === 'frame' && '🖼️'}
              {tab === 'background' && '🎨'}
              <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </button>
          ))}
        </nav>

        <div className={styles.drawerContent}>
          {/* Photo Tab */}
          {drawerTab === 'photo' && (
            <div className={styles.tabPanel}>
              <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <span>Choose Photo</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className={styles.hiddenInput}
                onChange={handlePhotoSelect}
              />
            </div>
          )}

          {/* Text Tab */}
          {drawerTab === 'text' && (
            <div className={styles.tabPanel}>
              <button className={styles.addTextBtn} onClick={addText}>
                + Add Text
              </button>
              {selectedItem?.type === 'text' && (
                <div className={styles.textOptions}>
                  <h4>Font</h4>
                  <div className={styles.fontGrid}>
                    {FONTS.map(font => (
                      <button
                        key={font.id}
                        className={`${styles.fontBtn} ${selectedItem.font === font.id ? styles.activeFont : ''}`}
                        style={{ fontFamily: font.family }}
                        onClick={() => updateItem(selectedItem.id, { font: font.id as any })}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                  <h4>Color</h4>
                  <div className={styles.colorGrid}>
                    {TEXT_COLORS.map(color => (
                      <button
                        key={color}
                        className={`${styles.colorBtn} ${selectedItem.color === color ? styles.activeColor : ''}`}
                        style={{ background: color }}
                        onClick={() => updateItem(selectedItem.id, { color })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sticker Tab */}
          {drawerTab === 'sticker' && (
            <div className={styles.tabPanel}>
              {STICKERS.map(category => (
                <div key={category.id} className={styles.stickerCategory}>
                  <h4>{category.label}</h4>
                  <div className={styles.stickerGrid}>
                    {category.items.map(emoji => (
                      <button key={emoji} className={styles.stickerBtn} onClick={() => addSticker(emoji)}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tape Tab */}
          {drawerTab === 'tape' && (
            <div className={styles.tabPanel}>
              <h4>Washi Tape</h4>
              <div className={styles.tapeGrid}>
                {WASHI_TAPES.map(tape => (
                  <button
                    key={tape.id}
                    className={styles.tapeBtn}
                    onClick={() => addTape(tape.id)}
                  >
                    <div
                      className={styles.tapePreview}
                      style={{
                        background: tape.background,
                        backgroundSize: tape.id.includes('dots') ? '12px 12px' : undefined,
                      }}
                    >
                      {tape.id === 'hearts' && <span>♥♥♥</span>}
                      {tape.id === 'stars' && <span>★★★</span>}
                    </div>
                    <span className={styles.tapeLabel}>{tape.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Frame Tab */}
          {drawerTab === 'frame' && selectedItem?.type === 'image' && (
            <div className={styles.tabPanel}>
              <div className={styles.frameGrid}>
                {FRAMES.map(frame => (
                  <button
                    key={frame.id}
                    className={`${styles.frameBtn} ${selectedItem.frame === frame.id ? styles.activeFrame : ''}`}
                    onClick={() => updateItem(selectedItem.id, { frame: frame.id })}
                  >
                    <span className={styles.frameLabel}>{frame.label}</span>
                    <span className={styles.frameDesc}>{frame.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {drawerTab === 'frame' && (!selectedItem || selectedItem.type !== 'image') && (
            <div className={styles.tabPanel}>
              <p className={styles.hint}>Select an image to change its frame style</p>
            </div>
          )}

          {/* Background Tab */}
          {drawerTab === 'background' && (
            <div className={styles.tabPanel}>
              <div className={styles.bgGrid}>
                {BACKGROUNDS.map(bg => (
                  <button
                    key={bg.id}
                    className={`${styles.bgBtn} ${background === bg.id ? styles.activeBg : ''}`}
                    style={{ background: bg.type === 'texture' ? bg.preview : bg.value }}
                    onClick={() => setBackground(bg.id)}
                  >
                    <span>{bg.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Canvas */}
      <main className={styles.canvasWrapper}>
        <div
          ref={canvasRef}
          className={styles.canvas}
          style={canvasStyle}
          onClick={(e) => {
            if (e.target === canvasRef.current) {
              setSelectedId(null);
            }
          }}
        >
          {items.map(renderItem)}
        </div>
      </main>

      {/* Crop Modal */}
      {cropMode && cropItem && (
        <div className={styles.cropModal}>
          <div className={styles.cropHeader}>
            <button className={styles.cropCancelBtn} onClick={cancelCrop}>Cancel</button>
            <span className={styles.cropTitle}>Crop Photo</span>
            <button className={styles.cropApplyBtn} onClick={applyCrop}>Apply</button>
          </div>
          <div className={styles.cropContainer}>
            <div className={styles.cropImageWrapper}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={cropImageRef}
                src={cropItem.src}
                alt=""
                className={styles.cropImage}
                onLoad={handleCropImageLoad}
                draggable={false}
              />
              {cropImageSize.width > 0 && (
                <div
                  className={styles.cropOverlay}
                  style={{
                    '--crop-x': `${(cropArea.x / cropImageSize.width) * 100}%`,
                    '--crop-y': `${(cropArea.y / cropImageSize.height) * 100}%`,
                    '--crop-w': `${(cropArea.width / cropImageSize.width) * 100}%`,
                    '--crop-h': `${(cropArea.height / cropImageSize.height) * 100}%`,
                  } as React.CSSProperties}
                >
                  <div className={styles.cropDarkTop} />
                  <div className={styles.cropMiddleRow}>
                    <div className={styles.cropDarkLeft} />
                    <div
                      className={styles.cropSelection}
                      onPointerDown={(e) => handleCropPointerDown(e, 'move')}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={handleCropPointerUp}
                      onPointerCancel={handleCropPointerUp}
                    >
                      <div
                        className={styles.cropCorner}
                        data-pos="tl"
                        onPointerDown={(e) => handleCropPointerDown(e, 'tl')}
                        onPointerMove={handleCropPointerMove}
                        onPointerUp={handleCropPointerUp}
                        onPointerCancel={handleCropPointerUp}
                      />
                      <div
                        className={styles.cropCorner}
                        data-pos="tr"
                        onPointerDown={(e) => handleCropPointerDown(e, 'tr')}
                        onPointerMove={handleCropPointerMove}
                        onPointerUp={handleCropPointerUp}
                        onPointerCancel={handleCropPointerUp}
                      />
                      <div
                        className={styles.cropCorner}
                        data-pos="bl"
                        onPointerDown={(e) => handleCropPointerDown(e, 'bl')}
                        onPointerMove={handleCropPointerMove}
                        onPointerUp={handleCropPointerUp}
                        onPointerCancel={handleCropPointerUp}
                      />
                      <div
                        className={styles.cropCorner}
                        data-pos="br"
                        onPointerDown={(e) => handleCropPointerDown(e, 'br')}
                        onPointerMove={handleCropPointerMove}
                        onPointerUp={handleCropPointerUp}
                        onPointerCancel={handleCropPointerUp}
                      />
                    </div>
                    <div className={styles.cropDarkRight} />
                  </div>
                  <div className={styles.cropDarkBottom} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
