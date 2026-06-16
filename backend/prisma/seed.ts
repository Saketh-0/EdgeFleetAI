import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.transaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.user.deleteMany({});

  // Hash password for default user
  const hashedPassword = await bcrypt.hash('Pass@1234', 10);

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

  const getSeedDate = (m: number, baseDay: number) => {
    const year = now.getFullYear();
    const month = now.getMonth() - m;
    if (m === 0) {
      // Map days > 14 to fit within [1, 14] to avoid future dates in the current month (today is June 15)
      const resolvedDay = baseDay > 14 ? (baseDay % 14) + 1 : baseDay;
      return new Date(year, month, resolvedDay);
    }
    return new Date(year, month, baseDay);
  };

  // Month indexes: current month (0), last month (1), two months ago (2)
  for (let m = 0; m < 3; m++) {
    
    // Add monthly Income (Salary)
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Monthly Corporate Salary',
      amount: 4500,
      type: 'INCOME',
      category: 'Salary',
      date: getSeedDate(m, 1),
    });

    // Add monthly Freelance Work
    transactionsData.push({
      userId: defaultUser.id,
      description: 'EdgeFleet Dashboard Freelance UI',
      amount: 850,
      type: 'INCOME',
      category: 'Freelance',
      date: getSeedDate(m, 18),
    });

    // Add Rent/Housing expense
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Downtown Apartment Rent',
      amount: 1100,
      type: 'EXPENSE',
      category: 'Housing',
      date: getSeedDate(m, 2),
    });

    // Add internet/utilities
    transactionsData.push({
      userId: defaultUser.id,
      description: 'High-speed Fiber Internet & Electric',
      amount: 210,
      type: 'EXPENSE',
      category: 'Utilities',
      date: getSeedDate(m, 5),
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
      date: getSeedDate(m, 3),
    });
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Sushi Dinner with Team',
      amount: 85 * foodMultipler,
      type: 'EXPENSE',
      category: 'Food',
      date: getSeedDate(m, 12),
    });
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Uber Eats Delivery',
      amount: 65 * foodMultipler,
      type: 'EXPENSE',
      category: 'Food',
      date: getSeedDate(m, 20),
    });
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Starbucks Coffee & Snacks',
      amount: 45 * foodMultipler,
      type: 'EXPENSE',
      category: 'Food',
      date: getSeedDate(m, 25),
    });
    
    // Add additional groceries for current month to intentionally blow the budget
    if (m === 0) {
      transactionsData.push({
        userId: defaultUser.id,
        description: 'Supermarket Stock Up',
        amount: 110,
        type: 'EXPENSE',
        category: 'Food',
        date: getSeedDate(m, 28),
      });
    }

    // Transportation
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Gas station refuel',
      amount: 45,
      type: 'EXPENSE',
      category: 'Transportation',
      date: getSeedDate(m, 8),
    });
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Uber rides',
      amount: 35,
      type: 'EXPENSE',
      category: 'Transportation',
      date: getSeedDate(m, 22),
    });
    if (m === 1) {
      transactionsData.push({
        userId: defaultUser.id,
        description: 'Train pass',
        amount: 60,
        type: 'EXPENSE',
        category: 'Transportation',
        date: getSeedDate(m, 10),
      });
    }

    // Entertainment
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Netflix & Spotify subscriptions',
      amount: 25,
      type: 'EXPENSE',
      category: 'Entertainment',
      date: getSeedDate(m, 4),
    });
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Movie Theater Outing',
      amount: 40,
      type: 'EXPENSE',
      category: 'Entertainment',
      date: getSeedDate(m, 14),
    });
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Concert Tickets',
      amount: 110,
      type: 'EXPENSE',
      category: 'Entertainment',
      date: getSeedDate(m, 26),
    });

    // Healthcare
    transactionsData.push({
      userId: defaultUser.id,
      description: 'Pharmacy Medicines',
      amount: 30,
      type: 'EXPENSE',
      category: 'Healthcare',
      date: getSeedDate(m, 11),
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
