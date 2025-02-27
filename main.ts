import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface ExportPackSettings {
	exportPath: string;
}

const DEFAULT_SETTINGS: ExportPackSettings = {
	exportPath: 'exports'
}

export default class MarkdownExportPlugin extends Plugin {
	settings: ExportPackSettings;

	async onload() {
		await this.loadSettings();

		// 添加导出命令
		this.addCommand({
			id: 'export-markdown-pack',
			name: '导出Markdown文档包',
			checkCallback: (checking: boolean) => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView) {
					if (!checking) {
						this.exportMarkdownPack(activeView);
					}
					return true;
				}
				return false;
			}
		});

		// 添加功能图标到左侧栏
		const ribbonIconEl = this.addRibbonIcon('package', 'Export Markdown Pack', async () => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				await this.exportMarkdownPack(activeView);
			} else {
				new Notice('请先打开一个Markdown文件！');
			}
		});

		// 添加设置选项
		this.addSettingTab(new ExportPackSettingTab(this.app, this));

		// 添加状态栏
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('导出准备就绪');
	}

	onunload() {
	}

	async exportMarkdownPack(view: MarkdownView) {
		const file = view.file;
		if (!file) {
			console.log('导出失败：未能获取当前文件信息');
			new Notice('无法获取当前文件信息');
			return;
		}

		console.log(`开始导出文档包，源文件：${file.path}`);

		// 创建导出目录
		const exportFolderPath = `${file.parent.path}/${this.settings.exportPath}`;
		try {
			console.log(`正在创建导出目录：${exportFolderPath}`);
			await this.app.vault.adapter.mkdir(exportFolderPath);
			console.log('导出目录创建成功');
		} catch (error) {
			console.log('目录已存在或创建失败', error);
		}

		// 获取文档的元数据缓存
		const fileCache = this.app.metadataCache.getFileCache(file);
		if (!fileCache) {
			console.log('无法获取文件的元数据缓存');
			new Notice('导出失败：无法获取文件的元数据信息');
			return;
		}

		// 收集所有链接和嵌入
		const links = new Set<string>();
		
		// 处理内部链接
		if (fileCache.links) {
			fileCache.links.forEach(link => {
				if (link.link) links.add(link.link);
			});
		}

		// 处理嵌入文件（包括图片）
		if (fileCache.embeds) {
			fileCache.embeds.forEach(embed => {
				if (embed.link) links.add(embed.link);
			});
		}

		console.log(`文档分析完成，发现 ${links.size} 个链接和嵌入`);

		// 复制主文档
		console.log(`正在复制主文档到：${exportFolderPath}/${file.name}`);
		await this.app.vault.adapter.copy(file.path, `${exportFolderPath}/${file.name}`);
		console.log('主文档复制完成');

		// 复制链接的文件和附件
		let successCount = 0;
		let failCount = 0;

		for (const link of links) {
			try {
				const linkedFile = this.app.metadataCache.getFirstLinkpathDest(link, file.path);
				if (linkedFile) {
					// 保持相对路径结构
					const relativePath = linkedFile.path.replace(linkedFile.parent.path + '/', '');
					const targetPath = `${exportFolderPath}/${relativePath}`;
					
					// 确保目标目录存在
					const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/'));
					await this.app.vault.adapter.mkdir(targetDir);

					console.log(`正在复制链接文件：${link} -> ${targetPath}`);
					await this.app.vault.adapter.copy(linkedFile.path, targetPath);
					successCount++;
				} else {
					console.log(`未找到链接文件：${link}`);
					failCount++;
				}
			} catch (error) {
				console.error(`复制文件失败: ${link}`, error);
				failCount++;
			}
		}

		console.log(`导出完成：成功 ${successCount} 个，失败 ${failCount} 个`);
		new Notice(`文档包已导出到 ${exportFolderPath}`);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ExportPackSettingTab extends PluginSettingTab {
	plugin: MarkdownExportPlugin;

	constructor(app: App, plugin: MarkdownExportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('导出路径')
			.setDesc('设置导出文件包的存储路径（相对于当前文档所在目录）')
			.addText(text => text
				.setPlaceholder('exports')
				.setValue(this.plugin.settings.exportPath)
				.onChange(async (value) => {
					this.plugin.settings.exportPath = value;
					await this.plugin.saveSettings();
				}));
	}
}
