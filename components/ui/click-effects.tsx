"use client";

// "Click Effects" — a decorative layer that draws a small GSAP animation at the
// spot where the user clicks. Supported modes: rings / burst / particles /
// crosshair / wavy / sniper.
//
// IMPORTANT scoping notes for this app:
//  - It listens ONLY on its own container element (NOT `document`), so it can be
//    placed behind the hero and never fires on the sidebar, fact cards, results,
//    or report view.
//  - Under prefers-reduced-motion it renders nothing and attaches no listeners.
//  - Effects clean themselves up onComplete, and any in-flight effects are killed
//    on unmount, so rapid clicking can't pile up stale state.
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type ClickMode =
  | "rings"
  | "burst"
  | "particles"
  | "crosshair"
  | "wavy"
  | "sniper";

interface ClickEffectsProps {
  mode?: ClickMode;
  duration?: number; // seconds each effect lasts
  strokeWidth?: number; // line/border thickness in px
  effectSize?: number; // base size of the effect in px
  color?: string; // any CSS colour; defaults to the app's emerald primary
  showLabel?: boolean; // the "Click Anywhere" hint (only used by "sniper")
  className?: string;
}

export function ClickEffects({
  mode = "rings",
  duration = 0.3,
  strokeWidth = 1.5,
  effectSize = 60,
  color = "var(--primary)", // themed: adapts to light/dark automatically
  showLabel = false,
  className,
}: ClickEffectsProps) {
  const [reduced, setReduced] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Every in-flight effect's timeline, so we can kill them all on unmount.
  const activeRef = useRef<Set<gsap.core.Timeline>>(new Set());

  // Watch the reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Attach the click listener to OUR container only (never document).
  useEffect(() => {
    if (reduced) return; // no animation, no listeners at all
    const container = containerRef.current;
    if (!container) return;

    const active = activeRef.current;

    // Small helper: build a positioned, non-interactive DOM node.
    const makeEl = (styles: Partial<CSSStyleDeclaration>): HTMLDivElement => {
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.pointerEvents = "none";
      el.style.left = "0";
      el.style.top = "0";
      Object.assign(el.style, styles);
      return el;
    };

    // Register a timeline that removes its DOM nodes + untracks itself when done.
    const track = (nodes: HTMLElement[]): gsap.core.Timeline => {
      const tl = gsap.timeline({
        onComplete: () => {
          nodes.forEach((n) => n.remove());
          active.delete(tl);
        },
      });
      active.add(tl);
      return tl;
    };

    const onClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      switch (mode) {
        case "burst": {
          // Short lines shooting outward from the click point.
          const count = 8;
          const nodes: HTMLElement[] = [];
          const tl = gsap.timeline({
            onComplete: () => {
              nodes.forEach((n) => n.remove());
              active.delete(tl);
            },
          });
          active.add(tl);
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const line = makeEl({
              width: `${effectSize / 3}px`,
              height: `${strokeWidth}px`,
              background: color,
              transformOrigin: "left center",
              transform: `translate(${x}px, ${y}px) rotate(${angle}rad)`,
            });
            container.appendChild(line);
            nodes.push(line);
            tl.to(
              line,
              {
                x: `+=${Math.cos(angle) * effectSize}`,
                y: `+=${Math.sin(angle) * effectSize}`,
                opacity: 0,
                duration,
                ease: "power2.out",
              },
              0,
            );
          }
          break;
        }
        case "particles": {
          // Small dots flying out and fading.
          const count = 10;
          const nodes: HTMLElement[] = [];
          const tl = gsap.timeline({
            onComplete: () => {
              nodes.forEach((n) => n.remove());
              active.delete(tl);
            },
          });
          active.add(tl);
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = effectSize * (0.4 + Math.random() * 0.6);
            const dot = makeEl({
              width: `${strokeWidth * 2}px`,
              height: `${strokeWidth * 2}px`,
              borderRadius: "50%",
              background: color,
              transform: `translate(${x}px, ${y}px)`,
            });
            container.appendChild(dot);
            nodes.push(dot);
            tl.to(
              dot,
              {
                x: `+=${Math.cos(angle) * dist}`,
                y: `+=${Math.sin(angle) * dist}`,
                opacity: 0,
                duration,
                ease: "power2.out",
              },
              0,
            );
          }
          break;
        }
        case "crosshair": {
          // A horizontal + vertical line crossing the click point.
          const h = makeEl({
            width: `${effectSize}px`,
            height: `${strokeWidth}px`,
            background: color,
            marginLeft: `${-effectSize / 2}px`,
            transform: `translate(${x}px, ${y}px)`,
          });
          const v = makeEl({
            width: `${strokeWidth}px`,
            height: `${effectSize}px`,
            background: color,
            marginTop: `${-effectSize / 2}px`,
            transform: `translate(${x}px, ${y}px)`,
          });
          container.append(h, v);
          track([h, v]).fromTo(
            [h, v],
            { opacity: 0.9, scale: 0.6 },
            { opacity: 0, scale: 1, duration, ease: "power2.out" },
          );
          break;
        }
        case "wavy": {
          // An expanding ring that also spins a little.
          const ring = makeEl({
            width: `${effectSize}px`,
            height: `${effectSize}px`,
            marginLeft: `${-effectSize / 2}px`,
            marginTop: `${-effectSize / 2}px`,
            borderRadius: "40% 60% 55% 45%",
            border: `${strokeWidth}px dashed ${color}`,
            transform: `translate(${x}px, ${y}px)`,
          });
          container.appendChild(ring);
          track([ring]).fromTo(
            ring,
            { scale: 0.2, rotate: 0, opacity: 0.9 },
            { scale: 1, rotate: 90, opacity: 0, duration, ease: "power2.out" },
          );
          break;
        }
        case "sniper": {
          // A ring + crosshair, and (optionally) a small label.
          const ring = makeEl({
            width: `${effectSize}px`,
            height: `${effectSize}px`,
            marginLeft: `${-effectSize / 2}px`,
            marginTop: `${-effectSize / 2}px`,
            borderRadius: "50%",
            border: `${strokeWidth}px solid ${color}`,
            transform: `translate(${x}px, ${y}px)`,
          });
          const h = makeEl({
            width: `${effectSize}px`,
            height: `${strokeWidth}px`,
            background: color,
            marginLeft: `${-effectSize / 2}px`,
            transform: `translate(${x}px, ${y}px)`,
          });
          const v = makeEl({
            width: `${strokeWidth}px`,
            height: `${effectSize}px`,
            background: color,
            marginTop: `${-effectSize / 2}px`,
            transform: `translate(${x}px, ${y}px)`,
          });
          const nodes = [ring, h, v];
          if (showLabel) {
            const label = makeEl({
              color,
              font: "600 12px sans-serif",
              transform: `translate(${x + effectSize / 2}px, ${y}px)`,
            });
            label.textContent = "Click Anywhere";
            nodes.push(label);
          }
          container.append(...nodes);
          track(nodes).fromTo(
            nodes,
            { opacity: 0.9, scale: 0.7 },
            { opacity: 0, scale: 1, duration, ease: "power2.out" },
          );
          break;
        }
        case "rings":
        default: {
          // A single ring that expands and fades — the subtle default.
          const ring = makeEl({
            width: `${effectSize}px`,
            height: `${effectSize}px`,
            marginLeft: `${-effectSize / 2}px`,
            marginTop: `${-effectSize / 2}px`,
            borderRadius: "50%",
            border: `${strokeWidth}px solid ${color}`,
            transform: `translate(${x}px, ${y}px)`,
          });
          container.appendChild(ring);
          track([ring]).fromTo(
            ring,
            { scale: 0.2, opacity: 0.9 },
            { scale: 1, opacity: 0, duration, ease: "power2.out" },
          );
          break;
        }
      }
    };

    container.addEventListener("click", onClick);

    // Cleanup: remove the listener, kill any running effects, and clear the DOM.
    return () => {
      container.removeEventListener("click", onClick);
      active.forEach((tl) => tl.kill());
      active.clear();
      container.replaceChildren();
    };
  }, [reduced, mode, duration, strokeWidth, effectSize, color, showLabel]);

  // Reduced motion → render nothing (and, above, no listeners were attached).
  if (reduced) return null;

  // The layer itself is decorative; hide it from assistive tech.
  return (
    <div
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={{ overflow: "hidden" }}
    />
  );
}
