/*
 * ESP8266 SmartLock Controller Firmware
 * 
 * Hardware:
 *   - ESP8266 (NodeMCU / Wemos D1 Mini)
 *   - 16x2 I2C LCD (0x27)
 *   - Lock Actuator Motor Driver (FORWARD_OUTPUT: D5 / GPIO14, BACKWARD_OUTPUT: D6 / GPIO12)
 *   - Limit Switch / Sensor (LIMIT_OUTPUT: SSD3 / GPIO1)
 *   - Builtin LED for status
 * 
 * Features:
 *   - Wi-Fi Access Point ("SmartLocc" / "1234567890", default IP 192.168.4.1)
 *   - WebSocket Server (/ws) with JSON Synchronization
 *   - Multi-Device Authentication & Cross-Device Account Sync:
 *       * Stores and syncs authorized users and pending registration requests
 *       * Administrator can approve requests on one device; other devices sync instantly
 *       * AuthScreen polls or pushes updates in real-time
 *   - Accurate Status Text:
 *       * Displays "UNLOCKING..." while actuator is unlocking
 *       * Displays "LOCKING..." while actuator is locking
 *       * Dispatches state to app so devices display UNLOCKING / LOCKING even if outside schedule
 *   - LittleFS State & User Persistence (restores lock state, custody & user credentials on reboot)
 *   - Web Server for hosting the SmartLock Web App directly from LittleFS
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include "LittleFS.h"

// -------------------------------------------------------------
// Configuration & Pin Definitions
// -------------------------------------------------------------
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
AsyncEventSource events("/events");

const char* ssid = "SmartLocc";
const char* password = "1234567890";

LiquidCrystal_I2C lcd(0x27, 16, 2);

const int FORWARD_OUTPUT = 14;  // D5
const int BACKWARD_OUTPUT = 12; // D6
const int LIMIT_OUTPUT = 1;     // SSD3 (TX)

// -------------------------------------------------------------
// User Management Structures & In-Memory Store
// -------------------------------------------------------------
struct SmartLockUser {
  String username;
  String password;
  String type;        // "admin" or "user"
  String permission;  // e.g. "Admin Privilege" or "Standard User Access"
  String avatarUrl;   // Data URL or image path, stored in LittleFS
};

struct SmartLockRequest {
  String username;
  String password;
  String type;
  String requestedAt;
};

struct SmartLockSchedule {
  String id;
  String label;
  String role;
  String time;
  String days;       // Comma-separated: "Mon,Tue,Wed,Thu,Fri,Sat,Sun"
  String startTime;  // "12:00 AM"
  String endTime;    // "11:59 PM"
  String status;     // "active" or "restricted"
};

struct SmartLockLabNote {
  String id;
  String username;
  String title;
  String date;
  String time;
  String purpose;
  String status;
};

const int MAX_USERS = 20;
const int MAX_REQUESTS = 20;
const int MAX_SCHEDULES = 20;
const int MAX_LAB_NOTES = 20;

SmartLockUser userList[MAX_USERS];
int userCount = 0;
unsigned long userLastSeen[MAX_USERS]; // Milliseconds of last heartbeat per user

SmartLockRequest requestList[MAX_REQUESTS];
int requestCount = 0;

SmartLockSchedule scheduleList[MAX_SCHEDULES];
int scheduleCount = 0;

SmartLockLabNote labNoteList[MAX_LAB_NOTES];
int labNoteCount = 0;

void updateUserHeartbeat(String username, bool online = true) {
  if (username.length() == 0) return;
  for (int i = 0; i < userCount; i++) {
    if (userList[i].username.equalsIgnoreCase(username)) {
      userLastSeen[i] = online ? millis() : 0;
      return;
    }
  }
}

// -------------------------------------------------------------
// Internal SmartLock Variables
// -------------------------------------------------------------
bool isLocked = false;      // true = LOCKED, false = UNLOCKED
bool changing = false;      // true while motor actuator is moving
String lockOperation = "idle"; // "idle", "locking", "unlocking"

int lockCounter = 0;
int openingCount = 25; // Duration in seconds for unlocking
int closingCount = 28; // Duration in seconds for locking
int remainingTime = closingCount;
int lockProgress = 0;
int totalDuration = closingCount;

unsigned long lastSecondTime = 0;
unsigned long secondDuration = 1000;

unsigned long lastPressTime = 0;
unsigned long pressDelay = 500;

String activeRoomHolder = "Administrator";
String lastActingUser = "Administrator";

// Room Transfer state variables
String pendingTransferId = "";
String pendingType = "";       // "transfer" or "request"
String pendingFromUser = "";
String pendingToUser = "";
String pendingNotes = "";
String pendingStatus = "";     // "pending", "accepted", "declined"
unsigned long pendingTimestamp = 0;

IPAddress myIP;
char lockCounterChar[10];

// -------------------------------------------------------------
// Helper: Extract JSON String Value
// -------------------------------------------------------------
String extractJsonString(String json, String key) {
  String searchKey = "\"" + key + "\":\"";
  int startIdx = json.indexOf(searchKey);
  if (startIdx >= 0) {
    startIdx += searchKey.length();
    int endIdx = json.indexOf("\"", startIdx);
    if (endIdx > startIdx) {
      return json.substring(startIdx, endIdx);
    }
  }
  
  // Numeric or boolean unquoted value: "key":value
  searchKey = "\"" + key + "\":";
  startIdx = json.indexOf(searchKey);
  if (startIdx >= 0) {
    startIdx += searchKey.length();
    while (startIdx < json.length() && (json[startIdx] == ' ' || json[startIdx] == '\"')) {
      startIdx++;
    }
    int endIdx = startIdx;
    while (endIdx < json.length() && json[endIdx] != ',' && json[endIdx] != '}' && json[endIdx] != '\"' && json[endIdx] != ' ') {
      endIdx++;
    }
    return json.substring(startIdx, endIdx);
  }
  
  return "";
}

// -------------------------------------------------------------
// User Management & LittleFS Persistence
// -------------------------------------------------------------
void saveAvatarToFS(String username, String avatarUrl) {
  if (username.length() == 0) return;
  String path = "/avatar_" + username + ".txt";
  File f = LittleFS.open(path, "w");
  if (f) {
    f.print(avatarUrl);
    f.close();
  }
}

String loadAvatarFromFS(String username) {
  if (username.length() == 0) return "/images/user.png";
  String path = "/avatar_" + username + ".txt";
  if (LittleFS.exists(path)) {
    File f = LittleFS.open(path, "r");
    if (f) {
      String av = f.readString();
      f.close();
      av.trim();
      if (av.length() > 0) return av;
    }
  }
  return "/images/user.png";
}

String extractDaysString(String json) {
  // 1. Direct comma-separated string: "days":"Mon,Tue,Wed" or "daysStr":"..."
  String daysStr = extractJsonString(json, "daysStr");
  if (daysStr.length() > 0 && daysStr != "[") return daysStr;

  String strVal = extractJsonString(json, "days");
  if (strVal.length() > 0 && strVal != "[") return strVal;

  // 2. JSON array: "days":["Mon","Tue"] or "days": ["Mon", "Tue"]
  int daysIdx = json.indexOf("\"days\":");
  if (daysIdx < 0) daysIdx = json.indexOf("\"days\" :");
  if (daysIdx >= 0) {
    int arrStart = json.indexOf('[', daysIdx);
    int arrEnd = (arrStart >= 0) ? json.indexOf(']', arrStart) : -1;
    if (arrStart >= 0 && arrEnd > arrStart) {
      String inside = json.substring(arrStart + 1, arrEnd);
      String result = "";
      const char* allDays[7] = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
      for (int i = 0; i < 7; i++) {
        if (inside.indexOf(allDays[i]) >= 0) {
          if (result.length() > 0) result += ",";
          result += allDays[i];
        }
      }
      if (result.length() > 0) return result;
    }
  }
  return "Mon,Tue,Wed,Thu,Fri";
}

String extractDayConfigsJson(String json) {
  int idx = json.indexOf("\"dayConfigs\":");
  if (idx < 0) idx = json.indexOf("\"dayConfigs\" :");
  if (idx >= 0) {
    int objStart = json.indexOf('{', idx);
    if (objStart >= 0) {
      int braceCount = 1;
      int cur = objStart + 1;
      while (cur < json.length() && braceCount > 0) {
        if (json[cur] == '{') braceCount++;
        else if (json[cur] == '}') braceCount--;
        cur++;
      }
      if (braceCount == 0) {
        return json.substring(objStart, cur);
      }
    }
  }
  return "";
}

void saveDayConfigsToFS(String id, String cfgJson) {
  if (id.length() == 0 || cfgJson.length() == 0) return;
  String path = "/daycfg_" + id + ".json";
  File f = LittleFS.open(path, "w");
  if (f) {
    f.print(cfgJson);
    f.close();
  }
}

String loadDayConfigsFromFS(String id) {
  if (id.length() == 0) return "";
  String path = "/daycfg_" + id + ".json";
  if (LittleFS.exists(path)) {
    File f = LittleFS.open(path, "r");
    if (f) {
      String content = f.readString();
      f.close();
      content.trim();
      if (content.length() > 0 && content.startsWith("{") && content.endsWith("}")) {
        return content;
      }
    }
  }
  return "";
}

void initDefaultUsers() {
  userCount = 0;
  // Default Admin
  userList[userCount++] = { "Administrator", "admin123", "admin", "Admin Privilege", "/images/user.png" };
  // Default Standard User
  userList[userCount++] = { "User123test", "user", "user", "Standard User Access", "/images/user.png" };
}

void saveUsersToFS() {
  File f = LittleFS.open("/users.txt", "w");
  if (f) {
    for (int i = 0; i < userCount; i++) {
      f.println(userList[i].username + "\t" + userList[i].password + "\t" + userList[i].type + "\t" + userList[i].permission);
      if (userList[i].avatarUrl.length() > 0 && userList[i].avatarUrl != "/images/user.png") {
        saveAvatarToFS(userList[i].username, userList[i].avatarUrl);
      }
    }
    f.close();
  }
}

void loadUsersFromFS() {
  if (!LittleFS.exists("/users.txt")) {
    initDefaultUsers();
    saveUsersToFS();
    return;
  }

  File f = LittleFS.open("/users.txt", "r");
  if (!f) {
    initDefaultUsers();
    return;
  }

  userCount = 0;
  while (f.available() && userCount < MAX_USERS) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    int p1 = line.indexOf('\t');
    int p2 = (p1 >= 0) ? line.indexOf('\t', p1 + 1) : -1;
    int p3 = (p2 >= 0) ? line.indexOf('\t', p2 + 1) : -1;

    if (p1 >= 0 && p2 >= 0 && p3 >= 0) {
      String u = line.substring(0, p1);
      String p = line.substring(p1 + 1, p2);
      String t = line.substring(p2 + 1, p3);
      String perm = line.substring(p3 + 1);

      // Filter out old removed users if present in file
      if (u == "Sarah_Chen" || u == "Alex_Rivera") continue;

      String av = loadAvatarFromFS(u);
      userList[userCount++] = { u, p, t, perm, av };
    }
  }
  f.close();

  if (userCount == 0) {
    initDefaultUsers();
    saveUsersToFS();
  }
}

void saveRequestsToFS() {
  File f = LittleFS.open("/requests.txt", "w");
  if (f) {
    for (int i = 0; i < requestCount; i++) {
      f.println(requestList[i].username + "\t" + requestList[i].password + "\t" + requestList[i].type + "\t" + requestList[i].requestedAt);
    }
    f.close();
  }
}

void loadRequestsFromFS() {
  if (!LittleFS.exists("/requests.txt")) return;

  File f = LittleFS.open("/requests.txt", "r");
  if (!f) return;

  requestCount = 0;
  while (f.available() && requestCount < MAX_REQUESTS) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    int p1 = line.indexOf('\t');
    int p2 = (p1 >= 0) ? line.indexOf('\t', p1 + 1) : -1;
    int p3 = (p2 >= 0) ? line.indexOf('\t', p2 + 1) : -1;

    if (p1 >= 0 && p2 >= 0) {
      String u = line.substring(0, p1);
      String p = line.substring(p1 + 1, p2);
      String t = (p3 >= 0) ? line.substring(p2 + 1, p3) : line.substring(p2 + 1);
      String rAt = (p3 >= 0) ? line.substring(p3 + 1) : "Recent";
      requestList[requestCount++] = { u, p, t, rAt };
    }
  }
  f.close();
}

void addUser(String username, String password, String type, String permission) {
  for (int i = 0; i < userCount; i++) {
    if (userList[i].username.equalsIgnoreCase(username)) {
      userList[i].password = password;
      userList[i].type = type;
      userList[i].permission = permission;
      saveUsersToFS();
      return;
    }
  }
  if (userCount < MAX_USERS) {
    userList[userCount++] = { username, password, type, permission };
    saveUsersToFS();
  }
}

void removeUser(String username) {
  if (username.equalsIgnoreCase("Administrator")) return;

  int idx = -1;
  for (int i = 0; i < userCount; i++) {
    if (userList[i].username.equalsIgnoreCase(username)) {
      idx = i;
      break;
    }
  }
  if (idx >= 0) {
    for (int i = idx; i < userCount - 1; i++) {
      userList[i] = userList[i + 1];
      userLastSeen[i] = userLastSeen[i + 1];
    }
    userCount--;
    saveUsersToFS();
  }

  // Cascade delete all associated access schedules for this user
  bool schedChanged = false;
  for (int i = scheduleCount - 1; i >= 0; i--) {
    if (scheduleList[i].label.equalsIgnoreCase(username)) {
      for (int j = i; j < scheduleCount - 1; j++) {
        scheduleList[j] = scheduleList[j + 1];
      }
      scheduleCount--;
      schedChanged = true;
    }
  }
  if (schedChanged) {
    saveSchedulesToFS();
  }

  // Cascade delete any lab notes for this user
  bool noteChanged = false;
  for (int i = labNoteCount - 1; i >= 0; i--) {
    if (labNoteList[i].username.equalsIgnoreCase(username)) {
      for (int j = i; j < labNoteCount - 1; j++) {
        labNoteList[j] = labNoteList[j + 1];
      }
      labNoteCount--;
      noteChanged = true;
    }
  }
  if (noteChanged) {
    saveLabNotesToFS();
  }
}

void addRequest(String username, String password, String type) {
  for (int i = 0; i < userCount; i++) {
    if (userList[i].username.equalsIgnoreCase(username)) return;
  }
  for (int i = 0; i < requestCount; i++) {
    if (requestList[i].username.equalsIgnoreCase(username)) return;
  }
  if (requestCount < MAX_REQUESTS) {
    requestList[requestCount++] = { username, password, type, "Recent" };
    saveRequestsToFS();
  }
}

void approveRequest(String username, String passOverride = "", String typeOverride = "") {
  String pass = passOverride;
  String type = typeOverride.length() > 0 ? typeOverride : "user";

  int reqIdx = -1;
  for (int i = 0; i < requestCount; i++) {
    if (requestList[i].username.equalsIgnoreCase(username)) {
      if (pass.length() == 0) pass = requestList[i].password;
      if (typeOverride.length() == 0) type = requestList[i].type;
      reqIdx = i;
      break;
    }
  }

  if (pass.length() == 0) pass = "user";
  String perm = (type == "admin") ? "Admin Privilege" : "Standard User Access";
  addUser(username, pass, type, perm);

  if (reqIdx >= 0) {
    for (int i = reqIdx; i < requestCount - 1; i++) {
      requestList[i] = requestList[i + 1];
    }
    requestCount--;
    saveRequestsToFS();
  }
}

void rejectRequest(String username) {
  int reqIdx = -1;
  for (int i = 0; i < requestCount; i++) {
    if (requestList[i].username.equalsIgnoreCase(username)) {
      reqIdx = i;
      break;
    }
  }
  if (reqIdx >= 0) {
    for (int i = reqIdx; i < requestCount - 1; i++) {
      requestList[i] = requestList[i + 1];
    }
    requestCount--;
    saveRequestsToFS();
  }
}

// -------------------------------------------------------------
// Schedule Management & LittleFS Persistence
// -------------------------------------------------------------
void initDefaultSchedules() {
  scheduleCount = 0;
  scheduleList[scheduleCount++] = {
    "1",
    "Administrator",
    "admin",
    "24/7 Unlimited Access, Monday to Sunday",
    "Mon,Tue,Wed,Thu,Fri,Sat,Sun",
    "12:00 AM",
    "11:59 PM",
    "active"
  };
  scheduleList[scheduleCount++] = {
    "2",
    "User123test",
    "user",
    "10:00 AM to 01:00 PM, Tuesday",
    "Tue",
    "10:00 AM",
    "01:00 PM",
    "active"
  };
}

void saveSchedulesToFS() {
  File f = LittleFS.open("/schedules.txt", "w");
  if (f) {
    for (int i = 0; i < scheduleCount; i++) {
      f.println(scheduleList[i].id + "\t" + scheduleList[i].label + "\t" + scheduleList[i].role + "\t" + scheduleList[i].time + "\t" + scheduleList[i].days + "\t" + scheduleList[i].startTime + "\t" + scheduleList[i].endTime + "\t" + scheduleList[i].status);
    }
    f.close();
  }
}

void loadSchedulesFromFS() {
  if (!LittleFS.exists("/schedules.txt")) {
    initDefaultSchedules();
    saveSchedulesToFS();
    return;
  }

  File f = LittleFS.open("/schedules.txt", "r");
  if (!f) {
    initDefaultSchedules();
    return;
  }

  scheduleCount = 0;
  while (f.available() && scheduleCount < MAX_SCHEDULES) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    int p[7];
    int start = 0;
    bool ok = true;
    for (int i = 0; i < 7; i++) {
      p[i] = line.indexOf('\t', start);
      if (p[i] < 0) { ok = false; break; }
      start = p[i] + 1;
    }

    if (ok) {
      String id = line.substring(0, p[0]);
      String lbl = line.substring(p[0] + 1, p[1]);
      String r = line.substring(p[1] + 1, p[2]);
      String t = line.substring(p[2] + 1, p[3]);
      String d = line.substring(p[3] + 1, p[4]);
      String st = line.substring(p[4] + 1, p[5]);
      String et = line.substring(p[5] + 1, p[6]);
      String stat = line.substring(p[6] + 1);
      scheduleList[scheduleCount++] = { id, lbl, r, t, d, st, et, stat };
    }
  }
  f.close();

  if (scheduleCount == 0) {
    initDefaultSchedules();
    saveSchedulesToFS();
  }
}

void addOrUpdateSchedule(String id, String label, String role, String time, String days, String startTime, String endTime, String status, String dayConfigsJson = "") {
  if (id.length() == 0) id = String(millis());
  if (status.length() == 0) status = "active";
  if (days.length() == 0) days = "Mon,Tue,Wed,Thu,Fri";
  if (startTime.length() == 0) startTime = "09:00 AM";
  if (endTime.length() == 0) endTime = "05:00 PM";
  if (role.length() == 0) role = "user";

  if (dayConfigsJson.length() > 0) {
    saveDayConfigsToFS(id, dayConfigsJson);
  }

  for (int i = 0; i < scheduleCount; i++) {
    if (scheduleList[i].id == id || scheduleList[i].label.equalsIgnoreCase(label)) {
      scheduleList[i] = { scheduleList[i].id, label, role, time, days, startTime, endTime, status };
      saveSchedulesToFS();
      return;
    }
  }
  if (scheduleCount < MAX_SCHEDULES) {
    scheduleList[scheduleCount++] = { id, label, role, time, days, startTime, endTime, status };
    saveSchedulesToFS();
  }
}

void removeSchedule(String id) {
  int idx = -1;
  for (int i = 0; i < scheduleCount; i++) {
    if (scheduleList[i].id == id) {
      idx = i;
      break;
    }
  }
  if (idx >= 0) {
    LittleFS.remove("/daycfg_" + id + ".json");
    for (int i = idx; i < scheduleCount - 1; i++) {
      scheduleList[i] = scheduleList[i + 1];
    }
    scheduleCount--;
    saveSchedulesToFS();
  }
}

void removeScheduleByLabel(String label) {
  bool changed = false;
  for (int i = scheduleCount - 1; i >= 0; i--) {
    if (scheduleList[i].label.equalsIgnoreCase(label)) {
      for (int j = i; j < scheduleCount - 1; j++) {
        scheduleList[j] = scheduleList[j + 1];
      }
      scheduleCount--;
      changed = true;
    }
  }
  if (changed) {
    saveSchedulesToFS();
  }
}

// -------------------------------------------------------------
// Schedule Access Requests (Lab Notes) Storage & Sync
// -------------------------------------------------------------
void saveLabNotesToFS() {
  File f = LittleFS.open("/labnotes.txt", "w");
  if (f) {
    for (int i = 0; i < labNoteCount; i++) {
      f.println(labNoteList[i].id + "\t" +
                labNoteList[i].username + "\t" +
                labNoteList[i].title + "\t" +
                labNoteList[i].date + "\t" +
                labNoteList[i].time + "\t" +
                labNoteList[i].purpose + "\t" +
                labNoteList[i].status);
    }
    f.close();
  }
}

void loadLabNotesFromFS() {
  if (!LittleFS.exists("/labnotes.txt")) {
    labNoteCount = 0;
    return;
  }

  File f = LittleFS.open("/labnotes.txt", "r");
  if (!f) return;

  labNoteCount = 0;
  while (f.available() && labNoteCount < MAX_LAB_NOTES) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    int p1 = line.indexOf('\t');
    int p2 = (p1 >= 0) ? line.indexOf('\t', p1 + 1) : -1;
    int p3 = (p2 >= 0) ? line.indexOf('\t', p2 + 1) : -1;
    int p4 = (p3 >= 0) ? line.indexOf('\t', p3 + 1) : -1;
    int p5 = (p4 >= 0) ? line.indexOf('\t', p4 + 1) : -1;
    int p6 = (p5 >= 0) ? line.indexOf('\t', p5 + 1) : -1;

    if (p1 >= 0 && p2 >= 0 && p3 >= 0 && p4 >= 0 && p5 >= 0) {
      String id = line.substring(0, p1);
      String u = line.substring(p1 + 1, p2);
      String ttl = line.substring(p2 + 1, p3);
      String d = line.substring(p3 + 1, p4);
      String tm = line.substring(p4 + 1, p5);
      String purp = (p6 >= 0) ? line.substring(p5 + 1, p6) : line.substring(p5 + 1);
      String stat = (p6 >= 0) ? line.substring(p6 + 1) : "confirmed";

      labNoteList[labNoteCount++] = { id, u, ttl, d, tm, purp, stat };
    }
  }
  f.close();
}

void addOrUpdateLabNote(String id, String username, String title, String date, String time, String purpose, String status) {
  if (id.length() == 0) id = "note-" + String(millis());
  if (status.length() == 0) status = "confirmed";

  for (int i = 0; i < labNoteCount; i++) {
    if (labNoteList[i].id == id) {
      labNoteList[i] = { id, username, title, date, time, purpose, status };
      saveLabNotesToFS();
      return;
    }
  }
  if (labNoteCount < MAX_LAB_NOTES) {
    labNoteList[labNoteCount++] = { id, username, title, date, time, purpose, status };
    saveLabNotesToFS();
  }
}

void removeLabNote(String id) {
  int idx = -1;
  for (int i = 0; i < labNoteCount; i++) {
    if (labNoteList[i].id == id) {
      idx = i;
      break;
    }
  }
  if (idx >= 0) {
    for (int i = idx; i < labNoteCount - 1; i++) {
      labNoteList[i] = labNoteList[i + 1];
    }
    labNoteCount--;
    saveLabNotesToFS();
  }
}

// -------------------------------------------------------------
// LittleFS Lock State Save & Load
// -------------------------------------------------------------
void saveStateToFS() {
  File f = LittleFS.open("/smartlock_state.txt", "w");
  if (f) {
    f.println(isLocked ? "1" : "0");
    f.println(activeRoomHolder);
    f.close();
  }
}

void loadStateFromFS() {
  if (LittleFS.exists("/smartlock_state.txt")) {
    File f = LittleFS.open("/smartlock_state.txt", "r");
    if (f) {
      String lockStr = f.readStringUntil('\n');
      lockStr.trim();
      isLocked = (lockStr == "1");

      String userStr = f.readStringUntil('\n');
      userStr.trim();
      if (userStr.length() > 0) {
        activeRoomHolder = userStr;
      }
      f.close();
    }
  }
}

// -------------------------------------------------------------
// Helper: Build Full SYNC_REPLY JSON
// Sends current state, user credentials, room custody, and requests
// -------------------------------------------------------------
String buildSyncJson() {
  String json = "{";
  json += "\"type\":\"SYNC_REPLY\",";
  
  // State block
  json += "\"state\":{";
  json += "\"locked\":" + String(isLocked ? "true" : "false") + ",";
  json += "\"activeRoomHolder\":" + (activeRoomHolder.length() > 0 ? ("\"" + activeRoomHolder + "\"") : "null") + ",";
  json += "\"changing\":" + String(changing ? "true" : "false") + ",";
  json += "\"lockOperation\":\"" + lockOperation + "\",";
  json += "\"lockProgress\":" + String(lockProgress) + ",";
  json += "\"remainingLockTime\":" + (changing ? String(remainingTime) : "null");
  json += "},";

  // Synced profiles with dynamic online presence
  json += "\"profiles\":[";
  for (int i = 0; i < userCount; i++) {
    if (i > 0) json += ",";
    bool online = (userLastSeen[i] > 0 && (millis() - userLastSeen[i] < 15000));
    String av = userList[i].avatarUrl;
    if (av.length() == 0) av = "/images/user.png";
    json += "{";
    json += "\"username\":\"" + userList[i].username + "\",";
    json += "\"password\":\"" + userList[i].password + "\",";
    json += "\"type\":\"" + userList[i].type + "\",";
    json += "\"avatarUrl\":\"" + av + "\",";
    json += "\"permission\":\"" + userList[i].permission + "\",";
    json += "\"time\":[0,1440],";
    json += "\"isOnline\":" + String(online ? "true" : "false") + ",";
    json += "\"lastActive\":\"" + String(online ? "Active now" : "Offline") + "\"";
    json += "}";
  }
  json += "],";

  // Synced user schedules
  json += "\"userSchedules\":[";
  for (int i = 0; i < scheduleCount; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"id\":\"" + scheduleList[i].id + "\",";
    json += "\"label\":\"" + scheduleList[i].label + "\",";
    json += "\"role\":\"" + scheduleList[i].role + "\",";
    json += "\"time\":\"" + scheduleList[i].time + "\",";
    json += "\"days\":[";
    String dStr = scheduleList[i].days;
    int dStart = 0;
    bool firstDay = true;
    while (dStart < dStr.length()) {
      int cIdx = dStr.indexOf(',', dStart);
      String d = (cIdx >= 0) ? dStr.substring(dStart, cIdx) : dStr.substring(dStart);
      d.trim();
      if (d.length() > 0) {
        if (!firstDay) json += ",";
        json += "\"" + d + "\"";
        firstDay = false;
      }
      if (cIdx >= 0) dStart = cIdx + 1;
      else break;
    }
    json += "],";
    json += "\"startTime\":\"" + scheduleList[i].startTime + "\",";
    json += "\"endTime\":\"" + scheduleList[i].endTime + "\",";
    json += "\"status\":\"" + scheduleList[i].status + "\",";
    
    // Output dayConfigs for day-by-day persistence
    String savedDayCfg = loadDayConfigsFromFS(scheduleList[i].id);
    if (savedDayCfg.length() > 0) {
      json += "\"dayConfigs\":" + savedDayCfg;
    } else {
      json += "\"dayConfigs\":{";
      const char* allDayShorts[7] = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
      bool is24 = (scheduleList[i].time.indexOf("24/7") >= 0 || scheduleList[i].time.indexOf("Unlimited") >= 0 || (scheduleList[i].startTime == "12:00 AM" && scheduleList[i].endTime == "11:59 PM"));
      for (int d = 0; d < 7; d++) {
        if (d > 0) json += ",";
        bool dayEn = (scheduleList[i].days.indexOf(allDayShorts[d]) >= 0);
        json += "\"" + String(allDayShorts[d]) + "\":{";
        json += "\"enabled\":" + String(dayEn ? "true" : "false") + ",";
        json += "\"is24Hours\":" + String(is24 ? "true" : "false") + ",";
        json += "\"startTime\":\"" + scheduleList[i].startTime + "\",";
        json += "\"endTime\":\"" + scheduleList[i].endTime + "\"";
        json += "}";
      }
      json += "}";
    }

    json += "}";
  }
  json += "],";

  // Synced profile requests
  json += "\"profileRequests\":[";
  for (int i = 0; i < requestCount; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"username\":\"" + requestList[i].username + "\",";
    json += "\"password\":\"" + requestList[i].password + "\",";
    json += "\"type\":\"" + requestList[i].type + "\",";
    json += "\"time\":[0,1440],";
    json += "\"requestedAt\":\"" + requestList[i].requestedAt + "\"";
    json += "}";
  }
  json += "],";

  // Room transfers
  json += "\"roomTransfers\":[";
  if (pendingTransferId.length() > 0) {
    json += "{";
    json += "\"id\":\"" + pendingTransferId + "\",";
    json += "\"requestType\":\"" + (pendingType.length() > 0 ? pendingType : "transfer") + "\",";
    json += "\"fromUsername\":\"" + pendingFromUser + "\",";
    json += "\"fromUserRole\":\"user\",";
    json += "\"toUsername\":\"" + pendingToUser + "\",";
    json += "\"doorName\":\"Laboratory SmartLock #1\",";
    json += "\"timestamp\":\"Just now\",";
    json += "\"timestampMs\":" + String(millis()) + ",";
    json += "\"notes\":\"" + pendingNotes + "\",";
    json += "\"status\":\"" + (pendingStatus.length() > 0 ? pendingStatus : "pending") + "\"";
    json += "}";
  }
  json += "],";

  // Schedule Access Requests (Lab Notes)
  json += "\"labNotes\":[";
  for (int i = 0; i < labNoteCount; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"id\":\"" + labNoteList[i].id + "\",";
    json += "\"username\":\"" + labNoteList[i].username + "\",";
    json += "\"title\":\"" + labNoteList[i].title + "\",";
    json += "\"date\":\"" + labNoteList[i].date + "\",";
    json += "\"time\":\"" + labNoteList[i].time + "\",";
    json += "\"purpose\":\"" + labNoteList[i].purpose + "\",";
    json += "\"status\":\"" + labNoteList[i].status + "\"";
    json += "}";
  }
  json += "],";

  json += "\"timestamp\":" + String(millis());
  json += "}";
  return json;
}

// -------------------------------------------------------------
// Lock Hardware Transition
// -------------------------------------------------------------
void triggerLockToggle(String user = "Administrator") {
  unsigned long timeElapsed = millis();
  if (timeElapsed - lastPressTime < pressDelay) return;
  if (changing) return;

  lastPressTime = timeElapsed;
  lastActingUser = user;

  if (isLocked) {
    // Currently LOCKED -> Begin UNLOCKING
    changing = true;
    lockOperation = "unlocking";
    isLocked = false; // Target is unlocked
    remainingTime = closingCount;
    totalDuration = closingCount;
    lockCounter = 0;
    lockProgress = 0;

    // Run motor forward / open direction
    digitalWrite(FORWARD_OUTPUT, HIGH);
    digitalWrite(BACKWARD_OUTPUT, LOW);
    digitalWrite(LIMIT_OUTPUT, HIGH);
    digitalWrite(LED_BUILTIN, HIGH); // LED OFF

    lcd.setCursor(0, 0);
    lcd.print("LOCK STATUS:    ");
    lcd.setCursor(0, 1);
    lcd.print("UNLOCKING...    ");
  } else {
    // Currently UNLOCKED -> Begin LOCKING
    changing = true;
    lockOperation = "locking";
    isLocked = true; // Target is locked
    remainingTime = openingCount;
    totalDuration = openingCount;
    lockCounter = 0;
    lockProgress = 0;

    // Run motor backward / close direction
    digitalWrite(FORWARD_OUTPUT, LOW);
    digitalWrite(BACKWARD_OUTPUT, HIGH);
    digitalWrite(LIMIT_OUTPUT, HIGH);
    digitalWrite(LED_BUILTIN, LOW); // LED ON

    lcd.setCursor(0, 0);
    lcd.print("LOCK STATUS:    ");
    lcd.setCursor(0, 1);
    lcd.print("LOCKING...      ");
  }

  // Broadcast initial progress and countdown to all connected apps
  sprintf(lockCounterChar, "%d", remainingTime);
  ws.textAll(lockCounterChar);
  ws.textAll(buildSyncJson());
}

// -------------------------------------------------------------
// Room Transfer Handler
// -------------------------------------------------------------
void handleRoomTransfer(String msg) {
  String subType = extractJsonString(msg, "subType");

  if (subType == "transfer" || subType == "request") {
    pendingTransferId = extractJsonString(msg, "transferId");
    if (pendingTransferId.length() == 0) {
      pendingTransferId = "xfer-" + String(millis());
    }
    pendingType = subType;
    pendingFromUser = extractJsonString(msg, "fromUsername");
    pendingToUser = extractJsonString(msg, "toUsername");
    pendingNotes = extractJsonString(msg, "notes");
    pendingStatus = "pending";
    pendingTimestamp = millis();

    lcd.setCursor(0, 0);
    lcd.print("ROOM TRANSFER:  ");
    lcd.setCursor(0, 1);
    String line = (subType == "request" ? "REQ: " : "XFER: ") + pendingFromUser + "        ";
    lcd.print(line.substring(0, 16));
  } 
  else if (subType == "respond") {
    String acceptStr = extractJsonString(msg, "accept");
    bool accept = (acceptStr == "true" || acceptStr == "1");

    if (accept) {
      pendingStatus = "accepted";
      if (pendingType == "request") {
        activeRoomHolder = pendingFromUser;
      } else {
        activeRoomHolder = pendingToUser;
      }
      saveStateToFS();

      lcd.setCursor(0, 0);
      lcd.print("ACCESS GRANTED: ");
      lcd.setCursor(0, 1);
      String line = activeRoomHolder + "                ";
      lcd.print(line.substring(0, 16));
    } else {
      pendingStatus = "declined";
      lcd.setCursor(0, 0);
      lcd.print("REQ DECLINED    ");
    }
  } 
  else if (subType == "dismiss") {
    pendingTransferId = "";
    pendingStatus = "";
  }
}

// -------------------------------------------------------------
// Emergency Override Handler
// -------------------------------------------------------------
void handleEmergency(String msg) {
  String user = extractJsonString(msg, "username");

  lcd.setCursor(0, 0);
  lcd.print("EMERGENCY ALERT!");
  lcd.setCursor(0, 1);
  lcd.print("OVERRIDE UNLOCK ");

  activeRoomHolder = (user.length() > 0 ? user : "EMERGENCY");
  
  if (isLocked) {
    // If currently locked, unlock immediately
    triggerLockToggle(activeRoomHolder);
  }
}

// -------------------------------------------------------------
// WebSocket Event Handler
// -------------------------------------------------------------
String wsIncomingBuffer = "";

void onEvent(AsyncWebSocket * server, AsyncWebSocketClient * client, AwsEventType type, void * arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    os_printf("Client #%u connected to SmartLock\n", client->id());
    client->text(buildSyncJson());
    client->ping();
  } 
  else if (type == WS_EVT_DISCONNECT) {
    os_printf("Client #%u disconnected\n", client->id());
  } 
  else if (type == WS_EVT_DATA) {
    AwsFrameInfo * info = (AwsFrameInfo*)arg;
    if (info->opcode == WS_TEXT) {
      if (info->index == 0) {
        wsIncomingBuffer = "";
      }
      for (size_t i = 0; i < len; i++) {
        wsIncomingBuffer += (char)data[i];
      }

      if (info->final || (info->index + len >= info->len)) {
        String msg = wsIncomingBuffer;
        wsIncomingBuffer = "";
        msg.trim();
        if (msg.length() == 0) return;

        // Update user presence whenever a message with username arrives
        String senderUser = extractJsonString(msg, "username");
        if (senderUser.length() > 0) {
          updateUserHeartbeat(senderUser, true);
        }

        // 1. Periodic poll or auth sync from app
        if (msg.indexOf("\"type\":\"POLL_REQUEST\"") >= 0 || msg == "update") {
          client->text(buildSyncJson());
          return;
        }

      // User presence status (login/logout/heartbeat)
      if (msg.indexOf("\"type\":\"USER_PRESENCE\"") >= 0) {
        String u = extractJsonString(msg, "username");
        String stat = extractJsonString(msg, "status");
        if (u.length() > 0) {
          updateUserHeartbeat(u, stat != "offline");
          ws.textAll(buildSyncJson());
        }
        return;
      }

      // 2. Direct Register request from AuthScreen
      if (msg.indexOf("\"type\":\"REGISTER_REQUEST\"") >= 0) {
        String u = extractJsonString(msg, "username");
        String p = extractJsonString(msg, "password");
        if (u.length() > 0 && p.length() > 0) {
          addRequest(u, p, "user");
          ws.textAll(buildSyncJson());
        }
        return;
      }

      // 3. Lock / Unlock action from app
      if (msg == "toggle" || msg.indexOf("\"type\":\"LOCK_ACTION\"") >= 0 || msg.indexOf("\"action\":\"toggle\"") >= 0) {
        String username = extractJsonString(msg, "username");
        if (username.length() == 0) username = "User";
        triggerLockToggle(username);
        return;
      }

      // 4. Room Transfer action
      if (msg.indexOf("\"type\":\"ROOM_TRANSFER_ACTION\"") >= 0) {
        handleRoomTransfer(msg);
        ws.textAll(buildSyncJson());
        return;
      }

      // 5. Emergency action
      if (msg.indexOf("\"type\":\"EMERGENCY_ACTION\"") >= 0) {
        handleEmergency(msg);
        ws.textAll(buildSyncJson());
        return;
      }

      // 6. Data Update action (users, requests, schedules, approvals)
      if (msg.indexOf("\"type\":\"DATA_UPDATE_ACTION\"") >= 0) {
        String entity = extractJsonString(msg, "entity");
        String action = extractJsonString(msg, "action");

        if (entity == "profileRequests") {
          if (action == "create") {
            String u = extractJsonString(msg, "username");
            String p = extractJsonString(msg, "password");
            if (u.length() > 0 && p.length() > 0) {
              addRequest(u, p, "user");
            }
          } else if (action == "approve") {
            String u = extractJsonString(msg, "username");
            String p = extractJsonString(msg, "password");
            String t = extractJsonString(msg, "type");
            if (u.length() > 0) {
              approveRequest(u, p, t);
            }
          } else if (action == "reject") {
            String u = extractJsonString(msg, "username");
            if (u.length() > 0) {
              rejectRequest(u);
            }
          }
        } else if (entity == "profiles") {
          if (action == "create") {
            String u = extractJsonString(msg, "username");
            String p = extractJsonString(msg, "password");
            String t = extractJsonString(msg, "type");
            String perm = extractJsonString(msg, "permission");
            if (u.length() > 0) {
              addUser(u, p.length() > 0 ? p : "user", t.length() > 0 ? t : "user", perm.length() > 0 ? perm : "Standard User Access");
            }
          } else if (action == "update_avatar") {
            String u = extractJsonString(msg, "username");
            String av = extractJsonString(msg, "avatarUrl");
            if (u.length() > 0 && av.length() > 0) {
              for (int i = 0; i < userCount; i++) {
                if (userList[i].username.equalsIgnoreCase(u)) {
                  userList[i].avatarUrl = av;
                  saveAvatarToFS(u, av);
                  break;
                }
              }
            }
          } else if (action == "update") {
            String u = extractJsonString(msg, "username");
            String p = extractJsonString(msg, "password");
            String av = extractJsonString(msg, "avatarUrl");
            if (u.length() > 0) {
              for (int i = 0; i < userCount; i++) {
                if (userList[i].username.equalsIgnoreCase(u)) {
                  if (p.length() > 0) userList[i].password = p;
                  if (av.length() > 0) {
                    userList[i].avatarUrl = av;
                    saveAvatarToFS(u, av);
                  }
                  saveUsersToFS();
                  break;
                }
              }
            }
          } else if (action == "delete") {
            String u = extractJsonString(msg, "username");
            if (u.length() > 0) {
              removeUser(u);
            }
          }
        } else if (entity == "schedules") {
          if (action == "create" || action == "update") {
            String sId = extractJsonString(msg, "id");
            String sLbl = extractJsonString(msg, "label");
            String sRole = extractJsonString(msg, "role");
            String sTime = extractJsonString(msg, "time");
            String sDays = extractDaysString(msg);
            String sStart = extractJsonString(msg, "startTime");
            String sEnd = extractJsonString(msg, "endTime");
            String sStat = extractJsonString(msg, "status");
            String sDayConfigs = extractDayConfigsJson(msg);
            if (sId.length() == 0) sId = String(millis());
            if (sRole.length() == 0) sRole = "user";
            if (sStat.length() == 0) sStat = "active";
            addOrUpdateSchedule(sId, sLbl, sRole, sTime, sDays, sStart, sEnd, sStat, sDayConfigs);
          } else if (action == "delete") {
            String sId = extractJsonString(msg, "id");
            String sLbl = extractJsonString(msg, "label");
            if (sId.length() > 0) {
              removeSchedule(sId);
            }
            if (sLbl.length() > 0) {
              removeScheduleByLabel(sLbl);
            }
          }
        } else if (entity == "labNotes") {
          if (action == "create" || action == "update") {
            String nId = extractJsonString(msg, "id");
            String nUser = extractJsonString(msg, "username");
            String nTitle = extractJsonString(msg, "title");
            String nDate = extractJsonString(msg, "date");
            String nTime = extractJsonString(msg, "time");
            String nPurpose = extractJsonString(msg, "purpose");
            String nStatus = extractJsonString(msg, "status");
            if (nId.length() == 0) nId = "note-" + String(millis());
            if (nStatus.length() == 0) nStatus = "confirmed";
            addOrUpdateLabNote(nId, nUser, nTitle, nDate, nTime, nPurpose, nStatus);
          } else if (action == "delete") {
            String nId = extractJsonString(msg, "id");
            if (nId.length() > 0) {
              removeLabNote(nId);
            }
          }
        }

        // Broadcast updated state & users & schedules & requests to all devices
        ws.textAll(buildSyncJson());
        return;
      }
    }
  }
}

// -------------------------------------------------------------
// Arduino setup()
// -------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  pinMode(LED_BUILTIN, OUTPUT);
  pinMode(FORWARD_OUTPUT, OUTPUT);
  pinMode(BACKWARD_OUTPUT, OUTPUT);
  pinMode(LIMIT_OUTPUT, OUTPUT);

  // Set motor outputs initially HIGH (inactive for active-low drivers)
  digitalWrite(FORWARD_OUTPUT, HIGH);
  digitalWrite(BACKWARD_OUTPUT, HIGH);
  digitalWrite(LIMIT_OUTPUT, HIGH);
  digitalWrite(LED_BUILTIN, HIGH);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("SMARTLOCK UNIT  ");
  lcd.setCursor(0, 1);
  lcd.print("BOOTING...      ");

  // Initialize LittleFS, load state & users & schedules & lab notes
  if (LittleFS.begin()) {
    loadStateFromFS();
    loadUsersFromFS();
    loadRequestsFromFS();
    loadSchedulesFromFS();
    loadLabNotesFromFS();
  } else {
    Serial.println("LittleFS mount error");
    initDefaultUsers();
    initDefaultSchedules();
  }

  // Setup Wi-Fi SoftAP
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  delay(1000);
  myIP = WiFi.softAPIP();

  Serial.print("SmartLock AP Ready. IP: ");
  Serial.println(myIP);

  // Attach WebSocket & EventSource
  ws.onEvent(onEvent);
  server.addHandler(&ws);
  server.addHandler(&events);

  // Serve LittleFS web files
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (LittleFS.exists("/index.html")) {
      request->send(LittleFS, "/index.html", "text/html");
    } else {
      request->send(200, "text/plain", "SmartLock ESP8266 WebSocket Server Ready at ws://" + myIP.toString() + "/ws");
    }
  });
  server.serveStatic("/", LittleFS, "/");

  server.begin();

  // Initial LCD update
  lcd.setCursor(0, 0);
  lcd.print("LOCK STATUS:    ");
  lcd.setCursor(0, 1);
  if (isLocked) {
    lcd.print("LOCKED          ");
  } else {
    lcd.print("UNLOCKED        ");
  }
}

// -------------------------------------------------------------
// Arduino loop()
// -------------------------------------------------------------
void loop() {
  unsigned long timeElapsed = millis();

  // Every 1 second: handle movement timing, countdown, and LCD display
  if (timeElapsed - lastSecondTime >= secondDuration) {
    lastSecondTime = timeElapsed;

    if (changing) {
      if (lockOperation == "unlocking") {
        // UNLOCKING transition
        lcd.setCursor(0, 0);
        lcd.print("LOCK STATUS:    ");
        lcd.setCursor(0, 1);
        lcd.print("UNLOCKING...    ");

        remainingTime = closingCount - lockCounter;
        lockProgress = (lockCounter * 100) / closingCount;

        if (lockCounter >= closingCount) {
          changing = false;
          lockOperation = "idle";
          isLocked = false;
          lockCounter = 0;
          lockProgress = 100;
          remainingTime = 0;

          // Stop motors
          digitalWrite(FORWARD_OUTPUT, HIGH);
          digitalWrite(BACKWARD_OUTPUT, HIGH);
          digitalWrite(LIMIT_OUTPUT, LOW);

          if (lastActingUser.length() > 0) {
            activeRoomHolder = lastActingUser;
          } else {
            activeRoomHolder = "Administrator";
          }
          saveStateToFS();

          lcd.setCursor(0, 0);
          lcd.print("LOCK STATUS:    ");
          lcd.setCursor(0, 1);
          String line = "UNLOCKED: " + activeRoomHolder + "                ";
          lcd.print(line.substring(0, 16));

          // Broadcast state completion to all connected clients
          ws.textAll(buildSyncJson());
        }
      } else {
        // LOCKING transition
        lcd.setCursor(0, 0);
        lcd.print("LOCK STATUS:    ");
        lcd.setCursor(0, 1);
        lcd.print("LOCKING...      ");

        remainingTime = openingCount - lockCounter;
        lockProgress = (lockCounter * 100) / openingCount;

        if (lockCounter >= openingCount) {
          changing = false;
          lockOperation = "idle";
          isLocked = true;
          lockCounter = 0;
          lockProgress = 100;
          remainingTime = 0;

          // Stop motors
          digitalWrite(FORWARD_OUTPUT, HIGH);
          digitalWrite(BACKWARD_OUTPUT, HIGH);
          digitalWrite(LIMIT_OUTPUT, LOW);

          // Invalidate room holder and pending transfers upon locking
          activeRoomHolder = "";
          pendingTransferId = "";
          saveStateToFS();

          lcd.setCursor(0, 0);
          lcd.print("LOCK STATUS:    ");
          lcd.setCursor(0, 1);
          lcd.print("LOCKED          ");

          // Broadcast state completion to all connected clients
          ws.textAll(buildSyncJson());
        }
      }

      if (changing) {
        lockCounter += 1;
        sprintf(lockCounterChar, "%d", remainingTime);
        // Broadcast both raw countdown and full sync state
        ws.textAll(lockCounterChar);
        ws.textAll(buildSyncJson());
      }
    } else {
      // Idle state LCD refresh (every 3 seconds)
      static int idleCounter = 0;
      idleCounter++;
      if (idleCounter >= 3) {
        idleCounter = 0;
        if (!isLocked) {
          lcd.setCursor(0, 0);
          String line0 = "HOLDER: " + (activeRoomHolder.length() > 0 ? activeRoomHolder : "OPEN") + "                ";
          lcd.print(line0.substring(0, 16));

          lcd.setCursor(0, 1);
          String line1 = "IP: " + myIP.toString() + "                ";
          lcd.print(line1.substring(0, 16));
        } else {
          lcd.setCursor(0, 0);
          lcd.print("LOCK STATUS:    ");
          lcd.setCursor(0, 1);
          lcd.print("LOCKED          ");
        }
      }
    }
  }

  // Clean up any stale WebSocket clients
  ws.cleanupClients();
}
