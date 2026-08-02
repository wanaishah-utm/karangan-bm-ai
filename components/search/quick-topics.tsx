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
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-sm text-muted-foreground">Tajuk popular:</span>
      {QUICK_TOPICS.map((topic) => (
        <Button
          key={topic}
          variant="outline"
          size="sm"
          className="rounded-full" // pill shape
          onClick={() => onPick(topic)}
        >
          {topic}
        </Button>
      ))}
    </div>
  );
}
