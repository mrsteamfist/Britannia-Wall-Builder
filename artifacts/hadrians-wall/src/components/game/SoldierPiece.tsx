export function SoldierPiece({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5 L60 25 L40 25 Z" fill="currentColor" />
      <circle cx="50" cy="35" r="10" fill="currentColor" />
      <path d="M30 90 L40 45 L60 45 L70 90 Z" fill="currentColor" />
      <rect x="75" y="30" width="5" height="60" fill="currentColor" />
      <rect x="20" y="40" width="10" height="30" fill="currentColor" />
    </svg>
  );
}