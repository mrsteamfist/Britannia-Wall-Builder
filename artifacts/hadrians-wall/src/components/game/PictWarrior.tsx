export function PictWarrior({ className }: { className?: string }) {
  return (
    <img
      src="/meeple_pict.png"
      alt="Pict warrior"
      className={`object-contain drop-shadow-md select-none ${className ?? ""}`}
      draggable={false}
    />
  );
}
