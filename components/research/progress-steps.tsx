"use client";

// Shows the list of steps the AI goes through while researching a topic,
// and highlights how far along we are. Each step fades in with framer-motion.
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

// The steps, in order, written in Bahasa Melayu.
export const RESEARCH_STEPS = [
  "Mencari sumber rasmi...",
  "Mengumpul statistik...",
  "Menyemak isu semasa...",
  "Menyusun mengikut 5W1H...",
  "Menyediakan hasil...",
];

// `currentStep` is the index (0-based) of the step happening right now.
// Steps before it are "done", the step at it is "in progress", and steps
// after it are "not started yet".
export function ProgressSteps({ currentStep }: { currentStep: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {RESEARCH_STEPS.map((step, index) => {
        const isCompleted = index < currentStep; // already finished
        const isCurrent = index === currentStep; // happening now

        return (
          <motion.li
            key={step}
            // Fade each step in when it appears.
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 }} // gentle stagger, one after another
            className="flex items-center gap-2 text-sm"
          >
            {isCompleted ? (
              // Finished step: a check mark in the theme's primary colour.
              <Check className="size-4 text-primary" />
            ) : isCurrent ? (
              // Current step: a spinning loader in the primary colour.
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              // Future step: a dim, empty circle at 35% opacity.
              <span className="size-4 rounded-full border border-current opacity-35" />
            )}
            <span>{step}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}
