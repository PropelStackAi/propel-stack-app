export type ActivityType = 'stories' | 'homework' | 'games' | 'bedtime';

export interface KidsScreenTime {
  usedMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
  allowed: boolean;
}

export interface KidsStars {
  totalStars: number;
}

export interface KidsAiResponse {
  text: string;
  stub: boolean;
}

export interface TtsResponse {
  stub: boolean;
  audioBase64?: string;
  note?: string;
}

export const ACTIVITY_CONFIG: Record<ActivityType, { emoji: string; label: string; color: string; bg: string }> = {
  stories:  { emoji: '📚', label: 'Stories',          color: 'text-purple-700', bg: 'bg-purple-100' },
  homework: { emoji: '✏️',  label: 'Homework Helper', color: 'text-blue-700',   bg: 'bg-blue-100'   },
  games:    { emoji: '🎮',  label: 'Brain Games',     color: 'text-green-700',  bg: 'bg-green-100'  },
  bedtime:  { emoji: '🌙',  label: 'Bedtime Story',   color: 'text-indigo-700', bg: 'bg-indigo-100' },
};

export const STAR_BADGES = [
  { threshold: 5,  label: 'Curious Cub',   emoji: '🐾' },
  { threshold: 15, label: 'Explorer',       emoji: '🔭' },
  { threshold: 30, label: 'Scholar',        emoji: '📖' },
  { threshold: 50, label: 'Champion',       emoji: '🏆' },
  { threshold: 100, label: 'Superstar',     emoji: '⭐' },
];

export function getBadge(stars: number) {
  return [...STAR_BADGES].reverse().find((b) => stars >= b.threshold) ?? null;
}
