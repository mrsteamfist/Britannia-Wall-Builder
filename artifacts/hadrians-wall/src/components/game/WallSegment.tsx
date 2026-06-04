export function WallSegment({ built, className }: { built: boolean; className?: string }) {
  if (built) {
    return (
      <img
        src="/wall-section.png"
        alt="Wall section"
        className={`object-contain select-none ${className ?? ""}`}
        draggable={false}
      />
    );
  }
  return (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 4" />
    </svg>
  );
}
