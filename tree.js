// Tree Chat - Frontend JavaScript
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
        messageDiv.className = `message ${node.role}`;
        messageDiv.dataset.nodeId = node.id;
        messageDiv.style.marginLeft = `${depth * 20}px`;

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
                throw new Error(`HTTP error! status: ${response.status}`);
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
});