// ==UserScript==
// @name         Skyskraber Core
// @namespace    local.skyskraber.core
// @version      1.1.0
// @description  Core module providing websocket access and indicator management
// @match        https://www.skyskraber.dk/chat*
// @match        https://skyskraber.dk/chat*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  let wsRef = null;
  let canvas = null;
  let indicator = null;
  let indicatorExpanded = false;

  const messageListeners = [];
  const sendListeners = [];
  const indicatorButtons = []; // { label, callback }

  /******************************************************************
   * PUBLIC API - Define early so modules can access it immediately
   ******************************************************************/
  window.SkyskraberCore = {
    /**
     * Register a listener for incoming websocket messages
     * @param {Function} callback - Called with (msg) for each message
     */
    onMessage(callback) {
      messageListeners.push(callback);
    },

    /**
     * Register a listener for outgoing websocket messages
     * @param {Function} callback - Called with (msg) for each sent message
     */
    onSend(callback) {
      sendListeners.push(callback);
    },

    /**
     * Send a message through the websocket
     * @param {Object} msg - The message object to send
     */
    send(msg) {
      if (!wsRef) return false;
      try {
        wsRef.send(JSON.stringify(msg));
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Add a button to the indicator control panel
     * @param {string} label - Button label
     * @param {Function} callback - Callback when button is clicked
     */
    addIndicatorButton(label, callback) {
      indicatorButtons.push({ label, callback });
    },

    /**
     * Clear all indicator buttons
     */
    clearIndicatorButtons() {
      indicatorButtons.length = 0;
    },

    /**
     * Check if websocket is connected
     */
    isConnected() {
      return wsRef !== null;
    }
  };

  /******************************************************************
   * CANVAS
   ******************************************************************/
  async function waitForCanvas() {
    while (!canvas) {
      canvas = document.querySelector("canvas[tabindex='1']");
      await new Promise(r => setTimeout(r, 300));
    }
  }

  /******************************************************************
   * WEBSOCKET HOOK
   ******************************************************************/
  (function hookWebSocketSend() {
    const nativeSend = WebSocket.prototype.send;

    WebSocket.prototype.send = function (...args) {
      try {
        if (!wsRef) {
          wsRef = this;
          attachMessageListener(wsRef);
          updateIndicatorColor();
        }

        // Notify all send listeners before the message is sent
        try {
          const msg = JSON.parse(args[0]);
          for (const listener of sendListeners) {
            listener(msg);
          }
        } catch { }
      } catch { }

      return nativeSend.call(this, ...args);
    };
  })();

  /******************************************************************
   * MESSAGE LISTENER
   ******************************************************************/
  function attachMessageListener(ws) {
    ws.addEventListener("message", e => {
      try {
        const msg = JSON.parse(e.data);

        // Notify all message listeners
        for (const listener of messageListeners) {
          listener(msg);
        }
      } catch { }
    });
  }

  /******************************************************************
   * INDICATOR
   ******************************************************************/
  function updateIndicatorColor() {
    if (!indicator) return;
    const color = wsRef ? "#15803D" : "#555";
    indicator.style.background = color;
  }

  function createIndicator() {
    indicator = document.createElement("div");
    indicator.style.cssText = `
      position: fixed;
      top: 5px;
      left: 5px;
      padding: 3px 5px;
      font: 600 8px Arial, sans-serif;
      border-radius: 5px;
      color: white;
      cursor: pointer;
      z-index: 9999;
      user-select: none;
      background: #555;
    `;
    indicator.textContent = "Core";

    canvas.parentElement.appendChild(indicator);
  }

  function setupIndicatorClickHandler() {
    if (!indicator) return;

    // Remove old listeners by cloning and replacing
    const newIndicator = indicator.cloneNode(true);
    indicator.parentElement.replaceChild(newIndicator, indicator);
    indicator = newIndicator;

    indicator.addEventListener("click", (e) => {
      if (e.target.closest(".core-indicator-header")) return; // Header handles its own click
      indicatorExpanded = !indicatorExpanded;
      renderIndicator();
    });
  }

  function renderIndicator() {
    if (!indicatorExpanded) {
      return; // Collapsed view is handled in createIndicator
    }

    if (!indicator) return;

    // Expanded view with buttons
    indicator.style.cssText = `
      position: fixed;
      top: 5px;
      left: 5px;
      padding: 5px;
      font: 600 8px Arial, sans-serif;
      border-radius: 5px;
      color: white;
      z-index: 9999;
      user-select: none;
      background: ${wsRef ? "#15803D" : "#555"};
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 100px;
    `;

    indicator.innerHTML = `
      <div style="text-align: center; padding-bottom: 3px; border-bottom: 1px solid rgba(255,255,255,0.3); cursor: pointer;" class="core-indicator-header">Core</div>
    `;

    // Add buttons
    for (let i = 0; i < indicatorButtons.length; i++) {
      const btn = indicatorButtons[i];
      const buttonEl = document.createElement("button");
      buttonEl.textContent = btn.label;
      buttonEl.style.cssText = `
        padding: 2px 4px;
        font: 600 8px Arial, sans-serif;
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.4);
        border-radius: 3px;
        color: white;
        cursor: pointer;
        transition: background 0.2s;
        font-weight: bold;
        font-size: 8px;
      `;

      buttonEl.addEventListener("mouseover", () => {
        buttonEl.style.background = "rgba(255,255,255,0.3)";
      });

      buttonEl.addEventListener("mouseout", () => {
        buttonEl.style.background = "rgba(255,255,255,0.2)";
      });

      buttonEl.addEventListener("click", (e) => {
        e.stopPropagation();
        btn.callback();
      });

      indicator.appendChild(buttonEl);
    }

    // Click header to collapse
    setTimeout(() => {
      const header = indicator.querySelector(".core-indicator-header");
      if (header) {
        header.addEventListener("click", (e) => {
          e.stopPropagation();
          indicatorExpanded = false;
          indicator.style.cssText = `
            position: fixed;
            top: 5px;
            left: 5px;
            padding: 3px 5px;
            font: 600 8px Arial, sans-serif;
            border-radius: 5px;
            color: white;
            cursor: pointer;
            z-index: 9999;
            user-select: none;
            background: ${wsRef ? "#15803D" : "#555"};
          `;
          indicator.textContent = "Core";
          setupIndicatorClickHandler();
        });
      }
    }, 0);

    setupIndicatorClickHandler();
  }

  /******************************************************************
   * INIT
   ******************************************************************/
  async function start() {
    await waitForCanvas();
    createIndicator();
  }

  start();
})();
