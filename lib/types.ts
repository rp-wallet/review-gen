export type ReviewMessage = {
  sender: 'customer' | 'support';
  text: string;
  time: string;
  date: string;
  replyTo?: number;
  isPinned?: boolean;
};

export type ReviewSet = {
  id: string;
  title: string;
  summary: string;
  customerName: string;
  pinnedText: string;
  messages: ReviewMessage[];
};

export type ScreenshotInput = {
  name: string;
  mimeType: string;
  data: string;
};

export type GenerationResult = {
  confidence?: number;
  toneTags?: string[];
  notes?: string;
  sets: ReviewSet[];
};
