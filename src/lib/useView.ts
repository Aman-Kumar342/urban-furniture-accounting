import { useEffect, useState } from "react";
import type { ViewMode } from "@/components/ui/ViewToggle";

// Remembers the List/Kanban choice per screen (localStorage; safe if storage is unavailable).
export function useView(key: string): [ViewMode, (v: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>("list");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === "kanban" || saved === "list") setView(saved);
    } catch {
      /* storage unavailable — keep the default */
    }
  }, [key]);
  const update = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(key, v);
    } catch {
      /* ignore */
    }
  };
  return [view, update];
}
