export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-lg space-y-4 rounded border border-gray-200 p-6">
        <h1 className="font-mono text-lg font-normal text-gray-800">
          404: NOT_FOUND
        </h1>

        <p className="text-sm text-gray-700">
          Path: <span className="font-mono">{window.location.pathname}</span>
        </p>

        <p className="text-sm text-gray-700">
          The page you are trying to visit is not found.
        </p>
      </div>
    </div>
  );
}
