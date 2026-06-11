# Hosting Checklist

This app is ready for Vercel with Supabase storage.

## Supabase

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase-schema.sql`.
4. Copy your project URL and `service_role` key from Supabase settings.

## Vercel Environment Variables

Add these variables in Vercel:

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

`RESEND_API_KEY` is optional. It is only needed for email password reset and approval email. WhatsApp notification works without Resend.

## Deploy

Vercel uses `vercel.json`:

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

After deploy, open:

```text
https://your-vercel-app.vercel.app/api/health
```

You should see `storage: "supabase"` when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.

## Admin Login

```text
username: admin
email: adminjixels@gmail.com
password: jixels123@
```

Change the password after first login if this site is public.

## Master QR

After deploy, open:

```text
https://your-vercel-app.vercel.app/api/master-link
```

Use that generated link for the master registration QR.

## Send Cards To WhatsApp

1. Log in at `/admin`.
2. Approve the worker.
3. Click `Send WhatsApp` in the approved card panel.
4. The worker receives a link where they can view, print, or download the approved ID card.
