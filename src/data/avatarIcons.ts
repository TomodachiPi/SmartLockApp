import user_png from '../assets/images/user.png';
import key_png from '../assets/images/key.png';
import padlock_png from '../assets/images/padlock.png';
import locked_png from '../assets/images/locked.png';
import unlocked_png from '../assets/images/unlocked.png';
import time_png from '../assets/images/time.png';
import history_png from '../assets/images/history.png';
import calendar_png from '../assets/images/calendar.png';
import login_png from '../assets/images/login.png';
import signup_png from '../assets/images/signup.png';

export interface AvatarIconOption {
  index: number;
  id: string;
  name: string;
  description: string;
  src: string;
}

export const AVATAR_ICONS: AvatarIconOption[] = [
  { index: 0, id: 'user', name: 'User', description: 'Standard Account', src: user_png },
  { index: 1, id: 'key', name: 'Key', description: 'Access Pass', src: key_png },
  { index: 2, id: 'padlock', name: 'Padlock', description: 'Security Guard', src: padlock_png },
  { index: 3, id: 'locked', name: 'Shield', description: 'Vault Keeper', src: locked_png },
  { index: 4, id: 'unlocked', name: 'Open Door', description: 'Entry Controller', src: unlocked_png },
  { index: 5, id: 'time', name: 'Time', description: 'Schedule Watch', src: time_png },
  { index: 6, id: 'history', name: 'History', description: 'Log Archivist', src: history_png },
  { index: 7, id: 'calendar', name: 'Calendar', description: 'Access Planner', src: calendar_png },
  { index: 8, id: 'login', name: 'Badge', description: 'Verified Credential', src: login_png },
  { index: 9, id: 'signup', name: 'Member', description: 'Team Member', src: signup_png },
];

/**
 * Returns the bundled image source for the given avatar index or reference.
 * Defaults cleanly to the user icon (index 0).
 */
export function getAvatarByIndex(index?: number | string | null): string {
  if (index === undefined || index === null || index === '') {
    return AVATAR_ICONS[0].src;
  }
  const idx = typeof index === 'number' ? index : parseInt(String(index), 10);
  if (!isNaN(idx) && idx >= 0 && idx < AVATAR_ICONS.length) {
    return AVATAR_ICONS[idx].src;
  }
  if (typeof index === 'string') {
    const clean = index.trim().toLowerCase();
    const found = AVATAR_ICONS.find(
      (a) => a.id.toLowerCase() === clean || a.src === index || a.name.toLowerCase() === clean
    );
    if (found) return found.src;
  }
  return AVATAR_ICONS[0].src;
}

/**
 * Parses any incoming avatar representation into an integer index (0-9).
 */
export function parseAvatarIndex(val?: number | string | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    return val >= 0 && val < AVATAR_ICONS.length ? val : 0;
  }
  const parsed = parseInt(String(val), 10);
  if (!isNaN(parsed) && parsed >= 0 && parsed < AVATAR_ICONS.length) {
    return parsed;
  }
  const clean = String(val).trim().toLowerCase();
  const foundIdx = AVATAR_ICONS.findIndex(
    (a) => a.id.toLowerCase() === clean || a.src === val || a.name.toLowerCase() === clean
  );
  return foundIdx >= 0 ? foundIdx : 0;
}
