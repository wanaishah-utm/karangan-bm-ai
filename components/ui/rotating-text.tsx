"use client";

// "Text Carousel" — a headline made of a plain PREFIX word followed by a
// coloured badge whose word animates in letter-by-letter and cycles through a
// list. Built on GSAP.
//
// This version is themed to our app (emerald primary, adapts to light/dark),
// sized fluidly with CSS clamp, and respects prefers-reduced-motion.
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface RotatingTextProps {
  prefix?: string; // the static word before the badge, e.g. "Jana"
  texts: string[]; // the words the badge cycles through (loops back to first)
  rotationInterval?: number; // milliseconds each word stays on screen
  className?: string;
}

export function RotatingText({
  prefix = "",
  texts,
  rotationInterval = 2200,
  className,
}: RotatingTextProps) {
  // Which word in `texts` is currently shown.
  const [index, setIndex] = useState(0);
  // Whether the user asked the OS to reduce motion.
  const [reduced, setReduced] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  // Remembers the badge's pixel width so we can tween FROM it to the next width.
  const prevWidthRef = useRef<number | null>(null);

  // 1) Detect (and keep watching) the reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // One-time read of the preference on mount. matchMedia isn't available during
    // server render, so this deferred single setState is intentional and safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // 2) Auto-rotate on a timer — but NOT when reduced motion is preferred.
  useEffect(() => {
    if (reduced) return; // stay on the first word, no rotation
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % texts.length); // loops back to 0 naturally
    }, rotationInterval);
    return () => clearInterval(id); // cleanup: stop the timer on unmount
  }, [reduced, texts.length, rotationInterval]);

  // 3) Animate whenever the word changes: tween the badge width to fit the new
  //    word, and reveal the letters one-by-one. Skipped under reduced motion.
  useEffect(() => {
    if (reduced) return;
    const badge = badgeRef.current;
    const container = containerRef.current;
    if (!badge || !container) return;

    // Measure the new word's natural width, then tween from the previous width.
    const previous = prevWidthRef.current;
    badge.style.width = "auto";
    const target = badge.getBoundingClientRect().width;
    badge.style.width = `${previous ?? target}px`;

    const widthTween = gsap.to(badge, {
      width: target,
      duration: 0.45,
      ease: "power3.out",
    });
    prevWidthRef.current = target;

    // Letter-by-letter reveal.
    const letters = container.querySelectorAll("[data-letter]");
    const lettersTween = gsap.from(letters, {
      opacity: 0,
      y: 10,
      stagger: 0.03,
      duration: 0.35,
      ease: "power3.out",
    });

    // Cleanup: kill both tweens so they never run after unmount (no leaks).
    return () => {
      widthTween.kill();
      lettersTween.kill();
    };
  }, [index, reduced]);

  // Under reduced motion we always show the FIRST word, statically.
  const word = reduced ? texts[0] : texts[index];

  return (
    <div
      ref={containerRef}
      className={className}
      // Fluid size: scales from ~32px on a 360px phone up to 72px on desktop.
      style={{
        fontSize: "clamp(2rem, 7vw, 4.5rem)",
        fontWeight: 700,
        lineHeight: 1.1,
        display: "flex",
        flexWrap: "wrap", // wrap gracefully instead of overflowing
        alignItems: "center",
        justifyContent: "center",
        gap: "0.25em",
      }}
    >
      {/* The prefix uses the normal foreground colour. */}
      {prefix && <span style={{ color: "var(--foreground)" }}>{prefix}</span>}

      {/* The badge: emerald primary background + primary-foreground text, read
          straight from the CSS variables so it adapts to light/dark mode. */}
      <span
        ref={badgeRef}
        aria-label={word}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
          overflow: "hidden", // clip letters while the width animates
          padding: "0.05em 0.35em",
          borderRadius: "0.25em",
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
          whiteSpace: "nowrap",
        }}
      >
        {/* Screen readers read this instead of the individual letters. */}
        <span className="sr-only">{word}</span>

        {/* Visible, animated letters (hidden from assistive tech). */}
        <span aria-hidden="true" style={{ display: "inline-flex" }}>
          {/* key=index recreates the spans each change so the reveal replays. */}
          {word.split("").map((char, i) => (
            <span
              key={`${index}-${i}`}
              data-letter
              style={{ display: "inline-block", whiteSpace: "pre" }}
            >
              {char}
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}
