// src/components/PrintOrder/CoverCustomization.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { auth } from "@/lib/firebase/client";
import styles from "./CoverCustomization.module.css";

export type CoverMode = "solid" | "front-image" | "wraparound";

export interface CoverCustomizationData {
  familyName: string;
  bookTitle: string;
  primaryColor: string;
  secondaryColor: string;
  coverMode: CoverMode;
  frontCoverImageUrl?: string;
  wraparoundImageUrl?: string;
}

interface CoverCustomizationProps {
  familyId: string;
  familyName: string;
  bookSize: "8x8" | "10x10" | "8.5x11";
  pageCount: number;
  onChange: (data: CoverCustomizationData) => void;
  initialData?: Partial<CoverCustomizationData>;
}

const PRESET_COLORS = [
  { name: "Navy", value: "#1e3a5f" },
  { name: "Forest", value: "#1e4d3a" },
  { name: "Burgundy", value: "#722f37" },
  { name: "Charcoal", value: "#374151" },
  { name: "Plum", value: "#4a1c40" },
  { name: "Slate", value: "#475569" },
  { name: "Terracotta", value: "#c2452d" },
  { name: "Ocean", value: "#0e4c6d" },
];

// Lulu 2026 cover dimensions at 300 DPI (with 0.125" bleed)
const COVER_DIMENSIONS = {
  "8x8": { width: 2475, height: 2475 },
  "10x10": { width: 3075, height: 3075 },
  "8.5x11": { width: 2625, height: 3375 },
};

// Spine width per page at 300 DPI (0.002252" × 300)
const SPINE_PX_PER_PAGE = 0.6756;

// Calculate spine width in pixels at 300 DPI
function getSpineWidth300(pageCount: number): number {
  return Math.max(Math.round(pageCount * SPINE_PX_PER_PAGE), 38); // Min ~0.125"
}

// Calculate spine width for preview (scaled)
function getSpineWidthPreview(pageCount: number): number {
  const spineInches = pageCount * 0.002252;
  return Math.max(spineInches * 72, 10);
}

export function CoverCustomization({
  familyId,
  familyName,
  bookSize,
  pageCount,
  onChange,
  initialData,
}: CoverCustomizationProps) {
  const [bookTitle, setBookTitle] = useState(
    initialData?.bookTitle || `${new Date().getFullYear()} Yearbook`
  );
  const [primaryColor, setPrimaryColor] = useState(
    initialData?.primaryColor || "#1e3a5f"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    initialData?.secondaryColor || "#ffffff"
  );
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [coverMode, setCoverMode] = useState<CoverMode>(
    initialData?.coverMode || "solid"
  );
  const [frontCoverImageUrl, setFrontCoverImageUrl] = useState<string | undefined>(
    initialData?.frontCoverImageUrl
  );
  const [wraparoundImageUrl, setWraparoundImageUrl] = useState<string | undefined>(
    initialData?.wraparoundImageUrl
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate wraparound dimensions for guidance
  const wraparoundDimensions = useMemo(() => {
    const coverDim = COVER_DIMENSIONS[bookSize];
    const spineWidth = getSpineWidth300(pageCount);
    return {
      width: coverDim.width * 2 + spineWidth,
      height: coverDim.height,
      spineWidth,
      coverWidth: coverDim.width,
    };
  }, [bookSize, pageCount]);

  // Notify parent of changes
  useEffect(() => {
    onChange({
      familyName,
      bookTitle,
      primaryColor,
      secondaryColor,
      coverMode,
      frontCoverImageUrl: coverMode === "front-image" ? frontCoverImageUrl : undefined,
      wraparoundImageUrl: coverMode === "wraparound" ? wraparoundImageUrl : undefined,
    });
  }, [familyName, bookTitle, primaryColor, secondaryColor, coverMode, frontCoverImageUrl, wraparoundImageUrl, onChange]);

  // Handle image upload
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadError("Please upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Image must be less than 15MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      if (!auth) throw new Error("Auth not initialized");
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("familyId", familyId);
      formData.append("position", coverMode === "wraparound" ? "wraparound" : "front");

      const response = await fetch("/api/print/upload-cover-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();

      if (coverMode === "wraparound") {
        setWraparoundImageUrl(data.imageUrl);
      } else {
        setFrontCoverImageUrl(data.imageUrl);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveImage() {
    if (coverMode === "wraparound") {
      setWraparoundImageUrl(undefined);
    } else {
      setFrontCoverImageUrl(undefined);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleModeChange(mode: CoverMode) {
    setCoverMode(mode);
    setUploadError(null);
  }

  // Preview dimensions
  const previewScale = 0.4;
  const dimensions = {
    "8x8": { width: 200, height: 200 },
    "10x10": { width: 200, height: 200 },
    "8.5x11": { width: 170, height: 220 },
  }[bookSize];

  const spineWidth = getSpineWidthPreview(pageCount) * previewScale;
  const currentImageUrl = coverMode === "wraparound" ? wraparoundImageUrl : frontCoverImageUrl;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Cover Design</h3>
      <p className={styles.subtitle}>
        Customize your book cover appearance
      </p>

      {/* Cover Mode Selection */}
      <div className={styles.field}>
        <label className={styles.label}>Cover Type</label>
        <div className={styles.modeSelector}>
          <button
            type="button"
            className={`${styles.modeBtn} ${coverMode === "solid" ? styles.selected : ""}`}
            onClick={() => handleModeChange("solid")}
          >
            <SolidColorIcon />
            <span>Solid Color</span>
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${coverMode === "front-image" ? styles.selected : ""}`}
            onClick={() => handleModeChange("front-image")}
          >
            <FrontImageIcon />
            <span>Front Image</span>
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${coverMode === "wraparound" ? styles.selected : ""}`}
            onClick={() => handleModeChange("wraparound")}
          >
            <WraparoundIcon />
            <span>Wraparound</span>
          </button>
        </div>
      </div>

      {/* Book Title - only for solid and front-image modes */}
      {coverMode !== "wraparound" && (
        <div className={styles.field}>
          <label className={styles.label}>Book Title</label>
          <input
            type="text"
            value={bookTitle}
            onChange={(e) => setBookTitle(e.target.value)}
            placeholder="2024 Yearbook"
            className={styles.input}
            maxLength={50}
          />
        </div>
      )}

      {/* Image Upload for front-image and wraparound modes */}
      {coverMode !== "solid" && (
        <div className={styles.field}>
          <label className={styles.label}>
            {coverMode === "wraparound" ? "Wraparound Cover Image" : "Front Cover Image"}
          </label>

          {coverMode === "wraparound" && (
            <div className={styles.dimensionGuide}>
              <strong>Recommended dimensions:</strong>
              <span className={styles.dimValue}>
                {wraparoundDimensions.width} × {wraparoundDimensions.height} px
              </span>
              <span className={styles.dimBreakdown}>
                (Back {wraparoundDimensions.coverWidth}px + Spine {wraparoundDimensions.spineWidth}px + Front {wraparoundDimensions.coverWidth}px)
              </span>
            </div>
          )}

          {coverMode === "front-image" && (
            <p className={styles.hint}>
              Recommended: {COVER_DIMENSIONS[bookSize].width} × {COVER_DIMENSIONS[bookSize].height} px at 300 DPI
            </p>
          )}

          {currentImageUrl ? (
            <div className={styles.uploadedImage}>
              <img
                src={currentImageUrl}
                alt="Cover preview"
                className={coverMode === "wraparound" ? styles.uploadedThumbnailWide : styles.uploadedThumbnail}
              />
              <div className={styles.uploadedInfo}>
                <span className={styles.uploadedLabel}>
                  {coverMode === "wraparound" ? "Wraparound cover" : "Front cover image"}
                </span>
                <button type="button" onClick={handleRemoveImage} className={styles.removeBtn}>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.uploadArea}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className={styles.fileInput}
                disabled={uploading}
                id="cover-image-upload"
              />
              <label htmlFor="cover-image-upload" className={styles.uploadLabel}>
                {uploading ? (
                  <>
                    <span className={styles.spinner} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadIcon />
                    <span>Click to upload image</span>
                    <span className={styles.uploadHint}>JPG, PNG, or WebP (max 15MB)</span>
                  </>
                )}
              </label>
            </div>
          )}

          {uploadError && <p className={styles.errorText}>{uploadError}</p>}
        </div>
      )}

      {/* Color Selection - for solid mode, or spine/back in front-image mode */}
      {(coverMode === "solid" || coverMode === "front-image") && (
        <div className={styles.field}>
          <label className={styles.label}>
            {coverMode === "front-image" ? "Spine & Back Cover Color" : "Cover Color"}
          </label>
          <div className={styles.colorGrid}>
            {PRESET_COLORS.map((color) => (
              <button
                key={color.value}
                className={`${styles.colorSwatch} ${primaryColor === color.value ? styles.selected : ""}`}
                style={{ backgroundColor: color.value }}
                onClick={() => setPrimaryColor(color.value)}
                title={color.name}
                type="button"
              />
            ))}
            <button
              className={`${styles.colorSwatch} ${styles.customSwatch} ${showCustomColor ? styles.selected : ""}`}
              onClick={() => setShowCustomColor(!showCustomColor)}
              title="Custom color"
              type="button"
            >
              <CustomColorIcon />
            </button>
          </div>
          {showCustomColor && (
            <div className={styles.customColorRow}>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className={styles.colorPicker}
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className={styles.colorInput}
                placeholder="#1e3a5f"
              />
            </div>
          )}
        </div>
      )}

      {/* Text Color - only for solid mode */}
      {coverMode === "solid" && (
        <div className={styles.field}>
          <label className={styles.label}>Text Color</label>
          <div className={styles.textColorOptions}>
            {[
              { value: "#ffffff", label: "White", border: true },
              { value: "#f5f5dc", label: "Cream", border: false },
              { value: "#ffd700", label: "Gold", border: false },
            ].map((opt) => (
              <button
                key={opt.value}
                className={`${styles.textColorBtn} ${secondaryColor === opt.value ? styles.selected : ""}`}
                onClick={() => setSecondaryColor(opt.value)}
                type="button"
              >
                <span
                  className={styles.textColorPreview}
                  style={{ backgroundColor: opt.value, border: opt.border ? "1px solid #e5e7eb" : undefined }}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Live Preview */}
      <div className={styles.previewSection}>
        <label className={styles.label}>Preview</label>
        <div className={styles.previewWrapper}>
          {coverMode === "wraparound" && wraparoundImageUrl ? (
            // Wraparound: single image spans entire cover
            <div
              className={styles.wraparoundPreview}
              style={{
                width: dimensions.width * previewScale * 2 + spineWidth,
                height: dimensions.height,
                backgroundImage: `url(${wraparoundImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Spine indicator overlay */}
              <div
                className={styles.spineIndicator}
                style={{
                  left: dimensions.width * previewScale,
                  width: Math.max(spineWidth, 8),
                }}
              />
            </div>
          ) : (
            // Solid or front-image: three separate panels
            <>
              {/* Back Cover */}
              <div
                className={styles.coverPanel}
                style={{
                  width: dimensions.width * previewScale,
                  height: dimensions.height,
                  backgroundColor: primaryColor,
                }}
              >
                {coverMode === "solid" && (
                  <span className={styles.backCoverText} style={{ color: secondaryColor }}>
                    Made with<br />Kinship Vault
                  </span>
                )}
              </div>

              {/* Spine */}
              <div
                className={styles.spine}
                style={{
                  width: Math.max(spineWidth, 8),
                  height: dimensions.height,
                  backgroundColor: adjustColor(primaryColor, -20),
                }}
              >
                {spineWidth > 20 && coverMode === "solid" && (
                  <span className={styles.spineText} style={{ color: secondaryColor }}>
                    {familyName}
                  </span>
                )}
              </div>

              {/* Front Cover */}
              <div
                className={styles.coverPanel}
                style={{
                  width: dimensions.width * previewScale,
                  height: dimensions.height,
                  backgroundColor: coverMode === "front-image" && frontCoverImageUrl ? "transparent" : primaryColor,
                  backgroundImage: coverMode === "front-image" && frontCoverImageUrl ? `url(${frontCoverImageUrl})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {coverMode === "solid" && (
                  <div className={styles.frontCoverContent}>
                    <span className={styles.familyName} style={{ color: secondaryColor }}>
                      {familyName}
                    </span>
                    <span className={styles.bookTitleText} style={{ color: secondaryColor }}>
                      {bookTitle}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <p className={styles.previewNote}>
          {coverMode === "wraparound" ? (
            <>Back Cover ← Spine → Front Cover &bull; Image wraps around entire book</>
          ) : (
            <>{pageCount} pages &bull; {bookSize} &bull; Spine width scales with page count</>
          )}
        </p>
      </div>
    </div>
  );
}

// Helper to darken a color
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function SolidColorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function FrontImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function WraparoundIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M12 6v6l4 2" strokeLinecap="round" />
    </svg>
  );
}

function CustomColorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
