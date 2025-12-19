"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold text-[var(--sb-dark)]">Something went wrong!</h2>
      <p className="text-gray-500">We couldn&apos;t serve your request. Please try again.</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-[var(--sb-green)] text-white rounded-md hover:brightness-110 transition"
      >
        Try again
      </button>
    </div>
  );
}
