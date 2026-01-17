// ==UserScript==
// @name         Skyskraber Hotkeys
// @namespace    local.skyskraber.hotkeys
// @version      1.0.0
// @description  Hokteys for Skyskraber
// @match        https://www.skyskraber.dk/chat*
// @match        https://skyskraber.dk/chat*
// @run-at       document-start
// @require      https://update.greasyfork.org/scripts/563000/Skyskraber%20Core.user.js
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  let roomExits = {};
  let navigationFrozen = false;
  let enabled = true;

  const STORAGE_HOTKEYS_ENABLED = "HOTKEYS_ENABLED";

  /******************************************************************
   * INITIALIZATION - Wait for Core
   ******************************************************************/
  async function waitForCore() {
    while (!window.SkyskraberCore) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  /******************************************************************
   * STATUS
   ******************************************************************/
  function updateStatus() {
    const status = enabled ? "Enabled" : "Disabled";
    window.SkyskraberCore.updateIndicator(`Hotkeys: ${status}`, enabled ? "#0066CC" : "#777");
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
   * HOTKEYS
   ******************************************************************/
  document.addEventListener("keydown", e => {
    if (!enabled || navigationFrozen || !window.SkyskraberCore.isConnected()) return;

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

    // Load enabled state
    enabled = localStorage.getItem(STORAGE_HOTKEYS_ENABLED) !== "false";
    updateStatus();

    // Add enable/disable button
    window.SkyskraberCore.addIndicatorButton(enabled ? "Disable Hotkeys" : "Enable Hotkeys", () => {
      enabled = !enabled;
      localStorage.setItem(STORAGE_HOTKEYS_ENABLED, String(enabled));
      updateStatus();
    });

    // Listen for outgoing messages
    window.SkyskraberCore.onSend((msg) => {
      if (msg?.type === "goto") {
        // Manual room change always unfreezes navigation
        navigationFrozen = false;
      }
    });

    // Listen for incoming messages
    window.SkyskraberCore.onMessage((msg) => {
      /******** ROOM ENTRY ********/
      if (msg?.room?.id) {
        navigationFrozen = false;
      }

      if (msg?.room?.fields) {
        roomExits = extractScreenRelativeExits(msg.room.fields);
      }
    });
  }

  start();
})();
