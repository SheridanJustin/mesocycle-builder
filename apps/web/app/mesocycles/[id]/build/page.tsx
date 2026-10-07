import { BuilderPage } from '../../../../components/wizard/BuilderPage';
import { requirePageUser } from '../../../../lib/require-user';

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageUser(`/mesocycles/${id}/build`);
  return <BuilderPage mesocycleId={id} />;
}
