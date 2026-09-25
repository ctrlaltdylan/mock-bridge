import { create } from "zustand";
import { combine } from "zustand/middleware";
import { type ResourcePickerOptions } from "../../lib/mockCatalog";

type ResourcePickerState = {
  open: boolean;
  requestId: string;
  options: ResourcePickerOptions | null;
  selectedIds: string[];
  search: string;
};

const initialState: ResourcePickerState = {
  open: false,
  requestId: '',
  options: null,
  selectedIds: [],
  search: '',
};

export const useResourcePickerStore = create(combine(
  initialState,
  set => ({
    openPicker: (payload: { requestId: string; options: ResourcePickerOptions }) => set({
      open: true,
      requestId: payload.requestId,
      options: payload.options,
      selectedIds: (payload.options.selectionIds ?? []).map(item => item.id),
      search: payload.options.query ?? '',
    }),

    setSearch: (search: string) => set({ search }),

    toggleId: (id: string) => set(state => {
      const multiple = state.options?.multiple;
      const already = state.selectedIds.includes(id);

      if (multiple === false || multiple == null) {
        return { selectedIds: already ? [] : [id] };
      }

      if (already) {
        return { selectedIds: state.selectedIds.filter(item => item !== id) };
      }

      if (typeof multiple === 'number' && state.selectedIds.length >= multiple) {
        return state;
      }

      return { selectedIds: [...state.selectedIds, id] };
    }),

    close: () => set(initialState),
  })
));
