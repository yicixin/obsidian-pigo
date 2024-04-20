import { App, Editor, Plugin, PluginSettingTab, Setting } from 'obsidian';
import OSS from 'ali-oss';
import * as path from 'path';
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	accessKeyID: string;
	accessKeySecret: string;
	endpoint: string;
	bucket: string;
	dir: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	accessKeyID: "",
	accessKeySecret: "",
	endpoint: "",
	bucket: "",
	dir: ""
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	client: OSS;

	async onload() {
		await this.loadSettings();
		this.initOssClient();

		this.addSettingTab(new SettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
				// 阻止默认的粘贴处理
				evt.preventDefault();

				// 检查粘贴板数据是否包含图片
				if (evt.clipboardData && evt.clipboardData.files.length > 0) {
					const files = Array.from(evt.clipboardData.files).filter(file => file.type.startsWith('image/'));

					if (files.length > 0) {
						// 处理所有图片文件
						for (const file of files) {
							const imageUrl = await this.uploadImage(file);
							console.log("upload success: " + imageUrl);
							this.insertImageUrl(editor, file.name, imageUrl);
						}
					}
				}

				if (evt.clipboardData){
				// 如果没有图片，则按常规文本处理粘贴
				const text = evt.clipboardData.getData('text');
				editor.replaceSelection(text);
				}
			})
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	initOssClient() {
		this.client = new OSS({
			accessKeyId: this.settings.accessKeyID,
			accessKeySecret: this.settings.accessKeySecret,
			endpoint: this.settings.endpoint,
			bucket: this.settings.bucket
		});
	}

	insertImageUrl(editor: Editor, filename: string, url: string) {
		// Create the markdown string for the image
		const imageMarkdown = `![${filename}](${url})`;
		// Insert the image markdown at the current cursor position
		editor.replaceSelection(imageMarkdown);
	}

	async uploadImage(file: File): Promise<string> {
		const extension = path.extname(file.name);
		const date = new Date().toISOString().split('T')[0];
		const randomString = Math.random().toString(36).substring(2, 15);
		const name = `${date}-${randomString}${extension}`;

		const result = await this.client.put(this.settings.dir + name, file);
		return result.url;
	}
}

class SettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'My Plugin Settings' });

		new Setting(containerEl)
			.setName('Access Key ID')
			.setDesc('The Access Key ID for API access')
			.addText(text => text
				.setPlaceholder('Enter your Access Key ID')
				.setValue(this.plugin.settings.accessKeyID)
				.onChange(async (value) => {
					this.plugin.settings.accessKeyID = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Access Key Secret')
			.setDesc('The Access Key Secret for API access')
			.addText(text => text
				.setPlaceholder('Enter your Access Key Secret')
				.setValue(this.plugin.settings.accessKeySecret)
				.onChange(async (value) => {
					this.plugin.settings.accessKeySecret = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Endpoint')
			.setDesc('The API endpoint URL')
			.addText(text => text
				.setPlaceholder('Enter the API endpoint URL')
				.setValue(this.plugin.settings.endpoint)
				.onChange(async (value) => {
					this.plugin.settings.endpoint = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Bucket')
			.setDesc('The storage bucket name')
			.addText(text => text
				.setPlaceholder('Enter the bucket name')
				.setValue(this.plugin.settings.bucket)
				.onChange(async (value) => {
					this.plugin.settings.bucket = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Directory')
			.setDesc('The default directory for uploads')
			.addText(text => text
				.setPlaceholder('Enter the default directory')
				.setValue(this.plugin.settings.dir)
				.onChange(async (value) => {
					this.plugin.settings.dir = value;
					await this.plugin.saveSettings();
				}));

	}
}
