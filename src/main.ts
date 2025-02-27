import { App, Editor, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class ImageToBase64Plugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log('ImageToBase64Plugin is loading...');
		await this.loadSettings();

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
						reader.onload = () => {
							const base64String = reader.result as string;
							console.log('Base64 conversion successful');
							// 插入Markdown格式的图片
							const imageMarkdown = `![image](${base64String})`;
							editor.replaceSelection(imageMarkdown);
							console.log('Image markdown inserted');
						};
						reader.readAsDataURL(blob);
						break;
					}
				}
			})
		);

		console.log('ImageToBase64Plugin loaded successfully');

		// 添加设置选项卡
		this.addSettingTab(new ImageToBase64SettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
