/**
 * Zero Headache Embeddable Widget
 *
 * Per connection-architecture.md - Layer 2: Authenticated Widget + Remote Functions
 *
 * Usage:
 * <script
 *   src="https://zeroheadache.co/widget.js"
 *   data-org-id="your-org-id"
 *   data-user-id="user_123"
 *   data-signature="HMAC_SHA256_hash"
 *   data-timestamp="1234567890"
 * ></script>
 *
 * Signature Generation (on customer server):
 * const crypto = require('crypto');
 * const signature = crypto
 *   .createHmac('sha256', WIDGET_SECRET)
 *   .update(`${userId}:${timestamp}`)
 *   .digest('hex');
 */

(function () {
  "use strict";

  // Configuration
  const API_BASE = window.ZH_API_BASE || "https://api.zeroheadache.co";

  // Get script attributes
  const script = document.currentScript;
  if (!script) {
    console.error("[ZH Widget] Could not find script element");
    return;
  }

  const config = {
    orgId: script.getAttribute("data-org-id"),
    userId: script.getAttribute("data-user-id"),
    signature: script.getAttribute("data-signature"),
    timestamp: parseInt(script.getAttribute("data-timestamp") || "0", 10),
    position: script.getAttribute("data-position") || "bottom-right",
    theme: script.getAttribute("data-theme") || "dark",
  };

  // Validate required attributes
  if (
    !config.orgId ||
    !config.userId ||
    !config.signature ||
    !config.timestamp
  ) {
    console.error(
      "[ZH Widget] Missing required attributes: data-org-id, data-user-id, data-signature, data-timestamp",
    );
    return;
  }

  // Widget state
  let sessionToken = null;
  let isOpen = false;
  let widgetContainer = null;

  // Styles
  const styles = `
    .zh-widget-launcher {
      position: fixed;
      ${config.position.includes("bottom") ? "bottom: 24px;" : "top: 24px;"}
      ${config.position.includes("right") ? "right: 24px;" : "left: 24px;"}
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #9382FF 0%, #7366CC 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(147, 130, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 999999;
    }
    .zh-widget-launcher:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 28px rgba(147, 130, 255, 0.5);
    }
    .zh-widget-launcher svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    .zh-widget-container {
      position: fixed;
      ${config.position.includes("bottom") ? "bottom: 100px;" : "top: 100px;"}
      ${config.position.includes("right") ? "right: 24px;" : "left: 24px;"}
      width: 380px;
      height: 520px;
      background: ${config.theme === "dark" ? "#080808" : "#ffffff"};
      border: 1px solid ${config.theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"};
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999998;
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .zh-widget-container.open {
      display: flex;
    }
    .zh-widget-header {
      padding: 16px 20px;
      background: ${config.theme === "dark" ? "#030014" : "#f5f5f5"};
      border-bottom: 1px solid ${config.theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"};
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .zh-widget-header-logo {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #9382FF, #7366CC);
      border-radius: 8px;
    }
    .zh-widget-header-title {
      font-size: 16px;
      font-weight: 600;
      color: ${config.theme === "dark" ? "#fff" : "#000"};
    }
    .zh-widget-header-close {
      margin-left: auto;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      opacity: 0.7;
    }
    .zh-widget-header-close:hover {
      opacity: 1;
    }
    .zh-widget-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      color: ${config.theme === "dark" ? "#e0e0e0" : "#333"};
    }
    .zh-widget-input-area {
      padding: 16px;
      border-top: 1px solid ${config.theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"};
      display: flex;
      gap: 12px;
    }
    .zh-widget-input {
      flex: 1;
      padding: 12px 16px;
      background: ${config.theme === "dark" ? "rgba(255,255,255,0.05)" : "#f0f0f0"};
      border: none;
      border-radius: 12px;
      color: ${config.theme === "dark" ? "#fff" : "#000"};
      font-size: 14px;
      outline: none;
    }
    .zh-widget-input::placeholder {
      color: ${config.theme === "dark" ? "rgba(255,255,255,0.4)" : "#999"};
    }
    .zh-widget-send {
      padding: 12px 20px;
      background: #9382FF;
      border: none;
      border-radius: 12px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .zh-widget-send:hover {
      background: #7366CC;
    }
    .zh-widget-message {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: 12px;
      max-width: 85%;
    }
    .zh-widget-message.user {
      background: #9382FF;
      color: white;
      margin-left: auto;
    }
    .zh-widget-message.agent {
      background: ${config.theme === "dark" ? "rgba(255,255,255,0.1)" : "#f0f0f0"};
    }
    .zh-widget-loading {
      text-align: center;
      padding: 40px;
    }
    .zh-widget-error {
      color: #ff6b6b;
      text-align: center;
      padding: 20px;
    }
  `;

  // Inject styles
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create widget DOM
  function createWidget() {
    // Launcher button
    const launcher = document.createElement("button");
    launcher.className = "zh-widget-launcher";
    launcher.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.2A1.5 1.5 0 0 0 4 22h.3l3.032-.892A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 0 1-4.086-1.12l-.292-.176-2.144.63.63-2.144-.176-.292A7.96 7.96 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
      </svg>
    `;
    launcher.onclick = toggleWidget;
    document.body.appendChild(launcher);

    // Widget container
    widgetContainer = document.createElement("div");
    widgetContainer.className = "zh-widget-container";
    widgetContainer.innerHTML = `
      <div class="zh-widget-header">
        <div class="zh-widget-header-logo"></div>
        <span class="zh-widget-header-title">Support</span>
        <button class="zh-widget-header-close" onclick="window.ZHWidget.close()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${config.theme === "dark" ? "#fff" : "#000"}">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="zh-widget-body" id="zh-messages">
        <div class="zh-widget-loading">Connecting...</div>
      </div>
      <div class="zh-widget-input-area">
        <input type="text" class="zh-widget-input" placeholder="Ask a question..." id="zh-input">
        <button class="zh-widget-send" onclick="window.ZHWidget.send()">Send</button>
      </div>
    `;
    document.body.appendChild(widgetContainer);

    // Enter key to send
    document
      .getElementById("zh-input")
      .addEventListener("keypress", function (e) {
        if (e.key === "Enter") window.ZHWidget.send();
      });
  }

  // Toggle widget open/close
  function toggleWidget() {
    isOpen = !isOpen;
    widgetContainer.classList.toggle("open", isOpen);
    if (isOpen && !sessionToken) {
      verifyIdentity();
    }
  }

  // Verify user identity with backend
  async function verifyIdentity() {
    const messagesEl = document.getElementById("zh-messages");

    try {
      const response = await fetch(`${API_BASE}/api/widget/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: config.userId,
          signature: config.signature,
          timestamp: config.timestamp,
          orgId: config.orgId,
        }),
      });

      const data = await response.json();

      if (data.valid && data.token) {
        sessionToken = data.token;
        messagesEl.innerHTML = `
          <div class="zh-widget-message agent">
            👋 Hi! How can I help you today?
          </div>
        `;
      } else {
        messagesEl.innerHTML = `
          <div class="zh-widget-error">
            Unable to verify identity. Please refresh the page.
          </div>
        `;
      }
    } catch (error) {
      console.error("[ZH Widget] Verification error:", error);
      messagesEl.innerHTML = `
        <div class="zh-widget-error">
          Connection failed. Please try again later.
        </div>
      `;
    }
  }

  // Send message
  async function sendMessage() {
    const input = document.getElementById("zh-input");
    const message = input.value.trim();
    if (!message || !sessionToken) return;

    const messagesEl = document.getElementById("zh-messages");

    // Add user message
    messagesEl.innerHTML += `
      <div class="zh-widget-message user">${escapeHtml(message)}</div>
    `;
    input.value = "";

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // TODO: Send to Customer Success Agent API
    // For now, show placeholder response
    setTimeout(() => {
      messagesEl.innerHTML += `
        <div class="zh-widget-message agent">
          I'm looking into that for you. One moment...
        </div>
      `;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 500);
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Public API
  window.ZHWidget = {
    open: function () {
      isOpen = true;
      widgetContainer.classList.add("open");
      if (!sessionToken) verifyIdentity();
    },
    close: function () {
      isOpen = false;
      widgetContainer.classList.remove("open");
    },
    toggle: toggleWidget,
    send: sendMessage,
    getCustomData: async function (intent, params) {
      if (!sessionToken) throw new Error("Widget not authenticated");
      const response = await fetch(`${API_BASE}/api/widget/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, intent, params }),
      });
      return response.json();
    },
  };

  // Initialize
  createWidget();
  console.log("[ZH Widget] Initialized for user:", config.userId);
})();
