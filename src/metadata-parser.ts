export interface IrisMetadata {
    irisChat?: string;
}

export class MetadataParser {
    static isChatFile(metadata: any): boolean {
        if (!metadata) return false;
        return metadata['iris-chat'] !== undefined;
    }

    static parseMetadata(metadata: any): IrisMetadata {
        return {
            irisChat: metadata['iris-chat']
        };
    }
}
