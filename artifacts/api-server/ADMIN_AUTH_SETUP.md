# Admin authentication

Set these environment variables before starting the API server:

```env
ADMIN_USERNAME=admin@gmail.com
ADMIN_PASSWORD=use-a-long-unique-password
ADMIN_SESSION_SECRET=use-a-long-random-secret
ADMIN_SMTP_USER=admin@gmail.com
ADMIN_SMTP_APP_PASSWORD=your-gmail-app-password
```

The Admin Panel signs in through `/api/admin/login`. The first startup seeds one Supabase admin account from these variables if no admin record exists. After that, the account in Supabase is shared across devices. The Settings page can update the admin Gmail, display name, and app password. The API stores the session in an HttpOnly cookie and protects building create/update/delete/seed operations, image uploads, and the admin user list. Public building read endpoints remain available to the mobile app.

`ADMIN_PASSWORD` is an app password for CampusNav. Never use or store the real Gmail password. The app does not need access to Gmail passwords.

To receive email alerts for Admin Panel logins and account changes, configure `ADMIN_SMTP_USER` and a Gmail App Password in `ADMIN_SMTP_APP_PASSWORD`. Create the App Password in Google Account security settings; never put the normal Gmail password in the server configuration.

Do not commit real credentials or put them in the frontend environment.