# Admin authentication

Run `supabase/schema.sql` in the Supabase SQL Editor before starting the updated API. The migration preserves the existing admin account as a CTU Danao campus admin.

Set separate credentials for the super admin and the existing Danao campus admin:

```env
SUPER_ADMIN_USERNAME=superadmin@gmail.com
SUPER_ADMIN_PASSWORD=use-a-long-unique-password
SUPER_ADMIN_NAME=CampusNav Super Admin
ADMIN_USERNAME=admin@gmail.com
ADMIN_PASSWORD=use-a-long-unique-password
ADMIN_NAME=CTU Danao Campus Admin
ADMIN_SESSION_SECRET=use-a-long-random-secret
ADMIN_SMTP_USER=admin@gmail.com
ADMIN_SMTP_APP_PASSWORD=your-gmail-app-password
```

The first successful super-admin login creates its account from `SUPER_ADMIN_USERNAME` and `SUPER_ADMIN_PASSWORD`. The existing Danao account is migrated from `admin_settings`, or seeded from `ADMIN_USERNAME` and `ADMIN_PASSWORD` if no stored account exists. Super admins can create, edit, block, and delete campus admin accounts and assign their campus. Campus admins can manage buildings only for their assigned campus. The public building list remains systemwide for the mobile app and includes each building's campus name.

The Admin Panel signs in through `/api/admin/login`; sessions use an HttpOnly cookie. Campus admins can update their own Gmail, display name, and password in Settings. Super-admin and campus-admin credentials must use different Gmail addresses.

`ADMIN_PASSWORD` is an app password for CampusNav. Never use or store the real Gmail password. The app does not need access to Gmail passwords.

To receive email alerts for Admin Panel logins and account changes, and password reset codes for app users, configure `ADMIN_SMTP_USER` and a Gmail App Password in `ADMIN_SMTP_APP_PASSWORD`. Create the App Password in Google Account security settings; never put the normal Gmail password in the server configuration.

Do not commit real credentials or put them in the frontend environment.