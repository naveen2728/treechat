// Inline HTML content
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const HTML_CONTENT = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="tree.css" />
  </head>
  <body>
    <div class="page-title">Branch Chat &#127795;</div>

    <div class="chat-shell" role="application" aria-label="Chat interface">
      <div class="chat-header">
        <div class="chat-title">
          <strong>Chat</strong>
          <span>Type a message and click Send</span>
        </div>
        <div class="chat-actions">
          <button class="settings-btn" id="settingsBtn" type="button" aria-label="Settings">
            Settings
          </button>
          <button class="export-btn" id="exportBtn" type="button" aria-label="Export Chat">
            Export
          </button>
          <button class="newchat-btn" id="newChatBtn" type="button" aria-label="New Chat">
            New Chat
          </button>
        </div>
      </div>

      <div class="chat-messages" id="messages" aria-live="polite"></div>

      <div class="chat-footer">
        <form id="chatForm">
          <input
            id="messageInput"
            class="input"
            type="text"
            autocomplete="off"
            placeholder="Write your message..."
            aria-label="Message input"
          />
          <button class="btn" id="sendBtn" type="submit">Send</button>
        </form>
        <div class="hint">Press Enter to send.</div>
      </div>
    </div>

    <script src="tree.js"></script>
  </body>
</html>`;

// Inline CSS content
const CSS_CONTENT = `:root {
  --bg0: #0b1020;
  --bg1: #0f1733;
  --panel: rgba(255, 255, 255, 0.06);
  --panel2: rgba(255, 255, 255, 0.08);
  --text: #e7eaf3;
  --muted: rgba(231, 234, 243, 0.7);
  --border: rgba(255, 255, 255, 0.12);
  --shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  --userA: #7c3aed;
  --userB: #a78bfa;
  --assistantA: #1f2937;
  --assistantB: #334155;
}

* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
}

body {
  margin: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica,
    Arial, "Apple Color Emoji", "Segoe UI Emoji";
  color: var(--text);
  background:
    radial-gradient(1000px 500px at 20% 0%, rgba(124, 58, 237, 0.25), transparent 60%),
    radial-gradient(900px 500px at 80% 10%, rgba(59, 130, 246, 0.18), transparent 55%),
    linear-gradient(180deg, var(--bg0), var(--bg1));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
}

.page-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  margin-bottom: 18px;
  color: var(--text);
  text-shadow:
    0 0 18px rgba(167, 139, 250, 0.45),
    0 0 40px rgba(56, 189, 248, 0.3);
}

.chat-shell {
  width: min(820px, 100%);
  height: min(78vh, 720px);
  border: 1px solid var(--border);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03));
  box-shadow: var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.24);
  background: radial-gradient(circle at 0 0, rgba(79, 70, 229, 0.22), transparent 55%),
    radial-gradient(circle at 100% 0, rgba(14, 165, 233, 0.16), transparent 60%),
    rgba(15, 23, 42, 0.92);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.75);
}

.chat-title {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.chat-title strong {
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.chat-title span {
  font-size: 11px;
  color: var(--muted);
}

.newchat-btn {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  user-select: none;
  transition: filter 120ms ease, border-color 120ms ease, transform 80ms ease,
    background 120ms ease;
  white-space: nowrap;
}

.newchat-btn:hover {
  filter: brightness(1.08);
  border-color: rgba(167, 139, 250, 0.55);
  background: rgba(167, 139, 250, 0.12);
  transform: translateY(-1px);
}

.newchat-btn:active {
  transform: translateY(1px);
}

.newchat-btn:focus-visible {
  outline: 3px solid rgba(167, 139, 250, 0.35);
  outline-offset: 2px;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.settings-btn {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  user-select: none;
  transition: filter 120ms ease, border-color 120ms ease, transform 80ms ease,
    background 120ms ease;
  white-space: nowrap;
}

.settings-btn:hover {
  filter: brightness(1.08);
  border-color: rgba(167, 139, 250, 0.55);
  background: rgba(167, 139, 250, 0.12);
  transform: translateY(-1px);
}

.settings-btn:active {
  transform: translateY(1px);
}

.settings-btn:focus-visible {
  outline: 3px solid rgba(167, 139, 250, 0.35);
  outline-offset: 2px;
}

.export-btn {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  user-select: none;
  transition: filter 120ms ease, border-color 120ms ease, transform 80ms ease,
    background 120ms ease;
  white-space: nowrap;
}

.export-btn:hover {
  filter: brightness(1.08);
  border-color: rgba(167, 139, 250, 0.55);
  background: rgba(167, 139, 250, 0.12);
  transform: translateY(-1px);
}

.export-btn:active {
  transform: translateY(1px);
}

.export-btn:focus-visible {
  outline: 3px solid rgba(167, 139, 250, 0.35);
  outline-offset: 2px;
}

.chat-messages {
  padding: 18px;
  overflow: auto;
  flex: 1;
  scroll-behavior: smooth;
}

.message-node {
  margin: 10px 0;
}

.message-node.is-entering {
  animation: message-rise 420ms cubic-bezier(0.2, 0.85, 0.25, 1.15) both;
}

.child-message {
  /* Horizontal elbow connector into the child bubble itself */
  position: relative;
  margin-left: 0;
  padding-left: 14px;
  transform-origin: 0 18px;
}

.message-row {
  display: flex;
  margin: 0;
  align-items: center;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.assistant {
  justify-content: flex-start;
}

.message-children {
  position: relative;
  margin-top: 12px; /* spacing between parent and children */
  padding-left: 22px; /* indent children group (>= 20px) */
  max-height: 2000px;
  opacity: 1;
  overflow: hidden;
  transform-origin: top left;
  transition: max-height 260ms ease, opacity 180ms ease, transform 260ms ease;
}

.message-children.is-collapsed {
  max-height: 0 !important;
  opacity: 0;
  transform: translateY(-4px) scaleY(0.98);
}

/* Vertical connector from parent into its children group */
.message-children::before {
  content: "";
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.14);
  transform-origin: top;
}

/* Horizontal elbow from vertical line into each child node */
.child-message::before {
  content: "";
  position: absolute;
  left: 0;
  top: 18px;
  width: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  transform-origin: left;
}

.child-message.is-entering::before {
  animation: connector-draw 360ms ease-out both;
}

.bubble {
  max-width: 86%;
  padding: 12px 15px;
  border-radius: 18px;
  border: 1px solid var(--border);
  line-height: 1.35;
  word-wrap: break-word;
  white-space: pre-wrap;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.bubble:hover {
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.26);
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-1px);
}

.bubble.user {
  color: #fff;
  background: linear-gradient(135deg, var(--userA), var(--userB));
  border-color: rgba(167, 139, 250, 0.35);
  border-top-right-radius: 8px;
}

.bubble.assistant {
  background: linear-gradient(135deg, var(--assistantA), var(--assistantB));
  border-color: rgba(255, 255, 255, 0.14);
  border-top-left-radius: 8px;
  color: var(--text);
}

/* Child messages: muted colors so they feel visually "down the branch". */
.child-message .bubble.user {
  background: linear-gradient(
    135deg,
    rgba(124, 58, 237, 0.55),
    rgba(167, 139, 250, 0.35)
  );
  border-color: rgba(167, 139, 250, 0.22);
  box-shadow: 0 10px 30px rgba(124, 58, 237, 0.12);
  border-top-right-radius: 12px;
}

.child-message .bubble.assistant {
  background: linear-gradient(
    135deg,
    rgba(15, 23, 51, 0.9),
    rgba(51, 65, 85, 0.75)
  );
  border-color: rgba(255, 255, 255, 0.10);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  border-top-left-radius: 12px;
}

.chat-footer {
  padding: 14px;
  border-top: 1px solid var(--border);
  background: rgba(0, 0, 0, 0.12);
}

.branch-btn {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  transition: filter 120ms ease, border-color 120ms ease, transform 80ms ease;
  margin-left: 10px;
  white-space: nowrap;
}

.toggle-btn {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  transition: filter 120ms ease, border-color 120ms ease, transform 80ms ease,
    background 120ms ease;
  margin-left: 8px;
  white-space: nowrap;
}

.toggle-btn:hover {
  filter: brightness(1.08);
  border-color: rgba(167, 139, 250, 0.55);
  background: rgba(167, 139, 250, 0.12);
  transform: translateY(-1px);
}

.toggle-btn:active {
  transform: translateY(1px);
}

.toggle-btn:focus-visible {
  outline: 3px solid rgba(167, 139, 250, 0.35);
  outline-offset: 2px;
}

.branch-btn:hover {
  filter: brightness(1.08);
  border-color: rgba(167, 139, 250, 0.55);
  background: rgba(167, 139, 250, 0.12);
  transform: translateY(-1px);
}

.branch-btn:active {
  transform: translateY(1px);
}

.branch-btn:focus-visible {
  outline: 3px solid rgba(167, 139, 250, 0.35);
  outline-offset: 2px;
}

.edit-btn {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  transition: filter 120ms ease, border-color 120ms ease, transform 80ms ease;
  margin-left: 6px;
  white-space: nowrap;
}

.edit-btn:hover {
  filter: brightness(1.08);
  border-color: rgba(167, 139, 250, 0.55);
  background: rgba(167, 139, 250, 0.12);
  transform: translateY(-1px);
}

.edit-btn:active {
  transform: translateY(1px);
}

.edit-btn:focus-visible {
  outline: 3px solid rgba(167, 139, 250, 0.35);
  outline-offset: 2px;
}

.delete-btn {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  transition: filter 120ms ease, border-color 120ms ease, transform 80ms ease;
  margin-left: 6px;
  white-space: nowrap;
}

.delete-btn:hover {
  filter: brightness(1.15);
  border-color: rgba(239, 68, 68, 0.6);
  background: rgba(239, 68, 68, 0.2);
  transform: translateY(-1px);
}

.delete-btn:active {
  transform: translateY(1px);
}

.delete-btn:focus-visible {
  outline: 3px solid rgba(239, 68, 68, 0.5);
  outline-offset: 2px;
}

.edit-input {
  max-width: 86%;
  padding: 12px 15px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  line-height: 1.35;
  word-wrap: break-word;
  white-space: pre-wrap;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  background: inherit;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.edit-input:focus {
  outline: none;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.26);
  border-color: rgba(167, 139, 250, 0.55);
  transform: translateY(-1px);
}

.branch-composer {
  display: none;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}

.branch-composer.is-active {
  display: flex;
}

.branch-composer .composer-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.branch-composer .composer-input {
  flex: 1;
}

.branch-composer .composer-cancel-btn {
  border-color: rgba(248, 113, 113, 0.4);
  color: rgba(248, 113, 113, 0.9);
}

.branch-composer .composer-cancel-btn:hover {
  background: rgba(248, 113, 113, 0.12);
}

form {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input {
  flex: 1;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
  outline: none;
  transition: border-color 120ms ease, background 120ms ease;
}

.input:focus {
  border-color: rgba(167, 139, 250, 0.6);
  background: rgba(255, 255, 255, 0.06);
}

.btn {
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(167, 139, 250, 0.55);
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(167, 139, 250, 0.9));
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 80ms ease, filter 120ms ease;
  user-select: none;
}

.btn:hover {
  filter: brightness(1.05);
}

.btn:active {
  transform: translateY(1px);
}

.btn:focus-visible,
.input:focus-visible {
  outline: 3px solid rgba(167, 139, 250, 0.35);
  outline-offset: 2px;
}

.hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--muted);
}

@keyframes message-rise {
  0% {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
    filter: blur(4px);
  }

  60% {
    opacity: 1;
    filter: blur(0);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes connector-draw {
  from {
    opacity: 0;
    transform: scaleX(0);
  }

  to {
    opacity: 1;
    transform: scaleX(1);
  }
}`;

// Inline JS content
const JS_CONTENT = `// Tree Chat - Frontend JavaScript
class TreeChat {
    constructor() {
        this.tree = this.loadTree();
        this.currentNodeId = this.tree.id;
        this.init();
    }

    init() {
        this.renderTree();
        this.setupEventListeners();
    }

    loadTree() {
        const saved = localStorage.getItem('treechat-tree');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.createTreeNode('Welcome to Branch Chat! Start a conversation...', 'system');
    }

    saveTree() {
        localStorage.setItem('treechat-tree', JSON.stringify(this.tree));
    }

    createTreeNode(text, role = 'user', parentId = null) {
        return {
            id: Date.now() + Math.random(),
            text: text,
            role: role,
            expanded: true,
            children: [],
            parentId: parentId
        };
    }

    renderTree() {
        const messages = document.getElementById('messages');
        messages.innerHTML = '';
        this.renderNode(this.tree, messages, 0);
    }

    renderNode(node, container, depth) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + node.role;
        messageDiv.dataset.nodeId = node.id;
        messageDiv.style.marginLeft = depth * 20 + 'px';

        const bubble = document.createElement('div');
        bubble.className = 'bubble';

        const textDiv = document.createElement('div');
        textDiv.className = 'text';
        textDiv.textContent = node.text;

        const actions = document.createElement('div');
        actions.className = 'actions';

        if (node.children.length > 0) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle';
            toggleBtn.textContent = node.expanded ? '−' : '+';
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                this.toggleNode(node.id);
            };
            actions.appendChild(toggleBtn);
        }

        const branchBtn = document.createElement('button');
        branchBtn.className = 'branch';
        branchBtn.textContent = 'Branch';
        branchBtn.onclick = (e) => {
            e.stopPropagation();
            this.showBranchComposer(node.id);
        };
        actions.appendChild(branchBtn);

        const editBtn = document.createElement('button');
        editBtn.className = 'edit';
        editBtn.textContent = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            this.editNode(node.id);
        };
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteNode(node.id);
        };
        actions.appendChild(deleteBtn);

        bubble.appendChild(textDiv);
        bubble.appendChild(actions);
        messageDiv.appendChild(bubble);

        container.appendChild(messageDiv);

        if (node.expanded) {
            node.children.forEach(child => {
                this.renderNode(child, container, depth + 1);
            });
        }
    }

    toggleNode(nodeId) {
        const node = this.findNode(this.tree, nodeId);
        if (node) {
            node.expanded = !node.expanded;
            this.saveTree();
            this.renderTree();
        }
    }

    showBranchComposer(parentId) {
        const composer = document.getElementById('branchComposer');
        composer.dataset.parentId = parentId;
        composer.style.display = 'block';
        document.getElementById('branchInput').focus();
    }

    hideBranchComposer() {
        const composer = document.getElementById('branchComposer');
        composer.style.display = 'none';
        document.getElementById('branchInput').value = '';
    }

    appendChildMessage(parentId, text, role = 'user') {
        const parent = this.findNode(this.tree, parentId);
        if (parent) {
            const child = this.createTreeNode(text, role, parentId);
            parent.children.push(child);
            this.saveTree();
            this.renderTree();
            return child.id;
        }
        return null;
    }

    editNode(nodeId) {
        const node = this.findNode(this.tree, nodeId);
        if (node) {
            const newText = prompt('Edit message:', node.text);
            if (newText !== null && newText.trim() !== '') {
                node.text = newText.trim();
                this.saveTree();
                this.renderTree();
            }
        }
    }

    deleteNode(nodeId) {
        if (nodeId === this.tree.id) return; // Don't delete root

        const deleteFromNode = (node) => {
            const index = node.children.findIndex(child => child.id === nodeId);
            if (index !== -1) {
                node.children.splice(index, 1);
                this.saveTree();
                this.renderTree();
                return true;
            }
            for (const child of node.children) {
                if (deleteFromNode(child)) return true;
            }
            return false;
        };

        deleteFromNode(this.tree);
    }

    findNode(node, id) {
        if (node.id === id) return node;
        for (const child of node.children) {
            const found = this.findNode(child, id);
            if (found) return found;
        }
        return null;
    }

    async callHuggingFaceAPI(message) {
        try {
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }

            const data = await response.json();
            return data.generated_text || 'AI response failed';
        } catch (error) {
            console.error('AI API call failed:', error);
            return this.getMockResponse(message);
        }
    }

    getMockResponse(message) {
        const responses = [
            "That's an interesting point. Can you elaborate?",
            "I see what you mean. What are your thoughts on this?",
            "Great question! Let me think about that.",
            "I understand. How does that make you feel?",
            "That's a good observation. What comes next?"
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    setupEventListeners() {
        // Chat form submission
        document.getElementById('chatForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            if (!message) return;

            input.value = '';
            const newNodeId = this.appendChildMessage(this.currentNodeId, message, 'user');

            // Get AI response
            const aiResponse = await this.callHuggingFaceAPI(message);
            this.appendChildMessage(newNodeId, aiResponse, 'assistant');
        });

        // Branch composer
        document.getElementById('branchForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('branchInput');
            const message = input.value.trim();
            if (!message) return;

            const parentId = document.getElementById('branchComposer').dataset.parentId;
            this.hideBranchComposer();

            const newNodeId = this.appendChildMessage(parentId, message, 'user');

            // Get AI response
            const aiResponse = await this.callHuggingFaceAPI(message);
            this.appendChildMessage(newNodeId, aiResponse, 'assistant');
        });

        document.getElementById('cancelBranch').addEventListener('click', () => {
            this.hideBranchComposer();
        });

        // Export functionality
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportTree();
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });
    }

    exportTree() {
        const dataStr = JSON.stringify(this.tree, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = 'treechat-export.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    showSettings() {
        alert('Settings panel coming soon!');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new TreeChat();
});`;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files inline
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(HTML_CONTENT);
});

app.get('/tree.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.send(CSS_CONTENT);
});

app.get('/tree.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(JS_CONTENT);
});

// Hugging Face API endpoint
app.post('/api/ai', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get token from environment variable
        const HF_TOKEN = process.env.HF_TOKEN;

        if (!HF_TOKEN) {
            console.warn('HF_TOKEN not set, using mock response');
            return res.json({
                generated_text: getMockResponse(message)
            });
        }

        const response = await fetch(
            'https://api-inference.huggingface.co/models/distilgpt2',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: message,
                    parameters: {
                        max_length: 100,
                        temperature: 0.7,
                        do_sample: true,
                        pad_token_id: 50256
                    }
                })
            }
        );

        if (!response.ok) {
            throw new Error(`Hugging Face API error: ${response.status}`);
        }

        const data = await response.json();

        // Extract the generated text
        let generatedText = '';
        if (Array.isArray(data) && data.length > 0) {
            generatedText = data[0].generated_text || '';
            // Remove the input message from the response if it's included
            if (generatedText.startsWith(message)) {
                generatedText = generatedText.substring(message.length).trim();
            }
        } else if (data.generated_text) {
            generatedText = data.generated_text;
        }

        if (!generatedText) {
            generatedText = getMockResponse(message);
        }

        res.json({ generated_text: generatedText });

    } catch (error) {
        console.error('AI API Error:', error);
        res.json({
            generated_text: getMockResponse(message)
        });
    }
});

function getMockResponse(message) {
    const responses = [
        "That's an interesting point. Can you elaborate?",
        "I see what you mean. What are your thoughts on this?",
        "Great question! Let me think about that.",
        "I understand. How does that make you feel?",
        "That's a good observation. What comes next?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// Export for Vercel serverless functions
module.exports = app;

// Start server (only for local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}