// pages/login.js
import { useRouter } from 'next/router';
import AuthScreen from '../components/AuthScreen';

export default function Login() {
  const router = useRouter();
  const redirectTo = router.query.redirect || '/profile';

  return <AuthScreen redirectTo={redirectTo} />;
}