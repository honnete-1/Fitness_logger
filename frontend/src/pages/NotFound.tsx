import { Compass } from "lucide-react";
import { ButtonLink } from "../components/ui/Button";
import { EmptyState } from "../components/ui/Feedback";
import { useAuth } from "../contexts/AuthContext";

export default function NotFound() {
  const { status } = useAuth();
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <EmptyState
        icon={<Compass className="size-6" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have moved."
        action={<ButtonLink to={status === "authenticated" ? "/dashboard" : "/"}>Go home</ButtonLink>}
      />
    </div>
  );
}
