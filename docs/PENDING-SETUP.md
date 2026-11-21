# Diagrams and solutions PDF: what's left

**The code is finished and tested.** Admins upload a question paper as `questions.json`
plus `diagrams.zip` made with Claude, diagrams show on questions and options, and each test
can have a solutions PDF that students view and download.

Files are kept in **Cloudflare R2** (file storage), in two **private** buckets. Students get
signed links that expire, so nothing is public and no domain or DNS changes are needed:
testverse.in stays on Hostinger exactly as it is.

## Is adding a card optional?

**No.** Cloudflare only turns on R2 after a card is added, even for the free plan.

- **Nothing is charged** within the free limits: 10 GB stored (years of diagrams and PDFs),
  and student downloads are always free.
- **Until R2 is set up, the website works normally:** tests, results, payments and
  everything else.
- **Only uploading diagrams and solutions PDFs is unavailable.** The admin page shows
  "File uploads aren't set up yet".

---

## 1. Developer: deploy the code (no card needed)

- [ ] Add the new database columns to the live database: `cd backend && npm run db:deploy`
      (**must be done before the push**, or the site errors)
- [ ] `git push`
- [ ] Open https://www.testverse.in as a student and take a test, to check everything works as before

## 2. Cloudflare setup (after the card is added)

- [ ] Run the **Cloudflare setup prompt** (at the end of this file) with the Claude browser
      extension. Tell it which steps are already done (account, R2 turned on, buckets).
- [ ] **Turn off the public address of the images bucket:** R2 → bucket `testverse-images` →
      Settings → **Public Development URL (r2.dev)** → **Disable**. Students now get signed
      links, so the bucket doesn't need to be public. (The prompt does this too.)
- [ ] **Redeploy the backend once:** Vercel → project `testverse-api` → Deployments → latest →
      **Redeploy**. New settings only take effect after a redeploy.
- [ ] Check: in the admin panel, create a test with a JSON and a diagrams zip. The pictures
      should upload and show in the preview.

## 3. First real test

- [ ] Admin → create a test → **Make the files with Claude** → **Copy prompt**
- [ ] In claude.ai: attach the question paper PDF and its answer key, paste the prompt, and
      download `questions.json` and `diagrams.zip`
- [ ] Choose both files in the test form. Check **every question and diagram in the preview**,
      because how well Claude crops diagrams can vary. Then publish.
- [ ] After the test, upload the solutions PDF in the test's **Solutions PDF** section, and
      check **View solutions** and **Download** as a student

## Other

- [ ] Cashfree: make sure `www.testverse.in` is in the whitelisted domains (for live payments)
- [ ] Share only **www.testverse.in**: the old testverse-theta.vercel.app address still opens,
      but logging in from it no longer works

---

## Settings reference (Vercel → testverse-api → Environment Variables)

| Name | Value |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare Account ID (R2 overview page) |
| `R2_ACCESS_KEY_ID` | from the R2 API token |
| `R2_SECRET_ACCESS_KEY` | from the R2 API token (secret: never share it) |
| `R2_IMAGES_BUCKET` | `testverse-images` |
| `R2_FILES_BUCKET` | `testverse-files` |

If `R2_IMAGES_URL` or `R2_IMAGES_OLD_URLS` were added earlier, they are no longer used and
can be deleted.

## Cost

| What | Free each month | After that |
|---|---|---|
| Storage | 10 GB | about ₹1.3 per GB |
| Students viewing diagrams and PDFs | unlimited | always free |
| Uploads and views (requests) | millions | far more than Testverse needs |

With about 10 tests a week, Testverse should stay inside the free limits for the first year
or more.

---

## Cloudflare setup prompt (for the Claude browser extension)

Paste it as it is, and tell it which steps are already done.

```
Set up Cloudflare R2 storage for my website Testverse. Follow these steps in order.

RULES
- Never enter payment details yourself. When Cloudflare asks for a card, STOP and ask me to enter it.
- Never paste secret keys into this chat. Put them only where Step 6 says.
- If anything fails, copy the exact error text and stop.
- After each step, tell me what happened.

STEP 1: Account
- Go to https://dash.cloudflare.com/sign-up and sign up with talktostudyverse@gmail.com
  (or log in if the account exists). Verify the email from that Gmail inbox.

STEP 2: Turn on R2
- In the left menu open "R2 Object Storage" and enable R2 (the free plan).
- It will ask for a payment method: STOP and let me enter the card. (The free allowance costs nothing.)
- Note the "Account ID" shown on the R2 overview page (it is not secret; tell me it).

STEP 3: Two private buckets
- Make sure these two buckets exist (create them if not): "testverse-images" and "testverse-files",
  location "Automatic", storage class "Standard".

STEP 4: Keep both buckets private
- Open bucket "testverse-images" → Settings → "Public Development URL" (r2.dev): if it is enabled, DISABLE it.
- Check "testverse-files" the same way (it must also be disabled). Do not add any custom domain.

STEP 5: CORS (lets the admin page upload files)
- Open bucket "testverse-images" → Settings → CORS Policy → Add/Edit, paste exactly:
[
  {
    "AllowedOrigins": ["https://www.testverse.in", "https://testverse.in", "https://testverse-theta.vercel.app", "http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
- Save. Do the same for bucket "testverse-files" with the same JSON.

STEP 6: API token (the website's key to these buckets)
- R2 overview → "Manage API tokens" → Create an Account API token.
- Name: testverse-website. Permission: "Object Read & Write". Apply to specific buckets only:
  testverse-images and testverse-files. TTL: Forever. Create it.
- Cloudflare shows an "Access Key ID" and a "Secret Access Key" ONCE.
- Do NOT paste them here. In a new tab open https://vercel.com → project "testverse-api" →
  Settings → Environment Variables, and add these (all environments):
    R2_ACCOUNT_ID        = the Account ID from Step 2
    R2_ACCESS_KEY_ID     = the Access Key ID
    R2_SECRET_ACCESS_KEY = the Secret Access Key
    R2_IMAGES_BUCKET     = testverse-images
    R2_FILES_BUCKET      = testverse-files
- If variables named R2_IMAGES_URL or R2_IMAGES_OLD_URLS exist, delete them (no longer used).

STEP 7: Report
- Tell me: the Account ID, that both buckets exist with the r2.dev address disabled, that both
  CORS policies are saved, and that the 5 variables are in Vercel. Never include the secret key.
```

After it finishes, redeploy the backend once (section 2 above).
