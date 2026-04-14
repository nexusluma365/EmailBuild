# 📧 Email Studio

Build and send beautiful HTML emails through your Gmail account. No third-party email services needed.

---

## ✨ Features

- **Visual email builder** — headline, body, image, CTA button, accent color
- **Live preview** — desktop and mobile toggle
- **Sends via Gmail API** — uses your own Google account
- **Subscriber management** — add, search, import/export CSV
- **Test + campaign sending** — one-by-one delivery with real-time status
- **Campaign automation** — save drafts as campaigns, sync referral leads, auto-send on import with Supabase

---

## 🗂 Project Structure

```
email-studio/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.js  ← NextAuth handler
│   │   └── send-email/route.js          ← Gmail send endpoint
│   ├── globals.css
│   ├── layout.js
│   ├── page.js                          ← Main app shell
│   └── providers.js                     ← SessionProvider wrapper
├── components/
│   ├── EmailBuilder.jsx                 ← Builder UI + live preview
│   ├── SendPanel.jsx                    ← Send test / campaign
│   └── Subscribers.jsx                 ← Subscriber list manager
├── lib/
│   ├── auth.js                          ← NextAuth config (shared)
│   ├── emailTemplate.js                 ← Builds email-safe HTML
│   └── gmail.js                         ← Gmail API send helper
├── .env.local.example
├── netlify.toml
├── next.config.js
├── package.json
└── tailwind.config.js
```

---

## 🔧 Setup Steps

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Google OAuth + Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the **Gmail API**:
   - Sidebar → APIs & Services → Library → search "Gmail API" → Enable
4. Create OAuth credentials:
   - Sidebar → APIs & Services → Credentials → Create Credentials → OAuth Client ID
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Click Create → copy **Client ID** and **Client Secret**
5. Configure OAuth consent screen:
   - Sidebar → OAuth consent screen
   - User type: **External**
   - Fill in app name, support email
   - Add scopes: `email`, `profile`, `https://www.googleapis.com/auth/gmail.send`
   - Add your Google account email as a **Test User** (required while app is in testing mode)

### 3. Create your `.env.local`

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_SECRET=run_openssl_rand_base64_32_and_paste_here
NEXTAUTH_URL=http://localhost:3000
```

Generate the NextAuth secret:
```bash
openssl rand -base64 32
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign in with Google → start building!

---

## 🚀 Deploy to Netlify

### Option A: Netlify CLI

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod
```

### Option B: GitHub + Netlify UI

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → New site from Git
3. Connect your repo
4. Build settings are auto-detected from `netlify.toml`
5. Add environment variables in **Site Settings → Environment Variables**:

```
GOOGLE_CLIENT_ID          = your_client_id
GOOGLE_CLIENT_SECRET      = your_client_secret
NEXTAUTH_SECRET           = your_secret
NEXTAUTH_URL              = https://your-site.netlify.app
```

6. **Update Google OAuth credentials** with your production URL:
   - Add `https://your-site.netlify.app` to Authorized JavaScript origins
   - Add `https://your-site.netlify.app/api/auth/callback/google` to Authorized redirect URIs

---

## 📦 Tech Stack

| Layer       | Technology                  |
|-------------|----------------------------|
| Framework   | Next.js 14 (App Router)    |
| Styling     | Tailwind CSS + DM Sans     |
| Auth        | NextAuth.js v4 (Google)    |
| Email send  | Gmail API (REST)           |
| Storage     | Browser localStorage       |
| Deploy      | Netlify                    |

## Campaigns + Supabase

The app now supports a Supabase-backed campaign workflow:

- Save the current draft as a persistent campaign
- Store imported referral leads in Supabase
- Enable automation so active campaigns send automatically after referral sync
- Persist Google sender credentials in Supabase so automated sends can run outside the current browser session

### Supabase setup

1. Create a Supabase project
2. Run [supabase/schema.sql](/Users/nexusluma/Downloads/email-studio-github-netlify-clean/supabase/schema.sql:1) in the SQL editor
3. Add these env vars:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
REFERRAL_SOURCE_URL=https://your-referral-source.example.com/referrals
CRON_SECRET=your_random_secret
AUTOMATION_OWNER_EMAIL=you@example.com
```

### Important referral-source limitation

Your current Google Apps Script can write referral rows and send emails, but it does **not** expose those rows for reading. This app's `/api/referrals/sync` route expects `REFERRAL_SOURCE_URL` to return JSON like:

```json
{
  "referrals": [
    {
      "referralFirstName": "Jane",
      "referralLastName": "Doe",
      "referralEmail": "jane@example.com",
      "businessName": "Acme Co"
    }
  ]
}
```

### Minimal Apps Script read endpoint

Add this to your Apps Script so the app can import referrals:

```javascript
function listReferralRows() {
  var sheet = getSheet();
  var values = sheet.getDataRange().getValues();
  var headers = values.shift();

  return values
    .filter(function(row) { return row[3]; }) // Referral Email
    .map(function(row) {
      var item = {};
      headers.forEach(function(header, index) {
        item[header] = row[index];
      });
      return {
        timestamp: item['Timestamp'],
        referralFirstName: item['Referral First Name'],
        referralLastName: item['Referral Last Name'],
        referralEmail: item['Referral Email'],
        businessName: item['Business Name'],
        yourFirstName: item['Your First Name'],
        yourLastName: item['Your Last Name'],
        yourEmail: item['Your Email'],
        paymentMethod: item['Payment Method'],
        paymentDetails: item['Payment Details'],
        status: item['Status']
      };
    });
}

function doGet(e) {
  try {
    if (e.parameter && e.parameter.action === 'referrals') {
      return ContentService
        .createTextOutput(JSON.stringify({ referrals: listReferralRows() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (e.parameter && e.parameter.data) {
      var data = JSON.parse(decodeURIComponent(e.parameter.data));
      writeRow(data);
      sendReferralEmail(data);
      sendConfirmationEmail(data);
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, via: 'GET' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'Nexus Luma script is live.' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

Then set:

```env
REFERRAL_SOURCE_URL=https://script.google.com/macros/s/your-script-id/exec?action=referrals
```

---

## 🔐 How auth + sending works

1. User signs in with Google via NextAuth — requesting `gmail.send` scope
2. NextAuth stores the `access_token` in the encrypted JWT
3. On send, the `/api/send-email` route reads the token server-side only
4. It builds a MIME message (base64url encoded) and POSTs to Gmail's REST API
5. Gmail delivers it from the user's own inbox — no third-party sending service

**Note:** While Google's OAuth app is in "Testing" mode, only accounts added as Test Users can sign in. To allow anyone to sign in, submit your app for Google verification.

---

## 💾 Subscriber Storage

Subscribers are stored in `localStorage` — meaning:
- ✅ No server or database required
- ✅ Instant, works offline
- ⚠️ Data lives in the browser — clearing cookies/localStorage removes them
- 💡 Use Export CSV to back up your list anytime

---

## 🛠 Common Issues

**"Error 403: Access denied"**  
→ Your Google account isn't added as a Test User. Add it in Google Cloud → OAuth consent screen → Test Users.

**"Error 401: Not authenticated"**  
→ Sign out and sign back in. This MVP does not yet auto-refresh expired Google access tokens.

**Emails going to spam?**  
→ This is normal for personal Gmail accounts sending bulk mail. Ask recipients to mark as "Not Spam". For large lists, consider Google Workspace or a warmed-up domain.

**Netlify build fails?**  
→ Make sure all env vars are set in Netlify dashboard, and `NEXTAUTH_URL` matches your live domain exactly.
