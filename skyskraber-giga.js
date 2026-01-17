// ==UserScript==
// @name         Skyskraber Giga
// @namespace    local.skyskraber.giga
// @version      1.0.0
// @description  Arrow navigation + auto-move to items with navigation freeze
// @match        https://www.skyskraber.dk/chat*
// @match        https://skyskraber.dk/chat*
// @run-at       document-start
// @require      file:///c:/Users/brunk/Documents/Skyskraber/skyskraber-core.js
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  let arrowsEnabled = false;
  let roomExits = {};

  let currentRoomId = null;
  let navigationFrozen = false;
  let activeItem = null;

  /******************************************************************
   * INITIALIZATION - Wait for Core
   ******************************************************************/
  async function waitForCore() {
    while (!window.SkyskraberCore) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  /******************************************************************
   * DOOR → ARROW MAPPING (SCREEN-RELATIVE)
   ******************************************************************/
  function extractScreenRelativeExits(fields) {
    const doors = fields.filter(f => f.state === "door" && typeof f.goto === "number");
    if (!doors.length) return {};

    const xs = fields.map(f => f.x);
    const ys = fields.map(f => f.y);

    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

    const exits = {};

    for (const door of doors) {
      const dx = door.x - centerX;
      const dy = door.y - centerY;

      if (Math.abs(dx) > Math.abs(dy)) {
        dx < 0 ? exits.ArrowLeft = door.goto : exits.ArrowRight = door.goto;
      } else {
        dy < 0 ? exits.ArrowUp = door.goto : exits.ArrowDown = door.goto;
      }
    }

    return exits;
  }

  /******************************************************************
   * MOVEMENT
   ******************************************************************/
  function moveTo(x, y) {
    if (!window.SkyskraberCore.isConnected()) return;
    window.SkyskraberCore.send({
      type: "move",
      data: { x, y }
    });
  }

  /******************************************************************
   * HOTKEYS
   ******************************************************************/
  document.addEventListener("keydown", e => {
    if (!arrowsEnabled || navigationFrozen || !window.SkyskraberCore.isConnected()) return;

    const targetRoom = roomExits[e.key];
    if (!targetRoom) return;

    window.SkyskraberCore.send({
      type: "goto",
      data: { room: targetRoom }
    });

    e.preventDefault();
  });

  /******************************************************************
   * INIT
   ******************************************************************/
  async function start() {
    await waitForCore();

    // Listen for outgoing messages
    window.SkyskraberCore.onSend((msg) => {
      if (msg?.type === "goto") {
        // Manual room change always unfreezes navigation
        navigationFrozen = false;
        activeItem = null;
      }
    });

    // Listen for incoming messages
    window.SkyskraberCore.onMessage((msg) => {
      /******** ROOM ENTRY ********/
      if (msg?.room?.id) {
        currentRoomId = msg.room.id;
        navigationFrozen = false;
        activeItem = null;
      }

      if (msg?.room?.fields) {
        arrowsEnabled = true;
        roomExits = extractScreenRelativeExits(msg.room.fields);
      }

      /******** ITEM APPEARS ********/
      if (msg?.items?.updates && !activeItem) {
        const item = msg.items.updates.find(i => i.roomId === currentRoomId);
        if (item) {
          activeItem = { id: item.id, x: item.x, y: item.y };
          navigationFrozen = true;
          moveTo(item.x, item.y);
        }
      }

      /******** ITEM REMOVED ********/
      if (msg?.items?.removes && activeItem) {
        for (const removed of msg.items.removes) {
          if (removed === `item-${activeItem.id}`) {
            activeItem = null;
            navigationFrozen = false;
          }
        }
      }
    });
  }

  start();
})();
