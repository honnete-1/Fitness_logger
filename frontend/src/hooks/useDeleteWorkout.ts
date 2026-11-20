import { useCallback, useState } from "react";
import { ApiError, workoutsApi } from "../api";
import { useToast } from "../contexts/ToastContext";

/** Shared confirm-then-delete flow for the history and detail pages. */
export function useDeleteWorkout<T extends { id: number; title: string }>(onDeleted: (w: T) => void) {
  const toast = useToast();
  const [target, setTarget] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirm = useCallback(async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await workoutsApi.remove(target.id);
      toast.success(`“${target.title}” was deleted.`);
      const deleted = target;
      setTarget(null);
      onDeleted(deleted);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the workout. Please try again.");
    } finally {
      setDeleting(false);
    }
  }, [target, toast, onDeleted]);

  return {
    target,
    deleting,
    request: setTarget,
    cancel: useCallback(() => setTarget(null), []),
    confirm,
  };
}
