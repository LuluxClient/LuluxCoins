export interface UserStatus {
    userId: string;
    username: string;
    currentStatus: 'online' | 'offline';
    lastStatusChange: number;
    dailyStats: {
        online: number;
        offline: number;
        lastReset: number;
    };
    weeklyStats: {
        online: number;
        offline: number;
        lastReset: number;
    };
}

export interface StatusDatabase {
    users: UserStatus[];
} 