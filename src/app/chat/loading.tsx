export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-auth-gradient">
      <div className="w-full max-w-2xl h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-white/30">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-500 dark:border-white"></div>
        </div>
      </div>
    </div>
  );
} 