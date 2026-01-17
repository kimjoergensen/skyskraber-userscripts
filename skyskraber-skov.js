// ==UserScript==
// @name         Skyskraber Skov
// @namespace    local.skyskraber.skov
// @version      1.0.0
// @description  Automatic maze exploration and pathfinding for Kontamineret skov
// @match        https://www.skyskraber.dk/chat*
// @match        https://skyskraber.dk/chat*
// @run-at       document-start
// @require      https://update.greasyfork.org/scripts/563000/Skyskraber%20Core.user.js
// @require      https://update.greasyfork.org/scripts/563002/Skyskraber%20Giga.user.js
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  const START_ROOM = 300; // Kontamineret skov - Indgang
  const EXCLUDED_ROOMS = new Set([350, 351]); // Dr. Grøns Laboratorie, Bunkeren

  let roomGraph = {}; // { roomId: { name, exits: { direction: targetRoomId } } }
  let discoveredRooms = new Set();
  let currentRoomId = null;
  let explorationComplete = false;
  let optimalPath = [];
  let pathIndex = 0;
  let isExecutingPath = false;
  let explorationInProgress = false;
  let enabled = true;

  const STORAGE_SKOV_ENABLED = "SKOV_ENABLED";
  const STORAGE_SKOV_PATH = "SKOV_PATH";
  const STORAGE_SKOV_GRAPH = "SKOV_GRAPH";

  /******************************************************************
   * INITIALIZATION - Wait for Core
   ******************************************************************/
  async function waitForCore() {
    while (!window.SkyskraberCore) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  /******************************************************************
   * ROOM GRAPH MANAGEMENT
   ******************************************************************/
  function trackRoom(roomId, roomName, fields) {
    if (!roomId || EXCLUDED_ROOMS.has(roomId)) return;

    discoveredRooms.add(roomId);

    const doors = fields.filter(f => f.state === "door" && typeof f.goto === "number");
    if (!doors.length) {
      roomGraph[roomId] = roomGraph[roomId] || { name: roomName, exits: {} };
      return;
    }

    const xs = fields.map(f => f.x);
    const ys = fields.map(f => f.y);
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    const exits = {};

    for (const door of doors) {
      const dx = door.x - centerX;
      const dy = door.y - centerY;
      let direction;

      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx < 0 ? "ArrowLeft" : "ArrowRight";
      } else {
        direction = dy < 0 ? "ArrowUp" : "ArrowDown";
      }

      if (!EXCLUDED_ROOMS.has(door.goto)) {
        exits[direction] = door.goto;
      }
    }

    roomGraph[roomId] = { name: roomName, exits };
  }

  /******************************************************************
   * MAZE EXPLORATION
   ******************************************************************/
  async function exploreMaze() {
    explorationInProgress = true;
    const toVisit = [START_ROOM];
    const visited = new Set();

    while (toVisit.length > 0 && explorationInProgress) {
      const roomId = toVisit.shift();
      if (visited.has(roomId) || EXCLUDED_ROOMS.has(roomId)) continue;

      visited.add(roomId);

      if (roomId !== currentRoomId) {
        window.SkyskraberCore.send({
          type: "goto",
          data: { room: roomId }
        });
        await new Promise(r => setTimeout(r, 1500)); // Wait for room data to arrive
      }

      // Add undiscovered exits to visit queue
      if (roomGraph[roomId]) {
        for (const targetRoom of Object.values(roomGraph[roomId].exits)) {
          if (!visited.has(targetRoom) && !EXCLUDED_ROOMS.has(targetRoom)) {
            toVisit.push(targetRoom);
          }
        }
      }
    }

    explorationComplete = true;
    explorationInProgress = false;
    console.log("Maze exploration complete!", roomGraph);
  }

  /******************************************************************
   * PATHFINDING - Nearest Neighbor TSP Approximation
   ******************************************************************/
  function calculateOptimalPath() {
    if (Object.keys(roomGraph).length === 0) return [];

    const rooms = Array.from(discoveredRooms);
    const n = rooms.length;

    // Build distance matrix (using BFS)
    const distances = {};
    for (const start of rooms) {
      distances[start] = {};
      const queue = [[start, 0]];
      const visited = new Set([start]);

      while (queue.length > 0) {
        const [roomId, dist] = queue.shift();
        distances[start][roomId] = dist;

        if (roomGraph[roomId]) {
          for (const nextRoom of Object.values(roomGraph[roomId].exits)) {
            if (!visited.has(nextRoom)) {
              visited.add(nextRoom);
              queue.push([nextRoom, dist + 1]);
            }
          }
        }
      }
    }

    // Nearest neighbor TSP
    const path = [START_ROOM];
    const visited = new Set([START_ROOM]);
    let current = START_ROOM;

    while (visited.size < rooms.length) {
      let nearest = null;
      let nearestDist = Infinity;

      for (const room of rooms) {
        if (!visited.has(room) && distances[current] && distances[current][room] < nearestDist) {
          nearest = room;
          nearestDist = distances[current][room];
        }
      }

      if (nearest === null) break;
      path.push(nearest);
      visited.add(nearest);
      current = nearest;
    }

    return path;
  }

  /******************************************************************
   * PATH EXECUTION
   ******************************************************************/
  function findPathBetweenRooms(startRoom, targetRoom) {
    // BFS to find shortest path between two rooms
    const queue = [[startRoom, [startRoom]]];
    const visited = new Set([startRoom]);

    while (queue.length > 0) {
      const [roomId, path] = queue.shift();

      if (roomId === targetRoom) {
        return path;
      }

      if (roomGraph[roomId]) {
        for (const nextRoom of Object.values(roomGraph[roomId].exits)) {
          if (!visited.has(nextRoom)) {
            visited.add(nextRoom);
            queue.push([nextRoom, [...path, nextRoom]]);
          }
        }
      }
    }

    return []; // No path found
  }

  async function executePath() {
    if (optimalPath.length === 0) {
      console.log("No path to execute");
      return;
    }

    isExecutingPath = true;

    while (isExecutingPath) {
      for (let i = 0; i < optimalPath.length; i++) {
        if (!isExecutingPath) break;

        const targetRoom = optimalPath[i];
        const pathToRoom = findPathBetweenRooms(currentRoomId, targetRoom);

        for (const roomId of pathToRoom.slice(1)) {
          if (!isExecutingPath) break;

          window.SkyskraberCore.send({
            type: "goto",
            data: { room: roomId }
          });

          await new Promise(r => setTimeout(r, 1000)); // Wait between moves
        }
      }
    }
  }

  /******************************************************************
   * INDICATOR
   ******************************************************************/
  function updateSkovIndicator() {
    // No longer needed - Core always shows status via buttons
  }

  /******************************************************************
   * INIT
   ******************************************************************/
  async function start() {
    await waitForCore();

    // Load enabled state
    enabled = localStorage.getItem(STORAGE_SKOV_ENABLED) !== "false";

    // Listen for incoming messages
    window.SkyskraberCore.onMessage((msg) => {
      if (msg?.room?.id) {
        currentRoomId = msg.room.id;

        if (msg?.room?.name && msg?.room?.fields && enabled) {
          trackRoom(msg.room.id, msg.room.name, msg.room.fields);
        }
      }
    });

    // Add enable/disable button
    window.SkyskraberCore.addIndicatorButton(enabled ? "Disable Skov" : "Enable Skov", () => {
      enabled = !enabled;
      localStorage.setItem(STORAGE_SKOV_ENABLED, String(enabled));
    });

    // Add indicator buttons for Skov controls
    window.SkyskraberCore.addIndicatorButton("Explore", () => {
      if (enabled && !explorationInProgress && !explorationComplete) {
        exploreMaze().then(() => {
          optimalPath = calculateOptimalPath();
          console.log("Optimal path:", optimalPath);
          localStorage.setItem(STORAGE_SKOV_PATH, JSON.stringify(optimalPath));
        });
      }
    });

    window.SkyskraberCore.addIndicatorButton("Collect", () => {
      if (enabled && explorationComplete && !isExecutingPath) {
        if (optimalPath.length === 0) {
          optimalPath = calculateOptimalPath();
        }
        executePath();
      }
    });

    window.SkyskraberCore.addIndicatorButton("Stop", () => {
      isExecutingPath = false;
    });

    // Auto-start if enabled in storage
    if (localStorage.getItem(STORAGE_SKOV_ENABLED) === "true") {
      setTimeout(() => {
        exploreMaze().then(() => {
          optimalPath = calculateOptimalPath();
          console.log("Optimal path:", optimalPath);
          localStorage.setItem(STORAGE_SKOV_PATH, JSON.stringify(optimalPath));
          executePath();
        });
      }, 500);
    }

    // Expose control functions to window for manual control
    window.SkovControls = {
      startExploration() {
        exploreMaze().then(() => {
          optimalPath = calculateOptimalPath();
          console.log("Optimal path:", optimalPath);
          localStorage.setItem(STORAGE_SKOV_PATH, JSON.stringify(optimalPath));
        });
      },
      startCollecting() {
        if (optimalPath.length === 0) {
          optimalPath = calculateOptimalPath();
        }
        executePath();
      },
      stopCollecting() {
        isExecutingPath = false;
      },
      getGraph() {
        return roomGraph;
      },
      getPath() {
        return optimalPath;
      }
    };

    console.log("Skov script loaded. Use window.SkovControls.startExploration() to start.");
  }

  start();
})();
