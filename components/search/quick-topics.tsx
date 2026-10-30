"use client";

// A row of common essay topics shown as clickable "pills". Picking one fills
// the search box (and, in the page, kicks off generation right away).
import { Button } from "@/components/ui/button";

// Popular Bahasa Melayu essay topics students often write about.
export const QUICK_TOPICS = [
  "Rasuah",
  "Buli siber",
  "Alam sekitar",
  "Kesihatan mental",
  "Teknologi AI",
  "Gejala sosial",
  "Dadah",
  "Patriotisme",
];

interface QuickTopicsProps {
  onPick: (topic: string) => void;
}

export function QuickTopics({ onPick }: QuickTopicsProps) {
  return (
    // A quiet secondary row: the pills must never out-shout the golden topic
    // box, so they stay light until hover, where they pick up a gold wash.
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs text-muted-foreground">Cuba tajuk popular</span>
      {QUICK_TOPICS.map((topic) => (
        <Button
          key={topic}
          variant="outline"
          size="sm"
          className="h-7 rounded-full border-amber-200 bg-transparent px-3 text-xs font-normal text-muted-foreground transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900 dark:border-amber-900/50 dark:bg-transparent dark:hover:bg-amber-400/10 dark:hover:text-amber-200"
          onClick={() => onPick(topic)}
        >
          {topic}
        </Button>
      ))}
    </div>
  );
}
