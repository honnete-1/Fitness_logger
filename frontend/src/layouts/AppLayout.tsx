import { BookOpen, History, LayoutDashboard, LineChart, LogOut, Plus, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Logo, LogoMark } from "../components/ui/Logo";
import { displayNameOf, useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/workouts/new", label: "Log Workout", short: "Log", icon: Plus, primary: true },
  { to: "/workouts", label: "Workout History", short: "History", icon: History, end: true },
  { to: "/exercises", label: "Exercise Library", short: "Exercises", icon: BookOpen },
  { to: "/progress", label: "Progress", short: "Progress", icon: LineChart },
  { to: "/profile", label: "Profile", short: "Profile", icon: UserRound },
] as const;

// Mobile bottom bar: the five most frequent destinations, "Log" in the centre.
const MOBILE_NAV = [NAV[0], NAV[2], NAV[1], NAV[4], NAV[3]];

export function AppLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const doLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.info("You've been signed out. See you next time!");
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  const name = displayNameOf(user);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-berry px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col border-r border-stone bg-white/60 px-4 py-6 lg:flex">
        <Link to="/dashboard" className="mb-8 rounded-xl px-2" aria-label="Workout Logger home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, ...item }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in item ? item.end : false}
              className={({ isActive }) =>
                `group flex h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition-colors ${
                  isActive ? "bg-berry-soft text-berry" : "text-ink-muted hover:bg-stone/50 hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden
                    className={`h-5 w-1 -ml-3 mr-0 rounded-r-full transition-colors ${isActive ? "bg-berry" : "bg-transparent"}`}
                  />
                  <Icon aria-hidden className="size-[1.15rem]" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 border-t border-stone pt-4">
          <div className="flex items-center gap-3 px-2">
            <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-blush text-sm font-semibold text-berry">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{name}</p>
              <p className="truncate text-xs text-ink-muted">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="mt-3 flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-stone/50 hover:text-ink"
          >
            <LogOut aria-hidden className="size-[1.1rem]" />
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone/80 bg-ivory/90 px-4 backdrop-blur lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2 rounded-lg" aria-label="Workout Logger home">
          <LogoMark className="size-8" />
          <span className="text-[0.9375rem] font-semibold tracking-tight">Workout Logger</span>
        </Link>
        <NavLink
          to="/profile"
          aria-label="Profile"
          className={({ isActive }) =>
            `flex size-10 items-center justify-center rounded-full text-sm font-semibold ${isActive ? "bg-berry text-white" : "bg-blush text-berry"}`
          }
        >
          {initial}
        </NavLink>
      </header>

      <main id="main" className="min-w-0 flex-1 pb-28 lg:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
          {MOBILE_NAV.map(({ to, short, icon: Icon, ...item }) => (
            <li key={to} className="flex">
              {"primary" in item ? (
                <NavLink
                  to={to}
                  aria-label="Log workout"
                  className="mx-auto -mt-5 flex size-14 items-center justify-center rounded-full bg-berry text-white shadow-lift ring-4 ring-ivory transition-transform active:scale-95"
                >
                  <Icon aria-hidden className="size-6" />
                </NavLink>
              ) : (
                <NavLink
                  to={to}
                  end={"end" in item ? item.end : false}
                  className={({ isActive }) =>
                    `flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium ${isActive ? "text-berry" : "text-ink-muted"}`
                  }
                >
                  <Icon aria-hidden className="size-5" />
                  {short}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <ConfirmDialog
        open={confirmLogout}
        tone="primary"
        title="Log out?"
        description="You'll need to sign in again to see your workouts."
        confirmLabel="Log out"
        loading={loggingOut}
        onConfirm={doLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
