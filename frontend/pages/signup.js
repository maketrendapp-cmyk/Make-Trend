// pages/signup.js
import AuthScreen from '../components/AuthScreen';
import Meta from '../components/Meta';

export default function Signup() {
  return (
    <>
      <Meta
        title="Sign Up | Make Trend"
        description="Create your Make Trend account and start launching viral campaigns."
      />
      <AuthScreen redirectTo="/profile" />
    </>
  );
}