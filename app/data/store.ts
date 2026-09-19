export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
};

export type UserAccount = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export const CART_KEY = "elijah-cart-v1";
export const WISHLIST_KEY = "elijah-wishlist-v1";
export const ACCOUNTS_KEY = "elijah-accounts-v1";
export const CURRENT_USER_KEY = "elijah-current-user-v1";
export const ORDERS_KEY = "elijah-orders-v1";

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or browser issues.
  }
}

export function getCartItems(): CartItem[] {
  return safeRead<CartItem[]>(CART_KEY, []);
}

export function addCartItem(item: CartItem) {
  const cart = getCartItems();
  const itemKey = `${item.productId}-${item.size}-${item.color}`;
  const existing = cart.find(
    (cartItem) =>
      `${cartItem.productId}-${cartItem.size}-${cartItem.color}` === itemKey,
  );

  if (existing) {
    existing.quantity += item.quantity;
    safeWrite(CART_KEY, cart);
    return;
  }

  safeWrite(CART_KEY, [...cart, item]);
}

export function updateCartItemQuantity(
  productId: string,
  size: string,
  color: string,
  delta: number,
) {
  const cart = getCartItems();
  const match = cart.find(
    (item) =>
      item.productId === productId && item.size === size && item.color === color,
  );

  if (!match) return;

  match.quantity = Math.max(0, match.quantity + delta);

  const filtered = match.quantity === 0
    ? cart.filter(
        (item) =>
          !(item.productId === productId && item.size === size && item.color === color),
      )
    : cart;

  safeWrite(CART_KEY, filtered);
}

export function removeCartItem(productId: string, size: string, color: string) {
  const cart = getCartItems();
  const filtered = cart.filter(
    (item) =>
      !(item.productId === productId && item.size === size && item.color === color),
  );
  safeWrite(CART_KEY, filtered);
}

export function clearCart() {
  safeWrite(CART_KEY, []);
}

export function getWishlistItems(): string[] {
  return safeRead<string[]>(WISHLIST_KEY, []);
}

export function toggleWishlist(productId: string) {
  const wishlist = getWishlistItems();
  const next = wishlist.includes(productId)
    ? wishlist.filter((item) => item !== productId)
    : [...wishlist, productId];
  safeWrite(WISHLIST_KEY, next);
  return next;
}

export function getAccounts(): UserAccount[] {
  return safeRead<UserAccount[]>(ACCOUNTS_KEY, []);
}

export function saveAccount(account: UserAccount) {
  const accounts = getAccounts();
  safeWrite(ACCOUNTS_KEY, [...accounts, account]);
}

export function getCurrentUser(): UserAccount | null {
  return safeRead<UserAccount | null>(CURRENT_USER_KEY, null);
}

export function setCurrentUser(user: UserAccount | null) {
  safeWrite(CURRENT_USER_KEY, user);
}

export function logoutCurrentUser() {
  setCurrentUser(null);
}

export function getOrders(): Array<{ id: string; items: CartItem[]; total: number; createdAt: string }> {
  return safeRead<Array<{ id: string; items: CartItem[]; total: number; createdAt: string }>>(ORDERS_KEY, []);
}

export function saveOrder(order: { id: string; items: CartItem[]; total: number; createdAt: string }) {
  const orders = getOrders();
  safeWrite(ORDERS_KEY, [order, ...orders]);
}
