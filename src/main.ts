import { App, Editor, Plugin, PluginSettingTab, Setting, normalizePath } from 'obsidian';
import { v4 as uuidv4 } from 'uuid';
import { ImageData, PluginSettings, DEFAULT_SETTINGS } from './types';
import * as fs from 'fs';
import * as path from 'path';

export default class ImageToBase64Plugin extends Plugin {
    settings: PluginSettings;
    async onload() {
        console.log('ImageToBase64Plugin is loading...');
        await this.loadSettings();

        // 确保图片存储目录存在
        const vaultBasePath = this.app.vault.adapter.basePath;
        const imageDir = path.join(vaultBasePath, this.settings.imageStoragePath);
        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
        }

        // 注册编辑器粘贴事件
        this.registerEvent(
            this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
                console.log('Paste event triggered');
                const items = evt.clipboardData?.items;
                if (!items) {
                    console.log('No clipboard data found');
                    return;
                }

                console.log('Clipboard items:', items.length);
                // 查找剪贴板中的图片数据
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    console.log('Item type:', item.type);
                    if (item.type.startsWith('image/')) {
                        console.log('Found image in clipboard');
                        // 阻止默认粘贴行为
                        evt.preventDefault();

                        // 获取图片blob数据
                        const blob = item.getAsFile();
                        if (!blob) {
                            console.log('Failed to get blob data');
                            continue;
                        }

                        console.log('Converting image to base64...');
                        // 转换为base64
                        const reader = new FileReader();
                        reader.onload = async () => {
                            const base64String = reader.result as string;
                            console.log('Base64 conversion successful');

                            // 生成唯一ID和图片名称
                            const imageId = uuidv4();
                            const timestamp = Date.now();
                            const imageName = `image_${timestamp}`;

                            // 保存图片文件
                            const vaultBasePath = this.app.vault.adapter.basePath;
                            const imageDir = path.join(vaultBasePath, this.settings.imageStoragePath);
                            const imageExt = blob.type.split('/')[1];
                            const imageFileName = `${imageId}.${imageExt}`;
                            const imageFilePath = path.join(imageDir, imageFileName);

                            // 将 base64 转换为 Buffer 并保存为文件
                            const base64Data = base64String.split(',')[1];
                            const imageBuffer = Buffer.from(base64Data, 'base64');
                            fs.writeFileSync(imageFilePath, imageBuffer);

                            // 创建图片数据对象
                            const imageData: ImageData = {
                                id: imageId,
                                name: imageName,
                                base64: base64String,  // 存储完整的 base64 数据
                                timestamp: timestamp,
                                mimeType: blob.type
                            };

                            // 保存图片数据到设置中
                            this.settings.imageData[imageId] = imageData;
                            await this.saveSettings();

                            // 插入图片引用，使用 ID
                            const imageReference = `![${imageName}](obsidian://image/${imageId})`;
                            editor.replaceSelection(imageReference);
                            console.log('Image reference inserted:', imageId);
                        };
                        reader.readAsDataURL(blob);
                        break;
                    }
                }
            })
        );



        console.log('ImageToBase64Plugin loaded successfully');
    }
    onunload() {}
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }
}
