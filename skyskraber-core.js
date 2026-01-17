// ==UserScript==
// @name         Skyskraber Core
// @namespace    local.skyskraber.core
// @version      1.0.0
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
  let indicatorLabel = "";
  let indicatorColor = "#555";
  let indicatorExpanded = false;

  const messageListeners = [];
  const sendListeners = [];
  const indicatorButtons = []; // { label, callback }

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

    indicator.addEventListener("click", () => {
      indicatorExpanded = !indicatorExpanded;
      renderIndicator();
    });

    canvas.parentElement.appendChild(indicator);
  }

  function renderIndicator() {
    if (!indicator) return;

    if (indicatorExpanded) {
      // Expanded view with buttons
      indicator.style.cssText = `
        position: fixed;
        top: 5px;
        left: 5px;
        padding: 5px;
        font: 600 8px Arial, sans-serif;
        border-radius: 5px;
        color: white;
        cursor: pointer;
        z-index: 9999;
        user-select: none;
        background: ${indicatorColor};
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 100px;
      `;

      indicator.innerHTML = `
        <div style="text-align: center; padding-bottom: 3px; border-bottom: 1px solid rgba(255,255,255,0.3); cursor: pointer;" class="core-indicator-header">${indicatorLabel}</div>
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
      indicator.querySelector(".core-indicator-header").addEventListener("click", (e) => {
        e.stopPropagation();
        indicatorExpanded = false;
        renderIndicator();
      });
    } else {
      // Collapsed view
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
        background: ${indicatorColor};
      `;
      indicator.textContent = indicatorLabel;
    }
  }

  /******************************************************************
   * PUBLIC API
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
     * Update the indicator color and label
     * @param {string} label - Text to display
     * @param {string} color - CSS color value
     * @param {boolean} visible - Whether to show the indicator
     */
    updateIndicator(label, color, visible = true) {
      if (!indicator) return;
      indicatorLabel = label;
      indicatorColor = color;
      indicator.style.display = visible ? "" : "none";
      if (!indicatorExpanded) {
        renderIndicator();
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
   * INIT
   ******************************************************************/
  async function start() {
    await waitForCanvas();
    createIndicator();
    window.SkyskraberCore.updateIndicator("Core", "#555", true);
  }

  start();
})();
