const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("messageInput");
const newChatBtn = document.getElementById("newChatBtn");
const sidebarNewChatBtn = document.getElementById("sidebarNewChatBtn");
const exportBtn = document.getElementById("exportBtn");
const settingsBtn = document.getElementById("settingsBtn");

const STORAGE_KEY = "treechat-tree:v3";

let tree = loadTree();
let latestAiWarning = "";

function createRoot() {
  return {
    id: "root",
    text: "",
    role: "root",
    expanded: true,
    children: [],
  };
}

function createNode(text, role = "user") {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    role,
    expanded: true,
    children: [],
  };
}

function loadTree() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) {
    console.warn("Failed to load saved chat:", error);
  }

  return createRoot();
}

function saveTree() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  } catch (error) {
    console.warn("Failed to save chat:", error);
  }
}

function findNode(root, id) {
  if (root.id === id) return root;

  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }

  return null;
}

function findParent(root, id) {
  for (const child of root.children) {
    if (child.id === id) return root;

    const found = findParent(child, id);
    if (found) return found;
  }

  return null;
}

function addEnteringAnimation(nodeEl) {
  nodeEl.classList.add("is-entering");
  const cleanup = () => nodeEl.classList.remove("is-entering");
  nodeEl.addEventListener("animationend", cleanup, { once: true });
  window.setTimeout(cleanup, 700);
}

function setBranchExpanded(childrenEl, expanded) {
  if (expanded) {
    childrenEl.classList.remove("is-collapsed");
    childrenEl.style.maxHeight = "0px";
    requestAnimationFrame(() => {
      childrenEl.style.maxHeight = `${childrenEl.scrollHeight}px`;
    });
    childrenEl.addEventListener(
      "transitionend",
      () => {
        if (!childrenEl.classList.contains("is-collapsed")) {
          childrenEl.style.maxHeight = "";
        }
      },
      { once: true },
    );
    return;
  }

  childrenEl.style.maxHeight = `${childrenEl.scrollHeight}px`;
  requestAnimationFrame(() => {
    childrenEl.classList.add("is-collapsed");
    childrenEl.style.maxHeight = "0px";
  });
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderTree(animatedNodeId = null) {
  messagesEl.innerHTML = "";
  if (tree.children.length === 0) {
    renderEmptyState();
  } else {
    tree.children.forEach((child) => renderNode(child, messagesEl, false, animatedNodeId));
  }
  renderAiWarning();
  scrollToBottom();
}

function renderEmptyState() {
  const emptyEl = document.createElement("div");
  emptyEl.className = "empty-state";

  const titleEl = document.createElement("strong");
  titleEl.textContent = "What are we branching today?";

  const textEl = document.createElement("span");
  textEl.textContent =
    "Start with a normal message. Use Branch on any reply when you want a side path.";

  emptyEl.appendChild(titleEl);
  emptyEl.appendChild(textEl);
  messagesEl.appendChild(emptyEl);
}

function renderAiWarning() {
  if (!latestAiWarning) return;

  const warningEl = document.createElement("div");
  warningEl.className = "api-warning";
  warningEl.textContent = latestAiWarning;
  messagesEl.appendChild(warningEl);
}

function renderNode(node, container, isChild, animatedNodeId) {
  const nodeEl = document.createElement("div");
  nodeEl.className = "message-node";
  if (isChild) nodeEl.classList.add("child-message");
  nodeEl.dataset.nodeId = node.id;

  const rowEl = document.createElement("div");
  rowEl.className = `message-row ${node.role}`;

  const bubbleEl = document.createElement("div");
  bubbleEl.className = `bubble ${node.role}`;
  bubbleEl.textContent = node.text;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "toggle-btn";
  toggleBtn.textContent = node.expanded ? "Collapse" : "Expand";
  toggleBtn.style.display = node.children.length > 0 ? "inline-flex" : "none";
  toggleBtn.setAttribute("aria-expanded", String(node.expanded));
  toggleBtn.addEventListener("click", () => toggleNode(node.id));

  const branchBtn = document.createElement("button");
  branchBtn.type = "button";
  branchBtn.className = "branch-btn";
  branchBtn.textContent = "Branch";
  branchBtn.addEventListener("click", () => branchFromNode(node.id));

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "edit-btn";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () => editNode(node.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteNode(node.id));
  deleteBtn.style.display = node === tree ? "none" : "inline-flex";

  const actionsEl = document.createElement("div");
  actionsEl.className = "message-actions";
  actionsEl.appendChild(toggleBtn);
  actionsEl.appendChild(branchBtn);
  actionsEl.appendChild(editBtn);
  actionsEl.appendChild(deleteBtn);

  rowEl.appendChild(bubbleEl);
  rowEl.appendChild(actionsEl);
  nodeEl.appendChild(rowEl);

  const childrenEl = document.createElement("div");
  childrenEl.className = "message-children";
  if (!node.expanded) {
    childrenEl.classList.add("is-collapsed");
    childrenEl.style.maxHeight = "0px";
  }

  node.children.forEach((child) => renderNode(child, childrenEl, true, animatedNodeId));
  nodeEl.appendChild(childrenEl);
  container.appendChild(nodeEl);

  if (node.id === animatedNodeId) {
    addEnteringAnimation(nodeEl);
  }
}

function toggleNode(nodeId) {
  const node = findNode(tree, nodeId);
  if (!node || node.children.length === 0) return;

  node.expanded = !node.expanded;
  saveTree();

  const nodeEl = messagesEl.querySelector(`[data-node-id="${nodeId}"]`);
  const childrenEl = nodeEl?.querySelector(":scope > .message-children");
  const toggleBtn = nodeEl?.querySelector(":scope > .message-row .toggle-btn");

  if (!childrenEl || !toggleBtn) {
    renderTree();
    return;
  }

  setBranchExpanded(childrenEl, node.expanded);
  toggleBtn.textContent = node.expanded ? "Collapse" : "Expand";
  toggleBtn.setAttribute("aria-expanded", String(node.expanded));
}

async function appendConversation(parentId, message) {
  const parent = findNode(tree, parentId);
  if (!parent) return;
  const history = buildHistoryFor(parent);

  const userNode = createNode(message, "user");
  parent.children.push(userNode);
  parent.expanded = true;
  saveTree();
  renderTree(userNode.id);

  const aiText = await callAi(message, history);
  const assistantNode = createNode(aiText, "assistant");
  parent.children.push(assistantNode);
  saveTree();
  renderTree(assistantNode.id);
}

function buildHistoryFor(parent) {
  const chain = [];
  collectPathToNode(tree, parent.id, chain);

  const rootMessages = parent.id === tree.id ? tree.children : chain.slice(1);
  return rootMessages
    .filter((node) => node.role === "user" || node.role === "assistant")
    .slice(-12)
    .map((node) => ({
      role: node.role,
      content: node.text,
    }));
}

function collectPathToNode(node, targetId, path) {
  path.push(node);
  if (node.id === targetId) return true;

  for (const child of node.children) {
    if (collectPathToNode(child, targetId, path)) return true;
  }

  path.pop();
  return false;
}

async function callAi(message, history = []) {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    latestAiWarning = data.warning || (data.source === "mock" ? "AI is using fallback replies right now." : "");
    return data.generated_text || getMockResponse();
  } catch (error) {
    console.error("AI API call failed:", error);
    latestAiWarning = "AI request failed, so a fallback reply was used.";
    return getMockResponse();
  }
}

function getMockResponse() {
  const responses = [
    "That's an interesting point. Can you elaborate?",
    "I see what you mean. What are your thoughts on this?",
    "Great question. Let me think about that.",
    "I understand. What direction should this branch take?",
    "That's a good observation. What comes next?",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function branchFromNode(nodeId) {
  const message = window.prompt("Enter child message text:");
  if (message === null) return;

  const trimmed = message.trim();
  if (!trimmed) return;

  appendConversation(nodeId, trimmed);
}

function editNode(nodeId) {
  const node = findNode(tree, nodeId);
  if (!node) return;

  const nextText = window.prompt("Edit message:", node.text);
  if (nextText === null) return;

  const trimmed = nextText.trim();
  if (!trimmed) return;

  node.text = trimmed;
  saveTree();
  renderTree();
}

function deleteNode(nodeId) {
  const parent = findParent(tree, nodeId);
  if (!parent) return;

  parent.children = parent.children.filter((child) => child.id !== nodeId);
  saveTree();
  renderTree();
}

function exportTree() {
  const data = JSON.stringify(tree, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "treechat-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = inputEl.value.trim();
  if (!message) return;

  inputEl.value = "";
  inputEl.focus();
  appendConversation(tree.id, message);
});

newChatBtn.addEventListener("click", () => {
  tree = createRoot();
  saveTree();
  renderTree();
  inputEl.focus();
});

sidebarNewChatBtn.addEventListener("click", () => {
  newChatBtn.click();
});

exportBtn.addEventListener("click", exportTree);

settingsBtn.addEventListener("click", () => {
  window.alert("Settings panel coming soon!");
});

renderTree();
