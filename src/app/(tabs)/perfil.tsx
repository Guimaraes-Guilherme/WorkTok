import { ProfileView } from '../../components/profile';
import { useMe } from '../../lib/auth';

export default function MeuPerfil() {
  const { userId } = useMe();
  return <ProfileView id={userId} />;
}
