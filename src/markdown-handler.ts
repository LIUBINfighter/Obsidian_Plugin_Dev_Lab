import { TFile, Vault } from 'obsidian';

interface ChatMessage {
    content: string;
    isUser: boolean;
    timestamp: number;
}

export class MarkdownHandler {
    private vault: Vault;

    constructor(vault: Vault) {
        this.vault = vault;
    }

    async createChatFile(filePath: string): Promise<TFile> {
        const content = '---\ntype: chat\n---\n\n# Chat History\n';
        return await this.vault.create(filePath, content);
    }

    async appendMessage(file: TFile, message: ChatMessage): Promise<void> {
        const content = await this.vault.read(file);
        const messageText = `\n## ${message.isUser ? '用户' : 'AI'} - ${new Date(message.timestamp).toLocaleString()}\n\n${message.content}\n`;
        await this.vault.modify(file, content + messageText);
    }

    async readChatHistory(file: TFile): Promise<ChatMessage[]> {
        const content = await this.vault.read(file);
        const messages: ChatMessage[] = [];
        
        const lines = content.split('\n');
        let currentMessage: Partial<ChatMessage> = {};
        let messageContent: string[] = [];

        for (const line of lines) {
            if (line.startsWith('## ')) {
                if (currentMessage.content) {
                    messages.push({
                        content: messageContent.join('\n').trim(),
                        isUser: currentMessage.isUser!,
                        timestamp: currentMessage.timestamp!
                    });
                    messageContent = [];
                }

                const match = line.match(/## (用户|AI) - (.+)/);
                if (match) {
                    currentMessage = {
                        isUser: match[1] === '用户',
                        timestamp: new Date(match[2]).getTime()
                    };
                }
            } else if (currentMessage.timestamp && line.trim()) {
                messageContent.push(line);
            }
        }

        if (currentMessage.timestamp && messageContent.length > 0) {
            messages.push({
                content: messageContent.join('\n').trim(),
                isUser: currentMessage.isUser!,
                timestamp: currentMessage.timestamp
            });
        }

        return messages;
    }
}