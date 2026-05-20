// ── Preference keys ──────────────────────────────────────────────────────────
const SOUND_KEY   = 'nexus-notif-sound';
const OS_KEY      = 'nexus-notif-os';

// ── Sound preference ─────────────────────────────────────────────────────────
export function isSoundEnabled(): boolean {
  return localStorage.getItem(SOUND_KEY) !== 'false';
}
export function setSoundEnabled(on: boolean): void {
  localStorage.setItem(SOUND_KEY, String(on));
}

// ── OS notification preference ───────────────────────────────────────────────
export function isOsNotifEnabled(): boolean {
  return localStorage.getItem(OS_KEY) !== 'false';
}
export function setOsNotifEnabled(on: boolean): void {
  localStorage.setItem(OS_KEY, String(on));
}

// ── OS notification permission ───────────────────────────────────────────────
export async function requestOsPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export function osPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ── OS notification display ───────────────────────────────────────────────────
export function showOsNotification(title: string, body: string): void {
  if (!isOsNotifEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icon-192.png', silent: true });
  } catch { /* ignore */ }
}

// ── Synthetic chime via Web Audio API ────────────────────────────────────────
type SoundVariant = 'default' | 'urgent';

export function playNotificationSound(variant: SoundVariant = 'default'): void {
  if (!isSoundEnabled()) return;
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx() as AudioContext;

    if (variant === 'urgent') {
      chime(ctx, 880,  0.00, 0.10, 0.12);
      chime(ctx, 1108, 0.13, 0.10, 0.12);
      chime(ctx, 1320, 0.26, 0.14, 0.20);
    } else {
      // Soft double-chime
      chime(ctx, 1108, 0.00, 0.08, 0.14);
      chime(ctx, 1320, 0.15, 0.07, 0.14);
    }

    // Close the AudioContext after all tones finish to free resources
    const totalDuration = variant === 'urgent' ? 0.56 : 0.39;
    setTimeout(() => { void ctx.close(); }, (totalDuration + 0.1) * 1000);
  } catch { /* audio blocked or unsupported — fail silently */ }
}

function chime(ctx: AudioContext, freq: number, delay: number, volume: number, duration: number): void {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.value = freq;

  const t = ctx.currentTime + delay;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.start(t);
  osc.stop(t + duration + 0.05);
}
