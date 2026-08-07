// app/dashboard/loading.tsx
export default function Loading() {
  // Return a spinner, text, or a skeleton loader layout
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-lg font-semibold text-gray-700">Loading Dashboard...</p>
    </div>
  );
}
