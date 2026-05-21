import type { Bill } from '../financial/types';

// Dashboard shared types (Session 5).

export interface Task {
  id: string;
  title: string;
  notes: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  completedToday: boolean;
  streak: number;
}

export interface Activity {
  id: string;
  kind: string;
  summary: string;
  createdAt: string;
}

export interface Summary {
  tasksCompletedThisWeek: number;
  netWorth: number;
  aiTokensUsed: number;
  contactsAddedThisMonth: number;
}

export interface Agenda {
  tasks: Task[];
  bills: Bill[];
}

export interface Weather {
  available: boolean;
  temperature?: number | null;
  weatherCode?: number | null;
  reason?: string;
}

export interface Brief {
  brief: string;
  stub: boolean;
  generatedAt: string;
  counts: { dueTasks: number; dueBills: number; overdueFollowUps: number };
}

export type CaptureKind = 'task' | 'note' | 'contact' | 'expense';

export const CAPTURE_LABELS: Record<CaptureKind, string> = {
  task: 'Task',
  note: 'Note',
  contact: 'Contact',
  expense: 'Expense',
};

/** Coarse WMO weather-code → label/emoji mapping (Open-Meteo). */
export function weatherLabel(code: number | null | undefined): { label: string; icon: string } {
  if (code == null) return { label: 'Unknown', icon: '·' };
  if (code === 0) return { label: 'Clear', icon: '☀️' };
  if (code <= 3) return { label: 'Partly cloudy', icon: '⛅' };
  if (code <= 48) return { label: 'Fog', icon: '🌫️' };
  if (code <= 67) return { label: 'Rain', icon: '🌧️' };
  if (code <= 77) return { label: 'Snow', icon: '🌨️' };
  if (code <= 82) return { label: 'Showers', icon: '🌦️' };
  if (code <= 99) return { label: 'Thunderstorm', icon: '⛈️' };
  return { label: 'Unknown', icon: '·' };
}
