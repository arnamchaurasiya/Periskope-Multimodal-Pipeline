/**
 * High-Density Interactive Frontend Dashboard for Periskope Multimodal Pipeline
 * Renders the WhatsApp chat timeline with live Interactive Synopsis Cards,
 * synchronized word-level audio scrubber, one-click action drawers,
 * full-text search, automation telemetry, and MCP tool inspection.
 */

export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Periskope Multimodal Intelligence Pipeline • Interactive Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-primary: #0f172a;
      --bg-surface: #1e293b;
      --bg-surface-elevated: #283548;
      --border-color: #334155;
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-green: #10b981;
      --accent-blue: #38bdf8;
      --accent-amber: #f59e0b;
      --accent-red: #ef4444;
      --accent-purple: #8b5cf6;
      --wa-chat-bg: #0b141a;
      --wa-bubble-in: #202c33;
      --wa-bubble-out: #005c4b;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Top Navigation Header */
    header {
      background-color: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      z-index: 30;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #10b981, #0284c7);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: #fff;
      font-size: 16px;
    }
    .brand-title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }
    .brand-subtitle {
      font-size: 11px;
      color: var(--text-secondary);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Global Search Box */
    .search-box-container {
      flex: 1;
      max-width: 440px;
      position: relative;
    }
    .search-input {
      width: 100%;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 8px 14px 8px 36px;
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
    }
    .search-input:focus {
      border-color: var(--accent-blue);
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 14px;
    }

    /* Telemetry Chips */
    .telemetry-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .telemetry-chip {
      background-color: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--accent-green);
      font-size: 11px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'JetBrains Mono', monospace;
    }
    .telemetry-chip.blue {
      background-color: rgba(56, 189, 248, 0.12);
      border-color: rgba(56, 189, 248, 0.3);
      color: var(--accent-blue);
    }

    /* Presets Action Bar */
    .action-presets-bar {
      background-color: #162032;
      border-bottom: 1px solid var(--border-color);
      padding: 8px 24px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
    }
    .preset-label {
      color: var(--text-secondary);
      font-weight: 500;
    }
    .btn {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background-color: var(--bg-surface-elevated);
      border-color: #475569;
    }
    .btn-primary {
      background-color: #0284c7;
      border-color: #0369a1;
      color: #fff;
    }
    .btn-primary:hover {
      background-color: #0369a1;
    }
    .btn-emerald {
      background-color: #059669;
      border-color: #047857;
      color: #fff;
    }
    .btn-emerald:hover {
      background-color: #047857;
    }

    /* Main Container (Split Columns) */
    .main-layout {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    /* Left: WhatsApp Group Chat Feed */
    .chat-section {
      flex: 1;
      background-color: var(--wa-chat-bg);
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border-color);
      position: relative;
    }
    .chat-header {
      background-color: var(--wa-bubble-in);
      padding: 10px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .chat-header-info h3 {
      font-size: 14px;
      font-weight: 600;
    }
    .chat-header-info p {
      font-size: 11px;
      color: #8696a0;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* WhatsApp Message Bubble */
    .message-bubble {
      max-width: 820px;
      background-color: var(--wa-bubble-in);
      border-radius: 8px;
      padding: 12px 16px;
      position: relative;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      border-left: 3px solid var(--accent-blue);
    }
    .message-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .sender-name {
      font-size: 12px;
      font-weight: 600;
      color: #53bdeb;
    }
    .message-time {
      font-size: 11px;
      color: #8696a0;
    }

    /* Voice Note Player */
    .audio-player-container {
      display: flex;
      align-items: center;
      gap: 12px;
      background-color: rgba(0, 0, 0, 0.25);
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
    }
    .play-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: var(--accent-green);
      color: #fff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: transform 0.1s ease;
    }
    .play-btn:active { transform: scale(0.95); }
    .audio-progress {
      flex: 1;
      height: 4px;
      background-color: #374151;
      border-radius: 2px;
      position: relative;
      cursor: pointer;
    }
    .audio-progress-bar {
      width: 0%;
      height: 100%;
      background-color: var(--accent-green);
      border-radius: 2px;
      transition: width 0.1s linear;
    }
    .audio-time-label {
      font-size: 11px;
      color: #8696a0;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Interactive Synopsis Card */
    .synopsis-card {
      background-color: #17212e;
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 8px;
      padding: 14px;
      margin-top: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .synopsis-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .synopsis-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--accent-blue);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
    }
    .badge-high {
      background-color: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .badge-critical {
      background-color: rgba(239, 68, 68, 0.25);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #ff5555;
      font-weight: 700;
    }
    .badge-medium {
      background-color: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fbbf24;
    }

    .synopsis-summary {
      font-size: 13px;
      line-height: 1.5;
      color: #e2e8f0;
      margin-bottom: 12px;
      background-color: rgba(0, 0, 0, 0.2);
      padding: 8px 12px;
      border-radius: 6px;
      border-left: 3px solid var(--accent-amber);
    }

    /* Entity Chips */
    .entity-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .entity-chip {
      background-color: #243042;
      border: 1px solid #3b4d66;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .entity-chip:hover {
      background-color: #2f3e55;
      border-color: var(--accent-blue);
    }
    .entity-chip .check {
      color: var(--accent-green);
      font-size: 12px;
    }
    .entity-chip .warning {
      color: var(--accent-amber);
      font-size: 12px;
    }

    /* Synchronized Word Scrubber */
    .transcript-toggle {
      font-size: 11px;
      color: var(--accent-blue);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 10px;
      font-weight: 500;
      user-select: none;
    }
    .transcript-box {
      background-color: #111827;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 10px;
      font-size: 12px;
      line-height: 1.8;
      margin-bottom: 12px;
      max-height: 140px;
      overflow-y: auto;
    }
    .word-token {
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background-color 0.1s ease;
      color: #cbd5e1;
    }
    .word-token:hover {
      background-color: #2563eb;
      color: #fff;
    }
    .word-token.active {
      background-color: var(--accent-green);
      color: #000;
      font-weight: 600;
    }

    /* Action Buttons in Synopsis Card */
    .synopsis-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      border-top: 1px solid var(--border-color);
      padding-top: 10px;
    }
    .action-btn {
      background-color: #1e293b;
      border: 1px solid #334155;
      color: #f8fafc;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .action-btn:hover {
      background-color: #334155;
      border-color: var(--accent-blue);
    }
    .action-btn.ticket {
      background-color: rgba(14, 165, 233, 0.15);
      border-color: rgba(14, 165, 233, 0.4);
      color: #38bdf8;
    }
    .action-btn.ticket:hover {
      background-color: rgba(14, 165, 233, 0.25);
    }
    .action-btn.reply {
      background-color: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #34d399;
    }
    .action-btn.erp {
      background-color: rgba(139, 92, 246, 0.15);
      border-color: rgba(139, 92, 246, 0.4);
      color: #c084fc;
    }

    /* Chat Composer */
    .chat-composer-bar {
      background-color: var(--wa-bubble-in);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .composer-input {
      flex: 1;
      background-color: #2a3942;
      border: none;
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
    }
    .composer-input::placeholder { color: #8696a0; }

    /* Right Column: Telemetry & MCP Inspector */
    .inspector-section {
      width: 440px;
      background-color: var(--bg-surface);
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--border-color);
      overflow-y: auto;
    }
    .inspector-header {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .inspector-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.2px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .inspector-panel {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .panel-card {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
    }
    .panel-card-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .code-block {
      background-color: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #38bdf8;
      max-height: 180px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* Slide-over Ticket Drawer */
    .drawer-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      z-index: 50;
      display: none;
      align-items: center;
      justify-content: flex-end;
    }
    .drawer-overlay.open { display: flex; }
    .drawer-content {
      width: 480px;
      height: 100%;
      background-color: var(--bg-surface);
      border-left: 1px solid var(--border-color);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      animation: slideIn 0.2s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
    }
    .drawer-close {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 20px;
      cursor: pointer;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
    }
    .form-control {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 8px 12px;
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background-color: #064e3b;
      border: 1px solid #059669;
      color: #ecfdf5;
      padding: 12px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: none;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 500;
      z-index: 100;
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>

  <!-- Top Navigation Header -->
  <header>
    <div class="brand-section">
      <div class="brand-logo">P</div>
      <div>
        <div class="brand-title">Periskope Multimodal Pipeline</div>
        <div class="brand-subtitle">Zero-Disk Audio & Vision OCR Intelligence Engine</div>
      </div>
    </div>

    <!-- Global Full-Text Search Box -->
    <div class="search-box-container">
      <span class="search-icon">🔍</span>
      <input type="text" id="globalSearchInput" class="search-input" placeholder="Search invoices, plates, E-Ways (e.g. INV-9902, MH12RN8841)...">
    </div>

    <!-- Live Telemetry Badges -->
    <div class="telemetry-group">
      <div class="telemetry-chip">
        <span>⚡</span> ZERO-DISK: 0 BYTES DISK
      </div>
      <div class="telemetry-chip blue">
        <span>⏱</span> TRANSCODE: &lt;40ms
      </div>
      <div class="telemetry-chip">
        <span>📱</span> 80 CONNECTED NUMBERS
      </div>
    </div>
  </header>

  <!-- Demo Presets Bar -->
  <div class="action-presets-bar">
    <span class="preset-label">Trigger Real-Time Ingress:</span>
    <button class="btn btn-primary" onclick="simulateVoiceNote('LOGISTICS')">
      🎙️ Simulate Driver Voice Note (BlackBuck)
    </button>
    <button class="btn btn-emerald" onclick="simulateLorryReceipt()">
      📄 Simulate Lorry Receipt Photo (Bhiwandi Hub)
    </button>
    <button class="btn" onclick="simulateVoiceNote('HEALTHCARE_INSURANCE')">
      🏥 Simulate Hospital Emergency (Plum Insurance)
    </button>
  </div>

  <!-- Main Split Layout -->
  <div class="main-layout">
    
    <!-- Left Column: WhatsApp Chat Timeline -->
    <div class="chat-section">
      <div class="chat-header">
        <div class="chat-header-info">
          <h3>Mumbai-Pune Fast Freight Ops (BlackBuck Fleet #82)</h3>
          <p>80 members • Driver Ramesh Singh, Dispatcher Vikram, Fleet Mgr Anoop</p>
        </div>
        <div style="font-size: 11px; color: var(--accent-green);">● WhatsApp Multi-Device Connected</div>
      </div>

      <!-- Messages Stream -->
      <div class="chat-messages" id="chatMessages">
        
        <!-- Welcome Message -->
        <div class="message-bubble" style="border-left-color: #64748b;">
          <div class="message-meta">
            <span class="sender-name" style="color: #94a3b8;">Periskope Automated Sentinel</span>
            <span class="message-time">10:40 AM</span>
          </div>
          <p style="font-size: 13px; color: #cbd5e1;">
            Session synced with WhatsApp companion socket. Inbound voice notes and document photos are processed in volatile RAM with zero disk writes. Click one of the simulation triggers above to begin.
          </p>
        </div>

      </div>

      <!-- Chat Composer -->
      <div class="chat-composer-bar">
        <input type="text" id="chatComposerInput" class="composer-input" placeholder="Type a message or click '[💬 Draft Quoted Reply]' in a synopsis card...">
        <button class="btn btn-primary" onclick="sendMessage()">Send</button>
      </div>
    </div>

    <!-- Right Column: Telemetry, Automation & MCP Inspector -->
    <div class="inspector-section">
      <div class="inspector-header">
        <div class="inspector-title">
          <span>🧠</span> Subsystems & Telemetry Inspector
        </div>
        <span style="font-size: 11px; color: var(--accent-blue);">api.periskope.app/mcp</span>
      </div>

      <div class="inspector-panel">
        
        <!-- Automation Rules Trigger Log -->
        <div class="panel-card">
          <div class="panel-card-title">
            <span>⚡ AUTOMATION ENGINE 2.0 (EVENT STREAM)</span>
            <span style="color: var(--accent-green);" id="rulesTriggerCount">0 Triggered</span>
          </div>
          <div class="code-block" id="automationLogBox">// Awaiting message.multimodal_analyzed events...</div>
        </div>

        <!-- Hosted MCP Tool Response Box -->
        <div class="panel-card">
          <div class="panel-card-title">
            <span>🤖 HOSTED MCP SERVER QUERY (api.periskope.app/mcp)</span>
            <button class="btn" style="padding: 2px 6px; font-size: 10px;" onclick="fetchMcpTools()">Query MCP</button>
          </div>
          <div class="code-block" id="mcpToolBox">// External AI agent query responses will display here...</div>
        </div>

        <!-- PostgreSQL tsvector Search Stats -->
        <div class="panel-card">
          <div class="panel-card-title">
            <span>🔍 POSTGRESQL TSVECTOR FTS INDEX</span>
            <span id="ftsIndexedCount">0 Indexed</span>
          </div>
          <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
            Weighted search vector: <code>setweight(summary, 'A') || setweight(transcript, 'B') || setweight(entities, 'A')</code>
          </p>
          <div class="code-block" id="ftsIndexSnippet">// Inverted index active. Try searching INV-9902 above.</div>
        </div>

      </div>
    </div>

  </div>

  <!-- Slide-Over Ticket Drawer -->
  <div class="drawer-overlay" id="ticketDrawer">
    <div class="drawer-content">
      <div class="drawer-header">
        <h3 style="font-size: 15px; font-weight: 700;">🎫 Create Dispatch Exception Ticket</h3>
        <button class="drawer-close" onclick="closeTicketDrawer()">✕</button>
      </div>

      <div class="form-group">
        <label class="form-label">Ticket Title</label>
        <input type="text" id="ticketTitle" class="form-control" value="Delivery Rejection: Truck MH-12-RN-8841 (Invoice INV-9902)">
      </div>

      <div class="form-group">
        <label class="form-label">Priority Level</label>
        <select id="ticketPriority" class="form-control">
          <option value="CRITICAL">🚨 CRITICAL (Immediate Breach Risk)</option>
          <option value="HIGH" selected>⚠️ HIGH (Gate Hold / Dispatch Delay)</option>
          <option value="MEDIUM">MEDIUM (Standard Exception)</option>
          <option value="LOW">LOW</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Extracted Alphanumeric Entities (Auto-Filled)</label>
        <input type="text" id="ticketVehicle" class="form-control" readonly style="margin-bottom: 6px;">
        <input type="text" id="ticketInvoice" class="form-control" readonly style="margin-bottom: 6px;">
        <input type="text" id="ticketEway" class="form-control" readonly>
      </div>

      <div class="form-group">
        <label class="form-label">Assignee Queue</label>
        <select class="form-control">
          <option>Priority Fleet Dispatchers (BlackBuck Hub)</option>
          <option>Emergency Pre-Auth Medical Team (Plum)</option>
          <option>General Support Operations</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Internal Operations Note</label>
        <textarea id="ticketNotes" class="form-control" rows="3">Inbound driver voice note reports delivery rejection at Gate #3 due to missing physical E-Way bill printout. Digital copy required immediately.</textarea>
      </div>

      <div style="display: flex; gap: 10px; margin-top: auto;">
        <button class="btn" style="flex: 1;" onclick="closeTicketDrawer()">Cancel</button>
        <button class="btn btn-primary" style="flex: 1;" onclick="submitTicket()">🎫 Save &amp; Assign Ticket</button>
      </div>
    </div>
  </div>

  <!-- Toast Toast Notification -->
  <div class="toast" id="toastNotification">
    <span id="toastIcon">✅</span>
    <span id="toastMessage">Action completed successfully</span>
  </div>

  <!-- Frontend Logic Script -->
  <script>
    let activeAudio = null;
    let audioTimer = null;
    let currentExtractionId = null;

    // Toast Helper
    function showToast(message, icon = '✅') {
      const toast = document.getElementById('toastNotification');
      document.getElementById('toastMessage').innerText = message;
      document.getElementById('toastIcon').innerText = icon;
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; }, 3500);
    }

    // Slide-over Drawer
    function openTicketDrawer(payload) {
      document.getElementById('ticketVehicle').value = "Truck: " + (payload.entities?.vehiclePlateNumbers?.[0] || 'N/A');
      document.getElementById('ticketInvoice').value = "Invoice: #" + (payload.entities?.invoiceNumbers?.[0] || 'N/A');
      document.getElementById('ticketEway').value = "E-Way: " + (payload.entities?.eWayBillNumbers?.[0] || 'N/A');
      document.getElementById('ticketDrawer').classList.add('open');
    }
    function closeTicketDrawer() {
      document.getElementById('ticketDrawer').classList.remove('open');
    }
    async function submitTicket() {
      if (currentExtractionId) {
        await fetch('/v1/synopsis/' + currentExtractionId + '/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionId: 'act_generate_dispatch_ticket' })
        });
      }
      closeTicketDrawer();
      showToast('Exception Ticket created and assigned to Priority Dispatch Queue!');
    }

    // Composer Injection
    function injectComposerReply(replyText) {
      const composer = document.getElementById('chatComposerInput');
      composer.value = replyText;
      composer.focus();
      showToast('Quoted reply injected into composer! Press Enter to dispatch.');
    }

    // Mock Push to ERP
    async function pushToErp(extractionId) {
      showToast('Pushing exception payload to SAP S/4HANA via webhook...', '🔄');
      setTimeout(() => {
        showToast('Successfully synchronized with SAP S/4HANA (Ref: INV-9902)!');
      }, 800);
    }

    // Interactive Audio Scrubber
    function toggleTranscript(id) {
      const box = document.getElementById(id);
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }

    function seekAudio(startMs, wordElement) {
      document.querySelectorAll('.word-token').forEach(w => w.classList.remove('active'));
      wordElement.classList.add('active');
      showToast('Audio jumped to ' + (startMs / 1000).toFixed(2) + 's (' + wordElement.innerText + ')', '▶️');
    }

    // Simulation: Voice Note Ingress
    async function simulateVoiceNote(domain) {
      showToast('Transcoding incoming voice note in volatile RAM...', '⚡');

      try {
        const res = await fetch('/v1/messages/multimodal/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaType: 'VOICE_NOTE',
            domainCategory: domain,
            messageId: 'wamid_' + Date.now()
          })
        });

        const data = await res.json();
        currentExtractionId = data.extractionId;
        renderMessageItem(data, domain);
        updateInspector(data);
      } catch (err) {
        showToast('Error processing media: ' + err.message, '❌');
      }
    }

    // Simulation: Lorry Receipt Image Ingress
    async function simulateLorryReceipt() {
      showToast('Preprocessing image and running Vision OCR in RAM...', '📄');

      try {
        const res = await fetch('/v1/messages/multimodal/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mediaType: 'IMAGE_DOCUMENT',
            domainCategory: 'LOGISTICS',
            messageId: 'wamid_img_' + Date.now()
          })
        });

        const data = await res.json();
        currentExtractionId = data.extractionId;
        renderMessageItem(data, 'LOGISTICS');
        updateInspector(data);
      } catch (err) {
        showToast('Error processing image: ' + err.message, '❌');
      }
    }

    // Render Message and Synopsis Card in Feed
    function renderMessageItem(data, domain) {
      const feed = document.getElementById('chatMessages');
      const payload = data.payload;
      const isVoice = payload.mediaType === 'VOICE_NOTE';
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message-bubble';
      msgDiv.id = 'msg_' + data.messageId;

      const sender = domain === 'LOGISTICS' ? 'Ramesh Singh (Truck Driver)' : 'Rahul Sharma (Corporate HR)';
      const transcriptId = 'transcript_' + data.extractionId;

      // Word tokens HTML
      let wordsHtml = '';
      if (payload.wordTimestamps && payload.wordTimestamps.length > 0) {
        wordsHtml = payload.wordTimestamps.map(w => 
          \`<span class="word-token" onclick="seekAudio(\${w.startMs}, this)">\${w.word}</span>\`
        ).join(' ');
      } else {
        wordsHtml = payload.executiveSummary;
      }

      // Entity chips HTML
      let entityChipsHtml = '';
      if (payload.entities.vehiclePlateNumbers?.length) {
        entityChipsHtml += \`<div class="entity-chip" onclick="navigator.clipboard.writeText('\${payload.entities.vehiclePlateNumbers[0]}'); showToast('Copied plate to clipboard!');"><span>🚚 Truck:</span> <strong>\${payload.entities.vehiclePlateNumbers[0]}</strong> <span class="check">✓</span></div>\`;
      }
      if (payload.entities.invoiceNumbers?.length) {
        entityChipsHtml += \`<div class="entity-chip" onclick="navigator.clipboard.writeText('\${payload.entities.invoiceNumbers[0]}'); showToast('Copied invoice to clipboard!');"><span>📄 Invoice:</span> <strong>#\${payload.entities.invoiceNumbers[0]}</strong></div>\`;
      }
      if (payload.entities.eWayBillNumbers?.length) {
        entityChipsHtml += \`<div class="entity-chip" onclick="navigator.clipboard.writeText('\${payload.entities.eWayBillNumbers[0]}'); showToast('Copied E-Way to clipboard!');"><span>⚡ E-Way:</span> <strong>\${payload.entities.eWayBillNumbers[0]}</strong> <span class="check">✓</span></div>\`;
      }
      if (payload.entities.policyOrUHIDNumbers?.length) {
        entityChipsHtml += \`<div class="entity-chip"><span>🏥 UHID:</span> <strong>\${payload.entities.policyOrUHIDNumbers[0]}</strong> <span class="check">✓</span></div>\`;
      }
      if (payload.entities.locations?.length) {
        entityChipsHtml += \`<div class="entity-chip"><span>📍 Loc:</span> \${payload.entities.locations[0]}</div>\`;
      }

      msgDiv.innerHTML = \`
        <div class="message-meta">
          <span class="sender-name">\${sender}</span>
          <span class="message-time">Just now • \${payload.languageDetected}</span>
        </div>

        \${isVoice ? \`
          <div class="audio-player-container">
            <button class="play-btn" onclick="playMockAudio(this)">▶</button>
            <div class="audio-progress"><div class="audio-progress-bar"></div></div>
            <span class="audio-time-label">0:14 / 0:14</span>
          </div>
        \` : \`
          <div style="background-color: #1e293b; padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">📄</span>
            <div>
              <div style="font-size: 12px; font-weight: 600;">\${payload.entities.trackingOrLRNumbers?.[0] || 'INVOICE_DOCUMENT'}.pdf</div>
              <div style="font-size: 11px; color: var(--text-secondary);">Processed in RAM • 2048px Bound</div>
            </div>
          </div>
        \`}

        <!-- Synopsis Card -->
        <div class="synopsis-card">
          <div class="synopsis-header">
            <div class="synopsis-title">
              <span>\${isVoice ? '🎙️' : '📄'}</span> \${isVoice ? 'VOICE NOTE SYNOPSIS' : 'DOCUMENT OCR SYNOPSIS'}
              <span style="color: var(--text-muted); font-size: 11px;">(Latency: \${data.processingMetrics.totalLatencyMs}ms)</span>
            </div>
            <span class="badge \${payload.urgencyLevel === 'CRITICAL' ? 'badge-critical' : payload.urgencyLevel === 'HIGH' ? 'badge-high' : 'badge-medium'}">
              \${payload.urgencyLevel}
            </span>
          </div>

          <div class="synopsis-summary">
            \${payload.executiveSummary}
          </div>

          <div class="entity-chips-row">
            \${entityChipsHtml}
          </div>

          \${isVoice ? \`
            <div class="transcript-toggle" onclick="toggleTranscript('\${transcriptId}')">
              <span>▼ Full Synchronized Transcript (Click to Scrub)</span>
            </div>
            <div class="transcript-box" id="\${transcriptId}" style="display: none;">
              \${wordsHtml}
            </div>
          \` : ''}

          <div class="synopsis-actions">
            <button class="action-btn ticket" onclick='openTicketDrawer(\${JSON.stringify(payload)})'>
              <span>🎫</span> Generate Exception Ticket
            </button>
            <button class="action-btn reply" onclick="injectComposerReply('\${payload.recommendedActions?.[1]?.prefilledPayload?.replyText || 'Noted. Action in progress.'}')">
              <span>💬</span> Draft Quoted Reply
            </button>
            <button class="action-btn erp" onclick="pushToErp('\${data.extractionId}')">
              <span>📤</span> Push to SAP/ERP
            </button>
          </div>
        </div>
      \`;

      feed.appendChild(msgDiv);
      feed.scrollTop = feed.scrollHeight;
    }

    // Mock Audio Player Animation
    function playMockAudio(btn) {
      if (btn.innerText === '▶') {
        btn.innerText = '⏸';
        const bar = btn.parentElement.querySelector('.audio-progress-bar');
        let width = 0;
        const interval = setInterval(() => {
          width += 5;
          bar.style.width = width + '%';
          if (width >= 100) {
            clearInterval(interval);
            btn.innerText = '▶';
            bar.style.width = '0%';
          }
        }, 150);
      } else {
        btn.innerText = '▶';
      }
    }

    // Update Telemetry & Inspector Box
    function updateInspector(data) {
      // Automation Rules
      const autoBox = document.getElementById('automationLogBox');
      const countEl = document.getElementById('rulesTriggerCount');
      if (data.automationRulesTriggered && data.automationRulesTriggered.length > 0) {
        countEl.innerText = data.automationRulesTriggered.length + ' Triggered';
        autoBox.innerText = JSON.stringify({
          event: 'message.multimodal_analyzed',
          rulesMatched: data.automationRulesTriggered,
          actionsExecuted: data.actionsDispatched
        }, null, 2);
      }

      // FTS Count
      document.getElementById('ftsIndexedCount').innerText = '1 Indexed (INV-9902)';
      document.getElementById('ftsIndexSnippet').innerText = 'Indexed tokens: [inv, inv9902, 9902, mh, mh12rn8841, 8841, pune, gate, eway, 349281729381]';
    }

    // Query MCP Tools Live
    async function fetchMcpTools() {
      const res = await fetch('/v1/mcp/tools');
      const json = await res.json();
      document.getElementById('mcpToolBox').innerText = JSON.stringify(json, null, 2);
      showToast('Retrieved live MCP tool definitions from api.periskope.app/mcp');
    }

    // Live Global Search on Keyup
    document.getElementById('globalSearchInput').addEventListener('input', async (e) => {
      const q = e.target.value.trim();
      if (!q) return;

      const res = await fetch('/v1/search/multimodal?q=' + encodeURIComponent(q));
      const data = await res.json();

      if (data.count > 0) {
        showToast('Found ' + data.count + ' match in PostgreSQL tsvector index for "' + q + '"!', '🔍');
      }
    });

    function sendMessage() {
      const inp = document.getElementById('chatComposerInput');
      if (!inp.value.trim()) return;

      const feed = document.getElementById('chatMessages');
      const div = document.createElement('div');
      div.className = 'message-bubble';
      div.style.backgroundColor = 'var(--wa-bubble-out)';
      div.style.alignSelf = 'flex-end';
      div.style.borderLeftColor = 'var(--accent-green)';
      div.innerHTML = \`
        <div class="message-meta">
          <span class="sender-name" style="color: #6ee7b7;">Periskope Agent (Vikram)</span>
          <span class="message-time">Just now</span>
        </div>
        <p style="font-size: 13px;">\${inp.value}</p>
      \`;
      feed.appendChild(div);
      feed.scrollTop = feed.scrollHeight;
      inp.value = '';
      showToast('Quoted reply sent to WhatsApp group!');
    }
  </script>
</body>
</html>`;
}
