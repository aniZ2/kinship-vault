// src/components/Canvas/Canvas.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase/client";
import {
  uploadToCloudflare,
  replaceCloudflareImage,
  deleteCloudflareImages,
} from "@/lib/cfImages";
import { toPng } from "html-to-image";
import html2canvas from "html2canvas";
import styles from "./Canvas.module.css";

// ============================================================================
// TYPES
// ============================================================================

interface CanvasProps {
  mode?: "edit" | "view";
  initialState?: CanvasState | null;
}

interface CanvasState {
  background: string;
  items: CanvasItem[];
}

interface CanvasItem {
  id: string;
  type: "image" | "text" | "sticker";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  // Image specific
  src?: string;
  cfId?: string;
  filter?: string;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: string;
  bgColor?: string;
  // Sticker specific
  stickerData?: string;
  // Style
  borderRadius?: number;
  shadow?: boolean;
  shape?: string;
}

type Tool = "select" | "photo" | "text" | "sticker" | "background" | "adjust";
type BottomSheet = null | "photo" | "text" | "sticker" | "background" | "adjust" | "item-options";

// ============================================================================
// CONSTANTS
// ============================================================================

const BACKGROUNDS = [
  { id: "white", color: "#ffffff", label: "White" },
  { id: "cream", color: "#fefae0", label: "Cream" },
  { id: "blush", color: "#ffe3ec", label: "Blush" },
  { id: "mint", color: "#e7fff3", label: "Mint" },
  { id: "sky", color: "#eaf6ff", label: "Sky" },
  { id: "lilac", color: "#efe8ff", label: "Lilac" },
  { id: "charcoal", color: "#1f2937", label: "Dark" },
  { id: "sunset", color: "linear-gradient(135deg,#ff9a9e 0%,#fad0c4 100%)", label: "Sunset" },
  { id: "ocean", color: "linear-gradient(135deg,#a1c4fd 0%,#c2e9fb 100%)", label: "Ocean" },
  { id: "forest", color: "linear-gradient(135deg,#d4fc79 0%,#96e6a1 100%)", label: "Forest" },
  { id: "berry", color: "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)", label: "Berry" },
  { id: "cork", color: "url(https://www.transparenttextures.com/patterns/cork-wallet.png)", label: "Cork" },
];

const FILTERS = [
  { id: "none", label: "Normal", css: "" },
  { id: "grayscale", label: "B&W", css: "grayscale(1)" },
  { id: "sepia", label: "Sepia", css: "sepia(0.8)" },
  { id: "warm", label: "Warm", css: "sepia(0.2) saturate(1.3)" },
  { id: "cool", label: "Cool", css: "hue-rotate(20deg) saturate(0.9)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.4) contrast(1.1) brightness(0.95)" },
  { id: "dramatic", label: "Drama", css: "contrast(1.3) brightness(0.9)" },
  { id: "fade", label: "Fade", css: "contrast(0.9) brightness(1.1) saturate(0.7)" },
];

const STICKERS = [
  { id: "heart", emoji: "❤️", label: "Heart" },
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "sparkle", emoji: "✨", label: "Sparkle" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "rainbow", emoji: "🌈", label: "Rainbow" },
  { id: "flower", emoji: "🌸", label: "Flower" },
  { id: "butterfly", emoji: "🦋", label: "Butterfly" },
  { id: "sun", emoji: "☀️", label: "Sun" },
  { id: "moon", emoji: "🌙", label: "Moon" },
  { id: "cloud", emoji: "☁️", label: "Cloud" },
  { id: "camera", emoji: "📷", label: "Camera" },
  { id: "gift", emoji: "🎁", label: "Gift" },
  { id: "balloon", emoji: "🎈", label: "Balloon" },
  { id: "confetti", emoji: "🎉", label: "Party" },
  { id: "crown", emoji: "👑", label: "Crown" },
  { id: "gem", emoji: "💎", label: "Gem" },
  { id: "music", emoji: "🎵", label: "Music" },
  { id: "leaf", emoji: "🍃", label: "Leaf" },
  { id: "paw", emoji: "🐾", label: "Paw" },
  { id: "plane", emoji: "✈️", label: "Travel" },
];

const TEXT_STYLES = [
  { id: "title", fontSize: 32, fontFamily: "'Inter', sans-serif", fontWeight: 700, label: "Title" },
  { id: "handwritten", fontSize: 28, fontFamily: "'Caveat', cursive", fontWeight: 400, label: "Handwritten" },
  { id: "caption", fontSize: 16, fontFamily: "'Inter', sans-serif", fontWeight: 400, label: "Caption" },
  { id: "quote", fontSize: 24, fontFamily: "Georgia, serif", fontWeight: 400, fontStyle: "italic", label: "Quote" },
];

const SHAPES = [
  { id: "none", label: "None", clip: "" },
  { id: "rounded", label: "Rounded", clip: "", radius: 16 },
  { id: "circle", label: "Circle", clip: "circle(50%)" },
  { id: "heart", label: "Heart", clip: "polygon(50% 15%, 61% 5%, 75% 5%, 90% 15%, 90% 35%, 50% 75%, 10% 35%, 10% 15%, 25% 5%, 39% 5%)" },
  { id: "star", label: "Star", clip: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" },
  { id: "hexagon", label: "Hexagon", clip: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" },
];

// ============================================================================
// HELPERS
// ============================================================================

const generateId = () => Math.random().toString(36).substr(2, 9);
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

function getDistance(touches: React.TouchList | TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function getAngle(touches: React.TouchList | TouchList): number {
  if (touches.length < 2) return 0;
  return Math.atan2(
    touches[1].clientY - touches[0].clientY,
    touches[1].clientX - touches[0].clientX
  ) * (180 / Math.PI);
}

function getCenter(touches: React.TouchList | TouchList): { x: number; y: number } {
  if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

function vibrate(pattern: number | number[] = 10) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Canvas({ mode = "edit", initialState }: CanvasProps) {
  console.log("[Canvas] Component mounted, mode:", mode);
  const viewOnly = mode === "view";
  const params = useParams();
  const router = useRouter();
  const familyId = params?.familyId as string | undefined;
  const pageId = params?.pageId as string | undefined;

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionUploads = useRef(new Set<string>());

  // State
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [background, setBackground] = useState("white");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [bottomSheet, setBottomSheet] = useState<BottomSheet>(null);
  const [saving, setSaving] = useState(false);

  // History for undo/redo
  const [history, setHistory] = useState<CanvasState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Gesture state (touch)
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    startItemX: number;
    startItemY: number;
    startWidth: number;
    startHeight: number;
    startRotation: number;
    startDistance: number;
    startAngle: number;
    isPinching: boolean;
  } | null>(null);

  // Mouse drag state
  const mouseDragRef = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    startItemX: number;
    startItemY: number;
  } | null>(null);

  // Computed
  const selectedItem = items.find((i) => i.id === selectedId) || null;
  const canvasRect = canvasRef.current?.getBoundingClientRect();

  // ============================================================================
  // HISTORY
  // ============================================================================

  const saveToHistory = useCallback(() => {
    const state: CanvasState = { background, items: [...items] };
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      // Limit history size
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [background, items, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setItems(prevState.items);
      setBackground(prevState.background);
      setHistoryIndex((prev) => prev - 1);
      vibrate();
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setItems(nextState.items);
      setBackground(nextState.background);
      setHistoryIndex((prev) => prev + 1);
      vibrate();
    }
  }, [history, historyIndex]);

  // ============================================================================
  // ITEM OPERATIONS
  // ============================================================================

  const addItem = useCallback((item: Omit<CanvasItem, "id" | "zIndex">) => {
    const newItem: CanvasItem = {
      ...item,
      id: generateId(),
      zIndex: items.length + 1,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
    setBottomSheet(null);
    saveToHistory();
    vibrate();
    return newItem;
  }, [items.length, saveToHistory]);

  const updateItem = useCallback((id: string, updates: Partial<CanvasItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedId(null);
    setBottomSheet(null);
    saveToHistory();
    vibrate([10, 50, 10]);
  }, [saveToHistory]);

  const duplicateItem = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newItem: CanvasItem = {
      ...item,
      id: generateId(),
      x: item.x + 20,
      y: item.y + 20,
      zIndex: items.length + 1,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
    saveToHistory();
    vibrate();
  }, [items, saveToHistory]);

  const bringToFront = useCallback((id: string) => {
    const maxZ = Math.max(...items.map((i) => i.zIndex));
    updateItem(id, { zIndex: maxZ + 1 });
    vibrate();
  }, [items, updateItem]);

  // ============================================================================
  // TOUCH HANDLERS
  // ============================================================================

  const handleCanvasTouch = (e: React.TouchEvent) => {
    if (viewOnly) return;
    
    // Tap on empty canvas = deselect
    if (e.target === canvasRef.current) {
      setSelectedId(null);
      setBottomSheet(null);
    }
  };

  const handleItemTouchStart = (e: React.TouchEvent, item: CanvasItem) => {
    if (viewOnly) return;
    e.stopPropagation();

    setSelectedId(item.id);
    bringToFront(item.id);

    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    gestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startItemX: item.x,
      startItemY: item.y,
      startWidth: item.width,
      startHeight: item.height,
      startRotation: item.rotation,
      startDistance: e.touches.length >= 2 ? getDistance(e.touches) : 0,
      startAngle: e.touches.length >= 2 ? getAngle(e.touches) : item.rotation,
      isPinching: e.touches.length >= 2,
    };
  };

  const handleItemTouchMove = (e: React.TouchEvent, item: CanvasItem) => {
    if (viewOnly || !gestureRef.current) return;
    e.preventDefault();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const gesture = gestureRef.current;

    if (e.touches.length >= 2) {
      // Pinch to resize + rotate
      gesture.isPinching = true;
      const currentDistance = getDistance(e.touches);
      const currentAngle = getAngle(e.touches);
      const center = getCenter(e.touches);

      const scale = gesture.startDistance > 0 ? currentDistance / gesture.startDistance : 1;
      const newWidth = clamp(gesture.startWidth * scale, 50, rect.width - 20);
      const newHeight = clamp(gesture.startHeight * scale, 50, rect.height - 20);

      const deltaAngle = currentAngle - gesture.startAngle;
      const newRotation = gesture.startRotation + deltaAngle;

      // Keep centered
      const centerX = center.x - rect.left;
      const centerY = center.y - rect.top;
      const newX = clamp(centerX - newWidth / 2, 0, rect.width - newWidth);
      const newY = clamp(centerY - newHeight / 2, 0, rect.height - newHeight);

      updateItem(item.id, {
        width: newWidth,
        height: newHeight,
        rotation: newRotation,
        x: newX,
        y: newY,
      });
    } else {
      // Single finger drag
      if (gesture.isPinching) return; // Don't drag if we were pinching

      const touch = e.touches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;

      const newX = clamp(gesture.startItemX + deltaX, 0, rect.width - item.width);
      const newY = clamp(gesture.startItemY + deltaY, 0, rect.height - item.height);

      updateItem(item.id, { x: newX, y: newY });
    }
  };

  const handleItemTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      if (gestureRef.current) {
        saveToHistory();
      }
      gestureRef.current = null;
    }
  };

  // Long press for context menu
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLongPressStart = (e: React.TouchEvent, item: CanvasItem) => {
    longPressTimer.current = setTimeout(() => {
      vibrate(20);
      setSelectedId(item.id);
      setBottomSheet("item-options");
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // ============================================================================
  // MOUSE HANDLERS (for desktop)
  // ============================================================================

  const handleItemMouseDown = (e: React.MouseEvent, item: CanvasItem) => {
    if (viewOnly) return;
    e.stopPropagation();
    e.preventDefault();

    setSelectedId(item.id);
    bringToFront(item.id);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    mouseDragRef.current = {
      itemId: item.id,
      startX: e.clientX,
      startY: e.clientY,
      startItemX: item.x,
      startItemY: item.y,
    };

    // Add window listeners for drag
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!mouseDragRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const drag = mouseDragRef.current;
    const item = items.find(i => i.id === drag.itemId);
    if (!item) return;

    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    const newX = clamp(drag.startItemX + deltaX, 0, rect.width - item.width);
    const newY = clamp(drag.startItemY + deltaY, 0, rect.height - item.height);

    setItems(prev =>
      prev.map(i => (i.id === drag.itemId ? { ...i, x: newX, y: newY } : i))
    );
  }, [items]);

  const handleMouseUp = useCallback(() => {
    if (mouseDragRef.current) {
      saveToHistory();
      mouseDragRef.current = null;
    }
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, saveToHistory]);

  // Cleanup mouse listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ============================================================================
  // PHOTO UPLOAD
  // ============================================================================

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    e.target.value = "";

    for (const file of Array.from(files)) {
      const localURL = URL.createObjectURL(file);
      const rect = canvasRef.current?.getBoundingClientRect();
      const size = Math.min(rect?.width || 200, rect?.height || 200) * 0.6;

      console.log("[Canvas] Adding image:", { localURL, rect, size });

      const item = addItem({
        type: "image",
        src: localURL,
        x: ((rect?.width || 300) - size) / 2,
        y: ((rect?.height || 200) - size) / 2,
        width: size,
        height: size,
        rotation: 0,
        filter: "",
        brightness: 100,
        contrast: 100,
        saturation: 100,
      });

      console.log("[Canvas] Item added:", item);

      // Upload to Cloudflare in background
      try {
        const auth = getAuth();
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
        console.log("[Canvas] Uploading to Cloudflare...");
        const res = await uploadToCloudflare(undefined, file, idToken, "public", {
          deliveryVariant: process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_VARIANT || "public",
          apiBaseURL: process.env.NEXT_PUBLIC_IMAGES_API_BASE,
        });

        console.log("[Canvas] Upload response:", res);

        if (res?.deliveryURL && res?.imageId) {
          URL.revokeObjectURL(localURL);
          updateItem(item.id, { src: res.deliveryURL, cfId: res.imageId });
          sessionUploads.current.add(res.imageId);
          console.log("[Canvas] Updated item src to:", res.deliveryURL);
        }
      } catch (err) {
        console.warn("Upload failed, keeping local preview", err);
      }
    }

    setBottomSheet(null);
  };

  // ============================================================================
  // ADD TEXT
  // ============================================================================

  const addText = (style: typeof TEXT_STYLES[0]) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    addItem({
      type: "text",
      text: "Tap to edit",
      x: ((rect?.width || 300) - 200) / 2,
      y: ((rect?.height || 200) - 60) / 2,
      width: 200,
      height: 60,
      rotation: 0,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      color: "#1f2937",
      textAlign: "center",
      bgColor: "transparent",
    });
  };

  // ============================================================================
  // ADD STICKER
  // ============================================================================

  const addSticker = (sticker: typeof STICKERS[0]) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    addItem({
      type: "sticker",
      stickerData: sticker.emoji,
      x: ((rect?.width || 300) - 80) / 2,
      y: ((rect?.height || 200) - 80) / 2,
      width: 80,
      height: 80,
      rotation: 0,
    });
  };

  // ============================================================================
  // SAVE / EXPORT
  // ============================================================================

  const captureCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const el = canvasRef.current;
    if (!el) return null;

    // Temporarily hide selection
    const wasSelected = selectedId;
    setSelectedId(null);

    await new Promise((r) => setTimeout(r, 50));

    try {
      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        filter: (node) => {
          const el = node as HTMLElement;
          return !el.classList?.contains(styles.selectionRing);
        },
      });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((r) => (img.onload = r));
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      return canvas;
    } catch {
      return html2canvas(el, { useCORS: true, scale: 2 });
    } finally {
      setSelectedId(wasSelected);
    }
  };

  const handleSave = async () => {
    if (!familyId) {
      // Just export as image
      const canvas = await captureCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = "scrapbook.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      return;
    }

    setSaving(true);
    vibrate();

    try {
      let pid = pageId;
      const isNew = !pid;
      if (!pid) {
        pid = doc(collection(db, `families/${familyId}/pages`)).id;
      }

      // Get existing render ID for replacement
      let existingRenderId = "";
      if (!isNew) {
        const snap = await getDoc(doc(db, `families/${familyId}/pages/${pid}`));
        if (snap.exists()) existingRenderId = snap.data()?.render?.ref || "";
      }

      // Capture preview
      const canvas = await captureCanvas();
      let deliveryURL = "";
      let previewImageId = existingRenderId;

      if (canvas) {
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), "image/png")
        );

        const auth = getAuth();
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;

        if (existingRenderId) {
          try {
            const res = await replaceCloudflareImage(undefined, blob, idToken, existingRenderId);
            deliveryURL = res?.deliveryURL || "";
          } catch {
            const res = await uploadToCloudflare(undefined, blob, idToken, "public");
            deliveryURL = res?.deliveryURL || "";
            previewImageId = res?.imageId || "";
          }
        } else {
          const res = await uploadToCloudflare(undefined, blob, idToken, "public");
          deliveryURL = res?.deliveryURL || "";
          previewImageId = res?.imageId || "";
        }
      }

      // Prepare state
      const state: CanvasState = { background, items };
      const usedCfIds = items.filter((i) => i.cfId).map((i) => i.cfId!);

      const data = {
        familyId,
        previewURL: deliveryURL,
        previewSize: canvas ? { w: canvas.width, h: canvas.height } : null,
        state,
        mediaRefs: usedCfIds,
        updatedAt: serverTimestamp(),
        ...(deliveryURL ? { render: { ref: previewImageId, url: deliveryURL } } : {}),
      };

      if (isNew) {
        const auth = getAuth();
        await setDoc(doc(db, `families/${familyId}/pages/${pid}`), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid || "anon",
          order: Date.now(),
          title: "Untitled",
          contributors: auth.currentUser ? [auth.currentUser.uid] : [],
          status: "published",
        });
      } else {
        await updateDoc(doc(db, `families/${familyId}/pages/${pid}`), data);
      }

      // Cleanup unused uploads
      const toDelete = [...sessionUploads.current].filter((id) => !usedCfIds.includes(id));
      if (toDelete.length) {
        const auth = getAuth();
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
        await deleteCloudflareImages(undefined, toDelete, idToken);
      }

      vibrate([10, 30, 10]);
      router.push(`/families/${familyId}/story`);
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // INITIALIZE
  // ============================================================================

  useEffect(() => {
    if (initialState) {
      setBackground(initialState.background || "white");
      setItems(initialState.items || []);
      setHistory([initialState]);
      setHistoryIndex(0);
    } else {
      setHistory([{ background: "white", items: [] }]);
      setHistoryIndex(0);
    }
  }, [initialState]);

  // ============================================================================
  // KEYBOARD (for desktop)
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewOnly) return;

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }

      // Delete
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const editing = (document.activeElement as HTMLElement)?.isContentEditable;
        if (!editing) {
          e.preventDefault();
          deleteItem(selectedId);
        }
      }

      // Escape
      if (e.key === "Escape") {
        setSelectedId(null);
        setBottomSheet(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewOnly, selectedId, undo, redo, deleteItem]);

  // ============================================================================
  // RENDER ITEM
  // ============================================================================

  const renderItem = (item: CanvasItem) => {
    console.log("[Canvas] Rendering item:", item.id, item.type, item.src?.substring(0, 50));
    const isSelected = item.id === selectedId;

    const style: React.CSSProperties = {
      position: "absolute",
      left: item.x,
      top: item.y,
      width: item.width,
      height: item.height,
      transform: `rotate(${item.rotation}deg)`,
      zIndex: item.zIndex,
      touchAction: "none",
    };

    const contentStyle: React.CSSProperties = {
      width: "100%",
      height: "100%",
      borderRadius: item.borderRadius || 0,
      boxShadow: item.shadow ? "0 8px 24px rgba(0,0,0,0.2)" : "none",
      clipPath: item.shape ? SHAPES.find((s) => s.id === item.shape)?.clip : undefined,
      overflow: "hidden",
    };

    return (
      <div
        key={item.id}
        className={`${styles.item} ${isSelected ? styles.selected : ""}`}
        style={style}
        onTouchStart={(e) => {
          handleItemTouchStart(e, item);
          handleLongPressStart(e, item);
        }}
        onTouchMove={(e) => {
          handleItemTouchMove(e, item);
          handleLongPressEnd();
        }}
        onTouchEnd={(e) => {
          handleItemTouchEnd(e);
          handleLongPressEnd();
        }}
        onTouchCancel={handleLongPressEnd}
        onMouseDown={(e) => handleItemMouseDown(e, item)}
        onClick={() => !viewOnly && setSelectedId(item.id)}
      >
        <div style={contentStyle}>
          {item.type === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.src}
              alt=""
              draggable={false}
              onLoad={() => console.log("[Canvas] Image loaded:", item.src)}
              onError={(e) => console.error("[Canvas] Image failed to load:", item.src, e)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: [
                  item.filter,
                  item.brightness !== 100 ? `brightness(${item.brightness}%)` : "",
                  item.contrast !== 100 ? `contrast(${item.contrast}%)` : "",
                  item.saturation !== 100 ? `saturate(${item.saturation}%)` : "",
                ].filter(Boolean).join(" ") || undefined,
              }}
            />
          )}

          {item.type === "text" && (
            <div
              contentEditable={!viewOnly}
              suppressContentEditableWarning
              className={styles.textContent}
              style={{
                fontSize: item.fontSize,
                fontFamily: item.fontFamily,
                color: item.color,
                textAlign: item.textAlign as React.CSSProperties["textAlign"],
                backgroundColor: item.bgColor,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 8,
                outline: "none",
              }}
              onBlur={(e) => updateItem(item.id, { text: e.currentTarget.textContent || "" })}
            >
              {item.text}
            </div>
          )}

          {item.type === "sticker" && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: Math.min(item.width, item.height) * 0.8,
                lineHeight: 1,
              }}
            >
              {item.stickerData}
            </div>
          )}
        </div>

        {isSelected && !viewOnly && (
          <div className={styles.selectionRing} />
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const bgStyle = BACKGROUNDS.find((b) => b.id === background);
  const canvasBg = bgStyle?.color.startsWith("linear-gradient") || bgStyle?.color.startsWith("url")
    ? { backgroundImage: bgStyle.color }
    : { backgroundColor: bgStyle?.color || "#fff" };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.headerBtn} onClick={() => router.back()}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className={styles.headerActions}>
          <button
            className={styles.headerBtn}
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 10h10a5 5 0 0 1 5 5v2M3 10l4-4M3 10l4 4" />
            </svg>
          </button>
          <button
            className={styles.headerBtn}
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10H11a5 5 0 0 0-5 5v2M21 10l-4-4M21 10l-4 4" />
            </svg>
          </button>
        </div>
        <button
          className={`${styles.headerBtn} ${styles.saveBtn}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "..." : "Done"}
        </button>
      </header>

      {/* Canvas */}
      <div className={styles.canvasWrapper}>
        <div
          ref={canvasRef}
          className={styles.canvas}
          style={canvasBg}
          onTouchStart={handleCanvasTouch}
          onClick={(e) => {
            if (e.target === canvasRef.current) {
              setSelectedId(null);
              setBottomSheet(null);
            }
          }}
        >
          {items.map(renderItem)}
        </div>
      </div>

      {/* Quick Actions (visible when item selected) */}
      {selectedItem && !bottomSheet && (
        <div className={styles.quickActions}>
          <button onClick={() => setBottomSheet("item-options")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
          <button onClick={() => duplicateItem(selectedItem.id)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
          </button>
          <button onClick={() => deleteItem(selectedItem.id)} className={styles.deleteBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
          {selectedItem.type === "image" && (
            <button onClick={() => setBottomSheet("adjust")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Bottom Toolbar */}
      <nav className={styles.toolbar}>
        <button
          className={`${styles.toolBtn} ${activeTool === "photo" ? styles.active : ""}`}
          onClick={() => {
            setActiveTool("photo");
            setBottomSheet("photo");
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          <span>Photo</span>
        </button>

        <button
          className={`${styles.toolBtn} ${activeTool === "text" ? styles.active : ""}`}
          onClick={() => {
            setActiveTool("text");
            setBottomSheet("text");
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7V4h16v3M9 20h6M12 4v16" />
          </svg>
          <span>Text</span>
        </button>

        <button
          className={`${styles.toolBtn} ${activeTool === "sticker" ? styles.active : ""}`}
          onClick={() => {
            setActiveTool("sticker");
            setBottomSheet("sticker");
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
          </svg>
          <span>Sticker</span>
        </button>

        <button
          className={`${styles.toolBtn} ${activeTool === "background" ? styles.active : ""}`}
          onClick={() => {
            setActiveTool("background");
            setBottomSheet("background");
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <span>Background</span>
        </button>
      </nav>

      {/* Bottom Sheets */}
      {bottomSheet && (
        <div className={styles.sheetOverlay} onClick={() => setBottomSheet(null)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            {/* Photo Sheet */}
            {bottomSheet === "photo" && (
              <div className={styles.sheetContent}>
                <h3>Add Photo</h3>
                <button
                  className={styles.uploadBtn}
                  onClick={() => {
                    console.log("[Canvas] Upload button clicked, fileInputRef:", fileInputRef.current);
                    fileInputRef.current?.click();
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  <span>Choose from Library</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className={styles.hidden}
                  onChange={handlePhotoSelect}
                />
              </div>
            )}

            {/* Text Sheet */}
            {bottomSheet === "text" && (
              <div className={styles.sheetContent}>
                <h3>Add Text</h3>
                <div className={styles.textStyles}>
                  {TEXT_STYLES.map((style) => (
                    <button
                      key={style.id}
                      className={styles.textStyleBtn}
                      onClick={() => addText(style)}
                    >
                      <span style={{ fontFamily: style.fontFamily, fontSize: 18 }}>
                        {style.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sticker Sheet */}
            {bottomSheet === "sticker" && (
              <div className={styles.sheetContent}>
                <h3>Add Sticker</h3>
                <div className={styles.stickerGrid}>
                  {STICKERS.map((sticker) => (
                    <button
                      key={sticker.id}
                      className={styles.stickerBtn}
                      onClick={() => addSticker(sticker)}
                    >
                      <span>{sticker.emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Background Sheet */}
            {bottomSheet === "background" && (
              <div className={styles.sheetContent}>
                <h3>Background</h3>
                <div className={styles.bgGrid}>
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      className={`${styles.bgBtn} ${background === bg.id ? styles.activeBg : ""}`}
                      style={
                        bg.color.startsWith("linear") || bg.color.startsWith("url")
                          ? { backgroundImage: bg.color }
                          : { backgroundColor: bg.color }
                      }
                      onClick={() => {
                        setBackground(bg.id);
                        saveToHistory();
                        vibrate();
                      }}
                    >
                      <span className={styles.bgLabel}>{bg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Adjust Sheet (for images) */}
            {bottomSheet === "adjust" && selectedItem?.type === "image" && (
              <div className={styles.sheetContent}>
                <h3>Adjust Photo</h3>

                {/* Filters */}
                <div className={styles.filterScroll}>
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      className={`${styles.filterBtn} ${selectedItem.filter === filter.css ? styles.activeFilter : ""}`}
                      onClick={() => {
                        updateItem(selectedItem.id, { filter: filter.css });
                        vibrate();
                      }}
                    >
                      <div
                        className={styles.filterPreview}
                        style={{
                          backgroundImage: `url(${selectedItem.src})`,
                          filter: filter.css,
                        }}
                      />
                      <span>{filter.label}</span>
                    </button>
                  ))}
                </div>

                {/* Sliders */}
                <div className={styles.sliders}>
                  <label>
                    <span>Brightness</span>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={selectedItem.brightness || 100}
                      onChange={(e) => updateItem(selectedItem.id, { brightness: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    <span>Contrast</span>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={selectedItem.contrast || 100}
                      onChange={(e) => updateItem(selectedItem.id, { contrast: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    <span>Saturation</span>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={selectedItem.saturation || 100}
                      onChange={(e) => updateItem(selectedItem.id, { saturation: Number(e.target.value) })}
                    />
                  </label>
                </div>

                {/* Shapes */}
                <h4>Shape</h4>
                <div className={styles.shapeGrid}>
                  {SHAPES.map((shape) => (
                    <button
                      key={shape.id}
                      className={`${styles.shapeBtn} ${selectedItem.shape === shape.id ? styles.activeShape : ""}`}
                      onClick={() => {
                        updateItem(selectedItem.id, {
                          shape: shape.id,
                          borderRadius: shape.radius || 0,
                        });
                        vibrate();
                      }}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>

                {/* Shadow toggle */}
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={selectedItem.shadow || false}
                    onChange={(e) => updateItem(selectedItem.id, { shadow: e.target.checked })}
                  />
                  <span>Drop Shadow</span>
                </label>
              </div>
            )}

            {/* Item Options Sheet */}
            {bottomSheet === "item-options" && selectedItem && (
              <div className={styles.sheetContent}>
                <h3>Options</h3>
                <div className={styles.optionsList}>
                  <button onClick={() => { duplicateItem(selectedItem.id); setBottomSheet(null); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                    Duplicate
                  </button>
                  <button onClick={() => { bringToFront(selectedItem.id); setBottomSheet(null); }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="8" y="8" width="12" height="12" rx="2" />
                      <rect x="4" y="4" width="12" height="12" rx="2" />
                    </svg>
                    Bring to Front
                  </button>
                  {selectedItem.type === "image" && (
                    <button onClick={() => setBottomSheet("adjust")}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41" />
                      </svg>
                      Adjust Photo
                    </button>
                  )}
                  <button
                    className={styles.deleteOption}
                    onClick={() => { deleteItem(selectedItem.id); setBottomSheet(null); }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
