export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--sb-cream)]">
      <div className="flex flex-col items-center gap-4">
        {/* Simple spinner using Tailwind */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--sb-light)] border-t-[var(--sb-green)]" />
        <p className="text-sm font-medium text-[var(--sb-dark)] animate-pulse">Brewing your data...</p>
      </div>
    </div>
  );
}
