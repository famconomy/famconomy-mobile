const STORAGE_KEY = 'famconomy.activeFamilyId';
const CHANGE_EVENT = 'famconomy:active-family-change';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

type ActiveFamilyChangeDetail = { familyId: number | null };

type SetOptions = {
  broadcast?: boolean;
};

const dispatchChangeEvent = (familyId: number | null, options?: SetOptions) => {
  if (!isBrowser) return;
  if (options?.broadcast === false) return;
  const event = new CustomEvent<ActiveFamilyChangeDetail>(CHANGE_EVENT, {
    detail: { familyId },
  });
  window.dispatchEvent(event);
};

export const getStoredActiveFamilyId = (): number | null => {
  if (!isBrowser) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const setStoredActiveFamilyId = (id: number | null, options?: SetOptions) => {
  if (!isBrowser) return;
  if (id === null) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, String(id));
  }
  dispatchChangeEvent(id, options);
};

export const clearStoredActiveFamilyId = (options?: SetOptions) => {
  setStoredActiveFamilyId(null, options);
};

export const getActiveFamilyStorageKey = () => STORAGE_KEY;

export const subscribeToActiveFamilyChanges = (
  listener: (familyId: number | null) => void
) => {
  if (!isBrowser) return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<ActiveFamilyChangeDetail>;
    listener(custom.detail?.familyId ?? null);
  };

  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  const storageHandler = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    const raw = event.newValue;
    if (raw === null) {
      listener(null);
      return;
    }
    const parsed = Number(raw);
    listener(Number.isFinite(parsed) ? parsed : null);
  };
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler as EventListener);
    window.removeEventListener('storage', storageHandler);
  };
};
