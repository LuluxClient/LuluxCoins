import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface UserData {
    userId: string;
    username: string;
    balance: number;
    zermikoins: number;
    lastDaily?: number;
}

export interface Transaction {
    timestamp: number;
    type: 'add' | 'remove' | 'set' | 'purchase';
    userId: string;
    amount: number;
    itemName?: string;
    executorId?: string;
}

interface DatabaseData {
    users: UserData[];
    transactions: Transaction[];
}

export class DatabaseManager {
    private data: DatabaseData = { users: [], transactions: [] };
    private readonly dbPath = join(process.cwd(), 'database.json');

    public async init() {
        if (existsSync(this.dbPath)) {
            try {
                const fileContent = await readFile(this.dbPath, 'utf-8');
                this.data = JSON.parse(fileContent);
                console.log('Database loaded successfully');
            } catch (error) {
                console.error('Error loading database:', error);
                throw error;
            }
        } else {
            await this.save();
            console.log('New database file created');
        }
    }

    private async save() {
        try {
            await writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
            console.log('Database saved successfully');
        } catch (error) {
            console.error('Error saving database:', error);
            throw error;
        }
    }

    public async registerUser(userId: string, username: string) {
        if (!this.data.users.some(u => u.userId === userId)) {
            this.data.users.push({
                userId,
                username,
                balance: 0,
                zermikoins: 0
            });
            await this.save();
            console.log(`User ${username} (${userId}) registered`);
        }
    }

    public async initializeUser(userId: string, username: string, luluxcoinsAmount: number = 0, zermikoinsAmount: number = 0) {
        const existingUser = this.data.users.find(u => u.userId === userId);
        if (existingUser) {
            existingUser.balance = luluxcoinsAmount;
            existingUser.zermikoins = zermikoinsAmount;
        } else {
            this.data.users.push({
                userId,
                username,
                balance: luluxcoinsAmount,
                zermikoins: zermikoinsAmount
            });
        }
        await this.save();
        console.log(`User ${username} (${userId}) initialized with ${luluxcoinsAmount} LuluxCoins and ${zermikoinsAmount} ZermiKoins`);
    }

    public getUser(userId: string): UserData | undefined {
        return this.data.users.find(u => u.userId === userId);
    }

    public getAllUsers(): UserData[] {
        return [...this.data.users];
    }

    public async updateBalance(userId: string, amount: number, operation: 'add' | 'remove', currency: 'luluxcoins' | 'zermikoins' = 'luluxcoins') {
        const user = this.data.users.find(u => u.userId === userId);
        if (!user) {
            throw new Error('User not found');
        }

        const currentBalance = currency === 'luluxcoins' ? user.balance : user.zermikoins;
        if (operation === 'remove' && currentBalance < amount) {
            throw new Error('Insufficient balance');
        }

        if (currency === 'luluxcoins') {
            user.balance = operation === 'add' ? user.balance + amount : user.balance - amount;
        } else {
            user.zermikoins = operation === 'add' ? user.zermikoins + amount : user.zermikoins - amount;
        }

        await this.save();
        console.log(`Updated ${currency} balance for user ${userId}: ${operation} ${amount}`);
    }

    public async updateLastDaily(userId: string) {
        const user = this.data.users.find(u => u.userId === userId);
        if (!user) {
            throw new Error('User not found');
        }

        user.lastDaily = Date.now();
        await this.save();
    }

    public async getLastDaily(userId: string): Promise<number | undefined> {
        const user = this.data.users.find(u => u.userId === userId);
        return user?.lastDaily;
    }

    public async addTransaction(transaction: Transaction) {
        this.data.transactions.push(transaction);
        await this.save();
    }

    public getTransactions(): Transaction[] {
        return [...this.data.transactions];
    }
}

export const db = new DatabaseManager(); 