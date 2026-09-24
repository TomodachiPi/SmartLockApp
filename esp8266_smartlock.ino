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
};

struct SmartLockRequest {
  String username;
  String password;
  String type;
  String requestedAt;
};

const int MAX_USERS = 20;
const int MAX_REQUESTS = 20;

SmartLockUser userList[MAX_USERS];
int userCount = 0;

SmartLockRequest requestList[MAX_REQUESTS];
int requestCount = 0;

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
void initDefaultUsers() {
  userCount = 0;
  // Default Admin
  userList[userCount++] = { "Administrator", "admin123", "admin", "Admin Privilege" };
  // Default Standard User (Sarah_Chen and Alex_Rivera removed)
  userList[userCount++] = { "User123test", "user", "user", "Standard User Access" };
}

void saveUsersToFS() {
  File f = LittleFS.open("/users.txt", "w");
  if (f) {
    for (int i = 0; i < userCount; i++) {
      f.println(userList[i].username + "\t" + userList[i].password + "\t" + userList[i].type + "\t" + userList[i].permission);
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

      userList[userCount++] = { u, p, t, perm };
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
    }
    userCount--;
    saveUsersToFS();
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

  // Synced profiles
  json += "\"profiles\":[";
  for (int i = 0; i < userCount; i++) {
    if (i > 0) json += ",";
    json += "{";
    json += "\"username\":\"" + userList[i].username + "\",";
    json += "\"password\":\"" + userList[i].password + "\",";
    json += "\"type\":\"" + userList[i].type + "\",";
    json += "\"avatarUrl\":\"/images/user.png\",";
    json += "\"permission\":\"" + userList[i].permission + "\",";
    json += "\"time\":[0,1440],";
    json += "\"isOnline\":false,";
    json += "\"lastActive\":\"Active\"";
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
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
      data[len] = 0;
      String msg = String((char*)data);
      msg.trim();

      // 1. Periodic poll or auth sync from app
      if (msg.indexOf("\"type\":\"POLL_REQUEST\"") >= 0 || msg == "update") {
        client->text(buildSyncJson());
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
          } else if (action == "update") {
            String u = extractJsonString(msg, "username");
            String p = extractJsonString(msg, "password");
            if (u.length() > 0 && p.length() > 0) {
              for (int i = 0; i < userCount; i++) {
                if (userList[i].username.equalsIgnoreCase(u)) {
                  userList[i].password = p;
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
        }

        // Broadcast updated state & users to all devices
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

  // Initialize LittleFS, load state & users
  if (LittleFS.begin()) {
    loadStateFromFS();
    loadUsersFromFS();
    loadRequestsFromFS();
  } else {
    Serial.println("LittleFS mount error");
    initDefaultUsers();
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
