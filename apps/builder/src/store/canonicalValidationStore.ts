import { create } from "zustand";
import {
  assertCanonicalTwin,
  CanonicalTwinV1,
  Correction,
} from "@aether/twin-schema";

interface CanonicalValidationState {
  revision: CanonicalTwinV1 | null;
  commands: Correction[];
  selectedId: string | null;
  load: (revision: CanonicalTwinV1) => void;
  select: (id: string | null) => void;
  queue: (command: Correction) => void;
  undo: () => void;
  clear: () => void;
}
/** Server snapshots are authoritative. Pending intent never becomes a separate layoutData model. */
export const useCanonicalValidationStore = create<CanonicalValidationState>(
  (set) => ({
    revision: null,
    commands: [],
    selectedId: null,
    load: (revision) =>
      set({
        revision: assertCanonicalTwin(revision),
        commands: [],
        selectedId: null,
      }),
    select: (selectedId) => set({ selectedId }),
    queue: (command) => set((s) => ({ commands: [...s.commands, command] })),
    undo: () => set((s) => ({ commands: s.commands.slice(0, -1) })),
    clear: () => set({ revision: null, commands: [], selectedId: null }),
  }),
);
