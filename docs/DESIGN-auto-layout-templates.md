# Auto-Layout Templates Design

## Overview

Auto-layout templates help users quickly arrange photos and text on scrapbook pages. Instead of manually positioning each item, users select a template and their content auto-fills into predefined slots.

## User Flow

### Flow A: Template First
1. User opens editor (new page or existing)
2. Clicks "Templates" button in toolbar
3. Browses template categories
4. Selects a template → placeholder slots appear on canvas
5. Clicks a slot → photo picker opens
6. Photo fills that slot with proper sizing/position
7. Repeat until all slots filled (or leave some empty)

### Flow B: Photos First
1. User adds several photos to canvas (freestyle)
2. Clicks "Auto-Arrange" button
3. Sees template suggestions based on photo count
4. Selects a template → existing photos rearrange into layout
5. Can swap photo positions by dragging between slots

---

## Template Data Structure

```typescript
interface LayoutTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  thumbnail: string; // SVG or preview image
  slots: TemplateSlot[];
  decorations?: TemplateDecoration[];
}

interface TemplateSlot {
  id: string;
  type: 'photo' | 'text' | 'any';
  // Position as percentage of canvas (0-100)
  x: number;      // left edge %
  y: number;      // top edge %
  width: number;  // width %
  height: number; // height %
  rotation?: number;
  // Optional styling defaults
  frame?: FrameStyle;
  shape?: PhotoShape;
  // For text slots
  placeholder?: string;
  fontSize?: number;
  font?: FontFamily;
}

interface TemplateDecoration {
  type: 'tape' | 'sticker';
  // Position relative to a slot or absolute
  anchor?: string; // slot id or 'canvas'
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
  offsetX?: number; // % offset from anchor
  offsetY?: number;
  pattern?: TapePattern;
  emoji?: string;
  rotation?: number;
}

type TemplateCategory =
  | 'single'      // 1 photo layouts
  | 'duo'         // 2 photo layouts
  | 'trio'        // 3 photo layouts
  | 'quad'        // 4 photo layouts
  | 'collage'     // 5+ photos
  | 'journal'     // Text-focused
  | 'special';    // Occasions
```

---

## Template Designs

### Category: Single Photo (1 photo)

#### 1. "Hero Center"
Large centered photo with space for caption below.
```
┌─────────────────────────┐
│                         │
│    ┌───────────────┐    │
│    │               │    │
│    │     PHOTO     │    │
│    │               │    │
│    └───────────────┘    │
│                         │
│      [Caption text]     │
│                         │
└─────────────────────────┘
```
- Photo: x:10, y:8, w:80, h:60
- Text: x:15, y:75, w:70, h:10

#### 2. "Polaroid Memory"
Single polaroid-style photo with handwritten caption.
```
┌─────────────────────────┐
│                         │
│     ┌─────────────┐     │
│     │             │     │
│     │    PHOTO    │     │
│     │             │     │
│     ├─────────────┤     │
│     │  caption    │     │
│     └─────────────┘     │
│                         │
└─────────────────────────┘
```
- Photo: x:20, y:10, w:60, h:55, frame:'polaroid'

#### 3. "Full Bleed"
Photo fills entire canvas.
```
┌─────────────────────────┐
│█████████████████████████│
│█████████████████████████│
│█████████████████████████│
│█████████████████████████│
│█████████████████████████│
│█████████████████████████│
└─────────────────────────┘
```
- Photo: x:0, y:0, w:100, h:100

#### 4. "Corner Feature"
Large photo in corner with text area.
```
┌─────────────────────────┐
│ ┌────────────────┐      │
│ │                │      │
│ │     PHOTO      │ text │
│ │                │ here │
│ └────────────────┘      │
│                         │
│   [More text below]     │
└─────────────────────────┘
```
- Photo: x:5, y:5, w:65, h:55
- Text1: x:72, y:15, w:23, h:40
- Text2: x:5, y:65, w:90, h:15

---

### Category: Duo (2 photos)

#### 5. "Side by Side"
Two equal photos horizontally.
```
┌─────────────────────────┐
│                         │
│  ┌─────────┐ ┌─────────┐│
│  │         │ │         ││
│  │ PHOTO 1 │ │ PHOTO 2 ││
│  │         │ │         ││
│  └─────────┘ └─────────┘│
│                         │
└─────────────────────────┘
```
- Photo1: x:5, y:15, w:43, h:55
- Photo2: x:52, y:15, w:43, h:55

#### 6. "Stacked"
Two photos vertically stacked.
```
┌─────────────────────────┐
│    ┌───────────────┐    │
│    │    PHOTO 1    │    │
│    └───────────────┘    │
│                         │
│    ┌───────────────┐    │
│    │    PHOTO 2    │    │
│    └───────────────┘    │
└─────────────────────────┘
```
- Photo1: x:15, y:5, w:70, h:40
- Photo2: x:15, y:50, w:70, h:40

#### 7. "Offset Overlap"
Two photos with artistic overlap.
```
┌─────────────────────────┐
│  ┌──────────────┐       │
│  │              │       │
│  │   PHOTO 1    │       │
│  │         ┌────┴─────┐ │
│  └─────────┤          │ │
│            │ PHOTO 2  │ │
│            │          │ │
│            └──────────┘ │
└─────────────────────────┘
```
- Photo1: x:5, y:8, w:55, h:45, rotation:-3
- Photo2: x:35, y:40, w:55, h:45, rotation:2

#### 8. "Big + Small"
One large feature photo with smaller accent.
```
┌─────────────────────────┐
│ ┌─────────────────┐     │
│ │                 │ ┌──┐│
│ │                 │ │2 ││
│ │     PHOTO 1     │ └──┘│
│ │                 │     │
│ │                 │     │
│ └─────────────────┘     │
└─────────────────────────┘
```
- Photo1: x:5, y:10, w:70, h:75
- Photo2: x:78, y:10, w:18, h:25, rotation:5

---

### Category: Trio (3 photos)

#### 9. "Classic Grid"
Three photos in L-shape.
```
┌─────────────────────────┐
│  ┌─────────┐ ┌─────────┐│
│  │         │ │         ││
│  │ PHOTO 1 │ │ PHOTO 2 ││
│  └─────────┘ └─────────┘│
│  ┌─────────────────────┐│
│  │       PHOTO 3       ││
│  └─────────────────────┘│
└─────────────────────────┘
```
- Photo1: x:5, y:5, w:44, h:40
- Photo2: x:51, y:5, w:44, h:40
- Photo3: x:5, y:50, w:90, h:40

#### 10. "Feature + Two"
One large photo with two small on side.
```
┌─────────────────────────┐
│ ┌──────────────┐ ┌────┐ │
│ │              │ │ 2  │ │
│ │              │ └────┘ │
│ │   PHOTO 1    │ ┌────┐ │
│ │              │ │ 3  │ │
│ │              │ └────┘ │
│ └──────────────┘        │
└─────────────────────────┘
```
- Photo1: x:5, y:8, w:60, h:80
- Photo2: x:68, y:8, w:27, h:35
- Photo3: x:68, y:48, w:27, h:35

#### 11. "Diagonal Story"
Three photos in diagonal cascade.
```
┌─────────────────────────┐
│ ┌────────┐              │
│ │   1    │              │
│ └────────┘              │
│       ┌────────┐        │
│       │   2    │        │
│       └────────┘        │
│             ┌────────┐  │
│             │   3    │  │
│             └────────┘  │
└─────────────────────────┘
```
- Photo1: x:5, y:5, w:35, h:28, rotation:-5
- Photo2: x:32, y:35, w:35, h:28, rotation:0
- Photo3: x:60, y:65, w:35, h:28, rotation:5

---

### Category: Quad (4 photos)

#### 12. "Grid 2x2"
Classic four-photo grid.
```
┌─────────────────────────┐
│  ┌────────┐ ┌────────┐  │
│  │   1    │ │   2    │  │
│  └────────┘ └────────┘  │
│  ┌────────┐ ┌────────┐  │
│  │   3    │ │   4    │  │
│  └────────┘ └────────┘  │
└─────────────────────────┘
```
- Photo1: x:5, y:5, w:43, h:42
- Photo2: x:52, y:5, w:43, h:42
- Photo3: x:5, y:52, w:43, h:42
- Photo4: x:52, y:52, w:43, h:42

#### 13. "Magazine Spread"
Asymmetric editorial layout.
```
┌─────────────────────────┐
│ ┌──────────────┐ ┌────┐ │
│ │              │ │ 2  │ │
│ │      1       │ ├────┤ │
│ │              │ │ 3  │ │
│ └──────────────┘ └────┘ │
│ ┌────────────────────┐  │
│ │         4          │  │
│ └────────────────────┘  │
└─────────────────────────┘
```
- Photo1: x:5, y:5, w:58, h:50
- Photo2: x:66, y:5, w:29, h:23
- Photo3: x:66, y:32, w:29, h:23
- Photo4: x:5, y:60, w:90, h:35

#### 14. "Mosaic Mix"
Varied sizes for visual interest.
```
┌─────────────────────────┐
│ ┌───────────────┐ ┌───┐ │
│ │               │ │ 2 │ │
│ │       1       │ └───┘ │
│ │               │ ┌───┐ │
│ └───────────────┘ │ 3 │ │
│ ┌─────────────────┴───┘ │
│ │          4            │
│ └───────────────────────┘
└─────────────────────────┘
```
- Photo1: x:5, y:5, w:60, h:48
- Photo2: x:68, y:5, w:27, h:22
- Photo3: x:68, y:30, w:27, h:22
- Photo4: x:5, y:58, w:90, h:35

---

### Category: Collage (5+ photos)

#### 15. "Five Scatter"
Five photos scattered naturally.
```
┌─────────────────────────┐
│  ┌────┐     ┌──────┐    │
│  │ 1  │     │  2   │    │
│  └────┘     └──────┘    │
│       ┌──────────┐      │
│       │    3     │ ┌──┐ │
│       └──────────┘ │4 │ │
│  ┌────────┐        └──┘ │
│  │   5    │             │
│  └────────┘             │
└─────────────────────────┘
```
- Various positions with slight rotations (-8 to +8 deg)

#### 16. "Photo Wall"
Six photos in tight grid.
```
┌─────────────────────────┐
│ ┌──────┐┌──────┐┌──────┐│
│ │  1   ││  2   ││  3   ││
│ └──────┘└──────┘└──────┘│
│ ┌──────┐┌──────┐┌──────┐│
│ │  4   ││  5   ││  6   ││
│ └──────┘└──────┘└──────┘│
└─────────────────────────┘
```
- 3x2 grid with small gaps

---

### Category: Journal (Text-focused)

#### 17. "Story Page"
Photo with journaling area.
```
┌─────────────────────────┐
│ ═══════ TITLE ════════  │
│                         │
│ ┌─────────┐             │
│ │  PHOTO  │  Text here  │
│ │         │  continues  │
│ └─────────┘  flowing... │
│                         │
│  More text below the    │
│  photo if needed...     │
└─────────────────────────┘
```
- Title: x:10, y:3, w:80, h:8
- Photo: x:5, y:15, w:40, h:40
- Text1: x:50, y:15, w:45, h:40
- Text2: x:5, y:60, w:90, h:30

#### 18. "Quote Card"
Large quote with accent photo.
```
┌─────────────────────────┐
│                         │
│   "Your quote goes      │
│    here in large        │
│    beautiful text"      │
│                         │
│              — Author   │
│                   ┌───┐ │
│                   │ 📷│ │
│                   └───┘ │
└─────────────────────────┘
```
- Text: x:10, y:15, w:80, h:45, fontSize:32
- Attribution: x:50, y:62, w:40, h:8
- Photo: x:70, y:70, w:20, h:20, shape:'circle'

---

### Category: Special Occasions

#### 19. "Birthday Celebration"
```
┌─────────────────────────┐
│  🎈  HAPPY BIRTHDAY 🎈  │
│    ┌─────────────┐      │
│    │             │      │
│    │    PHOTO    │      │
│    │             │      │
│    └─────────────┘      │
│  🎂    [Name]    🎁     │
│      [Message]          │
└─────────────────────────┘
```
- Includes birthday stickers as decorations

#### 20. "Wedding Memories"
```
┌─────────────────────────┐
│    ♥ [Names] ♥          │
│   ┌───────┐ ┌───────┐   │
│   │       │ │       │   │
│   │   1   │ │   2   │   │
│   │       │ │       │   │
│   └───────┘ └───────┘   │
│      [Date & Venue]     │
│           💍            │
└─────────────────────────┘
```
- Elegant fonts, heart decorations

---

## UI Design

### Template Picker Modal

```
┌─────────────────────────────────────────┐
│  Choose a Layout          [X]           │
├─────────────────────────────────────────┤
│                                         │
│  [All] [1 Photo] [2 Photos] [3+] [Text] │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │░░░░░│ │░ ░░░│ │░░ ░░│ │░░░░░│       │
│  │░░░░░│ │░ ░░░│ │░░ ░░│ │░ ░░░│       │
│  │     │ │     │ │  ░░░│ │░ ░░░│       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│   Hero    Side    Grid    Feature       │
│  Center  by Side   2x2    + Two         │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │░░░░░│ │░ ░ ░│ │═════│ │░░ ░░│       │
│  │░░░░░│ │ ░ ░ │ │░░░░░│ │░░ ░░│       │
│  │░ ░░░│ │░ ░ ░│ │text │ │░░ ░░│       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│  Scatter  Mosaic  Story   Photo         │
│                   Page    Wall          │
│                                         │
└─────────────────────────────────────────┘
```

### Template Button in Toolbar

Add between existing toolbar buttons:
```
[Add Photo] [Add Text] [Add Sticker] [🎨 Templates] [Undo] [Redo]
```

### Slot Placeholders

When template applied, empty slots show as:
```
┌─ ─ ─ ─ ─ ─ ─ ─┐
╎               ╎
╎    + Add      ╎   (dashed border)
╎    Photo      ╎   (subtle gray bg)
╎               ╎   (click to fill)
└─ ─ ─ ─ ─ ─ ─ ─┘
```

---

## Implementation Notes

### Percentage to Pixel Conversion

```typescript
function applyTemplate(template: LayoutTemplate, canvasWidth: number, canvasHeight: number) {
  return template.slots.map(slot => ({
    ...slot,
    x: (slot.x / 100) * canvasWidth,
    y: (slot.y / 100) * canvasHeight,
    width: (slot.width / 100) * canvasWidth,
    height: (slot.height / 100) * canvasHeight,
  }));
}
```

### Auto-Arrange Existing Photos

```typescript
function autoArrangePhotos(photos: EditorItem[], template: LayoutTemplate) {
  const photoSlots = template.slots.filter(s => s.type === 'photo');

  return photos.map((photo, index) => {
    if (index >= photoSlots.length) return photo; // Overflow: keep original position

    const slot = photoSlots[index];
    return {
      ...photo,
      x: convertPercent(slot.x),
      y: convertPercent(slot.y),
      width: convertPercent(slot.width),
      height: convertPercent(slot.height),
      rotation: slot.rotation || 0,
      frame: slot.frame || photo.frame,
    };
  });
}
```

### Smart Template Suggestions

Based on number of photos already on canvas:
- 1 photo → Show "Single" templates
- 2 photos → Show "Duo" templates
- 3 photos → Show "Trio" templates
- 4+ photos → Show "Quad" and "Collage" templates

---

## File Structure

```
src/components/ScrapbookEditor/
├── templates/
│   ├── index.ts              # Export all templates
│   ├── types.ts              # Template interfaces
│   ├── single.ts             # Single photo templates
│   ├── duo.ts                # Two photo templates
│   ├── trio.ts               # Three photo templates
│   ├── quad.ts               # Four photo templates
│   ├── collage.ts            # 5+ photo templates
│   ├── journal.ts            # Text-focused templates
│   └── special.ts            # Occasion templates
├── TemplatePicker/
│   ├── TemplatePicker.tsx    # Modal component
│   ├── TemplatePicker.module.css
│   └── TemplatePreview.tsx   # SVG preview component
└── ...
```

---

## MVP Scope

### Phase 1 (MVP)
- [ ] 8 core templates: Hero, Side by Side, Stacked, Grid 2x2, Feature+Two, Story Page, Scatter, Full Bleed
- [ ] Template picker modal with thumbnails
- [ ] Apply template to empty canvas
- [ ] Placeholder slots for photos

### Phase 2
- [ ] Auto-arrange existing photos
- [ ] More templates (20 total)
- [ ] Template decorations (tape, stickers)
- [ ] Smart suggestions based on photo count

### Phase 3
- [ ] Custom template creation
- [ ] Save favorite templates
- [ ] Community templates
