import { WorkoutContainer } from '../../../../../components/workout/WorkoutContainer';
import { requirePageUser } from '../../../../../lib/require-user';

export default async function WorkoutPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  await requirePageUser(`/mesocycles/${id}/workouts/${sessionId}`);
  return <WorkoutContainer sessionId={sessionId} />;
}
