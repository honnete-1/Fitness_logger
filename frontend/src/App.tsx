import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { LoadingState } from "./components/ui/Feedback";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { AppLayout } from "./layouts/AppLayout";
import { GuestOnly, RequireAuth } from "./layouts/guards";
import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import NotFound from "./pages/NotFound";
import LogWorkout from "./pages/workouts/LogWorkout";
import EditWorkout from "./pages/workouts/EditWorkout";
import WorkoutDetail from "./pages/workouts/WorkoutDetail";
import WorkoutHistory from "./pages/workouts/WorkoutHistory";
import ExerciseLibrary from "./pages/exercises/ExerciseLibrary";
import Profile from "./pages/profile/Profile";

// Chart-heavy page loaded on demand.
const Progress = lazy(() => import("./pages/progress/Progress"));

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="workouts" element={<WorkoutHistory />} />
          <Route path="workouts/new" element={<LogWorkout />} />
          <Route path="workouts/:id" element={<WorkoutDetail />} />
          <Route path="workouts/:id/edit" element={<EditWorkout />} />
          <Route path="exercises" element={<ExerciseLibrary />} />
          <Route
            path="progress"
            element={
              <Suspense fallback={<LoadingState label="Loading progress" />}>
                <Progress />
              </Suspense>
            }
          />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
