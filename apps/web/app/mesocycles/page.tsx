import { MesocycleListContainer } from '../../components/mesocycles/MesocycleListContainer';
import { requirePageUser } from '../../lib/require-user';

export default async function MesocyclesPage() {
  await requirePageUser('/mesocycles');
  return <MesocycleListContainer />;
}
