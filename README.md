# PostPilot

PostPilot is a simple Vercel webapp for uploading a creative, previewing Malay copywriting, and publishing it directly to a Facebook Page after approval.

Copywriting is generated from the uploaded creative note plus the supplied salespage URL. The app fetches the salespage title, meta description, headings, and visible text snippets so it is not locked to one product.

The posting flow is:

1. Upload creative and salespage URL.
2. Preview caption and first comment CTA.
3. Approve to publish, or regenerate for a new copywriting variation.

## Required Vercel Environment Variables

Set these in Vercel Project Settings:

```text
FACEBOOK_PAGE_ID=1201743546357100
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token
APP_PASSWORD=strong_login_password
```

Optional:

```text
MAX_UPLOAD_MB=20
```

## Invoice PDF + Google Drive

The app also includes a monthly ads invoice generator. It auto-detects the current month, creates one PDF per configured client, lets you review each PDF, then uploads approved invoices into each client's Google Drive `Invoice & Receipt` subfolder.

## Vercel Deploy / Repair CLI

This project uses one Vercel serverless function at `api/app.js`. The actual route handlers live in `api_handlers/`, and `vercel.json` rewrites each API path to `api/app.js?route=...`. This keeps the Hobby plan under the 12-function deployment limit.

Useful commands:

```bash
npm run ip -- check
npm run ip -- link
npm run ip -- pull
npm run ip -- build
npm run ip -- deploy
npm run ip -- env
npm run ip -- env:add APP_PASSWORD production
npm run ip -- repair
```

`npm run ip -- repair` links to the `invoice-pilot` Vercel project, pulls production settings, checks syntax, builds, and deploys production.

Set `VERCEL_PROJECT=your-project-name` if you need to target a different Vercel project.

### Invoice Environment Variables

```text
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/google/oauth-callback
GOOGLE_REFRESH_TOKEN=refresh_token_from_oauth_setup
INVOICE_DRIVE_MASTER_FOLDER_ID=1DqzU5ZZ_81bpEXZiWqqecBF8gqmRiv-o

INVOICE_BUSINESS_NAME=Your Business Name
INVOICE_BUSINESS_REG_NO=optional_registration_number
INVOICE_BUSINESS_ADDRESS=Your billing address
INVOICE_BUSINESS_EMAIL=billing@example.com
INVOICE_BUSINESS_PHONE=optional_phone
INVOICE_PAYMENT_DETAILS=Bank/payment instructions shown on invoices
INVOICE_BANK_NAME=CIMB Bank Bhd
INVOICE_BANK_ACCOUNT_NUMBER=8603134244
INVOICE_BANK_ACCOUNT_NAME=LUR BAY MARKETING
INVOICE_PAYMENT_LINK=https://optional-payment-link
INVOICE_SERVICE_TITLE=Lead Generation Ads & Funnelling
INVOICE_SERVICE_DESCRIPTION=Service description shown in the invoice item
INVOICE_SERVICE_SCOPE=One service scope per line
INVOICE_SERVICE_NOTE=Service note shown below the scope
INVOICE_DEFAULT_MONTHLY_RETAINER=1500
APP_TIMEZONE=Asia/Kuala_Lumpur
```

Clients are configured in `lib/invoice-config.js`. The current default client list is:

- TEEGA
- SAFRICH
- MUIZ NAZMI (HONDA)
- KAK SUE KITCHEN
- AZ HUSTLER EMPIRE

The app uses `INVOICE_DRIVE_MASTER_FOLDER_ID` as the master client folder. New clients added from the app are stored in `client-registry.json` inside that master folder. Saving a client creates:

- `LBM x {brand client}`
- `Weekly Report`
- `Invoice & Receipt`

Invoice uploads go into `Invoice & Receipt`. Existing config clients still work; if a client needs a custom folder name or exact folder ID, update that client entry in `lib/invoice-config.js`.

The Settings tab stores the business profile used in invoice PDFs as `business-settings.json` inside the same master Drive folder. If Google OAuth is not configured yet, invoice PDFs fall back to the environment variables above.

You can also override all clients from Vercel with `INVOICE_CLIENTS_JSON`:

```json
[
  {
    "name": "Client Name",
    "code": "CLIENT",
    "billingName": "Client Sdn Bhd",
    "billingAddress": "Client billing address",
    "monthlyRetainer": 1500,
    "driveFolderName": "LBM x Client Name"
  }
]
```

To get `GOOGLE_REFRESH_TOKEN`, login to the app and open:

```text
/api/google/oauth-start
```

After approving Google access, copy the refresh token shown on the callback page into Vercel env.

## Local Facebook Workflow

The original local automation and Telegram workflow is kept under `facebook-posts/`.

## App Icons

The web, iOS, and Android app icons are generated from `public/logo.svg`:

- `public/favicon.ico`
- `public/icons/apple-touch-icon.png`
- `public/icons/android-chrome-192x192.png`
- `public/icons/android-chrome-512x512.png`
