# RLA Workflow

Next.js app that lets a real estate agent prefill and send a CAR Residential Listing Agreement (RLA) through DocuSign by typing a freeform listing brief or filling in form fields. Claude extracts structured data; DocuSign sends a prefilled template to the seller; auto-reminders are enabled (2 days, then daily).

## Architecture

```
Agent enters listing details (freeform or form)
  → POST /api/extract       (Claude pulls structured fields from freeform text)
  → Agent reviews + edits the field values in the app
  → POST /api/send          (creates a DRAFT envelope via JWT Grant, returns an
                             embedded "Review & Send" URL)
  → Agent reviews the real prefilled document in DocuSign and clicks Send
  → DocuSign emails seller (Seller signs first, Agent counter-signs)
```

**Review gate:** the envelope is created as a *draft* and the agent is dropped into
DocuSign's "Review & Send" screen. Nothing is sent to the seller until the listing
agent clicks **Send** there. If they back out, the draft sits in their DocuSign
Drafts and the app says "Saved as draft."

Server-side API routes keep both API keys off the browser and avoid all CORS issues.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev                         # http://localhost:3000
```

## Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this on github.com).
2. Sign in to https://vercel.com with GitHub.
3. "Add New… → Project" → import `rla-workflow`.
4. Under "Environment Variables", add every key from `.env.local.example` with real values.
5. Click **Deploy**.

## DocuSign one-time setup (required before first send)

### 1. Generate RSA keypair

1. Sign in to https://admindemo.docusign.com (demo environment).
2. Settings → Apps and Keys → click your integration (Integration Key `efceafe8-89e8-4d2c-8f9e-fbea2af4a821`).
3. Under **RSA Keypairs**, click **+ Generate RSA**.
4. Copy the **private key** (long block starting with `-----BEGIN RSA PRIVATE KEY-----`).
5. In Vercel → Project → Settings → Environment Variables, paste the entire private key (including BEGIN/END lines) as the value of `DOCUSIGN_PRIVATE_KEY`. Vercel handles multi-line values natively — paste as-is.
6. Redeploy (Vercel auto-redeploys on env-var change).

### 2. Grant impersonation consent (one-time, per DocuSign user)

JWT Grant requires the user (Ian) to consent to impersonation once. Open this URL once in a browser logged in to the DocuSign demo account:

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=efceafe8-89e8-4d2c-8f9e-fbea2af4a821&redirect_uri=https://www.docusign.com
```

Click **Accept**. Done — JWT Grant will now work server-side.

## Environment variables checklist

| Variable | Where to find / set |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com → API Keys |
| `DOCUSIGN_INTEGRATION_KEY` | DocuSign Admin → Apps and Keys |
| `DOCUSIGN_SECRET_KEY` | DocuSign Admin → Apps and Keys (Secret) |
| `DOCUSIGN_ACCOUNT_ID` | DocuSign Admin → top right → API Account ID |
| `DOCUSIGN_USER_ID` | DocuSign Admin → Users → click user → User ID (GUID) |
| `DOCUSIGN_BASE_URL` | `https://demo.docusign.net/restapi/v2.1` (sandbox) |
| `DOCUSIGN_AUTH_SERVER` | `account-d.docusign.com` (sandbox) |
| `DOCUSIGN_TEMPLATE_ID` | DocuSign → Templates → click template → ID in URL |
| `DOCUSIGN_PRIVATE_KEY` | Generated above |
| `AGENT_NAME` | e.g. `Ian Tudor` |
| `AGENT_EMAIL` | e.g. `ian.b.tudor@gmail.com` |

## Going to production

When you complete DocuSign's go-live process, swap these in Vercel:

| Var | Demo (current) | Production |
|---|---|---|
| `DOCUSIGN_BASE_URL` | `https://demo.docusign.net/restapi/v2.1` | `https://na3.docusign.net/restapi/v2.1` |
| `DOCUSIGN_AUTH_SERVER` | `account-d.docusign.com` | `account.docusign.com` |
| `DOCUSIGN_ACCOUNT_ID` | `880343cb-691b-499f-94f6-7ab43ec41402` | `0add4fed-ba10-4057-94d3-085cce14fdef` |

Re-grant impersonation consent on the production auth server URL after switching.
