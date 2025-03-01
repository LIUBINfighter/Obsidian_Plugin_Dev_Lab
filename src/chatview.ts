import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { OllamaAPI } from './ollama-api';
import { MarkdownHandler } from './markdown-handler';

export const CHAT_VIEW_TYPE = 'iris-chat-view';

export class ChatView extends ItemView {
    private messageContainer: HTMLElement;
    private inputElement: HTMLTextAreaElement;
    private ollamaAPI: OllamaAPI;
    private markdownHandler: MarkdownHandler;
    private currentFile: TFile | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.ollamaAPI = new OllamaAPI();
        this.markdownHandler = new MarkdownHandler(this.app.vault);
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

        const chatContainer = container.createEl('div', { cls: 'iris-chat-container' });

        // 创建头部
        const header = chatContainer.createEl('div', { cls: 'iris-chat-header' });
        header.createEl('div', { cls: 'iris-chat-title', text: 'Iris Chat' });

        // 创建消息列表区域
        this.messageContainer = chatContainer.createEl('div', { cls: 'iris-chat-messages' });

        // 创建输入区域
        const inputContainer = chatContainer.createEl('div', { cls: 'iris-chat-input-container' });
        this.inputElement = inputContainer.createEl('textarea', {
            cls: 'iris-chat-input',
            attr: { placeholder: '输入消息...' }
        });

        // 创建发送按钮
        const sendButton = inputContainer.createEl('button', {
            cls: 'iris-send-button',
            text: '发送'
        });

        // 添加发送消息的事件监听
        sendButton.addEventListener('click', () => this.sendMessage());
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 如果有当前文件，加载聊天历史
        if (this.currentFile) {
            const messages = await this.markdownHandler.readChatHistory(this.currentFile);
            messages.forEach(msg => this.addMessage(msg.content, msg.isUser));
        } else {
            this.addMessage('你好！我是 Iris，你的 AI 助手。', false);
        }
    }

    private addMessage(content: string, isUser: boolean) {
        const messageEl = this.messageContainer.createEl('div', {
            cls: `iris-message ${isUser ? 'user' : ''}`
        });

        messageEl.createEl('div', { cls: 'iris-message-avatar' });

        const messageContent = messageEl.createEl('div', { cls: 'iris-message-content' });
        messageContent.createEl('div', {
            cls: 'iris-message-bubble',
            text: content
        });

        // 滚动到最新消息
        this.messageContainer.scrollTo({
            top: this.messageContainer.scrollHeight,
            behavior: 'smooth'
        });
    }

    async setCurrentFile(file: TFile) {
        this.currentFile = file;
        const messages = await this.markdownHandler.readChatHistory(file);
        this.messageContainer.empty();
        messages.forEach(msg => this.addMessage(msg.content, msg.isUser));
    }

    private async sendMessage() {
        const content = this.inputElement.value.trim();
        if (!content) return;

        // 清空输入框
        this.inputElement.value = '';

        // 添加用户消息到界面
        this.addMessage(content, true);

        try {
            // 如果没有当前文件，创建新的聊天文件
            if (!this.currentFile) {
                const fileName = `chat-${Date.now()}.md`;
                this.currentFile = await this.markdownHandler.createChatFile(fileName);
            }

            // 保存用户消息
            await this.markdownHandler.appendMessage(this.currentFile, {
                content,
                isUser: true,
                timestamp: Date.now()
            });

            // 获取AI响应
            const response = await this.ollamaAPI.chat(content);

            // 添加AI响应到界面
            this.addMessage(response, false);

            // 保存AI响应
            await this.markdownHandler.appendMessage(this.currentFile, {
                content: response,
                isUser: false,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error in chat:', error);
            this.addMessage('抱歉，发生了一些错误。请稍后重试。', false);
        }
    }

    async onClose() {
        // 清理工作
    }
}
