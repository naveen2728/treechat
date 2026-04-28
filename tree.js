const authShellEl = document.getElementById("authShell");
const appShellEl = document.getElementById("appShell");
const authFormEl = document.getElementById("authForm");
const authEmailEl = document.getElementById("authEmail");
const authPasswordEl = document.getElementById("authPassword");
const authStatusEl = document.getElementById("authStatus");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const signInModeBtn = document.getElementById("signInModeBtn");
const signUpModeBtn = document.getElementById("signUpModeBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userPillEl = document.getElementById("userPill");

const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const sidebarNewChatBtn = document.getElementById("sidebarNewChatBtn");
const conversationListEl = document.getElementById("conversationList");
const exportBtn = document.getElementById("exportBtn");
const settingsBtn = document.getElementById("settingsBtn");

const STORE_PREFIX = "treechat-conversations:v2";
const ACTIVE_PREFIX = "treechat-active-conversation:v2";
const LEGACY_TREE_KEY = "treechat-tree:v3";

let authMode = "signin";
let supabaseClient = null;
let appConfig = null;
let authSession = null;
let currentUser = null;
let conversations = [];
let activeConversationId = null;
let latestAiWarning = "";
let activeBranchParentId = null;
let isGenerating = false;
let isHydrating = false;
let databaseStatus = "syncing";

function createRoot() {
  return {
    id: "root",
    text: "",
    role: "root",
    expanded: true,
    children: [],
  };
}

function createConversation(title = "New chat", tree = createRoot()) {
  const now = new Date().toISOString();
  return {
    id: `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId: currentUser?.id || "",
    title,
    createdAt: now,
    updatedAt: now,
    tree,
  };
}

function createNode(text, role = "user") {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    role,
    expanded: true,
    children: [],
  };
}

function getStoreKey() {
  return `${STORE_PREFIX}:${currentUser?.id || "anonymous"}`;
}

function getActiveKey() {
  return `${ACTIVE_PREFIX}:${currentUser?.id || "anonymous"}`;
}

function normalizeConversation(conversation) {
  return {
    ...conversation,
    userId: currentUser?.id || conversation.userId || "",
  };
}

function loadLocalConversations() {
  try {
    const saved = localStorage.getItem(getStoreKey());
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeConversation);
      }
    }

    const legacy = localStorage.getItem(LEGACY_TREE_KEY);
    if (legacy) {
      const legacyTree = JSON.parse(legacy);
      return [createConversation(getConversationTitle(legacyTree), legacyTree)];
    }
  } catch (error) {
    console.warn("Failed to load conversations:", error);
  }

  return [createConversation()];
}

function loadActiveConversationId() {
  try {
    const savedId = localStorage.getItem(getActiveKey());
    if (savedId && conversations.some((conversation) => conversation.id === savedId)) return savedId;
  } catch (error) {
    console.warn("Failed to load active conversation:", error);
  }

  return conversations[0]?.id || null;
}

function getActiveConversation() {
  return conversations.find((conversation) => conversation.id === activeConversationId) || conversations[0] || null;
}

function getTree() {
  return getActiveConversation()?.tree || createRoot();
}

function saveLocalState() {
  try {
    localStorage.setItem(getStoreKey(), JSON.stringify(conversations));
    if (activeConversationId) {
      localStorage.setItem(getActiveKey(), activeConversationId);
    }
  } catch (error) {
    console.warn("Failed to save conversations:", error);
  }
}

function saveConversations() {
  saveLocalState();
  if (databaseStatus === "ready") {
    const conversation = getActiveConversation();
    if (conversation) {
      void saveConversationToDatabase(conversation);
    }
  }
}

function touchConversation(conversation = getActiveConversation()) {
  if (!conversation) return;
  conversation.updatedAt = new Date().toISOString();
  conversation.title = getConversationTitle(conversation.tree);
  conversation.userId = currentUser?.id || conversation.userId || "";
}

function getConversationTitle(tree) {
  const firstUser = tree.children.find((node) => node.role === "user");
  if (!firstUser) return "New chat";

  const title = firstUser.text.replace(/\s+/g, " ").trim();
  return title.length > 34 ? `${title.slice(0, 34)}...` : title;
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

function renderApp(animatedNodeId = null) {
  renderAuthState();
  if (!currentUser) return;
  renderSidebar();
  renderTree(animatedNodeId);
  updateInputState();
}

function renderAuthState() {
  const showApp = Boolean(currentUser);
  authShellEl.classList.toggle("is-hidden", showApp);
  appShellEl.classList.toggle("is-hidden", !showApp);
  userPillEl.textContent = currentUser?.email || "";
}

function renderSidebar() {
  conversationListEl.innerHTML = "";
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  sorted.forEach((conversation) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "conversation-item";
    if (conversation.id === activeConversationId) item.classList.add("is-active");
    item.textContent = conversation.title || "New chat";
    item.addEventListener("click", () => {
      activeConversationId = conversation.id;
      activeBranchParentId = null;
      latestAiWarning = "";
      saveConversations();
      renderApp();
      inputEl.focus();
    });
    conversationListEl.appendChild(item);
  });
}

function renderTree(animatedNodeId = null) {
  const tree = getTree();
  messagesEl.innerHTML = "";

  if (tree.children.length === 0) {
    renderEmptyState();
  } else {
    tree.children.forEach((child) => renderNode(child, messagesEl, false, animatedNodeId));
  }

  if (isGenerating) renderThinkingState();
  renderAiWarning();
  scrollToBottom();
}

function renderEmptyState() {
  const emptyEl = document.createElement("div");
  emptyEl.className = "empty-state";

  const titleEl = document.createElement("strong");
  titleEl.textContent = "What are we branching today?";

  const textEl = document.createElement("span");
  if (isHydrating) {
    textEl.textContent = "Loading your saved conversations...";
  } else {
    textEl.textContent = "Start with a normal message. Use Branch on any reply when you want a side path.";
  }

  emptyEl.appendChild(titleEl);
  emptyEl.appendChild(textEl);
  messagesEl.appendChild(emptyEl);
}

function renderThinkingState() {
  const rowEl = document.createElement("div");
  rowEl.className = "message-row assistant thinking-row";

  const bubbleEl = document.createElement("div");
  bubbleEl.className = "bubble assistant thinking-bubble";
  bubbleEl.textContent = "Thinking";

  rowEl.appendChild(bubbleEl);
  messagesEl.appendChild(rowEl);
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
  renderMessageText(bubbleEl, node.text);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "toggle-btn";
  toggleBtn.textContent = node.expanded ? "Collapse" : "Expand";
  toggleBtn.style.display = node.children.length > 0 ? "inline-flex" : "none";
  toggleBtn.setAttribute("aria-expanded", String(node.expanded));
  toggleBtn.disabled = isGenerating;
  toggleBtn.addEventListener("click", () => toggleNode(node.id));

  const branchBtn = document.createElement("button");
  branchBtn.type = "button";
  branchBtn.className = "branch-btn";
  branchBtn.textContent = activeBranchParentId === node.id ? "Branching" : "Branch";
  branchBtn.disabled = isGenerating;
  branchBtn.addEventListener("click", () => openBranchComposer(node.id));

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "edit-btn";
  editBtn.textContent = "Edit";
  editBtn.disabled = isGenerating;
  editBtn.addEventListener("click", () => editNode(node.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.disabled = isGenerating;
  deleteBtn.addEventListener("click", () => deleteNode(node.id));

  const actionsEl = document.createElement("div");
  actionsEl.className = "message-actions";
  actionsEl.appendChild(toggleBtn);
  actionsEl.appendChild(branchBtn);
  actionsEl.appendChild(editBtn);
  actionsEl.appendChild(deleteBtn);

  rowEl.appendChild(bubbleEl);
  rowEl.appendChild(actionsEl);
  nodeEl.appendChild(rowEl);

  if (activeBranchParentId === node.id) {
    nodeEl.appendChild(createBranchComposer(node.id));
  }

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

function createBranchComposer(parentId) {
  const form = document.createElement("form");
  form.className = "branch-composer is-active";

  const textarea = document.createElement("textarea");
  textarea.className = "branch-input";
  textarea.rows = 1;
  textarea.placeholder = "Branch from this message...";
  textarea.setAttribute("aria-label", "Branch message");

  const controls = document.createElement("div");
  controls.className = "branch-composer-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "composer-cancel-btn";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", () => {
    activeBranchParentId = null;
    renderApp();
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "composer-send-btn";
  submitBtn.textContent = "Send branch";

  controls.appendChild(cancelBtn);
  controls.appendChild(submitBtn);
  form.appendChild(textarea);
  form.appendChild(controls);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = textarea.value.trim();
    if (!message || isGenerating) return;
    activeBranchParentId = null;
    void appendConversation(parentId, message);
  });

  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  setTimeout(() => {
    textarea.focus();
    autoResizeTextarea(textarea);
  }, 0);

  textarea.addEventListener("input", () => autoResizeTextarea(textarea));

  return form;
}

function renderMessageText(container, text) {
  const fragment = document.createDocumentFragment();
  const blocks = normalizeMessageText(text).split(/\n{2,}/);

  blocks.forEach((block) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
      const codeEl = document.createElement("pre");
      codeEl.className = "message-code";
      const codeInner = document.createElement("code");
      codeInner.textContent = trimmed.replace(/^```[a-zA-Z0-9_-]*\n?/, "").replace(/```$/, "").trim();
      codeEl.appendChild(codeInner);
      fragment.appendChild(codeEl);
      return;
    }

    const lines = trimmed.split("\n");
    const isList = lines.every((line) => /^[-*]\s+/.test(line.trim()));

    if (isList) {
      const listEl = document.createElement("ul");
      listEl.className = "message-list";
      lines.forEach((line) => {
        const itemEl = document.createElement("li");
        appendInlineText(itemEl, line.replace(/^[-*]\s+/, ""));
        listEl.appendChild(itemEl);
      });
      fragment.appendChild(listEl);
      return;
    }

    const paragraphEl = document.createElement("p");
    paragraphEl.className = "message-paragraph";
    appendInlineText(paragraphEl, trimmed);
    fragment.appendChild(paragraphEl);
  });

  container.appendChild(fragment);
}

function normalizeMessageText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function appendInlineText(container, text) {
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g);

  parts.forEach((part) => {
    if (!part) return;

    if (part.startsWith("`") && part.endsWith("`")) {
      const codeEl = document.createElement("code");
      codeEl.className = "inline-code";
      codeEl.textContent = part.slice(1, -1);
      container.appendChild(codeEl);
      return;
    }

    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      const strongEl = document.createElement("strong");
      strongEl.textContent = part.slice(2, -2);
      container.appendChild(strongEl);
      return;
    }

    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      const emphasisEl = document.createElement("em");
      emphasisEl.textContent = part.slice(1, -1);
      container.appendChild(emphasisEl);
      return;
    }

    container.appendChild(document.createTextNode(part));
  });
}

function toggleNode(nodeId) {
  const tree = getTree();
  const node = findNode(tree, nodeId);
  if (!node || node.children.length === 0) return;

  node.expanded = !node.expanded;
  touchConversation();
  saveConversations();

  const nodeEl = messagesEl.querySelector(`[data-node-id="${nodeId}"]`);
  const childrenEl = nodeEl?.querySelector(":scope > .message-children");
  const toggleBtn = nodeEl?.querySelector(":scope > .message-row .toggle-btn");

  if (!childrenEl || !toggleBtn) {
    renderApp();
    return;
  }

  setBranchExpanded(childrenEl, node.expanded);
  toggleBtn.textContent = node.expanded ? "Collapse" : "Expand";
  toggleBtn.setAttribute("aria-expanded", String(node.expanded));
}

async function appendConversation(parentId, message) {
  if (isGenerating) return;

  const conversation = getActiveConversation();
  if (!conversation) return;

  const tree = conversation.tree;
  const parent = findNode(tree, parentId);
  if (!parent) return;

  const history = buildHistoryFor(parent);
  const userNode = createNode(message, "user");
  parent.children.push(userNode);
  parent.expanded = true;
  latestAiWarning = "";
  isGenerating = true;
  touchConversation(conversation);
  saveConversations();
  renderApp(userNode.id);

  const aiText = await callAi(message, history);
  const assistantNode = createNode(aiText, "assistant");
  parent.children.push(assistantNode);
  isGenerating = false;
  touchConversation(conversation);
  saveConversations();
  renderApp(assistantNode.id);
}

function buildHistoryFor(parent) {
  const tree = getTree();
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

function openBranchComposer(nodeId) {
  activeBranchParentId = activeBranchParentId === nodeId ? null : nodeId;
  renderApp();
}

function editNode(nodeId) {
  if (isGenerating) return;

  const tree = getTree();
  const node = findNode(tree, nodeId);
  if (!node) return;

  const nextText = window.prompt("Edit message:", node.text);
  if (nextText === null) return;

  const trimmed = nextText.trim();
  if (!trimmed) return;

  node.text = trimmed;
  touchConversation();
  saveConversations();
  renderApp();
}

function deleteNode(nodeId) {
  if (isGenerating) return;

  const tree = getTree();
  const parent = findParent(tree, nodeId);
  if (!parent) return;

  parent.children = parent.children.filter((child) => child.id !== nodeId);
  if (activeBranchParentId === nodeId) activeBranchParentId = null;
  touchConversation();
  saveConversations();
  renderApp();
}

function exportTree() {
  const conversation = getActiveConversation();
  if (!conversation) return;

  const data = JSON.stringify(conversation, null, 2);
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "treechat-export.json";
  link.click();
  URL.revokeObjectURL(url);
}

function startNewChat() {
  const conversation = createConversation();
  conversations.unshift(conversation);
  activeConversationId = conversation.id;
  activeBranchParentId = null;
  latestAiWarning = "";
  saveConversations();
  renderApp();
  inputEl.focus();
}

function updateInputState() {
  inputEl.disabled = isGenerating || !currentUser;
  sendBtn.disabled = isGenerating || inputEl.value.trim().length === 0 || !currentUser;
  sendBtn.textContent = isGenerating ? "..." : "Send";
}

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
}

function mergeConversations(localItems, remoteItems) {
  const merged = new Map();

  [...remoteItems, ...localItems].forEach((conversation) => {
    if (!conversation || !conversation.id) return;

    const normalized = normalizeConversation(conversation);
    const existing = merged.get(normalized.id);
    if (!existing) {
      merged.set(normalized.id, normalized);
      return;
    }

    const existingTime = new Date(existing.updatedAt || 0).getTime();
    const incomingTime = new Date(normalized.updatedAt || 0).getTime();
    if (incomingTime >= existingTime) {
      merged.set(normalized.id, normalized);
    }
  });

  return [...merged.values()].sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
  );
}

async function fetchWithAuth(url, options = {}) {
  if (!authSession?.access_token) {
    throw new Error("No active session");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${authSession.access_token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, { ...options, headers });
}

async function loadConversationsFromDatabase() {
  const response = await fetchWithAuth("/api/conversations");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  return Array.isArray(data.conversations) ? data.conversations : [];
}

async function saveConversationToDatabase(conversation) {
  try {
    const response = await fetchWithAuth("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ conversation: normalizeConversation(conversation) }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    databaseStatus = "ready";
  } catch (error) {
    console.warn("Failed to save conversation to database:", error);
    databaseStatus = "offline";
  }
}

async function syncConversationsToDatabase(items) {
  const response = await fetchWithAuth("/api/conversations/bulk-sync", {
    method: "POST",
    body: JSON.stringify({
      conversations: items.map((conversation) => normalizeConversation(conversation)),
    }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  return Array.isArray(data.conversations) ? data.conversations : [];
}

async function hydrateConversations() {
  if (!currentUser) return;

  conversations = loadLocalConversations();
  activeConversationId = loadActiveConversationId();
  isHydrating = true;
  renderApp();

  try {
    const remoteConversations = await loadConversationsFromDatabase();
    const mergedConversations = mergeConversations(conversations, remoteConversations);

    if (mergedConversations.length === 0) {
      const freshConversation = createConversation();
      conversations = [freshConversation];
      activeConversationId = freshConversation.id;
    } else {
      conversations = mergedConversations;
      if (!conversations.some((conversation) => conversation.id === activeConversationId)) {
        activeConversationId = conversations[0].id;
      }
    }

    saveLocalState();
    renderApp();

    const syncedConversations = await syncConversationsToDatabase(conversations);
    if (syncedConversations.length > 0) {
      conversations = syncedConversations.map(normalizeConversation);
      if (!conversations.some((conversation) => conversation.id === activeConversationId)) {
        activeConversationId = conversations[0].id;
      }
    }

    databaseStatus = "ready";
    saveLocalState();
  } catch (error) {
    console.warn("Falling back to browser storage:", error);
    databaseStatus = "offline";
    if (conversations.length === 0) {
      conversations = [createConversation()];
      activeConversationId = conversations[0].id;
      saveLocalState();
    }
  } finally {
    isHydrating = false;
    renderApp();
  }
}

function setAuthMode(mode) {
  authMode = mode;
  signInModeBtn.classList.toggle("is-active", mode === "signin");
  signUpModeBtn.classList.toggle("is-active", mode === "signup");
  authSubmitBtn.textContent = mode === "signin" ? "Sign in" : "Create account";
  authStatusEl.textContent = "";
}

function setAuthStatus(message, isError = false) {
  authStatusEl.textContent = message;
  authStatusEl.style.color = isError ? "#f2a7a4" : "";
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) {
    setAuthStatus("Supabase Auth is not configured yet.", true);
    return;
  }

  authSubmitBtn.disabled = true;
  const email = authEmailEl.value.trim();
  const password = authPasswordEl.value.trim();

  try {
    if (authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (!data.session) {
        setAuthStatus("Account created. Check your email to confirm your account before signing in.");
      } else {
        setAuthStatus("Account created. You are signed in.");
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setAuthStatus("Signed in.");
    }
  } catch (error) {
    setAuthStatus(error.message || "Authentication failed.", true);
  } finally {
    authSubmitBtn.disabled = false;
  }
}

async function handleSignOut() {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    window.alert(error.message || "Failed to sign out.");
  }
}

async function bootstrapAuth() {
  const response = await fetch("/api/app-config");
  appConfig = await response.json();

  if (!appConfig.authConfigured) {
    setAuthStatus("Supabase auth is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY on the server.", true);
    renderAuthState();
    return;
  }

  supabaseClient = window.supabase.createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey);

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  authSession = session;
  currentUser = session?.user || null;

  supabaseClient.auth.onAuthStateChange((_event, sessionValue) => {
    authSession = sessionValue;
    currentUser = sessionValue?.user || null;
    latestAiWarning = "";
    activeBranchParentId = null;

    if (!currentUser) {
      conversations = [];
      activeConversationId = null;
      renderApp();
      return;
    }

    void hydrateConversations();
  });

  renderApp();
  if (currentUser) {
    await hydrateConversations();
  }
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = inputEl.value.trim();
  if (!message || isGenerating || !currentUser) return;

  inputEl.value = "";
  autoResizeTextarea(inputEl);
  updateInputState();
  void appendConversation(getTree().id, message);
});

inputEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    formEl.requestSubmit();
  }
});

inputEl.addEventListener("input", () => {
  autoResizeTextarea(inputEl);
  updateInputState();
});

authFormEl.addEventListener("submit", handleAuthSubmit);
signInModeBtn.addEventListener("click", () => setAuthMode("signin"));
signUpModeBtn.addEventListener("click", () => setAuthMode("signup"));
logoutBtn.addEventListener("click", () => void handleSignOut());
newChatBtn.addEventListener("click", startNewChat);
sidebarNewChatBtn.addEventListener("click", startNewChat);
exportBtn.addEventListener("click", exportTree);

settingsBtn.addEventListener("click", () => {
  const details =
    databaseStatus === "ready"
      ? "Database sync is active for your account."
      : "Database sync is offline, so this browser is using local storage right now.";
  window.alert(`${details}\n\nSettings panel coming soon!`);
});

setAuthMode("signin");
autoResizeTextarea(inputEl);
renderApp();
void bootstrapAuth();
