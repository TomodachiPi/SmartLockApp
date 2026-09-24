# SmartLock App

Web application for controlling and monitoring smart laboratory door locks, access schedules, user approvals, and entry history.

## Features

- **Authentication & Access Control**: Login and registration requests for administrators and users.
- **Real-Time Lock Management**: Toggle lock state with visual animations, status monitoring, and live time/date display.
- **Access Periods**: Configurable allowed access schedules and permission levels.
- **Event History & Logs**: Chronological log of door lock/unlock events with starting and ending timestamps.
- **User & Approval Management**: Approve or reject pending user account requests, and manage access schedules with color-coded tags.

## Tech Stack

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Express + Node.js (Full-stack WebSocket server on `/ws`)
- LocalStorage & BroadcastChannel Multi-Device Sync

## ESP8266 WebSocket JSON Protocol

The SmartLock application connects to the ESP8266 WebSocket server (or the built-in `/ws` sync relay) to sync state across devices.

### 1. Periodic Polling (App &rarr; ESP8266, every 30 seconds & upon connection)
```json
{
  "type": "POLL_REQUEST",
  "client": "SmartLockApp",
  "timestamp": 1727150000000
}
```

### 2. Full Sync Response (ESP8266 &rarr; App)
When the ESP8266 receives `POLL_REQUEST`, or when internal variables change, reply with:
```json
{
  "type": "SYNC_REPLY",
  "state": {
    "locked": false,
    "activeRoomHolder": "User123test",
    "changing": false,
    "lockProgress": 0,
    "remainingLockTime": null
  },
  "roomTransfers": [],
  "history": [],
  "profiles": [],
  "timestamp": 1727150000000
}
```

### 3. Lock State Action (App &rarr; ESP8266)
Sent whenever a user locks, unlocks, or toggles:
```json
{
  "type": "LOCK_ACTION",
  "action": "toggle", // "lock" | "unlock" | "toggle"
  "username": "User123test",
  "userRole": "user",
  "timestamp": 1727150000000
}
```

### 4. Room Transfer Actions (App &rarr; ESP8266)
Sent when transferring custody or requesting room entry:
```json
{
  "type": "ROOM_TRANSFER_ACTION",
  "subType": "transfer", // "transfer" | "request" | "respond" | "dismiss"
  "transferId": "transfer-1727150000000",
  "fromUsername": "Administrator",
  "toUsername": "User123test",
  "accept": true, // included when subType is "respond"
  "notes": "Relinquishing room for testing",
  "timestamp": 1727150000000
}
```

### 5. Emergency Action (App &rarr; ESP8266)
```json
{
  "type": "EMERGENCY_ACTION",
  "reason": "Fire Alarm",
  "notes": "Emergency building evacuation",
  "username": "User123test",
  "timestamp": 1727150000000
}
```

### 6. Lock Progress Updates (ESP8266 &rarr; App, optional during servo motor rotation)
```json
{
  "type": "LOCK_PROGRESS",
  "changing": true,
  "lockProgress": 65,
  "remainingLockTime": 2,
  "locked": false
}
```
*(Also backwards-compatible: sending a raw number like `"3"`, `"2"`, `"0"`, `"done"`, or `"locked"` is also accepted).*

