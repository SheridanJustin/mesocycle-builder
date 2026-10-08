import { SettingsContainer } from '../../components/settings/SettingsContainer';
import { requirePageUser } from '../../lib/require-user';

export default async function SettingsPage() {
  await requirePageUser('/settings');
  return <SettingsContainer />;
}
