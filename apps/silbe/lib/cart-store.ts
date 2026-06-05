// Zustand store wrapping the Shopify Cart API client. Only the cartId
// is persisted to localStorage; the cart body is always re-fetched from
// Shopify on hydration to avoid stale prices / availability.
//
// Triadic-stack discipline: this store is consumed exclusively by the
// three client islands — AddToCartButton, CartIndicator, CartDrawer.
// Nothing on the RSC side imports from here.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  type Cart,
  addCartLines,
  createCart,
  CartUserError,
  getCart,
  removeCartLine,
  updateCartLine,
} from './shopify-cart';
import { trackAddToCart } from './tracking/events';

type CartState = {
  cartId: string | null;
  cart: Cart | null;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;

  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  clearError: () => void;
};

function toErrorMessage(err: unknown): string {
  if (err instanceof CartUserError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Unbekannter Fehler beim Warenkorb';
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      cart: null,
      isOpen: false,
      isLoading: false,
      error: null,

      hydrate: async () => {
        const { cartId, cart } = get();
        if (!cartId || cart) return;
        set({ isLoading: true });
        try {
          const fetched = await getCart(cartId);
          if (fetched) {
            set({ cart: fetched, isLoading: false });
          } else {
            // Cart expired or invalid — drop the persisted id.
            set({ cartId: null, cart: null, isLoading: false });
          }
        } catch (err) {
          console.error('[cart-store] hydrate failed:', err);
          set({ isLoading: false, error: toErrorMessage(err) });
        }
      },

      addItem: async (variantId, quantity = 1) => {
        const { cartId } = get();
        set({ isLoading: true, error: null });
        try {
          const next = cartId
            ? await addCartLines(cartId, variantId, quantity)
            : await createCart(variantId, quantity);
          set({
            cartId: next.id,
            cart: next,
            isOpen: true,
            isLoading: false,
          });
          // Tracking AFTER the successful mutation: price/title come from the
          // Shopify-confirmed line. quantity is the delta just added, not the
          // (possibly cumulative) line quantity. Consent-gated inside.
          const added = next.lines.find((l) => l.variantId === variantId);
          if (added) trackAddToCart(added, quantity);
        } catch (err) {
          console.error('[cart-store] addItem failed:', err);
          set({ isLoading: false, error: toErrorMessage(err) });
        }
      },

      updateQuantity: async (lineId, quantity) => {
        const { cartId } = get();
        if (!cartId) return;
        if (quantity <= 0) {
          await get().removeItem(lineId);
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const next = await updateCartLine(cartId, lineId, quantity);
          set({ cart: next, isLoading: false });
        } catch (err) {
          console.error('[cart-store] updateQuantity failed:', err);
          set({ isLoading: false, error: toErrorMessage(err) });
        }
      },

      removeItem: async (lineId) => {
        const { cartId } = get();
        if (!cartId) return;
        set({ isLoading: true, error: null });
        try {
          const next = await removeCartLine(cartId, lineId);
          set({ cart: next, isLoading: false });
        } catch (err) {
          console.error('[cart-store] removeItem failed:', err);
          set({ isLoading: false, error: toErrorMessage(err) });
        }
      },

      openDrawer: () => set({ isOpen: true }),
      closeDrawer: () => set({ isOpen: false }),
      toggleDrawer: () => set((s) => ({ isOpen: !s.isOpen })),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'silbe-cart',
      storage: createJSONStorage(() => localStorage),
      // Persist ONLY the cartId. The cart body re-fetches via hydrate()
      // so users never see a stale price or stock state from yesterday.
      partialize: (state) => ({ cartId: state.cartId }),
    },
  ),
);
