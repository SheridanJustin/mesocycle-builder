import { MesocyclePlanContainer } from '../../../components/plan/MesocyclePlanContainer';
import { requirePageUser } from '../../../lib/require-user';

export default async function MesocyclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageUser(`/mesocycles/${id}`);
  return <MesocyclePlanContainer mesocycleId={id} />;
}
