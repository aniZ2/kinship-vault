// src/components/ScrapbookEditor/TemplatePicker/TemplatePicker.tsx
"use client";

import { useState } from 'react';
import { LayoutTemplate, TemplateCategory, ALL_TEMPLATES, TEMPLATES_BY_CATEGORY } from '../templates';
import styles from './TemplatePicker.module.css';

interface TemplatePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: LayoutTemplate) => void;
  currentPhotoCount?: number;
}

const CATEGORY_LABELS: Record<TemplateCategory | 'all', string> = {
  all: 'All',
  single: '1 Photo',
  duo: '2 Photos',
  trio: '3 Photos',
  quad: '4 Photos',
  collage: '5+ Photos',
  journal: 'Journal',
};

const CATEGORY_ORDER: (TemplateCategory | 'all')[] = [
  'all',
  'single',
  'duo',
  'trio',
  'quad',
  'collage',
  'journal',
];

export function TemplatePicker({
  isOpen,
  onClose,
  onSelectTemplate,
  currentPhotoCount = 0,
}: TemplatePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');

  if (!isOpen) return null;

  const templates =
    selectedCategory === 'all'
      ? ALL_TEMPLATES
      : TEMPLATES_BY_CATEGORY[selectedCategory] || [];

  const handleSelect = (template: LayoutTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Choose a Layout</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={styles.categories}>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              className={`${styles.categoryBtn} ${selectedCategory === cat ? styles.active : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {templates.map((template) => (
            <button
              key={template.id}
              className={styles.templateCard}
              onClick={() => handleSelect(template)}
            >
              <div className={styles.preview}>
                <TemplatePreview template={template} />
              </div>
              <div className={styles.templateInfo}>
                <span className={styles.templateName}>{template.name}</span>
                <span className={styles.templateDesc}>{template.description}</span>
              </div>
            </button>
          ))}
        </div>

        {templates.length === 0 && (
          <div className={styles.empty}>
            No templates in this category yet.
          </div>
        )}
      </div>
    </div>
  );
}

// SVG preview of template layout
function TemplatePreview({ template }: { template: LayoutTemplate }) {
  const viewBox = "0 0 100 70";

  return (
    <svg viewBox={viewBox} className={styles.previewSvg}>
      {/* Background */}
      <rect x="0" y="0" width="100" height="70" fill="#f9fafb" rx="2" />

      {/* Slots */}
      {template.slots.map((slot) => {
        // Scale from 100% canvas to viewBox (100x70)
        const x = slot.x;
        const y = slot.y * 0.7; // Scale Y to fit 70 height
        const w = slot.width;
        const h = slot.height * 0.7;

        const isPhoto = slot.type === 'photo';
        const fill = isPhoto ? '#e5e7eb' : '#dbeafe';
        const stroke = isPhoto ? '#9ca3af' : '#93c5fd';

        return (
          <g key={slot.id} transform={`rotate(${slot.rotation || 0} ${x + w / 2} ${y + h / 2})`}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={fill}
              stroke={stroke}
              strokeWidth="0.5"
              rx="1"
            />
            {isPhoto && (
              // Photo icon
              <g transform={`translate(${x + w / 2 - 4}, ${y + h / 2 - 3})`}>
                <rect x="0" y="0" width="8" height="6" fill={stroke} rx="0.5" />
                <circle cx="2.5" cy="2" r="1" fill="#fff" />
                <path d="M1 5.5 L3 3 L5 4.5 L7 2.5 L7 5.5 Z" fill="#fff" />
              </g>
            )}
            {!isPhoto && (
              // Text lines
              <g>
                <rect x={x + w * 0.1} y={y + h * 0.3} width={w * 0.8} height={h * 0.15} fill={stroke} rx="0.5" />
                <rect x={x + w * 0.1} y={y + h * 0.55} width={w * 0.5} height={h * 0.15} fill={stroke} rx="0.5" />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default TemplatePicker;
