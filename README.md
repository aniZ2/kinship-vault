# Kinship Vault

A private, invite-only family scrapbook platform for preserving and sharing memories. Built with Next.js 15, Firebase, Stripe, and Cloudflare R2.

**Version:** 2.0.0

---

## Overview

Kinship Vault enables families to collaboratively create digital memory books with a vintage scrapbook aesthetic. Features include rich editing capabilities, yearbook printing, guest photo uploads via QR codes, and flexible subscription tiers.

**Key Products:**
- **Family Scrapbooks** - Ongoing, collaborative family memory keeping
- **Event Pack** - One-time occasions like weddings, reunions, and birthdays

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4, CSS Modules |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Email magic link + Google OAuth) |
| Storage | Cloudflare R2 (object storage) |
| Payments | Stripe (Subscriptions + Webhooks) |
| Functions | Firebase Cloud Functions (Node.js 20) |
| Email | Resend (transactional emails) |
| Hosting | Firebase Hosting |

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env.local

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Firebase
firebase deploy
```

---

## Project Structure

```
kinship-vault/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (app)/                    # Protected routes (requires auth)
│   │   │   ├── families/
│   │   │   │   ├── [familyId]/
│   │   │   │   │   ├── story/        # Main scrapbook feed
│   │   │   │   │   ├── pages/        # Create/view/edit pages
│   │   │   │   │   ├── qr/           # QR code generation
│   │   │   │   │   ├── moderate/     # Moderation dashboard
│   │   │   │   │   ├── yearbook/     # Yearbook export
│   │   │   │   │   └── print/        # Print preview
│   │   │   │   └── page.tsx          # Family gate (create/join)
│   │   │   ├── profile/              # User profile
│   │   │   ├── settings/             # Billing & settings
│   │   │   └── layout.tsx            # Auth-protected layout
│   │   ├── (auth)/                   # Authentication routes
│   │   │   └── signin/               # Sign in page
│   │   ├── (marketing)/              # Public landing pages
│   │   │   └── page.tsx              # Landing page
│   │   ├── api/                      # API routes
│   │   │   ├── guest-upload/         # Guest photo upload
│   │   │   ├── delete-image/         # Delete from R2
│   │   │   └── stripe/               # Checkout, portal, webhooks
│   │   ├── upload/[familyId]/        # Public guest upload page
│   │   └── view/[token]/             # Guest view-only access
│   ├── components/
│   │   ├── ScrapbookEditor/          # Canvas-based page editor
│   │   ├── FamilyStory/              # Page card previews
│   │   ├── StorageIndicator/         # Storage usage gauge
│   │   ├── Canvas/                   # Reusable canvas component
│   │   ├── NavBar.tsx                # Main navigation
│   │   └── FamilySwitcher.tsx        # Family dropdown
│   ├── context/
│   │   └── AuthContext.tsx           # Auth state provider
│   ├── lib/
│   │   ├── firebase/                 # Firebase client & admin
│   │   ├── stripe/                   # Stripe products & client
│   │   ├── cfImages.ts               # Cloudflare R2 operations
│   │   ├── rateLimit.ts              # Client & server rate limiting
│   │   ├── activeFamily.ts           # Active family state
│   │   └── utils.ts                  # Date, money, helpers
│   └── styles/                       # Global CSS files
│       ├── landing.css
│       ├── familygate.css
│       ├── profile.css
│       └── billing.css
├── functions/                        # Firebase Cloud Functions
│   ├── index.js                      # Function definitions
│   └── emails/                       # Resend email templates
│       ├── resend.js                 # Email client
│       └── templates/
│           └── eventOnboarding.js    # Event Pack welcome email
├── cf-worker/                        # Cloudflare Worker (R2 images)
├── firebase.json                     # Firebase configuration
├── firestore.rules                   # Security rules
└── PRODUCT_SPEC.md                   # Product specification
```

---

## Routes

### Public Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with features, pricing, CTA |
| `/signin` | Email magic link + Google OAuth signin |
| `/upload/[familyId]` | Guest photo upload (no auth, Event Pack only) |
| `/view/[token]` | Guest view-only access (read-only scrapbook) |

### Protected Routes (requires authentication)

| Route | Description |
|-------|-------------|
| `/families` | Family Gate - create/join families |
| `/families/[familyId]/story` | Main family scrapbook feed |
| `/families/[familyId]/pages/new` | Create new scrapbook page |
| `/families/[familyId]/pages/[pageId]` | View scrapbook page |
| `/families/[familyId]/pages/[pageId]/edit` | Edit scrapbook page |
| `/families/[familyId]/yearbook` | Print-ready yearbook preview |
| `/families/[familyId]/print` | Print preview |
| `/families/[familyId]/qr` | Generate QR code for guest uploads |
| `/families/[familyId]/moderate` | Moderation dashboard for guest uploads |
| `/profile` | User profile & avatar |
| `/settings/billing` | Subscription management |

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/stripe/checkout` | POST | Create Stripe checkout session |
| `/api/stripe/portal` | POST | Redirect to Stripe customer portal |
| `/api/stripe/webhooks` | POST | Stripe webhook handler |
| `/api/guest-upload` | POST | Handle guest photo uploads (Event Pack) |
| `/api/delete-image` | POST | Delete rejected guest uploads from R2 |

---

## Core Features

### 1. Scrapbook Editor

Full-featured canvas editor (`src/components/ScrapbookEditor/`) with:

- **Content Types:** Photos, text, stickers, washi tape
- **Photo Features:** Frames, shapes (heart, circle, star, hexagon), shadows, borders, filters, cropping
- **Text Features:** 12 fonts, colors, effects (neon, retro, emboss), decorations, alignment
- **Transformations:** Drag, resize, rotate, flip
- **Backgrounds:** Solid colors, textures, custom image uploads
- **History:** Undo/redo support
- **Touch Support:** Pinch zoom, multi-touch rotation

### 2. Family Management

- Create families with invite codes
- Join existing families via code
- Role-based permissions (Owner, Admin, Member)
- Family switching with persistent selection
- 5 member limit across all tiers (edit access)

### 3. Guest Upload System (Event Pack)

For events like weddings and reunions, the Event Pack enables:

**Three-tier access model:**

1. **Invited Members (5 max)**
   - Full edit + view access
   - Can create pages, upload photos, invite others

2. **Guest Uploaders (Unlimited)**
   - Scan QR code at events
   - Upload photos without login
   - Photos enter moderation queue
   - No edit access

3. **Guest Viewers (Unlimited)**
   - Receive read-only view link after upload approval
   - Can view scrapbook anytime
   - Cannot edit, invite, or upload more

**How it works:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   1. QR CODE    │────▶│   2. MODERATE   │────▶│   3. SHARE      │
│                 │     │                 │     │                 │
│  Print & display│     │  Approve the    │     │  Guests get     │
│  at your venue  │     │  best shots     │     │  view-only link │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Anti-abuse design:**
- Limited editors (5) prevents resale
- View-only guests have no resale value
- All uploads moderated before approval
- Rate limiting: 10 uploads/minute per guest

### 4. Yearbook Printing

- Print-ready page layouts
- Filter by creator and time period
- Optimized CSS for printing
- 5 free yearbooks/year with Event Pack

### 5. Storage Management

- Real-time usage tracking
- Per-family storage limits
- Session-based tracking during editing
- Storage indicator in editor
- Real-time counter increments/decrements on upload/delete

### 6. Email Notifications

- Event Pack onboarding emails via Resend
- Automatic welcome email when subscription activates
- Includes QR code links, moderation queue, and tips

---

## Subscriptions (Stripe)

| Tier | Price | Best For |
|------|-------|----------|
| **Free** | $0 | Testing, small families |
| **User Pro** | $49/year | Join multiple families (5 instead of 2) |
| **Family Pro** | $199/year | Ongoing family scrapbooking (50GB storage) |
| **Event Pack** | $299/year* | Weddings, reunions, big events (unlimited storage) |

*Launch pricing. Will increase to $499/year. Early customers grandfathered.

### Feature Comparison

| Feature | Free | User Pro | Family Pro | Event Pack |
|---------|:----:|:--------:|:----------:|:----------:|
| Families you can join | 2 | 5 | - | - |
| Members (edit access) | 5 | 5 | 5 | 5 |
| Storage per family | 1GB | 1GB | 50GB | **Unlimited** |
| Guest uploads | - | - | Limited | **Unlimited** |
| Guest view links | - | - | - | **Unlimited** |
| Free yearbooks/year | - | - | - | **5** |
| Priority support | - | - | - | Yes |

### Tier Switching

Customers can switch between Family Pro <-> Event Pack at renewal:
- **Upgrade:** Pay difference (prorated)
- **Downgrade:** Save $100/year
- Common pattern: Event Pack for wedding -> Family Pro for steady use -> Event Pack again for baby shower

---

## Family Roles & Permissions

| Action | Owner | Admin | Member | Guest Viewer |
|--------|:-----:|:-----:|:------:|:------------:|
| View pages | Yes | Yes | Yes | Yes* |
| Create pages | Yes | Yes | Yes | - |
| Edit own pages | Yes | Yes | Yes | - |
| Edit others' pages | Yes | Yes | - | - |
| Delete pages | Yes | Yes | - | - |
| Upload via QR | Yes | Yes | Yes | Yes** |
| Moderate uploads | Yes | Yes | - | - |
| Invite members | Yes | Yes | - | - |
| Generate QR codes | Yes | Yes | - | - |
| Manage billing | Yes | - | - | - |
| Delete family | Yes | - | - | - |

*Via view token only (Event Pack)
**Event Pack only, uploads go to moderation queue

---

## Database Schema (Firestore)

```
families/{familyId}/
├── name: string
├── createdAt: timestamp
├── storageUsedBytes: number
├── pendingUploadCount: number
├── subscription: { type, status, ... }
├── guestUploadSettings: {
│   enabled: boolean
│   requireName: boolean
│   requireEmail: boolean
│   welcomeMessage: string
│   autoApprove: boolean
│   notifyOnUpload: boolean
│   maxUploadsPerGuest: number
│}
├── pages/{pageId}/
│   ├── title, createdBy, createdAt, order
│   ├── state: { items[], background }
│   └── locked, unlockExpiresAt
├── pendingUploads/{uploadId}/
│   ├── imageId: string
│   ├── imageUrl: string
│   ├── guestName: string
│   ├── guestEmail?: string
│   ├── status: "pending" | "approved" | "rejected"
│   ├── sizeBytes: number
│   ├── createdAt: timestamp
│   ├── viewToken?: string (after approval)
│   └── clientIp?: string
└── members/{userId}/
    └── role: "owner" | "admin" | "member"

viewTokens/{token}/
├── token: string
├── familyId: string
├── guestName: string
├── guestEmail?: string
├── createdAt: timestamp
└── permissions: {
    canView: true
    canEdit: false
    canInvite: false
    canDownload: true
}

users/{uid}/
├── email, displayName, bio, location
├── activeFamilyId, defaultFamilyId
├── stripeCustomerId
└── userProSubscription: { status, ... }

memberships/{docId}/
├── uid, familyId, role
```

---

## Cloud Functions

### Deployed Functions (`functions/index.js`)

| Function | Type | Purpose |
|----------|------|---------|
| `createFamily` | HTTPS | Create new family (checks limits) |
| `joinFamily` | HTTPS | Join family via code |
| `leaveFamily` | HTTPS | Leave a family |
| `deleteFamily` | HTTPS | Delete family (owner only) |
| `getFamilyMeta` | HTTPS | Get family metadata |
| `getMembershipUsage` | HTTPS | Get user/family counts vs limits |
| `setAdminRoles` | HTTPS | Manage admin roles |
| `transferOwnership` | HTTPS | Transfer family ownership |
| `membershipCounter` | Firestore Trigger | Update member counts |
| `onSubscriptionChange` | Firestore Trigger | Send Event Pack onboarding emails |

---

## Components

### ScrapbookEditor
**Location:** `src/components/ScrapbookEditor/`

The core editing component with canvas-based layout, touch gestures, and real-time Firebase sync.

**Files:**
- `ScrapbookEditor.tsx` - Main component (1500+ lines)
- `types.ts` - TypeScript interfaces
- `constants.ts` - Backgrounds, frames, stickers, fonts, shapes, effects
- `ScrapbookEditor.module.css` - Styles (2300+ lines)

### StorageIndicator
**Location:** `src/components/StorageIndicator/`

Visual storage usage gauge with tier-aware limits and warnings.

### FamilyStory
**Location:** `src/components/FamilyStory/`

Page card previews and story feed display.

### NavBar
**Location:** `src/components/NavBar.tsx`

Main navigation with family switcher, mobile menu, and user dropdown.

---

## Libraries & Utilities

### Firebase (`src/lib/firebase/`)

| File | Purpose |
|------|---------|
| `client.ts` | Client-side Firebase initialization |
| `admin.ts` | Server-side Firebase Admin SDK |
| `functions.ts` | Typed Cloud Function wrappers |

### Stripe (`src/lib/stripe/`)

| File | Purpose |
|------|---------|
| `products.ts` | Pricing, limits, storage helpers, subscription types |
| `client.ts` | Stripe client operations |

### Other Utilities

| File | Purpose |
|------|---------|
| `cfImages.ts` | Cloudflare R2 image operations |
| `utils.ts` | Date formatting, money, initials |
| `activeFamily.ts` | Active family state management |
| `rateLimit.ts` | Client & server rate limiting |

---

## Environment Variables

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (for API routes)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Cloudflare R2 (object storage)
NEXT_PUBLIC_IMAGES_API_BASE=
CF_ACCOUNT_ID=
CF_API_TOKEN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRIPE_USER_PRO_ANNUAL=
NEXT_PUBLIC_STRIPE_FAMILY_PRO_ANNUAL=
NEXT_PUBLIC_STRIPE_EVENT_PACK=

# Resend (Email)
RESEND_API_KEY=
```

---

## Security

### Authentication
- Firebase Auth with email magic links
- Google OAuth with account linking
- Token-based API authentication

### Authorization (Firestore Rules)
- Family membership validation
- Role-based access control (Owner > Admin > Member)
- User/family limit enforcement
- Storage quota checks

### Rate Limiting
- Guest uploads: 20/hour per IP, 5/minute burst limit
- Photo uploads: 10/minute per user

### Data Protection
- Pages auto-lock after 7 days
- Temporary unlock windows for edits
- Hard deletes only (no recovery)
- All guest uploads require moderation

---

## Cost Structure (Event Pack)

### Infrastructure Costs per Customer

**Worst case scenario (500GB storage):**
- Cloudflare R2 storage: 500GB x $0.015/month = $7.50/month = **$90/year**
- R2 reads (view links): 100k reads x $0.00036 = **$0.36/year**
- Firebase Firestore: ~**$10/year**
- Vercel hosting (amortized): ~**$5/year**
- **Total: ~$105/year**

**At $299/year pricing:**
- Revenue: $299
- Cost: $105
- **Gross profit: $194 (65% margin)**

### Why Unlimited Storage Works

Cloudflare R2 pricing makes unlimited storage sustainable:
- **No egress fees** (would cost $4,500/year on S3 for same usage)
- **Linear scaling** (costs scale 1:1 with actual usage)
- **Cheap storage** ($0.015/GB vs $0.023/GB on S3)

---

## Deployment

### Firebase Deployment

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules
```

### Cloudflare Worker

```bash
cd cf-worker
wrangler publish
```

---

## Development

### Scripts

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Key Implementation Notes

1. **SSR Guards** - Firebase initialized client-side only (`typeof window !== 'undefined'`)
2. **Debounced Saves** - 450ms debounce on title edits
3. **Session Storage Tracking** - Tracks bytes added during editing session
4. **Active Family Sync** - LocalStorage + custom events + context
5. **Touch Gestures** - Pinch zoom and multi-touch rotation on mobile
6. **Guest Upload Rate Limiting** - 5 uploads/minute per IP for guest uploads
7. **View Token System** - UUID-based read-only access for guests
8. **R2 Storage** - Cloudflare R2 for object storage (not Cloudflare Images)
9. **Storage Tracking** - Real-time counter increments/decrements on upload/delete
10. **Moderation Queue** - All guest uploads require approval before appearing in scrapbook

---

## License

Private - All rights reserved.
