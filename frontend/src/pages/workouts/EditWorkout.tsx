import { useNavigate, useParams } from "react-router";
import { workoutsApi } from "../../api";
import { PageHeader } from "../../components/ui/Card";
import { ErrorState, LoadingState } from "../../components/ui/Feedback";
import { WorkoutForm } from "../../components/workouts/WorkoutForm";
import { useToast } from "../../contexts/ToastContext";
import { useApi } from "../../hooks/useApi";
import { draftFromWorkout } from "../../utils/workoutForm";

export default function EditWorkout() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, error, loading, reload } = useApi((signal) => workoutsApi.get(id, signal), [id]);

  return (
    <>
      <PageHeader eyebrow="Edit workout" title={data?.title ?? "Edit workout"} description="Update anything you need — changes are saved together." />
      {loading && !data ? (
        <LoadingState label="Loading workout" />
      ) : error || !data ? (
        <ErrorState message={error?.message ?? "Workout not found."} onRetry={error?.status === 404 ? undefined : reload} />
      ) : (
        <WorkoutForm
          key={data.id}
          initial={draftFromWorkout(data)}
          submitLabel="Save changes"
          onCancel={() => navigate(`/workouts/${data.id}`)}
          onSubmit={async (payload) => {
            await workoutsApi.update(data.id, payload);
            toast.success("Workout updated.");
            navigate(`/workouts/${data.id}`, { replace: true });
          }}
        />
      )}
    </>
  );
}
