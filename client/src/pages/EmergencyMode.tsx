import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/apiRequest';
import { getCurrentPosition, hapticMedium } from '../lib/native';
import type { EmergencyCard } from '../features/health/api';

/**
 * Emergency Mode — Session 10.
 * OUTSIDE the app shell — accessible without login (auth is demo-stubbed).
 * Shows: health card, emergency contacts, geolocation, 911/988/741741 hotlines, QR code.
 * SAFETY: 911, 988, and Crisis Text Line are always visible with zero clicks.
 */

// Emergency mode needs its own QueryClient since it's outside the AppLayout provider
const emergencyQc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 60_000 } } });

export function EmergencyMode(): JSX.Element {
  return (
    <QueryClientProvider client={emergencyQc}>
      <EmergencyModeInner />
    </QueryClientProvider>
  );
}

function EmergencyModeInner(): JSX.Element {
  const { data, isLoading, error } = useQuery({
    queryKey: ['emergency-card'],
    queryFn: () => apiRequest<EmergencyCard>('/api/health/emergency-card'),
    retry: 1,
  });

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState('');

  useEffect(() => {
    // Uses Capacitor Geolocation on native (proper permission flow + higher accuracy),
    // falls back to the browser Geolocation API on web.
    getCurrentPosition()
      .then((pos) => setLocation(pos))
      .catch(() => setLocError('Location unavailable'));
  }, []);

  const profile = data?.profile;
  const user = data?.user;
  const meds = data?.medications ?? [];

  const allergies: string[] = profile?.allergies ? JSON.parse(profile.allergies) : [];
  const conditions: string[] = profile?.conditions ? JSON.parse(profile.conditions) : [];

  const name = profile?.full_name || user?.display_name || 'Unknown';
  const bloodType = profile?.blood_type || 'Unknown';

  // QR code encodes a compact emergency summary for first responders
  const qrData = [
    `EMERGENCY MEDICAL INFO`,
    `Name: ${name}`,
    `Blood Type: ${bloodType}`,
    allergies.length ? `Allergies: ${allergies.join(', ')}` : '',
    conditions.length ? `Conditions: ${conditions.join(', ')}` : '',
    meds.length ? `Medications: ${meds.map((m) => `${m.name} ${m.dose}`).join(', ')}` : '',
    profile?.emergency_contact_phone ? `Emergency Contact: ${profile.emergency_contact_name} (${profile.emergency_contact_phone})` : '',
  ].filter(Boolean).join('\n');

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  const mapsUrl = location
    ? `https://maps.google.com/?q=${location.lat},${location.lng}`
    : null;

  return (
    <div className="min-h-screen bg-red-700 text-white">
      {/* Top bar */}
      <div className="bg-red-900 py-3 px-5 flex items-center justify-between">
        <div className="font-display font-extrabold uppercase tracking-widest text-sm">
          🚨 Emergency Mode
        </div>
        <Link href="/" className="text-xs text-red-200 hover:text-white underline">
          ← Back to app
        </Link>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-5">

        {/* Primary action buttons — always first, zero friction */}
        <div className="grid grid-cols-3 gap-3">
          <EmergencyBtn href="tel:911" label="Call 911" sublabel="Emergency" big />
          <EmergencyBtn href="tel:988" label="Call 988" sublabel="Crisis Line" />
          <EmergencyBtn href="sms:741741?body=HOME" label="Text HOME" sublabel="to 741741" />
        </div>

        {/* Location */}
        {location && mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-red-800 rounded-2xl px-4 py-3 hover:bg-red-900 transition-colors"
          >
            <span className="text-2xl">📍</span>
            <div>
              <div className="font-semibold text-sm">Share your location</div>
              <div className="text-xs text-red-200">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)} — tap to open in Maps
              </div>
            </div>
          </a>
        )}
        {locError && (
          <div className="flex items-center gap-2 text-xs text-red-300">
            <span>📍</span> {locError}
          </div>
        )}

        {/* Health card */}
        <div className="bg-white text-gray-900 rounded-2xl p-5 shadow-raised">
          <h2 className="font-display font-extrabold text-lg text-red-700 mb-4 border-b border-red-100 pb-2">
            🏥 Medical Information Card
          </h2>

          {isLoading && <p className="text-sm text-gray-500 py-4 text-center">Loading health data…</p>}

          {error && (
            <p className="text-sm text-red-600 py-2">
              Could not load health data. Key information may be unavailable.
            </p>
          )}

          {data && (
            <div className="space-y-4">
              {/* Name + blood type */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Patient name</div>
                  <div className="font-bold text-xl text-gray-900">{name}</div>
                </div>
                <div className="rounded-xl bg-red-100 border-2 border-red-400 px-4 py-3 text-center">
                  <div className="text-xs text-red-600 font-semibold uppercase">Blood Type</div>
                  <div className="font-extrabold text-2xl text-red-700">{bloodType}</div>
                </div>
              </div>

              {/* Allergies */}
              <InfoSection label="⚠️ Allergies" items={allergies} emptyText="None on record" chipClass="bg-red-100 text-red-700 border-red-200" />

              {/* Conditions */}
              <InfoSection label="📋 Medical conditions" items={conditions} emptyText="None on record" chipClass="bg-amber-100 text-amber-700 border-amber-200" />

              {/* Medications */}
              {meds.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1.5">💊 Current medications</div>
                  <div className="space-y-1">
                    {meds.map((m, i) => (
                      <div key={i} className="text-sm text-gray-800">
                        <span className="font-semibold">{m.name}</span>
                        {m.dose && <span className="text-gray-500"> {m.dose}</span>}
                        {m.frequency && <span className="text-gray-400"> · {m.frequency}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency contact */}
              {profile?.emergency_contact_phone && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3">
                  <div className="text-xs text-green-700 uppercase tracking-wider font-semibold mb-1">📞 Emergency contact</div>
                  <div className="font-bold text-gray-900">{profile.emergency_contact_name}</div>
                  {profile.emergency_contact_relation && (
                    <div className="text-xs text-gray-500">{profile.emergency_contact_relation}</div>
                  )}
                  <a
                    href={`tel:${profile.emergency_contact_phone}`}
                    className="inline-block mt-2 bg-green-600 text-white text-sm font-bold rounded-xl px-4 py-2 hover:bg-green-700"
                  >
                    📞 {profile.emergency_contact_phone}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* QR code for first responders */}
        <div className="bg-white text-gray-900 rounded-2xl p-5 text-center shadow-raised">
          <h3 className="font-display font-bold text-base text-gray-800 mb-1">QR Code — First Responders</h3>
          <p className="text-xs text-gray-500 mb-4">Scan to view this medical information card on any device.</p>
          <div className="flex justify-center">
            <img
              src={qrUrl}
              alt="Emergency medical info QR code"
              width={180}
              height={180}
              className="rounded-xl border border-gray-200"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-3">
            QR code encodes name, blood type, allergies, conditions, medications, and emergency contact.
          </p>
        </div>

        {/* Additional crisis resources */}
        <div className="bg-red-800 rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3">Additional resources</h3>
          <div className="space-y-2 text-sm">
            <CrisisLink href="tel:911"              label="911 — Emergency Services" />
            <CrisisLink href="tel:988"              label="988 — Suicide & Crisis Lifeline" />
            <CrisisLink href="sms:741741?body=HOME" label="741741 — Crisis Text Line (text HOME)" />
            <CrisisLink href="tel:18002221222"      label="Poison Control: 1-800-222-1222" />
          </div>
        </div>

        {/* Last updated */}
        {data?.retrievedAt && (
          <p className="text-xs text-red-300 text-center">
            Health data retrieved: {new Date(data.retrievedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

function EmergencyBtn({ href, label, sublabel, big }: { href: string; label: string; sublabel: string; big?: boolean }): JSX.Element {
  return (
    <a
      href={href}
      onClick={() => void hapticMedium()}
      className={[
        'block rounded-2xl bg-white text-red-700 text-center p-4 shadow-raised hover:bg-red-50 transition-colors',
        big ? 'ring-4 ring-red-300 ring-offset-2 ring-offset-red-700' : '',
      ].join(' ')}
    >
      <div className={`font-display font-extrabold ${big ? 'text-2xl' : 'text-xl'}`}>{label}</div>
      <div className="text-xs text-red-700/70 font-semibold uppercase tracking-wider mt-0.5">{sublabel}</div>
    </a>
  );
}

function InfoSection({ label, items, emptyText, chipClass }: {
  label: string; items: string[]; emptyText: string; chipClass: string;
}): JSX.Element {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1.5">{label}</div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span key={item} className={`text-xs font-semibold px-2 py-1 rounded-full border ${chipClass}`}>{item}</span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">{emptyText}</p>
      )}
    </div>
  );
}

function CrisisLink({ href, label }: { href: string; label: string }): JSX.Element {
  return (
    <a href={href} className="flex items-center gap-2 text-red-100 hover:text-white">
      <span className="text-base">→</span>
      {label}
    </a>
  );
}
