import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import { type CartLine, MAX_CART_LINE_QUANTITY } from "@/lib/validation";

const STORAGE_KEY = "then-ecommerce-cart-v1";
const STORAGE_EVENT = "then-ecommerce:cart";
const EMPTY_CART: CartLine[] = [];

type CartContextValue = {
  add: (line: CartLine) => void;
  clear: () => void;
  count: number;
  /**
   * False on the server and during hydration. True on the first client
   * snapshot. Consumers use it to tell the hydration jump from 0 apart from a
   * real user change, so they do not animate on page load.
   */
  hydrated: boolean;
  lines: CartLine[];
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY_CART;
let cacheReady = false;

function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) {
    return EMPTY_CART;
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (!Array.isArray(value)) {
      return EMPTY_CART;
    }

    const lines = value.filter(
      (line): line is CartLine =>
        typeof line === "object" &&
        line !== null &&
        typeof line.productId === "string" &&
        typeof line.quantity === "number" &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0
    );

    return lines.length === 0 ? EMPTY_CART : lines;
  } catch {
    return EMPTY_CART;
  }
}

function readRawCart() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getCartSnapshot() {
  const raw = readRawCart();

  if (cacheReady && raw === cachedRaw) {
    return cachedLines;
  }

  cachedRaw = raw;
  cachedLines = parseStoredCart(raw);
  cacheReady = true;
  return cachedLines;
}

function getServerCartSnapshot() {
  return EMPTY_CART;
}

function subscribeToCart(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cacheReady = false;
      onChange();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(STORAGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

function writeCart(lines: CartLine[]) {
  const raw = JSON.stringify(lines);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedLines = lines.length === 0 ? EMPTY_CART : lines;
  cacheReady = true;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function subscribeToHydration() {
  return () => undefined;
}

function clientHydrated() {
  return true;
}

function serverHydrated() {
  return false;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot
  );
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    clientHydrated,
    serverHydrated
  );

  const add = useCallback((line: CartLine) => {
    const current = getCartSnapshot();
    const existing = current.find(
      (currentLine) => currentLine.productId === line.productId
    );

    if (!existing) {
      writeCart([...current, line]);
      return;
    }

    writeCart(
      current.map((currentLine) =>
        currentLine.productId === line.productId
          ? {
              ...currentLine,
              quantity: Math.min(
                MAX_CART_LINE_QUANTITY,
                currentLine.quantity + line.quantity
              ),
            }
          : currentLine
      )
    );
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const current = getCartSnapshot();

    writeCart(
      quantity <= 0
        ? current.filter((line) => line.productId !== productId)
        : current.map((line) =>
            line.productId === productId
              ? {
                  ...line,
                  quantity: Math.min(MAX_CART_LINE_QUANTITY, quantity),
                }
              : line
          )
    );
  }, []);

  const remove = useCallback((productId: string) => {
    writeCart(getCartSnapshot().filter((line) => line.productId !== productId));
  }, []);

  const clear = useCallback(() => {
    writeCart(EMPTY_CART);
  }, []);

  const value = useMemo(
    () => ({
      add,
      clear,
      count: lines.reduce((total, line) => total + line.quantity, 0),
      hydrated,
      lines,
      remove,
      setQuantity,
    }),
    [add, clear, hydrated, lines, remove, setQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
