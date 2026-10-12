# Supabase setup

## Configure the project

1. Create a Supabase project and open **SQL Editor**.
2. Run `supabase/schema.sql` from this folder. It creates the tables, enables row-level security, and creates a public `building-photos` bucket for app images and campus floor plans. If the project was already set up, run the new `campus_floor_plans` table block from `supabase/schema.sql` in SQL Editor before using the floor-plan editor.
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET=building-photos` in the API server's `.env`. Get the URL and service-role key from the Supabase project's API settings. The service-role key is server-only: do not put it in the admin/mobile app or commit it.
4. Keep the existing Firebase project credentials in the API `.env` temporarily for migration. Do not remove them until the migration succeeds.

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