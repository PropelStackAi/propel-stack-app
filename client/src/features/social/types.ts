// ─── Social & Media Hub Types ───────────────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

export const DISCLAIMER_VERSION = 'PSAI-SMH-DISC-v1.0';

export const DISCLAIMER_TEXT = `
PROPEL STACK AI — SOCIAL & MEDIA HUB DISCLAIMER (PSAI-SMH-DISC-v1.0)

This Social & Media Hub is an organizational and informational tool provided by Propel Stack AI, LLC.

IMPORTANT LIMITATIONS:
• Social media connections require you to register developer apps with each platform. OAuth tokens are stored for convenience — keep your account secure.
• AI-generated digests and summaries are for informational purposes only. Always verify information from primary sources.
• News bias labels (Left/Center/Right) are sourced from third-party databases (AllSides, MediaBiasFactCheck) and are approximations.
• Scheduled post publishing requires active OAuth tokens and platform API access. Propel Stack AI is not responsible for platform API rate limits, policy changes, or failed publishes.

PRIVACY & DATA:
• Social account tokens are stored in your profile database. Revoke access at any time through each platform's settings.
• Screen time data is self-reported and estimated — it does not access system-level usage data.
• Content Calendar posts are not published automatically without your explicit action.

By continuing to use the Social & Media Hub, you acknowledge that you have read and understood this disclaimer.
`.trim();

// ─── Platform Config ─────────────────────────────────────────────────────────

export type PlatformTier = 'full' | 'deep_link';

export interface PlatformConfig {
  id: string;
  label: string;
  emoji: string;
  color: string;          // Tailwind bg color class
  textColor: string;      // Tailwind text color class
  tier: PlatformTier;
  oauthUrl?: string;
  charLimit?: number;
}

export const SOCIAL_PLATFORMS: PlatformConfig[] = [
  // Tier 1 — Full OAuth
  { id: 'facebook', label: 'Facebook', emoji: '📘', color: 'bg-blue-600', textColor: 'text-white', tier: 'full', oauthUrl: 'https://developers.facebook.com/apps/', charLimit: 63206 },
  { id: 'instagram', label: 'Instagram', emoji: '📸', color: 'bg-gradient-to-br from-purple-500 to-pink-500', textColor: 'text-white', tier: 'full', charLimit: 2200 },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵', color: 'bg-black', textColor: 'text-white', tier: 'full', oauthUrl: 'https://developers.tiktok.com/' },
  { id: 'x', label: 'X (Twitter)', emoji: '𝕏', color: 'bg-gray-900', textColor: 'text-white', tier: 'full', oauthUrl: 'https://developer.twitter.com/', charLimit: 280 },
  { id: 'linkedin', label: 'LinkedIn', emoji: '💼', color: 'bg-blue-700', textColor: 'text-white', tier: 'full', oauthUrl: 'https://www.linkedin.com/developers/', charLimit: 3000 },
  { id: 'pinterest', label: 'Pinterest', emoji: '📌', color: 'bg-red-600', textColor: 'text-white', tier: 'full' },
  { id: 'youtube', label: 'YouTube', emoji: '▶️', color: 'bg-red-600', textColor: 'text-white', tier: 'full', oauthUrl: 'https://console.developers.google.com/' },
  { id: 'reddit', label: 'Reddit', emoji: '🤖', color: 'bg-orange-600', textColor: 'text-white', tier: 'full', oauthUrl: 'https://www.reddit.com/prefs/apps' },
  // Tier 2 — Deep link only
  { id: 'telegram', label: 'Telegram', emoji: '✈️', color: 'bg-sky-500', textColor: 'text-white', tier: 'deep_link' },
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬', color: 'bg-green-500', textColor: 'text-white', tier: 'deep_link' },
  { id: 'discord', label: 'Discord', emoji: '🎮', color: 'bg-indigo-600', textColor: 'text-white', tier: 'deep_link' },
  { id: 'kik', label: 'Kik', emoji: '📱', color: 'bg-lime-500', textColor: 'text-white', tier: 'deep_link' },
  { id: 'snapchat', label: 'Snapchat', emoji: '👻', color: 'bg-yellow-400', textColor: 'text-black', tier: 'deep_link' },
];

export type BiasLabel = 'left' | 'center' | 'right' | 'unknown';

// ─── DB Record Types ─────────────────────────────────────────────────────────

export interface SocialConnection {
  id: string;
  user_id: string;
  platform: string;
  display_name: string;
  avatar_url: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string | null;
  scopes: string;
  is_active: boolean;
  created_at: string;
}

export interface MediaConnection {
  id: string;
  user_id: string;
  service: string;
  service_type: string;
  deep_link_url: string;
  is_active: boolean;
  created_at: string;
}

export interface SocialDigest {
  summary: string;
  highlights: { platform: string; text: string; url: string }[];
  news_hits: { topic: string; headline: string; source: string; url: string }[];
  actions: string[];
}

export interface WatchlistTopic {
  id: string;
  user_id: string;
  topic: string;
  sources: string;
  alert_enabled: boolean;
  created_at: string;
}

export interface NewsSource {
  id: string;
  user_id: string;
  source_name: string;
  rss_url: string;
  bias_label: BiasLabel;
  is_active: boolean;
  created_at: string;
}

export interface NewsArticle {
  id: string;
  source: string;
  bias_label: BiasLabel;
  title: string;
  url: string;
  summary: string;
  published_at: string;
}

export interface ScreenTimeEntry {
  platform: string;
  total_seconds: number;
  session_count: number;
}

export interface ScheduledPost {
  id: string;
  user_id: string;
  platforms: string;  // JSON string array
  content: string;
  media_urls: string; // JSON string array
  scheduled_for: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  error_message: string;
  created_at: string;
}

export interface StreamingService {
  service: string;
  service_type: 'streaming' | 'music' | 'podcast';
  deep_link_url: string;
}

export interface FeedItem {
  id: string;
  platform: string;
  author: string;
  content: string;
  media: string | null;
  timestamp: string;
  likes: number;
  comments: number;
  url: string;
}

export interface NotificationItem {
  id: string;
  platform: string;
  type: 'DM' | 'Mention' | 'Like' | 'Comment';
  sender: string;
  preview: string;
  timestamp: string;
  read: boolean;
  deep_link: string;
}

export interface HubStats {
  total_connections: number;
  unread_notifications: number;
  todays_posts: number;
  weekly_screen_time_seconds: number;
  sparkline: { day: string; posts: number; interactions: number }[];
}
