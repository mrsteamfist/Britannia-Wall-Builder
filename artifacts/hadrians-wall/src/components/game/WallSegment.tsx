export function WallSegment({ built, className }: { built: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      {built ? (
        <g>
          <rect width="100" height="100" fill="hsl(var(--secondary))" />
          <path d="M0,33 L100,33 M0,66 L100,66 M33,0 L33,33 M66,33 L66,66 M33,66 L33,100" stroke="hsl(var(--border))" strokeWidth="4" />
        </g>
      ) : (
        <rect width="100" height="100" fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />
      )}
    </svg>
  );
}