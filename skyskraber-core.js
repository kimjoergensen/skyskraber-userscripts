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

  const messageListeners = [];
  const sendListeners = [];

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
            position:fixed;
            top:5px;
            left:5px;
            padding:3px 5px;
            font:600 8px Arial,sans-serif;
            border-radius:5px;
            color:white;
            cursor:pointer;
            z-index:9999;
            user-select:none;
        `;

    canvas.parentElement.appendChild(indicator);
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
     * Update the indicator display
     * @param {string} label - Text to display
     * @param {string} color - CSS color value
     * @param {boolean} visible - Whether to show the indicator
     */
    updateIndicator(label, color, visible = true) {
      if (!indicator) return;
      indicator.style.display = visible ? "" : "none";
      indicator.style.background = color;
      indicator.textContent = label;
    },

    /**
     * Set up indicator interaction
     * @param {Function} onClick - Callback for single click
     * @param {Function} onLongPress - Callback for long press (800ms)
     */
    setupIndicatorInteraction(onClick, onLongPress) {
      if (!indicator) return;

      let pressTimer;
      let longPressFired = false;

      indicator.addEventListener("mousedown", () => {
        longPressFired = false;
        pressTimer = setTimeout(() => {
          if (onLongPress) onLongPress();
          longPressFired = true;
        }, 800);
      });

      indicator.addEventListener("mouseup", () => clearTimeout(pressTimer));
      indicator.addEventListener("mouseleave", () => clearTimeout(pressTimer));

      indicator.addEventListener("click", () => {
        if (longPressFired) return;
        if (onClick) onClick();
      });
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
