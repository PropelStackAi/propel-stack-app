/**
 * HealthKit Sync Service — Phase 3 Step 9 (iOS)
 * Propel Stack AI, LLC
 *
 * Reads health data from Apple HealthKit via @capacitor-community/health-kit.
 * Runs on iOS only — falls back gracefully on web/Android.
 *
 * ACTIVATION:
 *   1. npm install @capacitor-community/health-kit (after Capacitor is set up)
 *   2. Add NSHealthShareUsageDescription to Info.plist
 *   3. Enable HealthKit capability in Xcode → Signing & Capabilities
 *   4. Call requestHealthKitPermissions() once on first launch
 *   5. Register background fetch (capacitor.config.ts BackgroundFetch plugin)
 *
 * Permission Gotcha: Request each data type individually.
 * If the user denies one type, the rest are silently granted.
 * Always check authorization status per type before querying.
 */

import { Capacitor } from '@capacitor/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NormalizedHealthData {
  date: string;           // YYYY-MM-DD
  steps: number | null;
  sleep_hours: number | null;
  hrv_ms: number | null;
  resting_hr: number | null;
  active_energy_kcal: number | null;
  exercise_minutes: number | null;
  source: 'healthkit';
}

// ─── Platform guard ───────────────────────────────────────────────────────────

function isIos(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

// ─── Dynamic import of HealthKit plugin ──────────────────────────────────────
// The plugin is only available in native iOS builds, so we import dynamically
// and catch the module-not-found error in web/Android.

async function getPlugin(): Promise<{ requestAuthorization: (opts: unknown) => Promise<void>; queryQuantityType: (opts: unknown) => Promise<{ value: number; startDate: string }[]>; queryCategoryType: (opts: unknown) => Promise<{ value: number; startDate: string }[]> } | null> {
  if (!isIos()) return null;
  try {
    const mod = await import('@capacitor-community/health-kit') as { HealthKit: unknown };
    return mod.HealthKit as ReturnType<typeof getPlugin> extends Promise<infer T> ? Exclude<T, null> : never;
  } catch {
    console.warn('[HealthKit] Plugin not available — install @capacitor-community/health-kit');
    return null;
  }
}

// ─── Permission request ───────────────────────────────────────────────────────

/**
 * Request HealthKit read permissions for all data types we use.
 * Call once on first app launch (gated behind user consent screen).
 */
export async function requestHealthKitPermissions(): Promise<boolean> {
  const HK = await getPlugin();
  if (!HK) return false;

  try {
    await HK.requestAuthorization({
      read: [
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKQuantityTypeIdentifierAppleExerciseTime',
      ],
      write: [], // Read-only
    });
    return true;
  } catch (err) {
    console.error('[HealthKit] Permission request failed:', err);
    return false;
  }
}

// ─── Data sync ────────────────────────────────────────────────────────────────

function sevenDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function toDateStr(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Sync the last 7 days of health data from HealthKit.
 * Returns normalized records ready to POST to /api/health/sync.
 */
export async function syncHealthKitData(): Promise<NormalizedHealthData[]> {
  const HK = await getPlugin();
  if (!HK) return [];

  const startDate = sevenDaysAgo().toISOString();
  const endDate = new Date().toISOString();

  try {
    const [steps, sleep, hrv, rhr, energy, exercise] = await Promise.all([
      HK.queryQuantityType({ sampleType: 'HKQuantityTypeIdentifierStepCount',                startDate, endDate, unit: 'count'      }).catch(() => []),
      HK.queryCategoryType({ sampleType: 'HKCategoryTypeIdentifierSleepAnalysis',            startDate, endDate                     }).catch(() => []),
      HK.queryQuantityType({ sampleType: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', startDate, endDate, unit: 'ms'         }).catch(() => []),
      HK.queryQuantityType({ sampleType: 'HKQuantityTypeIdentifierRestingHeartRate',         startDate, endDate, unit: 'count/min'  }).catch(() => []),
      HK.queryQuantityType({ sampleType: 'HKQuantityTypeIdentifierActiveEnergyBurned',       startDate, endDate, unit: 'kcal'       }).catch(() => []),
      HK.queryQuantityType({ sampleType: 'HKQuantityTypeIdentifierAppleExerciseTime',        startDate, endDate, unit: 'min'        }).catch(() => []),
    ]);

    // Group by date
    const byDate = new Map<string, NormalizedHealthData>();

    const ensure = (date: string) => {
      if (!byDate.has(date)) byDate.set(date, { date, steps: null, sleep_hours: null, hrv_ms: null, resting_hr: null, active_energy_kcal: null, exercise_minutes: null, source: 'healthkit' });
      return byDate.get(date)!;
    };

    for (const s of steps)    { const r = ensure(toDateStr(s.startDate)); r.steps    = (r.steps    ?? 0) + s.value; }
    for (const s of energy)   { const r = ensure(toDateStr(s.startDate)); r.active_energy_kcal = (r.active_energy_kcal ?? 0) + s.value; }
    for (const s of exercise) { const r = ensure(toDateStr(s.startDate)); r.exercise_minutes   = (r.exercise_minutes ?? 0) + s.value; }

    // HRV and resting HR: take the most recent value per day
    for (const s of hrv) {
      const r = ensure(toDateStr(s.startDate));
      if (r.hrv_ms === null) r.hrv_ms = s.value;
    }
    for (const s of rhr) {
      const r = ensure(toDateStr(s.startDate));
      if (r.resting_hr === null) r.resting_hr = s.value;
    }

    // Sleep: sum in-bed duration in hours
    for (const s of sleep) {
      const r = ensure(toDateStr(s.startDate));
      // HKCategoryValueSleepAnalysisAsleep = 0, InBed = 1
      if (s.value === 0) r.sleep_hours = (r.sleep_hours ?? 0) + (1 / 6); // Each sample ≈ 10min — approximate
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error('[HealthKit] Sync error:', err);
    return [];
  }
}

/**
 * Upload normalized health data to the backend.
 * Called from background fetch handler every 6 hours.
 */
export async function uploadHealthDataToBackend(data: NormalizedHealthData[]): Promise<void> {
  if (!data.length) return;
  try {
    const { apiRequest } = await import('../lib/apiRequest');
    await apiRequest('/api/health/sync', { method: 'POST', body: { records: data } });
  } catch (err) {
    console.error('[HealthKit] Upload error:', err);
  }
}
