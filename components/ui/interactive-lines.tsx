"use client";

// "Reactive Lines" — a decorative canvas band of curved lines that bend toward
// the pointer. Used as a soft strip at the bottom of the page.
//
// Fixes applied vs. the original third-party component:
//  1. Transparent canvas (alpha:true + clearRect) so the page shows through.
//  2. Light-gray, theme-aware lines (read from next-themes, not a hardcoded hex).
//  3. Starts immediately (no deferred start), reacts to mouse AND touch, and
//     drifts on its own when there's no pointer.
//  4. Respects prefers-reduced-motion (one static frame, no loop/listeners).
//  5. Purely decorative: aria-hidden, pointer-events-none, behind content.
//  6. Pauses when scrolled out of view (IntersectionObserver) or the tab is
//     hidden (visibilitychange); all listeners are cleaned up on unmount.
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

// A subtle low-opacity gray, a touch lighter in dark mode so it stays visible.
function lineColorFor(resolvedTheme: string | undefined): string {
  return resolvedTheme === "dark"
    ? "rgba(180, 180, 180, 0.16)"
    : "rgba(100, 100, 100, 0.16)";
}

export function InteractiveLines({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reduced, setReduced] = useState(false);

  // Watch the reduced-motion preference.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Set up (and tear down) the canvas + animation. Re-runs if the theme or the
  // reduced-motion preference changes.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true }); // transparent canvas
    if (!ctx) return;

    const lineColor = lineColorFor(resolvedTheme);

    // Sizes in CSS pixels (kept in sync with the container by resize()).
    let cssW = 0;
    let cssH = 0;

    // Where the lines are pulled toward. `cur` eases toward `desired`.
    const cur = { x: 0, y: 0 };
    const desired = { x: 0, y: 0 };
    let hasPointer = false; // becomes true after a real mouse/touch move

    // Match the canvas bitmap to its CSS size, accounting for screen density.
    function resize() {
      const rect = container!.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.round(cssW * dpr);
      canvas!.height = Math.round(cssH * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    }

    // Draw one frame at time `t` (milliseconds).
    function draw(t: number) {
      ctx!.clearRect(0, 0, cssW, cssH); // transparent — no opaque background fill

      // With no pointer, the focus point wanders on its own (gentle drift).
      if (!hasPointer) {
        desired.x = cssW * (0.5 + 0.4 * Math.sin(t * 0.0003));
        desired.y = cssH * (0.5 + 0.35 * Math.cos(t * 0.00025));
      }
      // Ease the current point toward the desired one for smooth motion.
      cur.x += (desired.x - cur.x) * 0.06;
      cur.y += (desired.y - cur.y) * 0.06;

      ctx!.lineWidth = 1; // thin lines
      ctx!.strokeStyle = lineColor;

      const lines = 9;
      const step = 14;
      const sigma = Math.max(cssW * 0.18, 40); // width of the "bulge" near pointer
      const amp = 6; // base wave height

      for (let i = 0; i < lines; i++) {
        const baseY = (cssH / (lines + 1)) * (i + 1);
        ctx!.beginPath();
        for (let x = 0; x <= cssW; x += step) {
          const dx = x - cur.x;
          const influence = Math.exp(-(dx * dx) / (2 * sigma * sigma));
          const wave = Math.sin(x * 0.012 + t * 0.0012 + i * 0.5) * amp;
          const pull = (cur.y - baseY) * influence * 0.5; // bend toward pointer
          const y = baseY + wave + pull;
          if (x === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.stroke();
      }
    }

    // ---- Reduced motion: one static frame, no loop, no listeners. ----
    if (reduced) {
      resize();
      cur.x = desired.x = cssW / 2;
      cur.y = desired.y = cssH / 2;
      draw(0);
      return; // nothing to clean up
    }

    // ---- Animated version ----
    let raf = 0;
    let running = false;
    let inView = true;
    let tabVisible = !document.hidden;

    function loop(t: number) {
      draw(t);
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    }
    function stop() {
      if (running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    }
    // Only animate when the band is on screen AND the tab is visible.
    function sync() {
      if (inView && tabVisible) start();
      else stop();
    }

    function setTargetFromPoint(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      desired.x = clientX - rect.left;
      desired.y = clientY - rect.top;
      hasPointer = true;
    }
    const onMouseMove = (e: MouseEvent) => setTargetFromPoint(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) setTargetFromPoint(touch.clientX, touch.clientY);
    };
    const onVisibility = () => {
      tabVisible = !document.hidden;
      sync();
    };

    // Pause when scrolled out of view.
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(container);

    // Keep the canvas sized to the container.
    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    resize();
    cur.x = desired.x = cssW / 2;
    cur.y = desired.y = cssH / 2;

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    sync(); // start immediately if visible (no deferred start)

    // Cleanup: stop the loop and remove EVERY listener/observer.
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced, resolvedTheme]);

  return (
    // Decorative band: full width, fixed height (no layout shift), clipped so it
    // can't cause horizontal scroll, never intercepts clicks, hidden in print.
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative h-[180px] w-full overflow-hidden",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        // Soft fade at the TOP edge so the band blends into the page.
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 45%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 45%)",
        }}
      />
    </div>
  );
}
