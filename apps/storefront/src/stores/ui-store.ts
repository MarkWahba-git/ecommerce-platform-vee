import { create } from 'zustand';

// ---------------------------------------------------------------------------
// UI store – lightweight global UI state
// ---------------------------------------------------------------------------

export interface UiState {
  /** Whether the mobile navigation menu is open */
  mobileMenuOpen: boolean;
  /** Whether the search overlay is open */
  searchOpen: boolean;

  // Actions
  toggleMobileMenu: () => void;
  toggleSearch: () => void;
  closeMobileMenu: () => void;
  closeSearch: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileMenuOpen: false,
  searchOpen: false,

  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  toggleSearch: () =>
    set((s) => ({
      searchOpen: !s.searchOpen,
      // Close mobile menu when opening search and vice-versa
      mobileMenuOpen: s.searchOpen ? s.mobileMenuOpen : false,
    })),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
}));
