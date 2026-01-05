# Book Compiler Testing Checklist

## Quick Start

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open the test page: http://localhost:3001/test-compiler (or port 3000 if available)

3. Sign in with your account

---

## End-to-End Test Flow

### Test 1: Basic Compilation
- [ ] Select a family with locked pages
- [ ] Choose 8x8 book size
- [ ] Click "Start Compilation Test"
- [ ] Verify status progresses: `pending` → `rendering` → `merging` → `complete`
- [ ] Verify progress bar updates in real-time
- [ ] Verify download URL is generated
- [ ] Download PDF and verify it opens correctly

### Test 2: Different Book Sizes
- [ ] Test 10x10 compilation
- [ ] Test 8.5x11 compilation
- [ ] Verify each produces correctly sized PDF

### Test 3: Cache Hit
- [ ] Run same compilation again (same pages, same size)
- [ ] Verify it returns cached result immediately
- [ ] Verify "Using cached compilation" message appears

### Test 4: Page Selection
- [ ] Deselect some pages before compiling
- [ ] Verify only selected pages appear in final PDF
- [ ] Verify page count matches selection

### Test 5: Error Handling
- [ ] Test with invalid family ID (should show error)
- [ ] Test without authentication (should redirect to sign in)

---

## Cloud Function Logs

Check Firebase Console for detailed logs:
```
https://console.firebase.google.com/project/kinshipvault-47ad0/functions/logs
```

Filter by function:
- `compileBookInit` - Initialization logs
- `processRenderBatch` - Rendering progress
- `mergeBookPdf` - Merge phase logs

---

## Print Checkout Integration Test

1. Go to a family's print checkout page:
   ```
   /families/{familyId}/print/checkout?ids={pageId1},{pageId2},...
   ```

2. Test the "Generate PDF" button in the checkout flow
3. Verify cover customization works
4. Verify cost calculation updates

---

## R2 Storage Verification

Check Cloudflare R2 bucket for uploaded files:
- Bucket: `kinship-vault-books`
- Structure:
  ```
  {familyId}/
  ├── pages/{pageId}-{hash}.pdf     # Individual pages
  └── compiled/{jobId}.pdf          # Merged books
  ```

---

## Expected Compilation Times

| Pages | Estimated Time |
|-------|----------------|
| 5     | ~1 minute      |
| 20    | ~2-3 minutes   |
| 50    | ~5-6 minutes   |

---

## Troubleshooting

### Compilation stuck on "pending"
- Check if `processRenderBatch` function is deployed
- Check Firestore trigger is active

### Compilation stuck on "rendering"
- Check Cloud Function logs for Puppeteer errors
- Verify render page URL is accessible

### No download URL after "complete"
- Check R2 credentials in functions/.env
- Verify R2 bucket exists and is accessible

### "Access denied" error
- Verify user is a member of the family
- Check membership document exists in Firestore
