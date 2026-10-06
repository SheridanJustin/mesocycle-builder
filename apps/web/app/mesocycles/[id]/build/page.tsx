import { BuilderPage } from '../../../../components/wizard/BuilderPage';

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BuilderPage mesocycleId={id} />;
}
