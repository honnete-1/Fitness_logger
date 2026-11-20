import { LogOut, Minus, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ApiError, authApi } from "../../api";
import { Button, IconButton } from "../../components/ui/Button";
import { Card, CardHeader, PageHeader } from "../../components/ui/Card";
import { FormAlert, TextField } from "../../components/ui/Field";
import { displayNameOf, useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { pluralize } from "../../utils/format";

function AccountForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({ display_name: user!.display_name, username: user!.username, email: user!.email });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = values.display_name !== user!.display_name || values.username !== user!.username || values.email !== user!.email;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.username.trim()) next.username = "Username can't be empty.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = "Enter a valid email address.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const updated = await authApi.updateMe({ display_name: values.display_name.trim(), username: values.username.trim(), email: values.email.trim() });
      setUser(updated);
      setValues({ display_name: updated.display_name, username: updated.username, email: updated.email });
      toast.success("Profile updated.");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        setErrors(Object.fromEntries(Object.entries(err.fieldErrors).map(([k, v]) => [k, v.join(" ")])));
      } else setFormError(err instanceof ApiError ? err.message : "Couldn't save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Account" description="How you appear in the app and how you sign in." />
      <form noValidate onSubmit={submit} className="space-y-5 px-5 pt-5 pb-6 sm:px-6">
        <FormAlert message={formError} />
        <TextField label="Display name" optional hint="Shown in greetings. Defaults to your username." value={values.display_name} maxLength={150} onChange={(e) => setValues({ ...values, display_name: e.target.value })} error={errors.display_name} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Username" autoComplete="username" value={values.username} maxLength={150} onChange={(e) => setValues({ ...values, username: e.target.value })} error={errors.username} />
          <TextField label="Email" type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} error={errors.email} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={!dirty}>Save changes</Button>
        </div>
      </form>
    </Card>
  );
}

function GoalForm() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [target, setTarget] = useState(user!.weekly_workout_target);
  const [saving, setSaving] = useState(false);
  const clamp = (n: number) => Math.min(14, Math.max(1, n));

  const save = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateGoal(target);
      setUser({ ...user!, weekly_workout_target: res.weekly_workout_target });
      toast.success(`Weekly goal set to ${pluralize(res.weekly_workout_target, "workout")}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update your goal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Weekly goal" description="Pick a target that fits your life. Weeks run Monday to Sunday." />
      <div className="flex flex-col gap-5 px-5 pt-5 pb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <IconButton label="Decrease weekly goal" onClick={() => setTarget((t) => clamp(t - 1))} disabled={target <= 1} className="border border-stone-deep">
            <Minus aria-hidden className="size-4" />
          </IconButton>
          <p className="min-w-36 text-center" aria-live="polite">
            <span className="tabular block text-4xl font-semibold text-berry">{target}</span>
            <span className="text-sm text-ink-muted">{target === 1 ? "workout" : "workouts"} per week</span>
          </p>
          <IconButton label="Increase weekly goal" onClick={() => setTarget((t) => clamp(t + 1))} disabled={target >= 14} className="border border-stone-deep">
            <Plus aria-hidden className="size-4" />
          </IconButton>
        </div>
        <Button onClick={save} loading={saving} disabled={target === user!.weekly_workout_target}>Save goal</Button>
      </div>
    </Card>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  if (!user) return null;

  const joined = new Date(user.date_joined).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Profile" description="Manage your account and personal goal." />
      <Card className="mb-6 flex items-center gap-4 p-5 sm:p-6">
        <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-blush text-xl font-semibold text-berry">
          {displayNameOf(user).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{displayNameOf(user)}</p>
          <p className="truncate text-sm text-ink-muted">@{user.username} · Member since {joined}</p>
        </div>
      </Card>
      <div className="space-y-6">
        <GoalForm />
        <AccountForm />
        <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-semibold">Sign out</h2>
            <p className="text-sm text-ink-muted">End your session on this device.</p>
          </div>
          <Button
            variant="secondary"
            loading={leaving}
            icon={<LogOut aria-hidden className="size-4" />}
            onClick={async () => {
              setLeaving(true);
              await logout();
              toast.info("You've been signed out.");
              navigate("/login", { replace: true });
            }}
          >
            Log out
          </Button>
        </Card>
      </div>
    </>
  );
}
