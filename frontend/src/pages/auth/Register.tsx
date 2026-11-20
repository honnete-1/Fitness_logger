import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../../api";
import { Button } from "../../components/ui/Button";
import { FormAlert, TextField } from "../../components/ui/Field";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { AuthLayout } from "../../layouts/AuthLayout";
import { PasswordToggle } from "./Login";

type Fields = "username" | "email" | "password" | "password_confirm";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(values: Record<Fields, string>): Partial<Record<Fields, string>> {
  const errors: Partial<Record<Fields, string>> = {};
  if (!values.username.trim()) errors.username = "Choose a username.";
  else if (!/^[\w.@+-]+$/.test(values.username.trim()))
    errors.username = "Use letters, numbers and @ . + - _ only.";
  if (!values.email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Create a password.";
  else if (values.password.length < 8) errors.password = "Use at least 8 characters.";
  if (!values.password_confirm) errors.password_confirm = "Confirm your password.";
  else if (values.password && values.password !== values.password_confirm)
    errors.password_confirm = "Passwords do not match.";
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<Fields, string>>({ username: "", email: "", password: "", password_confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (field: Fields) => (e: ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    if (errors[field]) setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clientErrors = validateRegistration(values);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      const user = await register({ ...values, username: values.username.trim(), email: values.email.trim() });
      toast.success(`Welcome, ${user.username}! Your journal is ready.`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        const server: Partial<Record<Fields, string>> = {};
        for (const f of ["username", "email", "password", "password_confirm"] as Fields[]) {
          if (err.fieldErrors[f]) server[f] = err.fieldErrors[f].join(" ");
        }
        setErrors(server);
        if (!Object.keys(server).length) setFormError(err.message);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your fitness journal — it only takes a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-berry underline-offset-4 hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-5">
        <FormAlert message={formError} />
        <TextField label="Username" name="username" autoComplete="username" autoCapitalize="none" value={values.username} onChange={set("username")} error={errors.username} required />
        <TextField label="Email address" name="email" type="email" autoComplete="email" value={values.email} onChange={set("email")} error={errors.email} required />
        <div className="relative">
          <TextField
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={values.password}
            onChange={set("password")}
            error={errors.password}
            hint="At least 8 characters. Avoid common or all-number passwords."
            className="pr-11"
            required
          />
          <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
        </div>
        <TextField
          label="Confirm password"
          name="password_confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={values.password_confirm}
          onChange={set("password_confirm")}
          error={errors.password_confirm}
          required
        />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
