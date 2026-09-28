import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateMonthHistory } from './src/data/mockMonthHistory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// In-Memory Shared State (representing the ESP8266 / centralized smart lock unit state)
let smartLockState = {
  locked: false,
  activeRoomHolder: 'Administrator' as string | null,
  changing: false,
  lockOperation: 'idle' as 'idle' | 'locking' | 'unlocking',
  lockProgress: 0,
  remainingLockTime: null as number | null,
  version: 1,
  lastUpdated: Date.now(),
};

// Map of username.toLowerCase() -> timestampMs of last activity/heartbeat
const onlineUsersLastSeen = new Map<string, number>();

function updateUserPresence(username?: string, isOnline: boolean = true) {
  if (!username) return;
  const key = username.trim().toLowerCase();
  if (!key) return;
  if (isOnline) {
    onlineUsersLastSeen.set(key, Date.now());
  } else {
    onlineUsersLastSeen.delete(key);
  }
}

let profiles: any[] = [
  {
    username: 'Administrator',
    password: 'admin123',
    type: 'admin',
    avatarIndex: 0,
    avatarUrl: '0',
    time: [0, 1440],
    permission: 'Admin Privilege',
    joinedDate: 'Jan 15, 2026',
    isOnline: true,
    lastActive: 'Active now',
  },
  {
    username: 'User123test',
    password: 'user',
    type: 'user',
    avatarIndex: 0,
    avatarUrl: '0',
    time: [600, 780],
    permission: 'Standard User Access',
    joinedDate: 'Feb 10, 2026',
    isOnline: false,
    lastActive: 'Active 5m ago',
  },
];

function getSyncedProfiles() {
  const now = Date.now();
  return profiles.map((p) => {
    const key = p.username.toLowerCase();
    const lastSeen = onlineUsersLastSeen.get(key);
    // Active if seen in the last 15 seconds
    const isOnline = lastSeen ? now - lastSeen < 15000 : false;
    const avIdx = p.avatarIndex !== undefined ? Number(p.avatarIndex) : (p.avatarUrl ? parseInt(String(p.avatarUrl), 10) || 0 : 0);
    const validIdx = !isNaN(avIdx) && avIdx >= 0 && avIdx < 10 ? avIdx : 0;
    return {
      ...p,
      avatarIndex: validIdx,
      avatarUrl: String(validIdx),
      isOnline,
      lastActive: isOnline ? 'Active now' : p.lastActive || 'Offline',
    };
  });
}

let profileRequests: any[] = [];

let userSchedules: any[] = [
  {
    id: '1',
    label: 'Administrator',
    role: 'admin',
    time: '24/7 Unlimited Access, Monday to Sunday',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    startTime: '12:00 AM',
    endTime: '11:59 PM',
    dayConfigs: {
      Mon: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Tue: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Wed: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Thu: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Fri: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Sat: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
      Sun: { enabled: true, is24Hours: true, startTime: '12:00 AM', endTime: '11:59 PM' },
    },
    status: 'active',
  },
  {
    id: '2',
    label: 'User123test',
    role: 'user',
    time: 'Tue: 10:00 AM - 01:00 PM',
    days: ['Tue'],
    startTime: '10:00 AM',
    endTime: '01:00 PM',
    dayConfigs: {
      Mon: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Tue: { enabled: true, is24Hours: false, startTime: '10:00 AM', endTime: '01:00 PM' },
      Wed: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Thu: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Fri: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Sat: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
      Sun: { enabled: false, is24Hours: false, startTime: '09:00 AM', endTime: '05:00 PM' },
    },
    status: 'active',
  },
];

let roomTransfers: any[] = [];
let history: any[] = generateMonthHistory();
let labNotes: any[] = [];
let emergencyAlerts: any[] = [];
let adminNotifications: any[] = [];

function normalizeHistoryRecord(item: any): any {
  if (!item) return item;
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const todayStr = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const nowTimeStr = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;

  // 1. Calculate proper millisecond timestamp (year 2024+)
  let ts = item.timestamp;
  if (typeof ts === 'number' && !isNaN(ts)) {
    if (ts >= 1000000000000) {
      // valid ms
    } else if (ts >= 1000000000) {
      ts = ts * 1000;
    } else {
      // small ESP uptime
      ts = undefined;
    }
  } else {
    ts = undefined;
  }

  // 2. Fix date if placeholder
  let date = (item.date || '').trim();
  if (!date || date.toLowerCase() === 'today' || date.toLowerCase() === 'yesterday' || date.toLowerCase().includes('undefined')) {
    date = todayStr;
  }

  // 3. Fix startingTime & endingTime if placeholder
  let startingTime = (item.startingTime || '').trim();
  if (!startingTime || startingTime.toLowerCase().includes('recent') || startingTime.toLowerCase().includes('just now') || startingTime.toLowerCase().includes('undefined')) {
    startingTime = nowTimeStr;
  }
  let endingTime = (item.endingTime || '').trim();
  if (!endingTime || endingTime.toLowerCase().includes('recent') || endingTime.toLowerCase().includes('just now') || endingTime.toLowerCase().includes('undefined')) {
    endingTime = nowTimeStr;
  }

  if (!ts) {
    const parsed = Date.parse(`${date} ${startingTime}`);
    ts = !isNaN(parsed) && parsed > 1000000000000 ? parsed : Date.now();
  }

  return {
    ...item,
    date,
    startingTime,
    endingTime,
    timestamp: ts,
  };
}

function deduplicateHistory(records: any[]): any[] {
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: any[] = [];

  for (const rawItem of records) {
    if (!rawItem || !rawItem.id) continue;
    const item = normalizeHistoryRecord(rawItem);
    if (seenIds.has(item.id)) continue;

    const roughTime = Math.round((item.timestamp || 0) / 15000);
    const sig = `${(item.username || '').toLowerCase()}_${item.date}_${item.startingTime}_${(item.notes || '').slice(0, 30)}_${item.locked}_${roughTime}`;

    if (seenSignatures.has(sig)) continue;

    seenIds.add(item.id);
    seenSignatures.add(sig);
    result.push(item);
  }

  result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return result;
}

// Helper to format date & time
function formatDateTime(d = new Date()) {
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const timeStr = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateStr = `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return { timeStr, dateStr };
}

// Build standard SYNC_REPLY payload
function buildSyncPayload() {
  return {
    type: 'SYNC_REPLY',
    state: smartLockState,
    profiles: getSyncedProfiles(),
    profileRequests,
    userSchedules,
    roomTransfers,
    history,
    labNotes,
    emergencyAlerts,
    adminNotifications,
    timestamp: Date.now(),
  };
}

// Broadcast message to all connected clients
function broadcast(data: any, excludeWs?: WebSocket) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Handle transition timer
let lockTransitionTimer: NodeJS.Timeout | null = null;
function startLockTransition(targetLocked: boolean, actingUser = 'Administrator', role: 'admin' | 'user' = 'admin', isEmergency = false, emergencyReason = '') {
  if (lockTransitionTimer) {
    clearInterval(lockTransitionTimer);
    lockTransitionTimer = null;
  }

  smartLockState.changing = true;
  smartLockState.lockOperation = targetLocked ? 'locking' : 'unlocking';
  smartLockState.lockProgress = 0;
  smartLockState.version += 1;
  smartLockState.lastUpdated = Date.now();

  let seconds = 3;
  smartLockState.remainingLockTime = seconds;

  // Broadcast initial progress
  broadcast({
    type: 'LOCK_PROGRESS',
    changing: true,
    lockOperation: smartLockState.lockOperation,
    lockProgress: 10,
    remainingLockTime: seconds,
    locked: smartLockState.locked,
    timestamp: Date.now(),
  });

  lockTransitionTimer = setInterval(() => {
    seconds -= 1;
    smartLockState.remainingLockTime = seconds;
    const progress = Math.min(95, Math.max(15, Math.round(((3 - seconds) / 3) * 100)));
    smartLockState.lockProgress = progress;

    if (seconds <= 0) {
      if (lockTransitionTimer) {
        clearInterval(lockTransitionTimer);
        lockTransitionTimer = null;
      }

      smartLockState.changing = false;
      smartLockState.lockOperation = 'idle';
      smartLockState.lockProgress = 100;
      smartLockState.remainingLockTime = null;
      smartLockState.locked = targetLocked;
      smartLockState.version += 1;
      smartLockState.lastUpdated = Date.now();

      const { timeStr, dateStr } = formatDateTime();

      if (targetLocked) {
        smartLockState.activeRoomHolder = null;
        // Invalidate pending transfers on lock
        roomTransfers = roomTransfers.filter((t) => t.status !== 'pending');
      } else {
        smartLockState.activeRoomHolder = actingUser;
      }

      const histRecord: any = isEmergency ? {
        id: `hist-emg-${Date.now()}`,
        username: actingUser,
        permission: 'EMERGENCY OVERRIDE',
        userType: role,
        locked: false,
        startingTime: timeStr,
        endingTime: timeStr,
        date: dateStr,
        timestamp: Date.now(),
        isEmergencyOverride: true,
        emergencyReason: emergencyReason || 'Emergency Evacuation',
        notes: `EMERGENCY OVERRIDE UNLOCKED: ${emergencyReason || 'Emergency Evacuation'}`,
      } : {
        id: `hist-${Date.now()}`,
        username: actingUser,
        permission: role === 'admin' ? 'Admin Privilege' : 'Standard User Access',
        userType: role,
        locked: targetLocked,
        startingTime: timeStr,
        endingTime: timeStr,
        date: dateStr,
        timestamp: Date.now(),
        notes: targetLocked ? 'Door locked securely via WebSocket' : 'Door opened with authorized credential via WebSocket',
      };

      history = deduplicateHistory([histRecord, ...history]);

      const notif: any = {
        id: `notif-${Date.now()}`,
        type: 'lock_state_change',
        action: targetLocked ? 'locked' : 'unlocked',
        username: actingUser,
        userRole: role,
        doorName: 'Laboratory SmartLock #1',
        timestamp: `${timeStr}, ${dateStr}`,
        timestampMs: Date.now(),
        read: false,
      };
      adminNotifications = [notif, ...adminNotifications];

      // Broadcast state completion to all
      broadcast(buildSyncPayload());
    } else {
      broadcast({
        type: 'LOCK_PROGRESS',
        changing: true,
        lockProgress: progress,
        remainingLockTime: seconds,
        locked: smartLockState.locked,
        timestamp: Date.now(),
      });
    }
  }, 700);
}

// WebSocket connection lifecycle
wss.on('connection', (ws) => {
  // Immediately send initial full sync on connect
  ws.send(JSON.stringify(buildSyncPayload()));

  ws.on('message', (messageData) => {
    try {
      const rawText = messageData.toString().trim();
      let parsed: any = null;

      try {
        parsed = JSON.parse(rawText);
      } catch {
        // Plain string command (legacy fallback, e.g. "toggle")
        if (rawText.toLowerCase() === 'toggle') {
          parsed = { type: 'LOCK_ACTION', action: 'toggle', username: 'Physical Button' };
        }
      }

      if (!parsed || typeof parsed !== 'object') {
        return;
      }

      if (parsed.username) {
        (ws as any).authenticatedUsername = parsed.username;
        updateUserPresence(parsed.username, true);
      }

      const msgType = parsed.type;

      switch (msgType) {
        // 1. Periodic poll request from client (sent every 5s or during AuthScreen)
        case 'POLL_REQUEST': {
          if (parsed.username) {
            updateUserPresence(parsed.username, true);
          }
          ws.send(JSON.stringify(buildSyncPayload()));
          break;
        }

        // User presence heartbeat / login / logout notification
        case 'USER_PRESENCE': {
          if (parsed.username) {
            const isOnline = parsed.status === 'online';
            updateUserPresence(parsed.username, isOnline);
            if (isOnline) {
              (ws as any).authenticatedUsername = parsed.username;
            } else {
              delete (ws as any).authenticatedUsername;
            }
            broadcast(buildSyncPayload());
          }
          break;
        }

        // Register request from AuthScreen
        case 'REGISTER_REQUEST': {
          const uName = parsed.username?.trim();
          const pWord = parsed.password;
          if (uName && pWord) {
            const exists = profiles.some((p) => p.username.toLowerCase() === uName.toLowerCase()) ||
              profileRequests.some((p) => p.username.toLowerCase() === uName.toLowerCase());
            if (!exists) {
              profileRequests.push({
                username: uName,
                password: pWord,
                type: 'user',
                time: [0, 1440],
                requestedAt: new Date().toLocaleString(),
              });
              broadcast(buildSyncPayload());
            }
          }
          break;
        }

        // 2. Lock / Unlock / Toggle action
        case 'LOCK_ACTION': {
          const target = parsed.action === 'toggle'
            ? !smartLockState.locked
            : parsed.action === 'lock';
          const user = parsed.username || 'User';
          const role = parsed.userRole || 'user';
          startLockTransition(target, user, role, parsed.emergency, parsed.reason);
          break;
        }

        // 3. Room transfer actions
        case 'ROOM_TRANSFER_ACTION': {
          const { timeStr, dateStr } = formatDateTime();
          const subType = parsed.subType;

          if (subType === 'transfer' || subType === 'request') {
            const newTransfer = {
              id: parsed.transferId || `transfer-${Date.now()}`,
              requestType: subType,
              fromUsername: parsed.fromUsername || 'User',
              fromUserRole: 'user',
              toUsername: parsed.toUsername || 'Administrator',
              doorName: 'Laboratory SmartLock #1',
              timestamp: `${timeStr}, ${dateStr}`,
              timestampMs: Date.now(),
              notes: parsed.notes,
              status: 'pending',
            };
            roomTransfers = [newTransfer, ...roomTransfers];
          } else if (subType === 'respond') {
            const transferId = parsed.transferId;
            const accept = !!parsed.accept;
            const found = roomTransfers.find((t) => t.id === transferId);

            if (accept) {
              const reqType = found?.requestType || parsed.requestType || 'transfer';
              const isAccessReq = reqType === 'request';
              const relinquishing =
                parsed.relinquishing ||
                (isAccessReq
                  ? found?.toUsername || parsed.toUsername
                  : found?.fromUsername || parsed.fromUsername) ||
                'Administrator';
              const gaining =
                parsed.gaining ||
                (isAccessReq
                  ? found?.fromUsername || parsed.fromUsername
                  : found?.toUsername || parsed.toUsername) ||
                'User';

              if (found) {
                roomTransfers = roomTransfers
                  .map((t) =>
                    t.id === transferId
                      ? { ...t, status: 'accepted', resolvedAt: `${timeStr}, ${dateStr}` }
                      : t
                  )
                  .filter((t) => t.id === transferId || t.status !== 'pending');
              } else {
                roomTransfers = [
                  {
                    id: transferId || `transfer-${Date.now()}`,
                    requestType: reqType,
                    fromUsername: parsed.fromUsername || relinquishing,
                    toUsername: parsed.toUsername || gaining,
                    doorName: 'Laboratory SmartLock #1',
                    timestamp: `${timeStr}, ${dateStr}`,
                    timestampMs: Date.now(),
                    status: 'accepted',
                    resolvedAt: `${timeStr}, ${dateStr}`,
                  },
                  ...roomTransfers.filter((t) => t.status !== 'pending'),
                ];
              }

              smartLockState.activeRoomHolder = gaining;
              smartLockState.version += 1;
              smartLockState.lastUpdated = Date.now();

              const relinqUser = profiles.find((p) => p.username.toLowerCase() === String(relinquishing).toLowerCase());
              const gainUser = profiles.find((p) => p.username.toLowerCase() === String(gaining).toLowerCase());

              // Add history records for both parties
              const relinqRecord = parsed.relinqRecord || {
                id: `hist-relinq-${transferId || Date.now()}`,
                username: relinquishing,
                permission: relinqUser?.permission || (String(relinquishing).toLowerCase() === 'administrator' ? 'Admin Privilege' : 'Standard User Access'),
                userType: (String(relinquishing).toLowerCase() === 'administrator' || relinqUser?.type === 'admin') ? 'admin' : 'user',
                locked: false,
                startingTime: timeStr,
                endingTime: timeStr,
                date: dateStr,
                timestamp: Date.now() - 1,
                notes: `Relinquished room custody for Laboratory SmartLock #1 (Transferred to ${gaining})`,
              };

              const gainRecord = parsed.gainRecord || {
                id: `hist-gain-${transferId || Date.now()}`,
                username: gaining,
                permission: gainUser?.permission || (String(gaining).toLowerCase() === 'administrator' ? 'Admin Privilege' : 'Standard User Access'),
                userType: (String(gaining).toLowerCase() === 'administrator' || gainUser?.type === 'admin') ? 'admin' : 'user',
                locked: false,
                startingTime: timeStr,
                endingTime: timeStr,
                date: dateStr,
                timestamp: Date.now(),
                notes: `Gained room custody for Laboratory SmartLock #1 (Transferred from ${relinquishing})`,
              };

              history = deduplicateHistory([gainRecord, relinqRecord, ...history]);

              // Admin notification
              const transferNotif = {
                id: `notif-transfer-${Date.now()}`,
                type: 'lock_state_change',
                action: 'unlocked',
                username: gaining,
                userRole: (String(gaining).toLowerCase() === 'administrator' || gainUser?.type === 'admin') ? 'admin' : 'user',
                doorName: 'Laboratory SmartLock #1',
                timestamp: `${timeStr}, ${dateStr}`,
                timestampMs: Date.now(),
                read: false,
              };
              adminNotifications = [transferNotif, ...adminNotifications];
            } else if (found) {
              roomTransfers = roomTransfers.map((t) =>
                t.id === transferId
                  ? { ...t, status: 'declined', resolvedAt: `${timeStr}, ${dateStr}` }
                  : t
              );
            }
          } else if (subType === 'dismiss') {
            roomTransfers = roomTransfers.filter((t) => t.id !== parsed.transferId);
          }

          broadcast(buildSyncPayload());
          break;
        }

        // 4. Emergency Action
        case 'EMERGENCY_ACTION': {
          const { timeStr, dateStr } = formatDateTime();
          const newAlert = {
            id: `alert-${Date.now()}`,
            username: parsed.username || 'User',
            userRole: 'user',
            timestamp: `${timeStr}, ${dateStr}`,
            timestampMs: Date.now(),
            reason: parsed.reason || 'Emergency Evacuation',
            notes: parsed.notes,
            resolved: false,
          };
          emergencyAlerts = [newAlert, ...emergencyAlerts];
          startLockTransition(false, parsed.username || 'User', 'user', true, parsed.reason);
          break;
        }

        // 5. Data Update Action
        case 'DATA_UPDATE_ACTION': {
          const { entity, action, payload } = parsed;

          if (entity === 'profiles') {
            if (action === 'create') {
              const rawType = String(payload?.type || parsed?.userType || '').toLowerCase();
              const cleanType = (rawType === 'admin' || (payload?.username || '').toLowerCase() === 'administrator') ? 'admin' : 'user';
              const cleanProf = { ...payload, type: cleanType };
              profiles = [...profiles.filter((p) => p.username.toLowerCase() !== payload.username.toLowerCase()), cleanProf];
            } else if (action === 'update_avatar' || action === 'update') {
              const uName = (payload?.username || parsed.username || '').toLowerCase();
              const avIdx = payload?.avatarIndex !== undefined ? Number(payload.avatarIndex) : (parsed.avatarIndex !== undefined ? Number(parsed.avatarIndex) : undefined);
              const avUrl = payload?.avatarUrl || parsed.avatarUrl || (avIdx !== undefined ? String(avIdx) : undefined);
              const rawType = payload?.type !== undefined ? String(payload.type).toLowerCase() : undefined;
              const cleanType = rawType !== undefined ? ((rawType === 'admin' || uName === 'administrator') ? 'admin' : 'user') : undefined;

              if (uName) {
                profiles = profiles.map((p) => {
                  if (p.username.toLowerCase() === uName) {
                    const finalIndex = avIdx !== undefined ? avIdx : (avUrl ? parseInt(avUrl, 10) || 0 : (p as any).avatarIndex ?? 0);
                    return {
                      ...p,
                      ...(payload || {}),
                      type: cleanType !== undefined ? cleanType : p.type,
                      avatarIndex: finalIndex,
                      avatarUrl: String(finalIndex),
                    };
                  }
                  return p;
                });
              }
            } else if (action === 'delete') {
              const uName = (payload.username || '').toLowerCase();
              if (uName && uName !== 'administrator') {
                profiles = profiles.filter((p) => p.username.toLowerCase() !== uName);
                userSchedules = userSchedules.filter((s) => s.label.toLowerCase() !== uName);
                labNotes = labNotes.filter((n) => n.username.toLowerCase() !== uName);
                onlineUsersLastSeen.delete(payload.username);
              }
            }
          } else if (entity === 'profileRequests') {
            if (action === 'create') {
              profileRequests = [...profileRequests, payload];
            } else if (action === 'approve') {
              const req = profileRequests.find((r) => r.username.toLowerCase() === payload.username.toLowerCase());
              const userPass = payload.password || req?.password || 'user';
              const rawUserType = String(payload.type || req?.type || '').toLowerCase();
              const userType = (rawUserType === 'admin' || payload.username.toLowerCase() === 'administrator') ? 'admin' : 'user';
              const userTime = payload.time || req?.time || [0, 1440];
              profiles = [
                ...profiles.filter((p) => p.username.toLowerCase() !== payload.username.toLowerCase()),
                {
                  username: payload.username,
                  password: userPass,
                  type: userType,
                  time: userTime,
                  avatarUrl: payload.avatarUrl || '/images/user.png',
                  permission: userType === 'admin' ? 'Admin Privilege' : 'Standard User Access',
                  joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  isOnline: false,
                  lastActive: 'Registered recently',
                },
              ];
              profileRequests = profileRequests.filter((r) => r.username.toLowerCase() !== payload.username.toLowerCase());
            } else if (action === 'reject') {
              profileRequests = profileRequests.filter((r) => r.username.toLowerCase() !== payload.username.toLowerCase());
            }
          } else if (entity === 'schedules') {
            const rawRole = String(payload?.role || parsed.role || parsed.userType || '').toLowerCase();
            const schedObj = payload || {
              id: parsed.id,
              label: parsed.label,
              role: (rawRole === 'admin' || (parsed.label || '').toLowerCase() === 'administrator') ? 'admin' : 'user',
              time: parsed.time,
              days: parsed.daysArray || (parsed.days ? parsed.days.split(',') : []),
              startTime: parsed.startTime,
              endTime: parsed.endTime,
              status: parsed.status,
              dayConfigs: parsed.dayConfigs,
            };
            const cleanRole = (String(schedObj.role).toLowerCase() === 'admin' || (schedObj.label || '').toLowerCase() === 'administrator') ? 'admin' : 'user';
            const cleanSched = { ...schedObj, role: cleanRole };

            if (action === 'create') {
              const newSched = { ...cleanSched, id: cleanSched.id || Date.now().toString() };
              userSchedules = [...userSchedules.filter((s) => s.id !== newSched.id && s.label.toLowerCase() !== newSched.label.toLowerCase()), newSched];
            } else if (action === 'update') {
              const exists = userSchedules.some((s) => s.id === cleanSched.id || s.label.toLowerCase() === cleanSched.label.toLowerCase());
              if (exists) {
                userSchedules = userSchedules.map((s) => (s.id === cleanSched.id || s.label.toLowerCase() === cleanSched.label.toLowerCase() ? { ...s, ...cleanSched } : s));
              } else {
                userSchedules = [...userSchedules, cleanSched];
              }
            } else if (action === 'delete') {
              const targetId = cleanSched.id || parsed.id || payload?.id;
              const targetLabel = (cleanSched.label || parsed.label || payload?.label || '').toLowerCase();
              userSchedules = userSchedules.filter(
                (s) =>
                  (targetId ? s.id !== targetId : true) &&
                  (!targetLabel || s.label.toLowerCase() !== targetLabel)
              );
            }
          } else if (entity === 'labNotes') {
            if (action === 'create') {
              labNotes = [{ ...payload, id: `note-${Date.now()}` }, ...labNotes];
            } else if (action === 'update') {
              labNotes = labNotes.map((n) => n.id === payload.id ? payload : n);
            } else if (action === 'delete') {
              labNotes = labNotes.filter((n) => n.id !== payload.id);
            }
          } else if (entity === 'emergencyAlerts') {
            if (action === 'update' && payload?.id) {
              emergencyAlerts = emergencyAlerts.map((a) => a.id === payload.id ? { ...a, resolved: true } : a);
            }
          } else if (entity === 'adminNotifications') {
            if (action === 'clear') {
              adminNotifications = [];
            } else if (action === 'mark_read' && payload?.id) {
              adminNotifications = adminNotifications.map((n) => n.id === payload.id ? { ...n, read: true } : n);
            }
          } else if (entity === 'history') {
            if (action === 'clear') {
              history = [];
            } else if (action === 'seed') {
              history = Array.isArray(payload) && payload.length > 0 ? payload : generateMonthHistory();
            } else if (action === 'add' || action === 'create' || action === 'add_multiple') {
              const incoming = Array.isArray(payload) ? payload : (payload ? [payload] : []);
              if (incoming.length > 0) {
                history = deduplicateHistory([...incoming, ...history]);
              }
            }
          }

          broadcast(buildSyncPayload());
          break;
        }

        // 6. Push Full State (Client pushes comprehensive updates)
        case 'PUSH_STATE': {
          if (parsed.state) {
            smartLockState = { ...smartLockState, ...parsed.state, version: smartLockState.version + 1, lastUpdated: Date.now() };
          }
          if (parsed.data) {
            if (Array.isArray(parsed.data.profiles)) profiles = parsed.data.profiles;
            if (Array.isArray(parsed.data.profileRequests)) profileRequests = parsed.data.profileRequests;
            if (Array.isArray(parsed.data.userSchedules)) userSchedules = parsed.data.userSchedules;
            if (Array.isArray(parsed.data.roomTransfers)) roomTransfers = parsed.data.roomTransfers;
            if (Array.isArray(parsed.data.history)) history = parsed.data.history;
            if (Array.isArray(parsed.data.labNotes)) labNotes = parsed.data.labNotes;
            if (Array.isArray(parsed.data.emergencyAlerts)) emergencyAlerts = parsed.data.emergencyAlerts;
            if (Array.isArray(parsed.data.adminNotifications)) adminNotifications = parsed.data.adminNotifications;
          }
          broadcast(buildSyncPayload(), ws);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('[WebSocket Server] Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    const user = (ws as any).authenticatedUsername;
    if (user) {
      let otherSocketOpen = false;
      wss.clients.forEach((c) => {
        if (
          c !== ws &&
          (c as any).authenticatedUsername?.toLowerCase() === user.toLowerCase() &&
          c.readyState === WebSocket.OPEN
        ) {
          otherSocketOpen = true;
        }
      });
      if (!otherSocketOpen) {
        updateUserPresence(user, false);
        broadcast(buildSyncPayload());
      }
    }
  });
});

// REST endpoints for health and state queries
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: smartLockState.version, clients: wss.clients.size });
});

app.get('/api/state', (_req, res) => {
  res.json(buildSyncPayload());
});

app.get('/api/profiles', (_req, res) => {
  res.json(getSyncedProfiles());
});

app.post('/api/profiles/avatar', (req, res) => {
  const { username, avatarIndex, avatarUrl } = req.body;
  if (!username) {
    res.status(400).json({ error: 'Missing username' });
    return;
  }

  const uName = String(username).trim().toLowerCase();
  const rawIdx = avatarIndex !== undefined ? avatarIndex : avatarUrl;
  const numIdx = rawIdx !== undefined ? parseInt(String(rawIdx), 10) : 0;
  const finalIdx = !isNaN(numIdx) && numIdx >= 0 && numIdx < 10 ? numIdx : 0;

  let updated = false;
  profiles = profiles.map((p) => {
    if (p.username.toLowerCase() === uName) {
      updated = true;
      return {
        ...p,
        avatarIndex: finalIdx,
        avatarUrl: String(finalIdx),
      };
    }
    return p;
  });

  if (!updated) {
    // If not found in current list, create minimal profile
    profiles.push({
      username: String(username).trim(),
      password: 'user',
      type: 'user',
      avatarIndex: finalIdx,
      avatarUrl: String(finalIdx),
      permission: 'Standard User Access',
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isOnline: true,
      lastActive: 'Active now',
    });
  }

  // Broadcast to all WebSocket connected devices immediately
  broadcast(buildSyncPayload());
  res.json({ success: true, avatarIndex: finalIdx, avatarUrl: String(finalIdx) });
});

app.get('/api/history', (_req, res) => {
  res.json(history);
});

app.post('/api/history', (req, res) => {
  const payload = req.body;
  const incoming = Array.isArray(payload) ? payload : (payload ? [payload] : []);
  if (incoming.length > 0) {
    history = deduplicateHistory([...incoming, ...history]);
    broadcast(buildSyncPayload());
  }
  res.json({ success: true, historyCount: history.length });
});

app.post('/api/room-transfers/respond', (req, res) => {
  const { transferId, accept, fromUsername, toUsername, requestType, relinquishing, gaining, gainRecord, relinqRecord } = req.body;
  const { timeStr, dateStr } = formatDateTime();

  if (accept) {
    const found = roomTransfers.find((t) => t.id === transferId);
    const reqType = found?.requestType || requestType || 'transfer';
    const isAccessReq = reqType === 'request';
    const relinqUserStr =
      relinquishing ||
      (isAccessReq ? found?.toUsername || toUsername : found?.fromUsername || fromUsername) ||
      'Administrator';
    const gainUserStr =
      gaining ||
      (isAccessReq ? found?.fromUsername || fromUsername : found?.toUsername || toUsername) ||
      'User';

    if (found) {
      roomTransfers = roomTransfers
        .map((t) =>
          t.id === transferId
            ? { ...t, status: 'accepted', resolvedAt: `${timeStr}, ${dateStr}` }
            : t
        )
        .filter((t) => t.id === transferId || t.status !== 'pending');
    } else {
      roomTransfers = [
        {
          id: transferId || `transfer-${Date.now()}`,
          requestType: reqType,
          fromUsername: fromUsername || relinqUserStr,
          toUsername: toUsername || gainUserStr,
          doorName: 'Laboratory SmartLock #1',
          timestamp: `${timeStr}, ${dateStr}`,
          timestampMs: Date.now(),
          status: 'accepted',
          resolvedAt: `${timeStr}, ${dateStr}`,
        },
        ...roomTransfers.filter((t) => t.status !== 'pending'),
      ];
    }

    smartLockState.activeRoomHolder = gainUserStr;
    smartLockState.version += 1;
    smartLockState.lastUpdated = Date.now();

    const relinqUserObj = profiles.find((p) => p.username.toLowerCase() === String(relinqUserStr).toLowerCase());
    const gainUserObj = profiles.find((p) => p.username.toLowerCase() === String(gainUserStr).toLowerCase());

    const finalRelinq = relinqRecord || {
      id: `hist-relinq-${transferId || Date.now()}`,
      username: relinqUserStr,
      permission: relinqUserObj?.permission || (String(relinqUserStr).toLowerCase() === 'administrator' ? 'Admin Privilege' : 'Standard User Access'),
      userType: (String(relinqUserStr).toLowerCase() === 'administrator' || relinqUserObj?.type === 'admin') ? 'admin' : 'user',
      locked: false,
      startingTime: timeStr,
      endingTime: timeStr,
      date: dateStr,
      timestamp: Date.now() - 1,
      notes: `Relinquished room custody for Laboratory SmartLock #1 (Transferred to ${gainUserStr})`,
    };

    const finalGain = gainRecord || {
      id: `hist-gain-${transferId || Date.now()}`,
      username: gainUserStr,
      permission: gainUserObj?.permission || (String(gainUserStr).toLowerCase() === 'administrator' ? 'Admin Privilege' : 'Standard User Access'),
      userType: (String(gainUserStr).toLowerCase() === 'administrator' || gainUserObj?.type === 'admin') ? 'admin' : 'user',
      locked: false,
      startingTime: timeStr,
      endingTime: timeStr,
      date: dateStr,
      timestamp: Date.now(),
      notes: `Gained room custody for Laboratory SmartLock #1 (Transferred from ${relinqUserStr})`,
    };

    history = deduplicateHistory([finalGain, finalRelinq, ...history]);
    broadcast(buildSyncPayload());
    res.json({ success: true, activeRoomHolder: gainUserStr, historyCount: history.length });
  } else {
    roomTransfers = roomTransfers.map((t) =>
      t.id === transferId
        ? { ...t, status: 'declined', resolvedAt: `${timeStr}, ${dateStr}` }
        : t
    );
    broadcast(buildSyncPayload());
    res.json({ success: true, status: 'declined' });
  }
});

// Mount Vite in dev mode or serve static files in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SmartLock Server] Running on http://0.0.0.0:${PORT} (WebSocket at /ws)`);
  });
}

startServer();
