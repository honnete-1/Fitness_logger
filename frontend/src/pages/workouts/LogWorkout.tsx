import { useNavigate } from "react-router";
import { localToday, workoutsApi } from "../../api";
import { PageHeader } from "../../components/ui/Card";
import { WorkoutForm } from "../../components/workouts/WorkoutForm";
import { useToast } from "../../contexts/ToastContext";
import { emptyDraft } from "../../utils/workoutForm";

export default function LogWorkout() {
  const navigate = useNavigate();
  const toast = useToast();
  return (
    <>
      <PageHeader eyebrow="New session" title="Log a workout" description="Add the exercises you did — every workout counts." />
      <WorkoutForm
        initial={emptyDraft(localToday())}
        submitLabel="Save workout"
        onCancel={() => navigate(-1)}
        onSubmit={async (payload) => {
          const saved = await workoutsApi.create(payload);
          toast.success("Workout saved. Nice work!");
          navigate(`/workouts/${saved.id}`, { replace: true });
        }}
      />
    </>
  );
}
