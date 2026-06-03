export function SoldierPiece({ className }: { className?: string }) {
  return (
    <img
      src="/meeple_soldier.png"
      alt="Roman soldier"
      className={`object-contain drop-shadow-md select-none pointer-events-none ${className ?? ""}`}
      draggable={false}
    />
  );
}
