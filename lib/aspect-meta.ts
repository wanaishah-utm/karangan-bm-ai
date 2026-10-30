// What each 5W1H aspect means, plus its icon. Shown on the landing tiles and
// the results tabs, so students learn one icon + colour per aspect (the colour
// lives in aspect-colors.ts). The descriptions mirror the angle each aspect asks
// the AI for (see ANGLE_MEANINGS in lib/ai/prompt.ts).
import {
  BookOpen,
  Clock,
  Lightbulb,
  MapPin,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { SectionKey } from "@/types";

export const ASPECT_ICONS: Record<SectionKey, LucideIcon> = {
  siapa: Users,
  apa: BookOpen,
  bila: Clock,
  di_mana: MapPin,
  mengapa: Lightbulb,
  bagaimana: Settings,
};

export const ASPECT_DESCRIPTIONS: Record<SectionKey, string> = {
  siapa:
    "Pihak, individu, tokoh, agensi atau organisasi yang terlibat atau bertanggungjawab terhadap isu.",
  apa: "Definisi, konsep, jenis, bentuk dan ciri utama isu tersebut.",
  bila: "Masa, tempoh, aliran dan peristiwa penting yang berkaitan dengan isu.",
  di_mana:
    "Lokasi, sektor, negeri atau negara tempat isu berlaku atau memberi kesan.",
  mengapa: "Sebab, punca dan faktor yang mendorong berlakunya isu ini.",
  bagaimana:
    "Cara, langkah, kesan dan penyelesaian yang berkaitan dengan isu ini.",
};
