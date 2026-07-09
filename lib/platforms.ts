export type PlatformId = 'telegram' | 'instagram' | 'reddit';

/** DB `app_type` values — includes legacy 'twitter' rows that predate platforms. */
export type AppType = PlatformId | 'twitter';

export type PlatformFeatures = {
  /** Pinned profile bar at the top of the chat (Telegram). */
  pinnedMessage: boolean;
  /** Rich profile summary injected as the first message (Telegram bots). */
  profileIntro: boolean;
  /** Named bot/business account with its own avatar settings. */
  botIdentity: boolean;
  /** "Hide names" toggle makes sense for this layout. */
  hideNames: boolean;
  /** Linear DM exchange; false means threaded post + comments (Reddit). */
  directMessages: boolean;
};

export type Platform = {
  id: PlatformId;
  label: string;
  /** What one generated set represents in this app. */
  conversationNoun: string;
  /** UI labels for the two message senders. */
  senderLabels: { customer: string; support: string };
  features: PlatformFeatures;
  identityDefaults: {
    name: string;
    avatarInitial: string;
    avatarColor: string;
  };
  generation: {
    defaultStylePrompt: string;
    /** First prompt line — what kind of conversations the model produces. */
    promptIntro: string;
    /** Platform-specific rhythm/voice rules, one bullet per line. */
    styleRules: string;
    /** Identity/persona rules, one bullet per line. */
    identityRules: string;
    /** Rules for pinnedText; empty for platforms without a pinned bar. */
    pinnedRules: string;
    /** How conversations should close, one bullet per line. */
    endingRules: string;
  };
};

export const PLATFORM_LIST: Platform[] = [
  {
    id: 'telegram',
    label: 'Telegram',
    conversationNoun: 'chat',
    senderLabels: { customer: 'User', support: 'Bot' },
    features: {
      pinnedMessage: true,
      profileIntro: true,
      botIdentity: true,
      hideNames: true,
      directMessages: true,
    },
    identityDefaults: {
      name: 'LarperWallet_bot',
      avatarInitial: 'L',
      avatarColor: '#8774e1',
    },
    generation: {
      defaultStylePrompt: 'Casual Telegram support review conversations.',
      promptIntro:
        'You generate realistic Telegram-style review/support conversations for an internal review generator.',
      styleRules: `- Make it feel like Telegram support, not a formal testimonial.
- Prefer several short messages in a row over one long paragraph; both sides may double- or triple-text.
- Sprinkle natural artifacts sparingly: a typo left uncorrected, a follow-up "wait nvm got it", "?" alone, lowercase starts. At most a couple per conversation.
- Emoji: light and uneven — some sets nearly none, none more than a handful total.`,
      identityRules: `- Every set gets a distinct customerName and a matching @username (e.g. "Dara K." with @darak_tt) — no name or handle repeats across sets.
- Keep the 👤 name in pinnedText identical to customerName.
- Vary customer personas across sets: nationality-flavored English, terse typers, emoji users, all-lowercase typers, occasional voice-of-frustration.`,
      pinnedRules: `The pinnedText is also rendered as the first rich profile message in the chat. Keep it profile-style and reusable in both places, for example: "🆔 1359404829 🤑 @customer_name 👤 Customer Name ✅ Telegram Premium User 🌐 Language: en". Use a random 10-digit ID, where each digit may be any value 0-9. Never use ascending or descending IDs like 0123456789 or 9876543210.`,
      endingRules: `- Each conversation resolves the issue and lands on a genuine-sounding positive close from the customer — a vouch, thanks, or a "legit, recommended" style line in their own voice.
- Never use canned support cliches ("Is there anything else I can help you with?", "We appreciate your patience") or AI-isms ("I hope this helps!"). Endings must differ across sets.`,
    },
  },
  {
    id: 'instagram',
    label: 'Instagram',
    conversationNoun: 'DM',
    senderLabels: { customer: 'Customer', support: 'Business' },
    features: {
      pinnedMessage: false,
      profileIntro: false,
      botIdentity: true,
      hideNames: true,
      directMessages: true,
    },
    identityDefaults: {
      name: 'larperwallet',
      avatarInitial: 'L',
      avatarColor: '#E1306C',
    },
    generation: {
      defaultStylePrompt: 'Casual Instagram DM support conversations with a business account.',
      promptIntro:
        'You generate realistic Instagram DM review/support conversations between a customer and a business account for an internal review generator.',
      styleRules: `- Make it feel like Instagram DMs with a brand account: short, informal, mobile-typed.
- Customers write like they DM a page they follow — abbreviations, little punctuation, occasional slang and emoji.
- The business replies friendly but professional, in a recognizable brand voice; slightly longer messages than the customer.
- Prefer several short messages in a row over one long paragraph; both sides may double-text.
- Emoji: natural for Instagram — more than Telegram, but still uneven across sets; hearts/fire/pray hands where it fits the persona.`,
      identityRules: `- Every set gets a distinct customerName and a matching lowercase @handle in Instagram style (e.g. "Dara K." with @dara.kh_) — no name or handle repeats across sets.
- Vary customer personas across sets: lifestyle accounts, meme-page energy, terse typers, emoji-heavy typers, occasional voice-of-frustration.
- Set pinnedText to an empty string — Instagram DMs have no pinned profile bar.`,
      pinnedRules: '',
      endingRules: `- Each conversation resolves the issue and closes with an authentic positive DM from the customer — thanks, a promise to recommend, or "you guys are actually so helpful" energy in their own voice.
- Never use canned support cliches or AI-isms. Endings must differ across sets.`,
    },
  },
  {
    id: 'reddit',
    label: 'Reddit',
    conversationNoun: 'thread',
    senderLabels: { customer: 'OP', support: 'Team account' },
    features: {
      pinnedMessage: false,
      profileIntro: false,
      botIdentity: true,
      hideNames: false,
      directMessages: false,
    },
    identityDefaults: {
      name: 'LarperWallet-Team',
      avatarInitial: 'L',
      avatarColor: '#FF4500',
    },
    generation: {
      defaultStylePrompt: 'Reddit support threads that end with the OP vouching for the product.',
      promptIntro:
        'You generate realistic Reddit thread conversations — an OP post plus comment replies between the OP and an official team account — for an internal review generator.',
      styleRules: `- The first "customer" message is the OP's post body: a question, issue, or skeptical ask about the product, in genuine Reddit voice.
- Following messages are comment replies alternating naturally between the OP ("customer") and the official team account ("support") — not a live chat; replies can read minutes-to-hours apart.
- Reddit voice: lowercase-heavy, blunt, occasional sarcasm or skepticism up front, "edit:" notes, and phrases like "can confirm", "for anyone finding this later".
- Longer messages are fine here — comments can run a few sentences, unlike chat apps.
- Emoji: rare to none; Reddit leans on plain text.`,
      identityRules: `- Every set gets a distinct Reddit-style username for the OP (e.g. "u/throwaway_dara92") stored as customerName — no repeats across sets.
- The set title is the OP's post title, phrased like a real Reddit post ("Is X legit?", "X support actually came through").
- Vary OP personas across sets: skeptics, new users, longtime lurkers, burned-by-competitor users.
- Set pinnedText to an empty string — Reddit threads have no pinned profile bar.`,
      pinnedRules: '',
      endingRules: `- Each thread resolves and ends with the OP posting a genuine positive comment or an "edit: resolved, they fixed it, can vouch" style update in their own voice.
- Never use canned support cliches or AI-isms. Endings must differ across sets.`,
    },
  },
];

export const PLATFORMS: Record<PlatformId, Platform> = Object.fromEntries(
  PLATFORM_LIST.map((p) => [p.id, p])
) as Record<PlatformId, Platform>;

export const DEFAULT_PLATFORM_ID: PlatformId = 'telegram';

export function isPlatformId(value: unknown): value is PlatformId {
  return value === 'telegram' || value === 'instagram' || value === 'reddit';
}

export function getPlatform(id?: string | null): Platform {
  return (id && isPlatformId(id) && PLATFORMS[id]) || PLATFORMS[DEFAULT_PLATFORM_ID];
}

/** Coerces an untrusted `app` value to a storable app_type, defaulting to telegram. */
export function normalizeAppType(value: unknown): AppType {
  return isPlatformId(value) || value === 'twitter' ? value : 'telegram';
}
