// pages/templates/ncell-reward-v1.js
import { useRouter } from 'next/router';

export default function NcellRewardV1() {
  const router = useRouter();
  const { id } = router.query;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: 'white' }}>
      <h1>Ncell Reward V1</h1>
      <p>Campaign ID: {id || 'Not provided'}</p>
      <button onClick={() => router.push(`/tasks?id=${id}`)}>
        Go to Tasks
      </button>
    </div>
  );
}