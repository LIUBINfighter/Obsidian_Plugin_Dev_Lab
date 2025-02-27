import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, normalizePath } from 'obsidian';

// Remember to rename these classes and interfaces!

interface ExportPackSettings {
	exportPath: string;
	linkFormat: 'wiki' | 'markdown' | 'html';
}

const DEFAULT_SETTINGS: ExportPackSettings = {
	exportPath: 'exports',
	linkFormat: 'markdown'
}

export default class MarkdownExportPlugin extends Plugin {
	settings: ExportPackSettings;

	// 转换链接格式
	convertLinks(content: string, fileCache: any, links: Set<string>): string {
		const { linkFormat } = this.settings;
		let convertedContent = content;

		// 处理内部链接
		if (fileCache.links) {
			fileCache.links.forEach((link: any) => {
				const originalLink = link.original;
				const linkText = link.displayText || link.link;
				const linkPath = link.link;

				let newLink = '';
				switch (linkFormat) {
					case 'markdown':
						newLink = `[${linkText}](${linkPath})`;
						break;
					case 'html':
						newLink = `<a href="${linkPath}">${linkText}</a>`;
						break;
					case 'wiki':
					default:
						newLink = `[[${linkPath}]]`;
				}

				convertedContent = convertedContent.replace(originalLink, newLink);
			});
		}

		// 处理嵌入文件（包括图片）
		if (fileCache.embeds) {
			fileCache.embeds.forEach((embed: any) => {
				const originalEmbed = embed.original;
				const embedPath = embed.link;
				const isImage = /\.(png|jpg|jpeg|gif|svg)$/i.test(embedPath);

				let newEmbed = '';
				switch (linkFormat) {
					case 'markdown':
						newEmbed = isImage ? `![](${embedPath})` : `[${embedPath}](${embedPath})`;
						break;
					case 'html':
						newEmbed = isImage ? `<img src="${embedPath}" alt="">` : `<a href="${embedPath}">${embedPath}</a>`;
						break;
					case 'wiki':
					default:
						newEmbed = `![[${embedPath}]]`;
				}

				convertedContent = convertedContent.replace(originalEmbed, newEmbed);
			});
		}

		return convertedContent;
	}

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
		const exportFolderPath = normalizePath(`${file.parent.path}/${this.settings.exportPath}`);
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

		// 读取主文档内容
		console.log(`正在处理主文档：${file.path}`);
		let content = await this.app.vault.read(file);

		// 转换文档中的链接格式
		content = this.convertLinks(content, fileCache, links);

		// 写入转换后的文档
		await this.app.vault.adapter.write(`${exportFolderPath}/${file.name}`, content);
		console.log('主文档处理完成');

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

		new Setting(containerEl)
			.setName('链接格式')
			.setDesc('选择导出文档中的链接格式')
			.addDropdown(dropdown => dropdown
				.addOption('wiki', 'Wiki链接 [[文件名]]')
				.addOption('markdown', 'Markdown链接 [文件名](路径)')
				.addOption('html', 'HTML链接 <a href="路径">文件名</a>')
				.setValue(this.plugin.settings.linkFormat)
				.onChange(async (value: 'wiki' | 'markdown' | 'html') => {
					this.plugin.settings.linkFormat = value;
					await this.plugin.saveSettings();
				}));
	}
}
