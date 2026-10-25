import { FormEvent, useState } from "react";
import { Building2, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const loginError = await login(username, password);
    if (loginError) setError(loginError);
    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#242730] p-4 sm:p-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-2xl md:min-h-[600px] md:grid-cols-[0.9fr_1.1fr]">
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-sky-900 px-8 py-10 text-center text-white sm:px-12 md:py-14">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-200/50" />
          <div className="absolute -bottom-36 -left-20 h-72 w-72 rounded-full bg-sky-700/50" />
          <div className="relative">
            <img src="/campusnavlg.png" alt="CampusNav logo" className="mx-auto mb-8 h-35 w-35 rounded-full object-cover shadow-lg" />
            <h1 className="text-3xl font-bold tracking-normal">Welcome to CampusNav</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/75">Your campus, organized in one place. Sign in to manage buildings and campus information.</p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-12 md:px-14">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sky-600/10 text-sky-900">
                <Building2 className="h-6 w-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-normal">Welcome Back</h2>
              <p className="mt-2 text-sm text-muted-foreground">Sign in to your admin account</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="admin-email" className="text-sm font-medium">Email</label>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="admin-email" type="email" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your email" className="h-12 rounded-xl pl-10" autoComplete="username" required />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="admin-password" className="text-sm font-medium">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="admin-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-12 rounded-xl pl-10 pr-10" autoComplete="current-password" required />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-0 top-0 inline-flex h-12 w-10 items-center justify-center text-sky-900/50 hover:text-sky-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="h-12 w-full rounded-xl text-base bg-sky-700" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="mt-8 text-center text-xs text-muted-foreground">CampusNav Admin Portal</p>
          </div>
        </section>
      </div>
    </main>
  );
}
