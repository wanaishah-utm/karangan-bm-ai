"use client";

// The main search box where the teacher types an essay topic and clicks "Jana"
// (Generate). Pressing Enter in the box does the same thing as the button.
import { Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

export function SearchBar({ value, onChange, onGenerate, loading }: SearchBarProps) {
  // Treat a blank / spaces-only topic as empty.
  const isEmpty = value.trim() === "";

  return (
    // Stacks vertically on small screens, sits in a row from `sm:` upwards.
    <div className="flex w-full flex-col gap-2 sm:flex-row">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter generates, but only when there's a topic and we're not busy.
          if (e.key === "Enter" && !isEmpty && !loading) onGenerate();
        }}
        placeholder="Taip tajuk karangan… cth: Rasuah"
        className="h-10 flex-1"
      />
      <Button
        onClick={onGenerate}
        // Can't generate while loading or when the box is empty.
        disabled={loading || isEmpty}
        className="h-10"
      >
        <Sparkles aria-hidden />
        Jana
      </Button>
    </div>
  );
}
