import fs from 'fs/promises';
import path from 'path';
import { DatabaseStructure, UserData, Transaction } from '../types/types';

export class DatabaseManager {
    private dbPath: string;
    private data: DatabaseStructure;

    constructor() {
        this.dbPath = path.join(__dirname, 'database.json');
        this.data = {
            users: [],
            transactions: []
        };
    }

    async init() {
        try {
            const fileContent = await fs.readFile(this.dbPath, 'utf-8');
            this.data = JSON.parse(fileContent);
        } catch {
            await this.save();
        }
    }

    async save() {
        await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
    }

    async registerUser(userId: string, username: string) {
        if (!this.data.users.find(u => u.id === userId)) {
            this.data.users.push({
                id: userId,
                username: username,
                balance: 0
            });
            await this.save();
        }
    }

    async addTransaction(transaction: Transaction) {
        this.data.transactions.push(transaction);
        await this.save();
    }

    async updateBalance(userId: string, amount: number, type: 'add' | 'remove' | 'set') {
        const user = this.data.users.find(u => u.id === userId);
        if (user) {
            switch (type) {
                case 'add':
                    user.balance += amount;
                    break;
                case 'remove':
                    user.balance = Math.max(0, user.balance - amount);
                    break;
                case 'set':
                    user.balance = amount;
                    break;
            }
            await this.save();
        }
    }

    getUser(userId: string): UserData | undefined {
        return this.data.users.find(u => u.id === userId);
    }

    getAllUsers(): UserData[] {
        return this.data.users;
    }

    getTransactions(): Transaction[] {
        return this.data.transactions;
    }
}

export const db = new DatabaseManager(); 