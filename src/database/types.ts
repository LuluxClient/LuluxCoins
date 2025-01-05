export interface UserData {
    id: string;
    username: string;
    zermikoins: number;
    luluxcoins: number;
    lastDaily?: number;
    lastMessage?: number;
    messageCount?: number;
    voiceTime?: number;
    lastVoiceJoin?: number;
} 