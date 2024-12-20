export interface UserData {
    id: string;
    username: string;
    balance: number;
}

export interface Transaction {
    timestamp: number;
    type: 'add' | 'remove' | 'set' | 'purchase';
    userId: string;
    amount: number;
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