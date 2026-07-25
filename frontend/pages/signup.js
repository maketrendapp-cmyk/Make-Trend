// pages/signup.js
import { useRouter } from 'next/router';
import AuthScreen from '../components/AuthScreen';
import Meta from '../components/Meta';

export default function Signup() {
  const router = useRouter();
  const { ref } = router.query;

  return (
    <>
      <Meta
        title="Sign Up | Make Trend"
        description="Create your Make Trend account and start launching viral campaigns."
      />
      <AuthScreen redirectTo="/profile" initialReferralCode={ref || ''} />
    </>
  );
}