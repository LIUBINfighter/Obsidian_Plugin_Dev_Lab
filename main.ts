import { Plugin, MarkdownView } from 'obsidian';
import { MetadataParser } from './src/metadata-parser';
import { ChatView, CHAT_VIEW_TYPE } from './src/chatview';

export default class IrisChatPlugin extends Plugin {
    async onload() {
        // 注册视图类型
        this.registerView(
            CHAT_VIEW_TYPE,
            (leaf) => new ChatView(leaf)
        );

        // 注册文件打开事件处理
        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!file) return;

                const metadata = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (MetadataParser.isChatFile(metadata)) {
                    // 获取活动叶子
                    const leaf = this.app.workspace.getLeaf();
                    // 切换到聊天视图
                    await leaf.setViewState({
                        type: CHAT_VIEW_TYPE,
                        state: { file: file.path }
                    });
                }
            })
        );
    }

    async onunload() {
        // 清理注册的视图
        this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);
    }
}
