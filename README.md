# Kinship Vault

A private, invite-only family scrapbook platform for preserving and sharing memories. Built with Next.js 15, Firebase, Stripe, and Cloudflare R2.

**Version:** 2.0.0

## Overview

Kinship Vault enables families to collaboratively create digital memory books with a vintage scrapbook aesthetic. Features include rich editing capabilities, yearbook printing, guest photo uploads via QR codes, and flexible subscription tiers.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4, CSS Modules |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Email magic link + Google OAuth) |
| Storage | Cloudflare R2 (object storage, not Cloudflare Images) |
| Payments | Stripe (Subscriptions + Webhooks) |
| Functions | Firebase Cloud Functions (Node.js 20) |
| Hosting | Firebase Hosting |

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

## Project Structure

```
kinship-vault/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/              # Protected routes (requires auth)
│   │   ├── (auth)/             # Authentication routes
│   │   ├── (marketing)/        # Public landing pages
│   │   ├── api/                # API routes
│   │   ├── upload/             # Public guest upload
│   │   └── view/               # Guest view-only access
│   ├── components/             # React components
│   ├── context/                # React context providers
│   ├── lib/                    # Utilities & services
│   └── styles/                 # Global CSS
├── functions/                  # Firebase Cloud Functions
├── cf-worker/                  # Cloudflare Worker (R2 images)
├── firebase.json               # Firebase configuration
└── firestore.rules             # Security rules
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
- **Photo Features:** Frames, shapes, shadows, borders, filters, cropping
- **Text Features:** 12 fonts, colors, effects, decorations, alignment
- **Transformations:** Drag, resize, rotate, flip
- **Backgrounds:** Solid colors, textures, custom images
- **History:** Undo/redo support
- **Touch Support:** Pinch zoom, multi-touch rotation

### 2. Family Management

- Create families with invite codes
- Join existing families via code
- Role-based permissions (Owner, Admin, Member)
- Family switching with persistent selection
- 5 member limit across all tiers (edit access)

### 3. Guest Upload System (Event Pack)

**Three-tier access model:**

1. **Invited Members (5 max)**
   - Full edit + view access
   - Can create pages, upload photos, invite others
   - Example: Bride, Groom, both moms, maid of honor

2. **Guest Uploaders (Unlimited - Event Pack only)**
   - Scan QR code at events
   - Upload photos without login
   - Photos enter moderation queue
   - No edit access

3. **Guest Viewers (Unlimited - Event Pack only)**
   - Receive read-only view link after upload
   - Can view scrapbook anytime
   - Cannot edit, invite, or upload more
   - Example: 150 wedding guests view final album

**Anti-abuse design:**
- Limited editors (5) prevents resale
- View-only guests have no resale value
- All uploads moderated before approval

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

### 6. Subscriptions (Stripe)

| Tier | Price | Best For |
|------|-------|----------|
| **Free** | $0 | Testing, small families |
| **User Pro** | $49/year | Join multiple families |
| **Family Pro** | $199/year | Ongoing family scrapbooking |
| **Event Pack** | $299/year* | Weddings, reunions, big events |

*Launch pricing. Will increase to $499/year. Early customers grandfathered.

---

## Subscription Model

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

### Access Model (Event Pack)

**Three-tier access system prevents abuse while enabling unlimited guest uploads:**

1. **Invited Members (5 max)** - Full edit + view access
   - Can create pages, upload photos, moderate uploads
   - Example: Bride, Groom, both moms, maid of honor

2. **Guest Uploaders (Unlimited)** - Upload only, no account needed
   - Scan QR code at event
   - Upload photos without login
   - Photos enter moderation queue
   - No edit access

3. **Guest Viewers (Unlimited)** - Read-only access via link
   - Receive view-only URL after upload
   - Can view scrapbook anytime
   - Cannot edit, invite, or upload more

---

## Pricing Strategy

### Launch Pricing (Current)
- **Event Pack:** $299/year
- **Family Pro:** $199/year
- **User Pro:** $49/year

### Future Pricing Increases

Event Pack pricing will increase based on demand:
- **Phase 1 (First 100 customers):** $299/year (current)
- **Phase 2 (Month 6-18):** $399/year
- **Phase 3 (Month 18+):** $499/year

**Grandfather Clause:** Early customers lock in their signup price forever as long as they maintain active subscription.

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

**Note:** All tiers limited to 5 members with edit access. Event Pack adds unlimited guest uploaders (view-only).

---

## Components

### ScrapbookEditor
**Location:** `src/components/ScrapbookEditor/`

The core editing component with canvas-based layout, touch gestures, and real-time Firebase sync.

**Files:**
- `ScrapbookEditor.tsx` - Main component (1500+ lines)
- `types.ts` - TypeScript interfaces
- `constants.ts` - Backgrounds, frames, stickers, fonts
- `ScrapbookEditor.module.css` - Styles

### NavBar
**Location:** `src/components/NavBar.tsx`

Main navigation with family switcher, mobile menu, and user dropdown.

### FamilyStory
**Location:** `src/components/FamilyStory/`

Page card previews and story feed display.

### StorageIndicator
**Location:** `src/components/StorageIndicator/`

Visual storage usage gauge with tier-aware limits.

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
| `products.ts` | Pricing, limits, subscription types |
| `client.ts` | Stripe client operations |

### Other Utilities

| File | Purpose |
|------|---------|
| `cfImages.ts` | Cloudflare R2 image operations |
| `utils.ts` | Date formatting, money, initials |
| `activeFamily.ts` | Active family state management |
| `rateLimit.ts` | Client & server rate limiting |

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
│   ├── title, createdBy, createdAt
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
│   └── clientIp?: string
├── viewTokens/{token}/
│   ├── token: string
│   ├── guestName: string
│   ├── guestEmail?: string
│   ├── createdAt: timestamp
│   └── permissions: {
│       canView: true
│       canEdit: false
│       canInvite: false
│       canDownload: true
│   }
└── members/{userId}/
    └── role: "owner" | "admin" | "member"

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
| `fsOnPageCreate` | Firestore Trigger | Handle new page creation |
| `fsOnQuestionCreate` | Firestore Trigger | Handle questions |
| `fsOnResponseCreate` | Firestore Trigger | Handle responses |

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

**At $499/year pricing (future):**
- Revenue: $499
- Cost: $105
- **Gross profit: $394 (79% margin)**

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
