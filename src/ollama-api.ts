interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

interface OllamaModelResponse {
    models: Array<{
        name: string;
        modified_at: string;
        size: number;
    }>;
}

export class OllamaAPI {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = 'http://localhost:11434', model: string = 'deepseek-r1:latest') {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    private async checkModelAvailability(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json() as OllamaModelResponse;
            return data.models.some(model => model.name === this.model);
        } catch (error) {
            console.error('Error checking model availability:', error);
            return false;
        }
    }

    async chat(prompt: string): Promise<string> {
        try {
            const modelAvailable = await this.checkModelAvailability();
            if (!modelAvailable) {
                throw new Error(`模型 ${this.model} 未在本地找到。请使用 'ollama pull ${this.model}' 命令下载模型。`);
            }
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as OllamaResponse;
            return data.response;
        } catch (error) {
            console.error('Error calling Ollama API:', error);
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                throw new Error('无法连接到Ollama服务。请确保Ollama服务已启动并在运行在端口11434上。');
            } else if (error instanceof Error) {
                throw new Error(`调用Ollama API时出错: ${error.message}`);
            } else {
                throw new Error('调用Ollama API时发生未知错误。');
            }
        }
    }
}
