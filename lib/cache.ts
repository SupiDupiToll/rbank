type CacheEntry<T> = { value: T; expiresAt: number };

const cacheStore = new Map<string, CacheEntry<unknown>>();
const pendingPromises = new Map<string, Promise<unknown>>();

export const CACHE_TTL = {
  overview: 60_000,
  page: 30_000,
  checkout: 15_000,
  lists: 60_000,
  admin: 30_000,
} as const;

export async function remember<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = cacheStore.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const inFlight = pendingPromises.get(key);
  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const promise = loader()
    .then((value) => {
      cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch((error: unknown) => {
      pendingPromises.delete(key);
      throw error;
    });

  pendingPromises.set(key, promise);
  return promise;
}

export function forgetKey(key: string) {
  cacheStore.delete(key);
  pendingPromises.delete(key);
}

export function forgetPrefix(prefix: string) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
  for (const key of pendingPromises.keys()) {
    if (key.startsWith(prefix)) {
      pendingPromises.delete(key);
    }
  }
}

export const pageCacheKeys = {
  overview: (userId: string) => `page:overview:${userId}`,
  transactions: (userId: string, query = "") =>
    `page:transactions:${userId}:${query}`,
  festgeldList: (userId: string) => `page:festgeld:${userId}`,
  festgeldDetail: (userId: string, id: string) => `page:festgeld:${userId}:${id}`,
  krediteList: (userId: string) => `page:kredite:${userId}`,
  krediteDetail: (userId: string, id: string) => `page:kredite:${userId}:${id}`,
  loanProducts: () => `page:loan-products`,
  donationBoxes: (userId: string) => `page:donation-boxes:${userId}`,
  pay: (token: string) => `page:pay:${token}`,
  card: (userId: string) => `page:card:${userId}`,
  checkoutUser: (userId: string) => `page:checkout-user:${userId}`,
  embeddedUsers: () => `page:embedded-users`,
  admin: () => `page:admin`,
} as const;

const userPrefixes = [
  "page:overview:",
  "page:transactions:",
  "page:festgeld:",
  "page:kredite:",
  "page:card:",
  "page:checkout-user:",
];

export function invalidateUserData(userId: string) {
  for (const prefix of userPrefixes) {
    forgetPrefix(`${prefix}${userId}`);
  }
}

export function invalidateGlobalData() {
  forgetPrefix("page:donation-boxes:");
  forgetPrefix("page:loan-products");
  forgetPrefix("page:embedded-users");
  forgetPrefix("page:admin");
}

export function invalidatePayData(token: string) {
  forgetKey(pageCacheKeys.pay(token));
}