import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export default function AdminSettingsPage() {
  const { name, username, updateProfile } = useAdminAuth();
  const { toast } = useToast();
  const [adminName, setAdminName] = useState(name ?? "");
  const [email, setEmail] = useState(username ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAdminName(name ?? "");
    setEmail(username ?? "");
  }, [name, username]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const error = await updateProfile({ email, name: adminName, ...(password ? { password } : {}) });
    if (error) toast({ title: "Could not save settings", description: error, variant: "destructive" });
    else {
      setPassword("");
      toast({ title: "Admin settings updated", description: "Use the new email and password the next time you log in." });
    }
    setSaving(false);
  };

  return (
    <div className="p-4 space-y-5 sm:p-6 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Admin Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage the single CampusNav administrator account.</p>
      </div>
      <Card className="max-w-2xl shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings className="h-5 w-5 text-primary" />Account</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium">Admin name<Input value={adminName} onChange={(event) => setAdminName(event.target.value)} minLength={2} required /></label>
            <label className="block space-y-1.5 text-sm font-medium">Gmail address<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@gmail.com" required /></label>
            <label className="block space-y-1.5 text-sm font-medium">New password
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={password ? 8 : undefined} placeholder="Leave blank to keep current password" className="pr-10" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <Button type="submit" disabled={saving} className="gap-2"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save changes"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}