// ─── Analytics Layer — Enhancement 31 (PostHog-compatible) ───────────────────
// Propel Stack AI, LLC
//
// Thin event-tracking wrapper. When VITE_POSTHOG_KEY is set, events flow to
// PostHog. In development (or when the key is absent) events are logged to
// console only. PostHog script is loaded lazily to avoid bundle bloat.

type Properties = Record<string, unknown>;

interface AnalyticsClient {
  capture: (event: string, props?: Properties) => void;
  identify: (id: string, traits?: Properties) => void;
  reset: () => void;
}

// Lazy-load PostHog once on first event
let _ph: AnalyticsClient | null = null;
let _phLoading = false;

function getPH(): AnalyticsClient {
  const dev: AnalyticsClient = {
    capture: (e, p) => { if (import.meta.env.DEV) console.debug('[analytics]', e, p); },
    identify: (id) => { if (import.meta.env.DEV) console.debug('[analytics] identify', id); },
    reset: () => { if (import.meta.env.DEV) console.debug('[analytics] reset'); },
  };

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return dev;

  if (_ph) return _ph;

  if (!_phLoading) {
    _phLoading = true;
    import('posthog-js').then((m) => {
      const posthog = m.default;
      posthog.init(key, {
        api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        capture_pageview: false,
        autocapture: false,
        persistence: 'memory', // no localStorage per hard rules
      });
      _ph = {
        capture: (e, p) => posthog.capture(e, p),
        identify: (id, t) => posthog.identify(id, t),
        reset: () => posthog.reset(),
      };
    }).catch(() => { _ph = dev; });
  }

  return dev; // return dev shim while PostHog loads
}

// ─── Core Events (50-event taxonomy) ─────────────────────────────────────────

export const analytics = {
  // Session
  appOpened: () => getPH().capture('app_opened'),
  pageViewed: (page: string) => getPH().capture('page_viewed', { page }),

  // Onboarding
  onboardingStarted: () => getPH().capture('onboarding_started'),
  onboardingCompleted: (persona: string) => getPH().capture('onboarding_completed', { persona }),
  onboardingSkipped: (step: number) => getPH().capture('onboarding_skipped', { step }),

  // AI interactions
  aiBriefingViewed: () => getPH().capture('ai_briefing_viewed'),
  aiChatSent: (model: string, complexity: string) => getPH().capture('ai_chat_sent', { model, complexity }),
  aiCoachInsightViewed: (type: string) => getPH().capture('ai_coach_insight_viewed', { type }),
  aiWeeklyRecapViewed: () => getPH().capture('ai_weekly_recap_viewed'),
  aiWeeklyRecapSetup: () => getPH().capture('ai_weekly_recap_setup'),

  // Goals
  goalCreated: (category: string) => getPH().capture('goal_created', { category }),
  goalUpdated: (pct: number) => getPH().capture('goal_updated', { progress_pct: pct }),
  goalCompleted: (category: string) => getPH().capture('goal_completed', { category }),
  milestoneHit: (pct: number) => getPH().capture('milestone_hit', { milestone_pct: pct }),

  // Journal / Mood
  moodLogged: (score: number) => getPH().capture('mood_logged', { mood_score: score }),
  journalEntryCreated: (withAI: boolean) => getPH().capture('journal_entry_created', { ai_opted_in: withAI }),
  journalInsightsViewed: () => getPH().capture('journal_insights_viewed'),

  // Streaks & Wins
  streakExtended: (type: string, length: number) => getPH().capture('streak_extended', { streak_type: type, length }),
  streakBadgeEarned: (badge: string) => getPH().capture('streak_badge_earned', { badge }),
  lifeWinLogged: (type: string) => getPH().capture('life_win_logged', { win_type: type }),

  // Finance
  financeLinked: (accountType: string) => getPH().capture('finance_linked', { account_type: accountType }),
  budgetSet: (category: string) => getPH().capture('budget_set', { category }),
  spendInsightViewed: () => getPH().capture('spend_insight_viewed'),

  // Health
  healthMetricLogged: (type: string) => getPH().capture('health_metric_logged', { metric_type: type }),

  // Energy
  energyLogged: (level: number, type: string) => getPH().capture('energy_logged', { energy_level: level, energy_type: type }),
  energyScheduleViewed: () => getPH().capture('energy_schedule_viewed'),

  // Notifications
  notifPreferenceChanged: (key: string, enabled: boolean) => getPH().capture('notif_preference_changed', { key, enabled }),
  notNowActivated: (duration: string) => getPH().capture('not_now_activated', { duration }),

  // Theme
  themeChanged: (theme: string) => getPH().capture('theme_changed', { theme }),

  // Referral
  referralLinkCopied: () => getPH().capture('referral_link_copied'),
  referralShareClicked: (channel: string) => getPH().capture('referral_share_clicked', { channel }),
  referralConverted: () => getPH().capture('referral_converted'),

  // Monetization
  upgradePromptViewed: (context: string) => getPH().capture('upgrade_prompt_viewed', { context }),
  upgradeClicked: (planTier: string) => getPH().capture('upgrade_clicked', { plan_tier: planTier }),

  // Privacy / Trust
  privacyVaultViewed: () => getPH().capture('privacy_vault_viewed'),
  dataExportRequested: () => getPH().capture('data_export_requested'),
  memoryResetInitiated: (type: string) => getPH().capture('memory_reset_initiated', { reset_type: type }),

  // Feature discovery
  featureFirstUsed: (feature: string) => getPH().capture('feature_first_used', { feature }),

  // NPS / Feedback
  npsScored: (score: number) => getPH().capture('nps_scored', { score }),
  feedbackSubmitted: () => getPH().capture('feedback_submitted'),

  // Generic
  identify: (userId: string, traits?: Properties) => getPH().identify(userId, traits),
  reset: () => getPH().reset(),
  track: (event: string, props?: Properties) => getPH().capture(event, props),
};
