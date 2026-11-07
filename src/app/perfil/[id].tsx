import { useLocalSearchParams } from 'expo-router';
import { ProfileView } from '../../components/profile';

export default function PerfilDeOutro() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileView id={id} showBack />;
}
