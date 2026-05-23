// ─── Social & Media Hub — Social Connect ─────────────────────────────────────
// Session 14 — Propel Stack AI, LLC

import { useState } from 'react';
import { useSocialConnections, useConnectPlatform, useDisconnectPlatform } from '../api';
import { SOCIAL_PLATFORMS, PlatformConfig } from '../types';
import type { SocialConnection } from '../types';

function Tooltip({ text }: { text: string }): JSX.Element {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="cursor-help text-surface-muted text-xs border border-surface-ink/[0.06] rounded px-1">?</span>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-52 bg-gray-900 text-white text-xs rounded-lg px-2 py-1.5 z-10 shadow-lg leading-snug">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

interface PlatformCardProps {
  platform: PlatformConfig;
  connection: SocialConnection | undefined;
  onConnect: (p: PlatformConfig) => void;
  onDisconnect: (id: string) => void;
  isConnecting: boolean;
  isDisconnecting: boolean;
}

function PlatformCard({
  platform,
  connection,
  onConnect,
  onDisconnect,
  isConnecting,
  isDisconnecting,
}: PlatformCardProps): JSX.Element {
  const isDeepLink = platform.tier === 'deep_link';

  return (
    <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{platform.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-surface-ink text-sm truncate">{platform.label}</p>
          {isDeepLink && (
            <span className="inline-block text-[10px] font-medium bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 mt-0.5">
              Limited
            </span>
          )}
        </div>
      </div>

      {connection ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
            <span>✓</span>
            <span className="truncate">{connection.display_name}</span>
          </div>
          <button
            onClick={() => onDisconnect(connection.id)}
            disabled={isDisconnecting}
            className="btn-outline text-xs text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
          >
            🗑 Disconnect
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {isDeepLink ? (
            <>
              <button
                disabled
                className="flex-1 btn-outline text-xs text-surface-muted cursor-not-allowed opacity-60"
              >
                Connect
              </button>
              <Tooltip text="Deep link only — no OAuth needed" />
            </>
          ) : (
            <button
              onClick={() => onConnect(platform)}
              disabled={isConnecting}
              className="flex-1 btn bg-brand-teal text-white text-xs disabled:opacity-50"
            >
              {isConnecting ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SocialConnect(): JSX.Element {
  const { data: connections = [], isLoading } = useSocialConnections();
  const connectPlatform = useConnectPlatform();
  const disconnectPlatform = useDisconnectPlatform();

  function getConnection(platformId: string): SocialConnection | undefined {
    return connections.find((c) => c.platform === platformId && c.is_active);
  }

  function handleConnect(platform: PlatformConfig): void {
    connectPlatform.mutate({
      platform: platform.id,
      display_name: platform.label,
    });
  }

  function handleDisconnect(id: string): void {
    disconnectPlatform.mutate(id);
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl px-4 py-3">
        <p className="text-sm text-surface-ink">
          🔐 Connect your social accounts to unlock the feed, inbox, and AI digest.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-raised border border-surface-ink/[0.06] rounded-xl p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SOCIAL_PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              connection={getConnection(platform.id)}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              isConnecting={connectPlatform.isPending}
              isDisconnecting={disconnectPlatform.isPending}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-surface-muted">
        Tier 2 platforms use deep links — they open the native app or website.
      </p>
    </div>
  );
}
