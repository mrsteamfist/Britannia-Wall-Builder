export function PictWarrior({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M40 10 L60 10 L65 30 L35 30 Z" fill="currentColor" />
      <path d="M25 80 L35 35 L65 35 L75 80 Z" fill="currentColor" />
      <path d="M10 20 L25 50 L20 60 L5 30 Z" fill="currentColor" />
      <path d="M90 20 L75 50 L80 60 L95 30 Z" fill="currentColor" />
      <circle cx="50" cy="20" r="8" fill="hsl(var(--background))" />
    </svg>
  );
}