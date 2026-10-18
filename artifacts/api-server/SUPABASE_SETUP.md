# Supabase setup

## Configure the project

1. Create a Supabase project and open **SQL Editor**.
2. Run `supabase/schema.sql` from this folder. It creates the tables, enables row-level security, and creates a public `building-photos` bucket for app images and campus floor plans. For an existing project, run the updated schema again in SQL Editor to add app updates, feedback, and configurable floor-legend colors; its table and bucket setup is idempotent. Also run the `alter table public.users` and `create unique index ... users_username_unique_idx` statements to enable email/password accounts. If username values are duplicated regardless of case, resolve those duplicates before creating the unique index.
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET=building-photos` in the API server's `.env`. Get the URL and service-role key from the Supabase project's API settings. The service-role key is server-only: do not put it in the admin/mobile app or commit it.
4. Keep the existing Firebase project credentials in the API `.env` temporarily for migration. Do not remove them until the migration succeeds.

Email/password account recovery also requires `ADMIN_SMTP_USER` and `ADMIN_SMTP_APP_PASSWORD` in the API server environment. Use a Gmail App Password; do not use a normal Gmail password.

## Migrate existing records and photos

Run this from the repository root after applying the SQL schema and adding the Supabase values:

```powershell
pnpm --filter @workspace/api-server migrate:firebase
```

The migration copies building records, registered users, the admin account, and Firebase Storage building photos. It is safe to re-run: records are upserted and migrated photos receive new Supabase URLs. Check the reported counts and confirm the buildings/photos in Supabase before removing old Firebase credentials.

## Run the API

Restart the API server after configuring Supabase:

```powershell
pnpm --filter @workspace/api-server run dev
```

The API continues to provide the same routes to the admin and mobile apps. New building images upload to Supabase Storage. Once migration is verified, remove the `FIREBASE_*` values from the API `.env`; the Cloudinary variables are no longer used.