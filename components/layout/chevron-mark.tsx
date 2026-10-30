// The three little play-triangles from the Kuning Emas design (teal, gold,
// coral) — the app's mark, used in the header, the menu panel and the hero.
export function ChevronMark({ size = 10 }: { size?: number }) {
  const colors = ["#00a896", "#fab915", "#e63956"];
  return (
    <span aria-hidden className="flex items-center gap-1">
      {colors.map((c) => (
        <span
          key={c}
          className="h-0 w-0 border-y-transparent"
          style={{
            borderTopWidth: size * 0.6,
            borderBottomWidth: size * 0.6,
            borderLeftWidth: size,
            borderLeftColor: c,
            borderStyle: "solid",
            borderRightWidth: 0,
          }}
        />
      ))}
    </span>
  );
}
