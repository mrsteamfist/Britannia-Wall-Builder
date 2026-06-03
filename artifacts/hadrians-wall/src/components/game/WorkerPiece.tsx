export function WorkerPiece({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M50 10 A15 15 0 0 0 50 40 A15 15 0 0 0 50 10 Z" fill="currentColor" />
      <path d="M20 90 L30 45 Q50 35 70 45 L80 90 Z" fill="currentColor" />
      <path d="M20 90 L80 90" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}