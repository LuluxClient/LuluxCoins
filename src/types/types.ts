export interface UserData {
    userId: string;
    username: string;
    balance: number;
    zermikoins: number;
    lastDaily?: number;
    lastMessage?: number;
    messageCount?: number;
    voiceTime?: number;
    lastVoiceJoin?: number;
}

export interface Transaction {
    timestamp: number;
    type: 'add' | 'remove' | 'set' | 'purchase';
    userId: string;
    amount: number;
    currency: 'zermikoins' | 'luluxcoins';
    itemName?: string;
    executorId?: string;
}

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    price: number;
    emoji: string;
}

export interface DatabaseStructure {
    users: UserData[];
    transactions: Transaction[];
} 