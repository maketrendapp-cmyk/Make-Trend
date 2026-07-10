// frontend/pages/create.js
import Meta from '../components/Meta';

export default function Create() {
  return (
    <>
      <Meta 
        title="Create Campaign" 
        description="Design your viral campaign. Set the platform, action type, and reward link in just a few clicks."
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">✨ Create Campaign</h1>
        <p className="text-gray-500 mt-2">Campaign creation form will go here.</p>
      </main>
    </>
  );
}