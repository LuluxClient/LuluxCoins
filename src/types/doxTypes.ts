export type DoxItemType = 'message' | 'image' | 'link';

export interface DoxItem {
    type: DoxItemType;
    content: string;
    title?: string;
}

export interface VendettaDoxConfig {
    countdownChannelId: string;
    christmasDate: string;
    doxInfo: DoxItem[];
    finalLink: string;
} 