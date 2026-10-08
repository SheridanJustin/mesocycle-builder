import { RecordsContainer } from '../../components/records/RecordsContainer';
import { requirePageUser } from '../../lib/require-user';

export default async function RecordsPage() {
  await requirePageUser('/records');
  return <RecordsContainer />;
}
