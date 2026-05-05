const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chatForm");
const inputEl = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const sidebarNewChatBtn = document.getElementById("sidebarNewChatBtn");
const sidebarSearchEl = document.getElementById("sidebarSearch");
const conversationListEl = document.getElementById("conversationList");
const exportBtn = document.getElementById("exportBtn");
const settingsBtn = document.getElementById("settingsBtn");
const toastLayerEl = document.getElementById("toastLayer");
const tutorialBtn = document.getElementById("tutorialBtn");
const tutorialModalEl = document.getElementById("tutorialModal");
const tutorialSlideEl = document.getElementById("tutorialSlide");
const tutorialDotsEl = document.getElementById("tutorialDots");
const tutorialPrevBtn = document.getElementById("tutorialPrevBtn");
const tutorialNextBtn = document.getElementById("tutorialNextBtn");
const tutorialCloseBtn = document.getElementById("tutorialCloseBtn");

const STORE_KEY = "treechat-conversations:v1";
const ACTIVE_KEY = "treechat-active-conversation:v1";
const LEGACY_TREE_KEY = "treechat-tree:v3";
const TUTORIAL_SEEN_KEY = "treechat-tutorial-seen:v1";

let conversations = loadLocalConversations();
let activeConversationId = loadActiveConversationId();
let latestAiWarning = "";
let activeBranchParentId = null;
let isGenerating = false;
let isHydrating = false;
let databaseStatus = "syncing";
let conversationSearchTerm = "";
let pendingDeleteToast = null;
let tutorialIndex = 0;

const tutorialSlides = [
  {
    title: "Start simple",
    body: "Chat normally first. Only branch when a reply deserves its own path.",
    points: [
      "Main flow stays clean",
      "Branch from AI replies",
      "Context stays attached",
    ],
    art: "branching",
  },
  {
    title: "Explore alternatives",
    body: "Use branches to compare directions without losing the answer you already liked.",
    points: [
      "Compare prompt ideas",
      "Collapse when needed",
      "Pin strong chats",
    ],
    art: "compare",
  },
  {
    title: "Keep momentum",
    body: "Copy code, ask follow-ups, and spin off a branch when one answer needs deeper work.",
    points: [
      "Copy code instantly",
      "Guide stays here anytime",
      "Made for thinking in threads",
    ],
    art: "code",
  },
];

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
    title,
    pinned: false,
    titleLocked: false,
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

function loadLocalConversations() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizeConversation);
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
    const savedId = localStorage.getItem(ACTIVE_KEY);
    if (savedId && conversations.some((conversation) => conversation.id === savedId)) return savedId;
  } catch (error) {
    console.warn("Failed to load active conversation:", error);
  }

  return conversations[0]?.id || null;
}

function getActiveConversation() {
  return conversations.find((conversation) => conversation.id === activeConversationId) || conversations[0] || null;
}

function normalizeConversation(conversation) {
  return {
    ...conversation,
    pinned: Boolean(conversation?.pinned),
    titleLocked: Boolean(conversation?.titleLocked),
  };
}

function getTree() {
  return getActiveConversation()?.tree || createRoot();
}

function saveLocalState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(conversations));
    if (activeConversationId) {
      localStorage.setItem(ACTIVE_KEY, activeConversationId);
    }
  } catch (error) {
    console.warn("Failed to save conversations:", error);
  }
}

function saveConversations() {
  saveLocalState();
  const conversation = getActiveConversation();
  if (conversation) {
    void saveConversationToDatabase(conversation);
  }
}

function touchConversation(conversation = getActiveConversation()) {
  if (!conversation) return;
  conversation.updatedAt = new Date().toISOString();
  if (!conversation.titleLocked) {
    conversation.title = getConversationTitle(conversation.tree);
  }
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
  renderSidebar();
  renderTree(animatedNodeId);
  updateInputState();
}

function renderSidebar() {
  conversationListEl.innerHTML = "";
  const search = conversationSearchTerm.trim().toLowerCase();
  const sorted = [...conversations]
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .filter((conversation) => {
      if (!search) return true;
      return conversation.title.toLowerCase().includes(search);
    });

  if (sorted.length === 0) {
    const empty = document.createElement("div");
    empty.className = "conversation-item";
    empty.textContent = "No matching chats";
    conversationListEl.appendChild(empty);
    return;
  }

  sorted.forEach((conversation) => {
    const item = document.createElement("div");
    item.className = "conversation-item";
    if (conversation.id === activeConversationId) item.classList.add("is-active");

    const mainButton = document.createElement("button");
    mainButton.type = "button";
    mainButton.className = "conversation-item-main";
    mainButton.title = conversation.title || "New chat";
    mainButton.addEventListener("click", () => {
      activeConversationId = conversation.id;
      activeBranchParentId = null;
      latestAiWarning = "";
      saveConversations();
      renderApp();
      inputEl.focus();
    });

    const title = document.createElement("span");
    title.className = "conversation-item-title";
    title.textContent = conversation.title || "New chat";
    title.addEventListener("dblclick", () => renameConversation(conversation.id));

    const meta = document.createElement("span");
    meta.className = "conversation-item-meta";
    meta.textContent = conversation.pinned ? "Pinned" : formatConversationTime(conversation.updatedAt);

    const pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = "conversation-action conversation-pin";
    if (conversation.pinned) pinBtn.classList.add("is-active");
    pinBtn.textContent = conversation.pinned ? "Pinned" : "Pin";
    pinBtn.title = conversation.pinned ? "Unpin chat" : "Pin chat";
    pinBtn.setAttribute("aria-label", pinBtn.title);
    pinBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleConversationPin(conversation.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "conversation-action conversation-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.title = "Delete chat";
    deleteBtn.setAttribute("aria-label", deleteBtn.title);
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteConversation(conversation.id);
    });

    const actions = document.createElement("div");
    actions.className = "conversation-actions";
    actions.appendChild(pinBtn);
    actions.appendChild(deleteBtn);

    mainButton.appendChild(title);
    mainButton.appendChild(meta);
    item.appendChild(mainButton);
    item.appendChild(actions);
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
  textEl.textContent = isHydrating
    ? "Loading saved conversations..."
    : "Start with a normal message. Use Branch on any reply when you want a side path.";

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
  if (node.children.length > 0) nodeEl.classList.add("has-children");
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

  const actionsEl = document.createElement("div");
  actionsEl.className = "message-actions";
  if (node.children.length > 0) {
    actionsEl.appendChild(toggleBtn);
  }

  if (node.role === "assistant") {
    const branchBtn = document.createElement("button");
    branchBtn.type = "button";
    branchBtn.className = "branch-btn";
    branchBtn.textContent = activeBranchParentId === node.id ? "Branching" : "Branch";
    branchBtn.title = "Create a side branch from this reply";
    branchBtn.setAttribute("aria-label", branchBtn.title);
    branchBtn.disabled = isGenerating;
    branchBtn.addEventListener("click", () => openBranchComposer(node.id));
    actionsEl.appendChild(branchBtn);
  }

  rowEl.appendChild(bubbleEl);
  if (actionsEl.childElementCount > 0) {
    rowEl.appendChild(actionsEl);
  }
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
  submitBtn.textContent = "Start branch";

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
      const codeWrap = document.createElement("div");
      codeWrap.className = "message-code-wrap";

      const codeEl = document.createElement("pre");
      codeEl.className = "message-code";
      const codeInner = document.createElement("code");
      const codeText = trimmed.replace(/^```[a-zA-Z0-9_-]*\n?/, "").replace(/```$/, "").trim();
      codeInner.textContent = codeText;
      codeEl.appendChild(codeInner);

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "code-copy-btn";
      copyBtn.textContent = "Copy";
      copyBtn.title = "Copy code";
      copyBtn.setAttribute("aria-label", copyBtn.title);
      copyBtn.addEventListener("click", () => {
        void copyText(codeText, "Code copied.");
      });

      codeWrap.appendChild(codeEl);
      codeWrap.appendChild(copyBtn);
      fragment.appendChild(codeWrap);
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
  flashNode(parentId);
  flashNode(assistantNode.id);
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
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 20000);
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ message, history }),
      });
      window.clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const busy = response.status === 503 || /busy|overloaded|high demand/i.test(data?.warning || data?.error || "");
        if (busy && attempt < 2) {
          latestAiWarning = "AI is currently busy, retrying...";
          renderApp();
          await delay(500 * 2 ** attempt);
          continue;
        }

        throw new Error(data?.error || `HTTP ${response.status}`);
      }

      latestAiWarning =
        data.warning || (data.source === "mock" ? "AI is unavailable right now, so a fallback reply was used." : "");
      return data.generated_text || getMockResponse();
    } catch (error) {
      lastError = error;
      const busy = /503|busy|overloaded|high demand/i.test(String(error?.message || ""));
      if (busy && attempt < 2) {
        latestAiWarning = "AI is currently busy, retrying...";
        renderApp();
        await delay(500 * 2 ** attempt);
        continue;
      }

      if (attempt < 2) {
        latestAiWarning =
          error?.name === "AbortError"
            ? "AI took too long to respond, retrying..."
            : "AI request failed, retrying...";
        renderApp();
        await delay(500 * 2 ** attempt);
      }
    }
  }

  console.error("AI API call failed:", lastError);
  latestAiWarning = "AI request failed, so a fallback reply was used.";
  return getMockResponse();
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
  inputEl.disabled = isGenerating;
  sendBtn.disabled = isGenerating || inputEl.value.trim().length === 0;
  sendBtn.textContent = isGenerating ? "..." : "Send";
}

function formatConversationTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renameConversation(conversationId) {
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) return;

  const nextTitle = window.prompt("Rename chat:", conversation.title || "New chat");
  if (nextTitle === null) return;

  const trimmed = nextTitle.trim();
  if (!trimmed) return;

  conversation.title = trimmed;
  conversation.titleLocked = true;
  touchConversation(conversation);
  saveConversations();
  renderApp();
}

function toggleConversationPin(conversationId) {
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) return;

  conversation.pinned = !conversation.pinned;
  touchConversation(conversation);
  saveConversations();
  renderApp();
}

function deleteConversation(conversationId) {
  const index = conversations.findIndex((item) => item.id === conversationId);
  if (index === -1) return;

  const [deletedConversation] = conversations.splice(index, 1);
  const previousActiveId = activeConversationId;

  if (conversations.length === 0) {
    const fallback = createConversation();
    conversations = [fallback];
    activeConversationId = fallback.id;
  } else if (activeConversationId === conversationId) {
    activeConversationId = conversations[Math.max(0, index - 1)].id;
  }

  saveConversations();
  renderApp();

  showUndoToast({
    label: "Chat deleted.",
    undo: () => {
      if (conversations.length === 1 && conversations[0].tree.children.length === 0) {
        conversations = [];
      }

      conversations.splice(index, 0, deletedConversation);
      activeConversationId = previousActiveId;
      saveConversations();
      renderApp();
    },
  });
}

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
}

function mergeConversations(localItems, remoteItems) {
  const merged = new Map();

  [...remoteItems, ...localItems].forEach((conversation) => {
    if (!conversation || !conversation.id) return;

    const existing = merged.get(conversation.id);
    if (!existing) {
      merged.set(conversation.id, conversation);
      return;
    }

    const existingTime = new Date(existing.updatedAt || 0).getTime();
    const incomingTime = new Date(conversation.updatedAt || 0).getTime();
    if (incomingTime >= existingTime) {
      merged.set(conversation.id, conversation);
    }
  });

  return [...merged.values()].sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
  );
}

async function loadConversationsFromDatabase() {
  const response = await fetch("/api/conversations");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  return Array.isArray(data.conversations) ? data.conversations : [];
}

async function saveConversationToDatabase(conversation) {
  try {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation }),
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
  const response = await fetch("/api/conversations/bulk-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversations: items }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  return Array.isArray(data.conversations) ? data.conversations : [];
}

async function hydrateConversations() {
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

function flashNode(nodeId) {
  window.setTimeout(() => {
    const nodeEl = messagesEl.querySelector(`[data-node-id="${nodeId}"]`);
    if (!nodeEl) return;
    nodeEl.classList.remove("is-highlighted");
    void nodeEl.offsetWidth;
    nodeEl.classList.add("is-highlighted");
    window.setTimeout(() => nodeEl.classList.remove("is-highlighted"), 1100);
  }, 40);
}

async function copyText(text, successLabel) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      helper.remove();
    }

    showToast({ label: successLabel });
  } catch (error) {
    console.warn("Failed to copy text:", error);
    showToast({ label: "Copy failed. Try again." });
  }
}

function showToast({ label, actionLabel, action, duration = 5000 }) {
  if (pendingDeleteToast?.cleanup) {
    pendingDeleteToast.cleanup();
  }

  toastLayerEl.innerHTML = "";

  const toast = document.createElement("div");
  toast.className = "toast";

  const copy = document.createElement("div");
  copy.className = "toast-copy";
  copy.textContent = label;
  toast.appendChild(copy);

  let timer = null;
  const cleanup = () => {
    if (timer) {
      window.clearTimeout(timer);
    }

    if (toast.parentNode) toast.remove();
    pendingDeleteToast = null;
  };

  if (actionLabel && typeof action === "function") {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action";
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener("click", () => {
      cleanup();
      action();
    });
    toast.appendChild(actionBtn);
  }

  toastLayerEl.appendChild(toast);
  timer = window.setTimeout(cleanup, duration);
  pendingDeleteToast = { cleanup };
}

function showUndoToast({ label, undo }) {
  showToast({ label, actionLabel: "Undo", action: undo, duration: 5000 });
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function shouldAutoOpenTutorial() {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) !== "true";
  } catch (error) {
    console.warn("Failed to read tutorial state:", error);
    return true;
  }
}

function setTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
  } catch (error) {
    console.warn("Failed to save tutorial state:", error);
  }
}

function renderTutorialArt(art) {
  if (art === "branching") {
    return `
      <div class="tutorial-artboard">
        <div class="tutorial-mini-toolbar">
          <span class="tutorial-mini-dot"></span>
          <span class="tutorial-mini-dot"></span>
          <span class="tutorial-mini-dot"></span>
        </div>
        <div class="tutorial-thread">
          <div class="tutorial-node assistant">
            <span class="tutorial-node-label">Main reply</span>
            <div class="tutorial-node-copy">Here is the core answer to your question.</div>
          </div>
          <div class="tutorial-node user">
            <span class="tutorial-node-label">Follow-up</span>
            <div class="tutorial-node-copy">What if we explore a simpler approach?</div>
          </div>
          <div class="tutorial-node branch">
            <span class="tutorial-node-label">Branch</span>
            <div class="tutorial-node-copy">Keep a side path without interrupting the main thread.</div>
          </div>
        </div>
      </div>
    `;
  }

  if (art === "compare") {
    return `
      <div class="tutorial-artboard">
        <div class="tutorial-mini-toolbar">
          <span class="tutorial-mini-dot"></span>
          <span class="tutorial-mini-dot"></span>
          <span class="tutorial-mini-dot"></span>
        </div>
        <div class="tutorial-thread">
          <div class="tutorial-node assistant">
            <span class="tutorial-node-label">Original answer</span>
            <div class="tutorial-node-copy">A structured response stays in the main path.</div>
          </div>
          <div class="tutorial-node branch">
            <span class="tutorial-node-label">Alternative branch</span>
            <div class="tutorial-node-copy">Test a faster version, a creative version, or a code-heavy version.</div>
          </div>
          <div class="tutorial-node branch">
            <span class="tutorial-node-label">Another branch</span>
            <div class="tutorial-node-copy">Compare directions instead of rewriting the same answer over and over.</div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="tutorial-artboard">
      <div class="tutorial-mini-toolbar">
        <span class="tutorial-mini-dot"></span>
        <span class="tutorial-mini-dot"></span>
        <span class="tutorial-mini-dot"></span>
      </div>
      <div class="tutorial-code-card">
        <div class="tutorial-code-header">
          <span class="tutorial-node-label">Code reply</span>
          <span class="tutorial-code-pill">Copy</span>
        </div>
        <div class="tutorial-code-line w-92"></div>
        <div class="tutorial-code-line w-80"></div>
        <div class="tutorial-code-line w-66"></div>
        <div class="tutorial-code-line w-48"></div>
      </div>
      <div class="tutorial-thread">
        <div class="tutorial-node branch">
          <span class="tutorial-node-label">Next step</span>
          <div class="tutorial-node-copy">Branch from the code reply to ask for a cleaner version, tests, or explanation.</div>
        </div>
      </div>
    </div>
  `;
}

function renderTutorial() {
  if (!tutorialSlideEl || !tutorialDotsEl) return;

  const slide = tutorialSlides[tutorialIndex];
  tutorialSlideEl.innerHTML = `
    <div class="tutorial-copy" id="tutorialBody">
      <h3>${slide.title}</h3>
      <p>${slide.body}</p>
      <div class="tutorial-points">
        ${slide.points
          .map(
            (point, index) => `
              <div class="tutorial-point">
                <span class="tutorial-point-mark">${index + 1}</span>
                <div class="tutorial-point-copy">${point}</div>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
    ${renderTutorialArt(slide.art)}
  `;

  tutorialDotsEl.innerHTML = tutorialSlides
    .map((_, index) => `<span class="tutorial-dot${index === tutorialIndex ? " is-active" : ""}"></span>`)
    .join("");

  tutorialPrevBtn.disabled = tutorialIndex === 0;
  tutorialNextBtn.textContent = tutorialIndex === tutorialSlides.length - 1 ? "Done" : "Next";
}

function openTutorial() {
  if (!tutorialModalEl) return;
  renderTutorial();
  tutorialModalEl.classList.remove("is-hidden");
  tutorialModalEl.setAttribute("aria-hidden", "false");
  setTutorialSeen();
}

function closeTutorial() {
  tutorialModalEl.classList.add("is-hidden");
  tutorialModalEl.setAttribute("aria-hidden", "true");
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = inputEl.value.trim();
  if (!message || isGenerating) return;

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

newChatBtn.addEventListener("click", startNewChat);
sidebarNewChatBtn.addEventListener("click", startNewChat);
exportBtn.addEventListener("click", exportTree);
sidebarSearchEl.addEventListener("input", () => {
  conversationSearchTerm = sidebarSearchEl.value || "";
  renderSidebar();
});

settingsBtn.addEventListener("click", () => {
  const details =
    databaseStatus === "ready"
      ? "Database sync is active."
      : "Database sync is offline, so this browser is using local storage right now.";
  window.alert(`${details}\n\nSettings panel coming soon!`);
});

tutorialCloseBtn?.addEventListener("click", closeTutorial);
tutorialPrevBtn?.addEventListener("click", () => {
  tutorialIndex = Math.max(0, tutorialIndex - 1);
  renderTutorial();
});
tutorialNextBtn?.addEventListener("click", () => {
  if (tutorialIndex >= tutorialSlides.length - 1) {
    closeTutorial();
    return;
  }

  tutorialIndex += 1;
  renderTutorial();
});
tutorialBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (tutorialModalEl && !tutorialModalEl.classList.contains("is-hidden")) {
    closeTutorial();
    return;
  }
  tutorialIndex = 0;
  openTutorial();
});
tutorialModalEl?.addEventListener("click", (event) => {
  event.stopPropagation();
});
window.addEventListener("click", (event) => {
  if (!tutorialModalEl || tutorialModalEl.classList.contains("is-hidden")) return;
  const target = event.target;
  if (target instanceof Node && !tutorialModalEl.contains(target) && target !== tutorialBtn) {
    closeTutorial();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && tutorialModalEl && !tutorialModalEl.classList.contains("is-hidden")) {
    closeTutorial();
  }
});

autoResizeTextarea(inputEl);
renderApp();
void hydrateConversations();
