"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding database...');
    // Clean existing data
    await prisma.transaction.deleteMany({});
    await prisma.budget.deleteMany({});
    await prisma.user.deleteMany({});
    // Hash password for default user
    const hashedPassword = await bcrypt.hash('password123', 10);
    // Create default User
    const defaultUser = await prisma.user.create({
        data: {
            email: 'user@edgefleet.ai',
            name: 'Saketh Kumar',
            password: hashedPassword,
            role: 'USER',
        },
    });
    console.log(`Created user: ${defaultUser.email}`);
    // Create active budgets for this user
    const categories = [
        { category: 'Food', limitAmount: 400 },
        { category: 'Transportation', limitAmount: 150 },
        { category: 'Utilities', limitAmount: 250 },
        { category: 'Entertainment', limitAmount: 200 },
        { category: 'Housing', limitAmount: 1200 },
        { category: 'Healthcare', limitAmount: 100 },
    ];
    for (const item of categories) {
        await prisma.budget.create({
            data: {
                userId: defaultUser.id,
                category: item.category,
                limitAmount: item.limitAmount,
                period: 'monthly',
            },
        });
    }
    console.log('Created budgets.');
    // Create transactions over the last 3 months
    const now = new Date();
    const transactionsData = [];
    // Month indexes: current month (0), last month (1), two months ago (2)
    for (let m = 0; m < 3; m++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 15);
        // Add monthly Income (Salary)
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Monthly Corporate Salary',
            amount: 4500,
            type: 'INCOME',
            category: 'Salary',
            date: new Date(now.getFullYear(), now.getMonth() - m, 1),
        });
        // Add monthly Freelance Work
        transactionsData.push({
            userId: defaultUser.id,
            description: 'EdgeFleet Dashboard Freelance UI',
            amount: 850,
            type: 'INCOME',
            category: 'Freelance',
            date: new Date(now.getFullYear(), now.getMonth() - m, 18),
        });
        // Add Rent/Housing expense
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Downtown Apartment Rent',
            amount: 1100,
            type: 'EXPENSE',
            category: 'Housing',
            date: new Date(now.getFullYear(), now.getMonth() - m, 2),
        });
        // Add internet/utilities
        transactionsData.push({
            userId: defaultUser.id,
            description: 'High-speed Fiber Internet & Electric',
            amount: 210,
            type: 'EXPENSE',
            category: 'Utilities',
            date: new Date(now.getFullYear(), now.getMonth() - m, 5),
        });
        // Food Expenses
        // Exceed budget slightly in the current month to show budget alert
        const foodMultipler = m === 0 ? 1.25 : 0.9;
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Whole Foods Groceries',
            amount: 120 * foodMultipler,
            type: 'EXPENSE',
            category: 'Food',
            date: new Date(now.getFullYear(), now.getMonth() - m, 3),
        });
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Sushi Dinner with Team',
            amount: 85 * foodMultipler,
            type: 'EXPENSE',
            category: 'Food',
            date: new Date(now.getFullYear(), now.getMonth() - m, 12),
        });
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Uber Eats Delivery',
            amount: 65 * foodMultipler,
            type: 'EXPENSE',
            category: 'Food',
            date: new Date(now.getFullYear(), now.getMonth() - m, 20),
        });
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Starbucks Coffee & Snacks',
            amount: 45 * foodMultipler,
            type: 'EXPENSE',
            category: 'Food',
            date: new Date(now.getFullYear(), now.getMonth() - m, 25),
        });
        // Add additional groceries for current month to intentionally blow the budget
        if (m === 0) {
            transactionsData.push({
                userId: defaultUser.id,
                description: 'Supermarket Stock Up',
                amount: 110,
                type: 'EXPENSE',
                category: 'Food',
                date: new Date(now.getFullYear(), now.getMonth() - m, 28),
            });
        }
        // Transportation
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Gas station refuel',
            amount: 45,
            type: 'EXPENSE',
            category: 'Transportation',
            date: new Date(now.getFullYear(), now.getMonth() - m, 8),
        });
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Uber rides',
            amount: 35,
            type: 'EXPENSE',
            category: 'Transportation',
            date: new Date(now.getFullYear(), now.getMonth() - m, 22),
        });
        if (m === 1) {
            transactionsData.push({
                userId: defaultUser.id,
                description: 'Train pass',
                amount: 60,
                type: 'EXPENSE',
                category: 'Transportation',
                date: new Date(now.getFullYear(), now.getMonth() - m, 10),
            });
        }
        // Entertainment
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Netflix & Spotify subscriptions',
            amount: 25,
            type: 'EXPENSE',
            category: 'Entertainment',
            date: new Date(now.getFullYear(), now.getMonth() - m, 4),
        });
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Movie Theater Outing',
            amount: 40,
            type: 'EXPENSE',
            category: 'Entertainment',
            date: new Date(now.getFullYear(), now.getMonth() - m, 14),
        });
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Concert Tickets',
            amount: 110,
            type: 'EXPENSE',
            category: 'Entertainment',
            date: new Date(now.getFullYear(), now.getMonth() - m, 26),
        });
        // Healthcare
        transactionsData.push({
            userId: defaultUser.id,
            description: 'Pharmacy Medicines',
            amount: 30,
            type: 'EXPENSE',
            category: 'Healthcare',
            date: new Date(now.getFullYear(), now.getMonth() - m, 11),
        });
    }
    // Batch insert
    await prisma.transaction.createMany({
        data: transactionsData,
    });
    console.log(`Successfully seeded ${transactionsData.length} transactions.`);
    console.log('Seeding complete.');
}
main()
    .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
