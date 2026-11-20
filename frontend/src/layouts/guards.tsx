import { Navigate, Outlet, useLocation } from "react-router";
import { LogoMark } from "../components/ui/Logo";
import { Spinner } from "../components/ui/Feedback";
import { useAuth } from "../contexts/AuthContext";

function FullPageLoader() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <LogoMark className="size-12" />
      <Spinner label="Loading your journal" />
    </div>
  );
}

/** Private pages: redirect visitors to the login page, remembering where they were going. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullPageLoader />;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Login/register/landing: signed-in users go straight to their dashboard. */
export function GuestOnly() {
  const { status } = useAuth();
  if (status === "loading") return <FullPageLoader />;
  if (status === "authenticated") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
