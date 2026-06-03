export function MeeplePiece({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 80" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Head */}
      <circle cx="30" cy="13" r="10" fill="currentColor" />
      {/* Toga body */}
      <path d="M12 72 L18 36 Q30 28 42 36 L48 72 Z" fill="currentColor" />
      {/* Toga drape detail */}
      <path d="M18 36 Q22 50 20 72" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      <path d="M42 36 Q38 50 40 72" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
      {/* Arms */}
      <path d="M18 42 Q8 50 10 58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M42 42 Q52 50 50 58" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Base */}
      <ellipse cx="30" cy="72" rx="18" ry="4" fill="currentColor" opacity="0.35" />
    </svg>
  );
}
