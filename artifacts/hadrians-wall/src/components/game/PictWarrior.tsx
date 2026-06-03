export function PictWarrior({ className }: { className?: string }) {
  return (
    <img
      src="/meeple_pict.png"
      alt="Pict warrior"
      className={`object-contain drop-shadow-md select-none pointer-events-none ${className ?? ""}`}
      draggable={false}
    />
  );
}
