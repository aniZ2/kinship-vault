# Kinship Vault - Product Specification

## Overview

Kinship Vault is a family scrapbook platform with two distinct products:
1. **Family Scrapbooks** - Ongoing, collaborative family memory keeping
2. **Event Books** - One-time occasions (weddings, birthdays, reunions)

---

## Account Types

### Regular Account (Family Scrapbooks)
- For ongoing family memory keeping
- Subject to user and family limits
- Free to start, upgradeable

### Event Account
- For one-time occasions
- Completely separate from family limits
- $99/year upfront
- Same user can have both account types (no crossover on limits)

---

## Pricing

### User Pro - $5/mo or $50/yr
| | Free User | Pro User |
|--|-----------|----------|
| Families can join | 2 | 5 |

### Family Pro - $10/mo or $100/yr
| | Free Family | Pro Family |
|--|-------------|------------|
| Members | 5 | 25 |
| Storage | 1GB | Unlimited |

### Event Pack - $99/year
| Feature | Included |
|---------|----------|
| Members | Unlimited |
| Storage | Unlimited |
| Duration | 1 year active editing |
| After expiry | View-only archive (organizer only) |
| Renewals | $99/year to continue adding |

---

## Storage Rules

### Free Family (1GB)
- Storage full = cannot upload more
- Options: Upgrade to Pro OR delete existing pages
- Deleted = gone forever (hard delete)
- Existing pages remain viewable, editable, printable

### Pro Family / Events
- Unlimited storage while subscription active
- Hard delete (no soft delete/recovery)

---

## Family Roles & Permissions

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Add photos | ✅ | ✅ | ✅ |
| Edit pages | ✅ | ✅ | ❌ |
| Delete photos | ✅ | ✅ | ❌ |
| Invite members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ |
| Manage billing | ✅ | ❌ | ❌ |
| Transfer ownership | ✅ | ❌ | ❌ |
| Delete family | ✅ | ❌ | ❌ |

**Note:** Only owner/admin can edit. Members can add but not rearrange. This avoids conflicts and keeps curation controlled.

---

## Event Roles & Permissions

| Action | Organizer | Editor (max 5) | Guest (unlimited) |
|--------|-----------|----------------|-------------------|
| Upload photos | ✅ | ✅ | ✅ |
| Arrange/move | ✅ | ✅ | ❌ |
| Add captions | ✅ | ✅ | ❌ |
| Delete photos | ✅ | ❌ | ❌ |
| Invite editors | ✅ | ❌ | ❌ |
| Mark ready for print | ✅ | ❌ | ❌ |
| Order prints | ✅ | ✅ | ✅ (when ready) |
| Manage billing | ✅ | ❌ | ❌ |

### Guest Access
- Join via link/QR code (no account needed)
- Upload only - no editing
- Access ends when event expires (unless they order prints)

### Editor Access
- Invited by email
- Requires account
- Can help curate but cannot delete

---

## Event Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Active    │────▶│   Ready     │────▶│  Archived   │
│  (1 year)   │     │ for Print   │     │ (view only) │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                    │
  Upload,              Everyone              Organizer
  Edit,                can order             can view,
  Arrange              prints                order prints
```

### After 1 Year
- Editing locked
- Guests lose access
- Organizer retains view-only access
- Print ordering available forever
- Renew for $99 to continue editing/adding

### Recurring Events
- Same event can be renewed yearly
- Add to previous book (birthday year 1, 2, 3...)
- Print all years as one book or separately

---

## Print Pricing

### Per-Page Pricing
| Pages | Price |
|-------|-------|
| 50 | $100 |
| 100 | $200 |
| 150 | $300 |
| 250 | $500 |

Linear pricing: ~$2/page, no bulk discount on pages (prevents gaming)

### Order Types

| Order Type | Discount | Shipping |
|------------|----------|----------|
| Bulk (10+ books) | 10% off | One address, organizer distributes |
| Individual | Full price | Ships to their address |

### Print Flow (Events)
1. Organizer marks "Ready for Print"
2. All members (including guests) can order
3. Organizer typically collects orders, does bulk purchase
4. Individual stragglers can order later at full price

---

## Signup Flow

```
What would you like to create?

┌─────────────────────────┐    ┌─────────────────────────┐
│   👨‍👩‍👧‍👦 Family            │    │   🎉 Event              │
│                         │    │                         │
│  Ongoing scrapbook      │    │  One-time occasion      │
│  for your family        │    │  Birthday, wedding,     │
│                         │    │  reunion, etc.          │
│  Free to start          │    │  $99/year               │
└─────────────────────────┘    └─────────────────────────┘
```

---

## Key Business Rules

### Downloads
- **No downloads allowed** - protects print revenue
- Users cannot export photos or PDF
- Only way to "keep" memories is print

### Deletion
- Hard delete everywhere (free and paid)
- No soft delete, no recovery
- Simple, saves storage costs
- Creates urgency to upgrade before deleting

### Limits Separation
- Event membership never affects family limits
- Same user can have families + events
- Clean separation, no confusion

### Upgrade Psychology
- 1GB free storage = hit wall fast
- "Delete your memories or upgrade" = clear choice
- Annual discount (2 months free) = encourages commitment

---

## Revenue Streams

1. **User Pro** - $5/mo or $50/yr (recurring)
2. **Family Pro** - $10/mo or $100/yr (recurring)
3. **Event Pack** - $99/yr (transactional, renewable)
4. **Print Sales** - Per page pricing + bulk orders (transactional)

---

## Target Users

### Family Pro Buyer
- The family organizer/historian
- Usually matriarch/patriarch type
- "I want everyone in here - grandma, cousins, everyone"

### User Pro Buyer
- Multi-family person
- Divorced parents, in-laws, friend groups
- Power user, deeply embedded
- Your best evangelist

### Event Buyer
- One-time occasion host
- Weddings, milestone birthdays, reunions
- High intent, deadline-driven
- Gateway to family product

---

## Future Considerations

- School/organization tier (unlimited everything, per-yearbook pricing)
- Team accounts for photographers/planners
- White-label for wedding venues
