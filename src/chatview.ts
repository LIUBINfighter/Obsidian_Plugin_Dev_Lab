import { ItemView, WorkspaceLeaf } from 'obsidian';

export const CHAT_VIEW_TYPE = 'iris-chat-view';

export class ChatView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return CHAT_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Iris Chat';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('div', {
            cls: 'iris-chat-container',
            text: '聊天界面'
        });
    }

    async onClose() {
        // 清理工作
    }
}
