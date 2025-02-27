export interface ImageData {
    id: string;           // 图片唯一标识符
    name: string;         // 图片名称
    base64: string;       // base64编码的图片数据
    timestamp: number;    // 创建时间戳
    mimeType: string;     // 图片MIME类型
}

export interface PluginSettings {
    imageStoragePath: string;     // 图片存储文件夹路径
    imageData: Record<string, ImageData>;  // 图片数据映射表
}

export const DEFAULT_SETTINGS: PluginSettings = {
    imageStoragePath: 'images',
    imageData: {}
};