// The landing page's hero picture: an essay page and a glowing lightbulb (the
// "idea" moment), ringed by the six 5W1H aspects in their signature colours.
// Pure SVG, so it is crisp at any size and has no image licence to worry about.
// The aspect circles bob gently (CSS `hero-float`, off for reduced motion).
import type { SectionKey } from "@/types";
import { SECTION_LABELS } from "@/types";
import { ASPECT_COLORS } from "@/lib/aspect-colors";

// Where each aspect circle sits around the page and bulb (viewBox 500×380).
const ORBIT: { key: SectionKey; x: number; y: number }[] = [
  { key: "siapa", x: 62, y: 58 },
  { key: "apa", x: 222, y: 40 },
  { key: "bila", x: 440, y: 56 },
  { key: "di_mana", x: 462, y: 250 },
  { key: "mengapa", x: 380, y: 334 },
  { key: "bagaimana", x: 52, y: 322 },
];

export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 380"
      role="img"
      aria-label="Ilustrasi: halaman karangan dan mentol idea, dikelilingi enam aspek 5W1H"
      className={className}
      style={{ fontFamily: "var(--font-poppins)" }}
    >
      <defs>
        <linearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <radialGradient id="hero-glow">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="500" height="380" fill="url(#hero-bg)" />

      {/* Soft dotted ring linking the aspects. */}
      <ellipse
        cx="255"
        cy="190"
        rx="205"
        ry="148"
        fill="none"
        stroke="#d97706"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="2 9"
        strokeLinecap="round"
      />

      {/* The essay page, slightly tilted. */}
      <g transform="rotate(-6 175 200)">
        <rect x="88" y="92" width="178" height="220" rx="16" fill="#fff" />
        <rect x="88" y="92" width="178" height="220" rx="16" fill="none" stroke="#fcd34d" strokeWidth="2" />
        <rect x="110" y="116" width="96" height="12" rx="6" fill="#eab308" />
        {[146, 168, 190, 212, 234, 256].map((y, i) => (
          <rect
            key={y}
            x="110"
            y={y}
            width={i % 3 === 2 ? 92 : 134}
            height="8"
            rx="4"
            fill="#e7e5e4"
          />
        ))}
        <text x="110" y="292" fontSize="15" fontWeight="800" fill="#422006">
          5W1H
        </text>
      </g>

      {/* The lightbulb with its glow and rays. */}
      <circle cx="338" cy="168" r="104" fill="url(#hero-glow)" />
      <g stroke="#d97706" strokeWidth="5" strokeLinecap="round">
        <line x1="338" y1="70" x2="338" y2="88" />
        <line x1="268" y1="98" x2="281" y2="111" />
        <line x1="408" y1="98" x2="395" y2="111" />
        <line x1="246" y1="166" x2="264" y2="166" />
        <line x1="412" y1="166" x2="430" y2="166" />
      </g>
      <path
        d="M338 104c-34 0-60 26-60 58 0 21 11 36 23 47 7 6 10 12 10 20v6h54v-6c0-8 3-14 10-20 12-11 23-26 23-47 0-32-26-58-60-58z"
        fill="#facc15"
        stroke="#ca8a04"
        strokeWidth="3"
      />
      <path
        d="M322 210v-24l16 14 16-14v24"
        fill="none"
        stroke="#92400e"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="318" cy="140" rx="12" ry="18" fill="#fff" opacity="0.55" />
      <rect x="312" y="238" width="52" height="11" rx="5" fill="#a16207" />
      <rect x="317" y="252" width="42" height="11" rx="5" fill="#854d0e" />
      <rect x="327" y="266" width="22" height="8" rx="4" fill="#713f12" />

      {/* The six aspects, bobbing gently. */}
      {ORBIT.map(({ key, x, y }, i) => (
        <g
          key={key}
          className="hero-float"
          style={{ animationDelay: `${i * -0.7}s` }}
        >
          <circle cx={x} cy={y} r="31" fill={ASPECT_COLORS[key]} />
          <circle cx={x - 9} cy={y - 11} r="10" fill="#fff" opacity="0.18" />
          <text
            x={x}
            y={y + 4}
            textAnchor="middle"
            fontSize={key === "bagaimana" ? 9.5 : 11}
            fontWeight="700"
            fill="#fff"
          >
            {SECTION_LABELS[key]}
          </text>
        </g>
      ))}
    </svg>
  );
}
