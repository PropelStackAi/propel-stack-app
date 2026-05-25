/**
 * Health Connect Sync Service — Phase 3 Step 9 (Android)
 * Propel Stack AI, LLC
 *
 * Reads health data from Android Health Connect.
 * Falls back to self-reported data if Health Connect is unavailable.
 *
 * ACTIVATION:
 *   1. Health Connect is pre-installed on Android 14+ devices
 *   2. On Android 13: users download from Play Store
 *   3. Check isAvailable() before EVERY call — never assume
 *   4. Fallback gracefully to Google Fit REST API for older Android versions
 *
 * Availability Gotcha: Always call checkHealthConnectAvailability() first.
 * On Android 13 without the app installed, APIs will fail silently.
 * On Android 14+, the APIs are available natively.
 */

import { Capacitor } from '@capacitor/core';
import type { NormalizedHealthData } from './healthKit';

// ─── Platform guard ───────────────────────────────────────────────────────────

function isAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

// ─── Health Connect availability ──────────────────────────────────────────────

/**
 * Check if Health Connect is installed and available on this device.
 * Returns false on iOS, web, or Android without Health Connect.
 */
export async function checkHealthConnectAvailability(): Promise<boolean> {
  if (!isAndroid()) return false;

  try {
    // @capacitor-community/health-connect availability check
    const { HealthConnect } = await import('@capacitor-community/health-connect') as {
      HealthConnect: { checkAvailability: () => Promise<{ availability: string }> };
    };
    const result = await HealthConnect.checkAvailability();
    return result.availability === 'Available';
  } catch {
    return false;
  }
}

// ─── Permission request ───────────────────────────────────────────────────────

/**
 * Request Health Connect permissions for all required data types.
 */
export async function requestHealthConnectPermissions(): Promise<boolean> {
  if (!isAndroid()) return false;

  try {
    const { HealthConnect } = await import('@capacitor-community/health-connect') as {
      HealthConnect: {
        requestHealthPermissions: (opts: { permissions: { accessType: string; recordType: string }[] }) => Promise<{ grantedPermissions: string[] }>;
      };
    };

    await HealthConnect.requestHealthPermissions({
      permissions: [
        { accessType: 'read', recordType: 'Steps'              },
        { accessType: 'read', recordType: 'SleepSession'       },
        { accessType: 'read', recordType: 'HeartRate'          },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'ExerciseSession'    },
      ],
    });
    return true;
  } catch (err) {
    console.error('[HealthConnect] Permission request failed:', err);
    return false;
  }
}

// ─── Data sync ────────────────────────────────────────────────────────────────

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

/**
 * Sync the last 7 days of health data from Android Health Connect.
 * Falls back to empty array if unavailable.
 */
export async function syncHealthConnectData(): Promise<NormalizedHealthData[]> {
  const available = await checkHealthConnectAvailability();
  if (!available) return [];

  try {
    const { HealthConnect } = await import('@capacitor-community/health-connect') as {
      HealthConnect: {
        readRecords: (opts: { recordType: string; timeRangeFilter: { startTime: string; endTime: string } }) => Promise<{ records: unknown[] }>;
      };
    };

    const startTime = sevenDaysAgo();
    const endTime   = new Date().toISOString();
    const filter    = { startTime, endTime };

    const [stepsRes, sleepRes, hrRes, energyRes] = await Promise.allSettled([
      HealthConnect.readRecords({ recordType: 'Steps',                       timeRangeFilter: filter }),
      HealthConnect.readRecords({ recordType: 'SleepSession',                timeRangeFilter: filter }),
      HealthConnect.readRecords({ recordType: 'HeartRate',                   timeRangeFilter: filter }),
      HealthConnect.readRecords({ recordType: 'ActiveCaloriesBurned',        timeRangeFilter: filter }),
    ]);

    // Group by day
    const byDate = new Map<string, NormalizedHealthData>();
    const ensure = (date: string) => {
      if (!byDate.has(date)) byDate.set(date, {
        date, steps: null, sleep_hours: null, hrv_ms: null,
        resting_hr: null, active_energy_kcal: null, exercise_minutes: null,
        source: 'healthkit', // reuse same source type — backend normalizes
      });
      return byDate.get(date)!;
    };

    type StepRecord     = { startTime: string; count: number };
    type SleepRecord    = { startTime: string; endTime: string };
    type HrRecord       = { time: string; beatsPerMinute: number };
    type EnergyRecord   = { startTime: string; energy: { inKilocalories: number } };

    if (stepsRes.status === 'fulfilled') {
      for (const r of stepsRes.value.records as StepRecord[]) {
        const d = r.startTime.slice(0, 10);
        const row = ensure(d);
        row.steps = (row.steps ?? 0) + r.count;
      }
    }

    if (sleepRes.status === 'fulfilled') {
      for (const r of sleepRes.value.records as SleepRecord[]) {
        const d = r.startTime.slice(0, 10);
        const row = ensure(d);
        const durationMs = new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
        row.sleep_hours = (row.sleep_hours ?? 0) + durationMs / (1000 * 60 * 60);
      }
    }

    if (hrRes.status === 'fulfilled') {
      for (const r of hrRes.value.records as HrRecord[]) {
        const d = r.time.slice(0, 10);
        const row = ensure(d);
        if (row.resting_hr === null) row.resting_hr = r.beatsPerMinute;
      }
    }

    if (energyRes.status === 'fulfilled') {
      for (const r of energyRes.value.records as EnergyRecord[]) {
        const d = r.startTime.slice(0, 10);
        const row = ensure(d);
        row.active_energy_kcal = (row.active_energy_kcal ?? 0) + r.energy.inKilocalories;
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  } catch (err) {
    console.error('[HealthConnect] Sync error:', err);
    return [];
  }
}

/**
 * Unified sync that tries Health Connect on Android, returns empty on other platforms.
 */
export async function syncAndUploadHealthConnect(): Promise<void> {
  const data = await syncHealthConnectData();
  if (!data.length) return;

  try {
    const { apiRequest } = await import('../lib/apiRequest');
    await apiRequest('/api/health/sync', { method: 'POST', body: { records: data } });
  } catch (err) {
    console.error('[HealthConnect] Upload error:', err);
  }
}
