# Supabase And Vercel Setup

## 1. Supabase SQL

Open Supabase SQL Editor and run all of `supabase-schema.sql`.

That creates:

- `cards`
- `audit_log`
- `attendance_records`
- `scanner_devices`
- `admin_users`

It also seeds this super admin:

```text
username: admin
email: adminjixels@gmail.com
password: jixels123@
```

## 2. Vercel Environment Variables

Create these in Vercel Project Settings > Environment Variables:

```env
ADMIN_USER=admin
ADMIN_PASS=jixels123@
ADMIN_EMAIL=adminjixels@gmail.com
MASTER_TOKEN=replace-with-a-long-random-master-registration-secret
QR_SIGNING_SECRET=replace-with-a-long-random-qr-signing-secret
PUBLIC_BASE_URL=https://your-vercel-app.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=
RESET_FROM_EMAIL=Jixels ID Cards <onboarding@resend.dev>
```

Use the Supabase `service_role` key only in Vercel. Do not put it in browser files.

## 3. Vercel Deploy

The project is Vercel-ready through `vercel.json`. Vercel routes every request to `server.js`, while `server.js` exports the handler for serverless use and only starts a port locally with `npm start`.

After deployment, check:

```text
https://your-vercel-app.vercel.app/api/health
```

## 4. Master Registration Link

After `PUBLIC_BASE_URL` and `MASTER_TOKEN` are set, open:

```text
https://your-vercel-app.vercel.app/api/master-link
```

Use that URL/QR as the master registration card link.

## 5. WhatsApp Approval Flow

1. Log in at `/admin`.
2. Approve a worker.
3. The approved card panel opens.
4. Click `Send WhatsApp` to send the worker their claim/download link.

The WhatsApp message uses the worker phone number saved on the card.
