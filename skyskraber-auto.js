// ==UserScript==
// @name         Skyskraber AU2
// @namespace    local.skyskraber.au2
// @version      1.0.0
// @description  Sends a message every 15 minutes while inactive
// @match        https://www.skyskraber.dk/chat*
// @match        https://skyskraber.dk/chat*
// @run-at       document-start
// @require      https://update.greasyfork.org/scripts/563000/Skyskraber%20Core.user.js
// @grant        none
// ==/UserScript==

(() => {
    "use strict";

    const CHAT_MESSAGE = "😴";
    const CHAT_INTERVAL = 15 * 60 * 1000;
    const AUTO_RESUME_MS = 3 * 60 * 1000;

    const STORAGE_OFF = "AU2_OFF";
    const STORAGE_INDICATOR = "AU2_INDICATOR_VISIBLE";

    let chatTimer = null;
    let state = "IDLE"; // IDLE | RUNNING | PAUSED | OFF
    let lastUserActionAt = Date.now();
    let au2Sending = false;

    const isOff = () => localStorage.getItem(STORAGE_OFF) === "true";
    const setOff = v => localStorage.setItem(STORAGE_OFF, String(v));
    const indicatorVisible = () => localStorage.getItem(STORAGE_INDICATOR) !== "false";

    /******************************************************************
     * INITIALIZATION - Wait for Core
     ******************************************************************/
    async function waitForCore() {
        while (!window.SkyskraberCore) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    /******************************************************************
     * CHAT
     ******************************************************************/
    function sendChat() {
        if (state !== "RUNNING" || !window.SkyskraberCore.isConnected()) return;
        au2Sending = true;
        window.SkyskraberCore.send({
            type: "chat",
            data: { message: CHAT_MESSAGE }
        });
        au2Sending = false;
    }

    function schedule(delay = CHAT_INTERVAL) {
        if (state !== "RUNNING") return;
        clearTimeout(chatTimer);
        chatTimer = setTimeout(() => {
            sendChat();
            schedule();
        }, delay);
    }

    function stopTimer() {
        clearTimeout(chatTimer);
        chatTimer = null;
    }

    /******************************************************************
     * PAUSE / RESUME
     ******************************************************************/
    function pause() {
        if (state !== "RUNNING") return;
        state = "PAUSED";
        lastUserActionAt = Date.now();
        stopTimer();
        updateIndicator();
    }

    function resume() {
        if (state !== "PAUSED" || isOff()) return;
        state = "RUNNING";
        schedule();
        updateIndicator();
    }

    setInterval(() => {
        if (state === "PAUSED" && Date.now() - lastUserActionAt >= AUTO_RESUME_MS) {
            resume();
        }
    }, 1000);

    /******************************************************************
     * INDICATOR
     ******************************************************************/
    function updateIndicator() {
        if (!indicatorVisible()) {
            window.SkyskraberCore.updateIndicator("AU2", "#555", false);
            return;
        }
        const colors = {
            "RUNNING": "#15803D",
            "PAUSED": "#FF5F15",
            "OFF": "#777",
            "IDLE": "#555"
        };
        window.SkyskraberCore.updateIndicator(`AU2: ${state}`, colors[state], true);
    }

    /******************************************************************
     * INIT
     ******************************************************************/
    async function start() {
        await waitForCore();

        // Set up indicator interactions
        window.SkyskraberCore.setupIndicatorInteraction(
            // onClick
            () => {
                const off = !isOff();
                setOff(off);
                state = off ? "OFF" : (window.SkyskraberCore.isConnected() ? "RUNNING" : "IDLE");
                off ? stopTimer() : schedule();
                updateIndicator();
            },
            // onLongPress
            () => {
                if (state === "PAUSED") {
                    resume();
                }
            }
        );

        // Listen for incoming messages
        window.SkyskraberCore.onMessage((msg) => {
            if (msg?.player?.newHour === true) {
                window.SkyskraberCore.send({ type: "hour" });
            }
        });

        // Listen for outgoing messages
        window.SkyskraberCore.onSend((msg) => {
            if (!au2Sending && state === "RUNNING") {
                if (msg?.type === "chat") pause();
                if (msg?.type === "move") pause();
                if (msg?.type === "goto") pause();
            }
        });

        state = isOff() ? "OFF" : "IDLE";
        updateIndicator();

        // Start running when connected
        const checkConnection = setInterval(() => {
            if (window.SkyskraberCore.isConnected() && state === "IDLE" && !isOff()) {
                state = "RUNNING";
                schedule();
                updateIndicator();
                clearInterval(checkConnection);
            }
        }, 100);
    }

    start();
})();
