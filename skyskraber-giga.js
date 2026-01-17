// ==UserScript==
// @name         Skyskraber Giga
// @namespace    local.skyskraber.giga
// @version      1.1.1
// @description  Auto-move to items dropped on the floor
// @match        https://www.skyskraber.dk/chat*
// @match        https://skyskraber.dk/chat*
// @run-at       document-start
// @require      https://update.greasyfork.org/scripts/563007/Skyskraber%20Core.user.js
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  let currentRoomId = null;
  let activeItem = null;
  let enabled = true;

  const STORAGE_GIGA_ENABLED = "GIGA_ENABLED";

  /******************************************************************
   * INITIALIZATION - Wait for Core
   ******************************************************************/
  async function waitForCore() {
    while (!window.SkyskraberCore) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  /******************************************************************
   * MOVEMENT
   ******************************************************************/
  function moveTo(x, y) {
    if (!enabled || !window.SkyskraberCore.isConnected()) return;
    window.SkyskraberCore.send({
      type: "move",
      data: { x, y }
    });
  }

  /******************************************************************
   * STATUS
   ******************************************************************/
  function updateStatus() {
    // No longer needed - Core always shows status via buttons
  }

  /******************************************************************
   * INIT
   ******************************************************************/
  async function start() {
    await waitForCore();

    // Load enabled state
    enabled = localStorage.getItem(STORAGE_GIGA_ENABLED) !== "false";

    // Add enable/disable button
    window.SkyskraberCore.addIndicatorButton(enabled ? "Disable Giga" : "Enable Giga", () => {
      enabled = !enabled;
      localStorage.setItem(STORAGE_GIGA_ENABLED, String(enabled));
    });

    // Listen for outgoing messages
    window.SkyskraberCore.onSend((msg) => {
      if (msg?.type === "goto") {
        // Manual room change always unfreezes navigation
        activeItem = null;
      }
    });

    // Listen for incoming messages
    window.SkyskraberCore.onMessage((msg) => {
      /******** ROOM ENTRY ********/
      if (msg?.room?.id) {
        currentRoomId = msg.room.id;
        activeItem = null;
      }

      /******** ITEM APPEARS ********/
      if (enabled && msg?.items?.updates && !activeItem) {
        const item = msg.items.updates.find(i => i.roomId === currentRoomId);
        if (item) {
          activeItem = { id: item.id, x: item.x, y: item.y };
          moveTo(item.x, item.y);
        }
      }

      /******** ITEM REMOVED ********/
      if (msg?.items?.removes && activeItem) {
        for (const removed of msg.items.removes) {
          if (removed === `item-${activeItem.id}`) {
            activeItem = null;
          }
        }
      }
    });
  }

  start();
})();
