import { MesocyclePlanContainer } from '../../../components/plan/MesocyclePlanContainer';

export default async function MesocyclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MesocyclePlanContainer mesocycleId={id} />;
}
