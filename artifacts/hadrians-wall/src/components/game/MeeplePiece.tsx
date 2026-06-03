export function MeeplePiece({ className }: { className?: string }) {
  return (
    <img
      src="/meeple_citizen.png"
      alt="Roman citizen"
      className={`object-contain drop-shadow-md select-none ${className ?? ""}`}
      draggable={false}
    />
  );
}
