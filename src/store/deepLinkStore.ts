import { create } from 'zustand';

interface DeepLinkState {
  inviteToken: string | null;
  setInviteToken: (token: string | null) => void;
  consumeInviteToken: () => string | null;
}

export const useDeepLinkStore = create<DeepLinkState>((set, get) => ({
  inviteToken: null,
  setInviteToken: (token) => set({ inviteToken: token }),
  consumeInviteToken: () => {
    const token = get().inviteToken;
    set({ inviteToken: null });
    return token;
  },
}));
