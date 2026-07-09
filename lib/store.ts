'use client';

import { create } from 'zustand';
import type { GenerationResult } from '@/lib/types';
import { DeviceId, DEFAULT_DEVICE_ID } from '@/lib/devices';
import { DEFAULT_PLATFORM_ID, PlatformId, getPlatform } from '@/lib/platforms';

export type Entitlement = {
  plan: 'free' | 'pro';
  isPro: boolean;
  credits: number;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
};

const EMPTY_ENTITLEMENT: Entitlement = {
  plan: 'free',
  isPro: false,
  credits: 0,
  subscriptionStatus: null,
  currentPeriodEnd: null,
};

type MeState = Entitlement & {
  status: 'idle' | 'loading' | 'ready';
  /** Session user id the entitlement was fetched for — dedupes route-change refetches. */
  forUser: string | null;
};

/** Generator state that must survive route changes (e.g. Edit review → back). */
type AiReviewsState = {
  result: GenerationResult | null;
  selectedId: string | null;
  platform: PlatformId;
  productName: string;
  productDesc: string;
  count: number;
  minMessages: number;
  maxMessages: number;
  hideNames: boolean;
  device: DeviceId;
  botName: string;
  botAvatarInitial: string;
  botAvatarColor: string;
  botAvatarImage: string;
};

interface AppStore {
  me: MeState;
  /** Fetch entitlement once per signed-in user; `force` after upgrades/sign-ins. */
  fetchMe: (userId: string | null, force?: boolean) => Promise<void>;
  resetMe: () => void;

  aiReviews: AiReviewsState;
  setAiReviews: (partial: Partial<AiReviewsState>) => void;
  /** Switches platform and resets the bot identity to that platform's defaults. */
  setPlatform: (platform: PlatformId) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  me: { ...EMPTY_ENTITLEMENT, status: 'idle', forUser: null },

  fetchMe: async (userId, force = false) => {
    const { me } = get();
    if (!userId) {
      set({ me: { ...EMPTY_ENTITLEMENT, status: 'ready', forUser: null } });
      return;
    }
    if (!force && (me.status === 'loading' || (me.status === 'ready' && me.forUser === userId))) {
      return;
    }

    set({ me: { ...me, status: 'loading' } });
    try {
      const response = await fetch('/api/me');
      const payload = await response.json();
      set({
        me: {
          plan: payload?.isPro ? 'pro' : 'free',
          isPro: Boolean(payload?.isPro),
          credits: Number(payload?.credits ?? 0),
          subscriptionStatus: payload?.subscriptionStatus ?? null,
          currentPeriodEnd: payload?.currentPeriodEnd ?? null,
          status: 'ready',
          forUser: userId,
        },
      });
    } catch {
      set({ me: { ...EMPTY_ENTITLEMENT, status: 'ready', forUser: userId } });
    }
  },

  resetMe: () => set({ me: { ...EMPTY_ENTITLEMENT, status: 'idle', forUser: null } }),

  aiReviews: {
    result: null,
    selectedId: null,
    platform: DEFAULT_PLATFORM_ID,
    productName: 'LarperWallet',
    productDesc: 'A wallet app. Casual Telegram support chats that end in a positive review.',
    count: 5,
    minMessages: 15,
    maxMessages: 24,
    hideNames: false,
    device: DEFAULT_DEVICE_ID,
    botName: 'LarperWallet_bot',
    botAvatarInitial: 'L',
    botAvatarColor: '#8774e1',
    botAvatarImage: '',
  },

  setAiReviews: (partial) => set((state) => ({ aiReviews: { ...state.aiReviews, ...partial } })),

  setPlatform: (platform) =>
    set((state) => {
      if (state.aiReviews.platform === platform) return state;
      const { identityDefaults } = getPlatform(platform);
      return {
        aiReviews: {
          ...state.aiReviews,
          platform,
          botName: identityDefaults.name,
          botAvatarInitial: identityDefaults.avatarInitial,
          botAvatarColor: identityDefaults.avatarColor,
          botAvatarImage: '',
        },
      };
    }),
}));
