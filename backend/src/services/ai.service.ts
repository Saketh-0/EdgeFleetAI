import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple interface for transaction matching
interface Transaction {
  description: string;
  amount: number;
  type: string; // INCOME, EXPENSE
  category: string;
  date: Date;
}

interface Budget {
  category: string;
  limitAmount: number;
}

export class AIService {
  private static getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      // Initialize GoogleGenerativeAI SDK
      return new GoogleGenerativeAI(apiKey);
    } catch (error) {
      console.error('Error initializing Gemini Client:', error);
      return null;
    }
  }

  /**
   * Private helper to call the Groq API
   */
  private static async callGroq(systemPrompt: string, userMessage: string, chatHistory: any[] = []): Promise<string | null> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return null;

    try {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      
      // Construct messages list for standard chat completions
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Format Gemini chatHistory [{ role: 'user'|'model', parts: [{ text }] }] to standard messages format
      chatHistory.forEach(msg => {
        const role = msg.role === 'model' ? 'assistant' : msg.role;
        const text = msg.parts && msg.parts[0] ? msg.parts[0].text : (msg.content || '');
        if (text) {
          messages.push({ role, content: text });
        }
      });

      // Append final user message
      messages.push({ role: 'user', content: userMessage });

      console.log(`Calling Groq API (${model}) ...`);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Groq API responded with status ${response.status}: ${errorText}`);
        return null;
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.error('Error calling Groq API:', error);
      return null;
    }
  }

  /**
   * Generates a monthly financial summary
   */
  public static async generateSummary(transactions: Transaction[], budgets: Budget[]): Promise<string> {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthlyTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthlyTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const netSavings = income - expense;

    // Calculate category breakdowns
    const categorySpending: Record<string, number> = {};
    monthlyTx.filter(t => t.type === 'EXPENSE').forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

    // Check budget warnings
    const budgetWarnings: string[] = [];
    budgets.forEach(b => {
      const spent = categorySpending[b.category] || 0;
      if (spent > b.limitAmount) {
        const excess = spent - b.limitAmount;
        budgetWarnings.push(`You exceeded your **${b.category}** budget by **$${excess.toFixed(2)}** (Spent: $${spent.toFixed(2)} / Budget: $${b.limitAmount.toFixed(2)}).`);
      } else if (spent > b.limitAmount * 0.85) {
        budgetWarnings.push(`Warning: You have used **${((spent / b.limitAmount) * 100).toFixed(0)}%** of your **${b.category}** budget (Spent: $${spent.toFixed(2)} / Budget: $${b.limitAmount.toFixed(2)}).`);
      }
    });

    // Sort categories by spending
    const sortedCategories = Object.entries(categorySpending).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

    // 1. Try Groq API
    if (process.env.GROQ_API_KEY) {
      try {
        console.log('Generating summary using Groq API...');
        const systemPrompt = `
          You are Groq, a professional financial advisor for EdgeFleet.AI.
          Analyze the user's monthly financial metrics and write a clear, encouraging, and actionable monthly summary.
          Use clean markdown formatting, including bold text for numbers and categories.
        `;
        const prompt = `
          Here is their data for the current month:
          - Total Income: $${income.toFixed(2)}
          - Total Expenses: $${expense.toFixed(2)}
          - Net Savings: $${netSavings.toFixed(2)}
          - Budget Limits: ${JSON.stringify(budgets)}
          - Category Spending: ${JSON.stringify(categorySpending)}
          - Budget Alerts/Warnings: ${JSON.stringify(budgetWarnings)}
          
          Format the summary in 3-4 concise paragraphs:
          1. A brief overview of their month-to-date income vs expense and overall savings rate.
          2. Spending pattern analysis (mention their top expense category: ${topCategory ? `${topCategory[0]} at $${topCategory[1].toFixed(2)}` : 'None'}).
          3. Address any budget breaches or warnings and offer specific cost-cutting recommendations.
          4. An encouraging closing remark with one concrete saving tip.
        `;

        const reply = await this.callGroq(systemPrompt, prompt);
        if (reply) return reply;
      } catch (err) {
        console.error('Groq summary generation failed, fallback to Gemini:', err);
      }
    }

    // 2. Try Google Gemini API
    const client = this.getGeminiClient();
    if (client) {
      try {
        console.log('Generating summary using Gemini LLM...');
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `
          You are a professional financial advisor assistant for EdgeFleet.AI.
          Analyze the user's monthly financial metrics and write a clear, encouraging, and actionable monthly summary.
          
          Here is their data for the current month:
          - Total Income: $${income.toFixed(2)}
          - Total Expenses: $${expense.toFixed(2)}
          - Net Savings: $${netSavings.toFixed(2)}
          - Budget Limits: ${JSON.stringify(budgets)}
          - Category Spending: ${JSON.stringify(categorySpending)}
          - Budget Alerts/Warnings: ${JSON.stringify(budgetWarnings)}
          
          Format the summary in 3-4 concise paragraphs:
          1. A brief overview of their month-to-date income vs expense and overall savings rate.
          2. Spending pattern analysis (mention their top expense category: ${topCategory ? `${topCategory[0]} at $${topCategory[1].toFixed(2)}` : 'None'}).
          3. Address any budget breaches or warnings and offer specific cost-cutting recommendations.
          4. An encouraging closing remark with one concrete saving tip.
          
          Use clean markdown formatting, including bold text for numbers and categories.
        `;

        const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
        const text = result.response.text();
        if (text) return text;
      } catch (err) {
        console.error('Gemini API error, using fallback summary generator:', err);
      }
    }

    // 3. Fallback Local Generator
    console.log('Generating summary using local rule engine...');
    let summaryText = `### Monthly Financial Summary & Insights\n\n`;
    summaryText += `Your total income for this month is **$${income.toLocaleString()}** and total expenses are **$${expense.toLocaleString()}**. This results in a net savings of **$${netSavings >= 0 ? '+' : ''}$${netSavings.toLocaleString()}** (Savings Rate: **${income > 0 ? ((netSavings / income) * 100).toFixed(0) : 0}%**).\n\n`;
    
    if (topCategory) {
      summaryText += `#### Spending Analysis\n`;
      summaryText += `Your highest spending category this month was **${topCategory[0]}**, where you spent **$${topCategory[1].toFixed(2)}**. This represents **${expense > 0 ? ((topCategory[1] / expense) * 100).toFixed(0) : 0}%** of your total monthly expenditures. `;
      
      const secondCategory = sortedCategories[1];
      if (secondCategory) {
        summaryText += `Your second highest spending category was **${secondCategory[0]}** with **$${secondCategory[1].toFixed(2)}**. `;
      }
      summaryText += `\n\n`;
    }

    if (budgetWarnings.length > 0) {
      summaryText += `#### ⚠️ Budget Warnings\n`;
      budgetWarnings.forEach(warning => {
        summaryText += `- ${warning}\n`;
      });
      summaryText += `\n`;
    } else {
      summaryText += `#### ✅ Budget Status\n`;
      summaryText += `Great job! You are currently within budget limits across all active categories. Keep up the excellent work!\n\n`;
    }

    // Cost-saving recommendation
    summaryText += `#### 💡 Smart Financial Tips\n`;
    if (topCategory && topCategory[0] === 'Food') {
      summaryText += `- Your **Food** expenses are slightly elevated. Consider reducing takeout/Uber Eats by cooking 2 more meals at home each week. This could save you an estimated **$80** monthly.\n`;
    } else if (topCategory && topCategory[0] === 'Entertainment') {
      summaryText += `- Your discretionary **Entertainment** spending is high. Audit your active subscriptions (Netflix, Spotify, etc.) and temporarily pause those you haven't used in the past 30 days.\n`;
    } else {
      summaryText += `- To optimize your monthly savings rate, automate a transfer of **10%** of your income directly to a high-yield savings account on pay day, enforcing a "pay yourself first" habit.\n`;
    }
    
    return summaryText;
  }

  /**
   * Responds to user queries regarding their financial data
   */
  public static async chatWithAssistant(
    transactions: Transaction[],
    budgets: Budget[],
    chatHistory: { role: 'user' | 'model'; parts: { text: string }[] }[],
    userMessage: string
  ): Promise<string> {
    // Gather transaction details for rule analysis or context Injection
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalIncome = monthlyTx.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = monthlyTx.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);

    const categorySpending: Record<string, number> = {};
    monthlyTx.filter(t => t.type === 'EXPENSE').forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

    // 1. Try Groq API
    if (process.env.GROQ_API_KEY) {
      try {
        console.log('Using Groq for chatbot response...');
        const systemPrompt = `
          You are Groq, an AI Financial Chatbot Assistant for EdgeFleet.AI.
          You answer the user's finance questions based on their real financial transaction history, budgets, and savings.
          Be precise, friendly, professional, and clear.
          
          User's Current Month Summary:
          - Total Income: $${totalIncome.toFixed(2)}
          - Total Expenses: $${totalExpense.toFixed(2)}
          - Net Savings: $${(totalIncome - totalExpense).toFixed(2)}
          - Category Spending Breakdowns: ${JSON.stringify(categorySpending)}
          - Set Monthly Budgets: ${JSON.stringify(budgets)}
          - Recent Transaction Records: ${JSON.stringify(transactions.slice(0, 50))} (up to 50 recent records showing description, amount, type, category, date)

          Rules:
          1. Answer the query directly using the transaction details and numbers above.
          2. Keep answers concise (2-4 sentences is best).
          3. If the user asks general financial advice, give sensible answers.
          4. Format financial numbers clearly like $1,234.56.
          5. Use clean markdown formatting (bolding, tables, bullet points).
        `;

        const reply = await this.callGroq(systemPrompt, userMessage, chatHistory);
        if (reply) return reply;
      } catch (err) {
        console.error('Groq chat error, falling back to Gemini:', err);
      }
    }

    // 2. Try Google Gemini API
    const client = this.getGeminiClient();
    if (client) {
      try {
        console.log('Sending message to Gemini Model...');
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const systemInstruction = `
          You are an AI Financial Chatbot Assistant for EdgeFleet.AI.
          You answer the user's finance questions based on their real financial transaction history.
          Be precise, friendly, professional, and clear.
          
          User's Current Month Summary:
          - Total Income: $${totalIncome.toFixed(2)}
          - Total Expenses: $${totalExpense.toFixed(2)}
          - Category Spending Breakdowns: ${JSON.stringify(categorySpending)}
          - Set Monthly Budgets: ${JSON.stringify(budgets)}
          - Full List of Transactions: ${JSON.stringify(transactions.slice(0, 30))} (shows up to 30 recent records)

          Rules:
          1. Answer the query directly using the transaction details. If they ask about food, look at the food spending.
          2. Keep answers concise (2-4 sentences is best).
          3. If the user asks general financial advice, give sensible answers.
          4. Format financial numbers clearly like $1,234.56.
        `;

        // Format history for Gemini API chat
        const contents = [
          { role: 'user', parts: [{ text: systemInstruction }] },
          ...chatHistory,
          { role: 'user', parts: [{ text: userMessage }] }
        ];

        const result = await model.generateContent({ contents });
        const text = result.response.text();
        if (text) return text;
      } catch (err) {
        console.error('Gemini chat error, fallback to local engine:', err);
      }
    }

    // 3. Local Fallback Rule Engine for Chat (Completely Free, No Key Required)
    console.log('Responding using local rule chatbot...');
    const textLower = userMessage.toLowerCase();

    // Query: Greetings & Capabilities
    if (
      textLower.includes('hello') || 
      textLower.includes('hi ') || 
      textLower.includes('hey') || 
      textLower.includes('greetings') ||
      textLower.includes('who are you') ||
      textLower.includes('capabilities') ||
      textLower.includes('what can you do') ||
      textLower.includes('help')
    ) {
      return `Hello! I am your EdgeFleet AI Financial Assistant. Ask me details about your spending, budgets, and savings targets!

Here are some examples of what you can ask me:
- **"How much did I spend on Food this month?"**
- **"Show my recent transactions"**
- **"Did I overspend this month?"**
- **"What is my current savings rate?"**
- **"Give me budget optimization tips"**
- **"Search for Uber transactions"**`;
    }

    // Query: Overspending / Budget breaches
    if (
      textLower.includes('overspend') || 
      textLower.includes('overspent') || 
      textLower.includes('exceed') || 
      textLower.includes('breach') || 
      textLower.includes('over spent') ||
      textLower.includes('over-spent') ||
      textLower.includes('warning')
    ) {
      const breached = budgets.filter(b => (categorySpending[b.category] || 0) > b.limitAmount);
      if (breached.length === 0) {
        return `Great news! You have not exceeded any of your budget limits this month. Your cash flow is completely in the green.`;
      }
      const lines = breached.map(b => {
        const spent = categorySpending[b.category] || 0;
        const excess = spent - b.limitAmount;
        return `- **${b.category}**: Exceeded by **$${excess.toFixed(2)}** (Spent: $${spent.toFixed(2)} / Limit: $${b.limitAmount.toFixed(2)})`;
      });
      return `Here are the budget categories where you have overspent this month:\n\n${lines.join('\n')}\n\nI recommend reviewing these categories or clicking **Manage Limits** on the budgets page to adjust your targets.`;
    }

    // Query: Transaction History Search & Listing
    if (
      textLower.includes('recent') || 
      textLower.includes('latest') || 
      textLower.includes('transactions') || 
      textLower.includes('history') || 
      textLower.includes('what did i buy') || 
      textLower.includes('show transactions') ||
      textLower.includes('list transactions')
    ) {
      const limit = 5;
      const recentTx = transactions.slice(0, limit);
      if (recentTx.length === 0) {
        return `You don't have any recorded transactions yet. Try adding one on the Dashboard!`;
      }
      
      let table = `Here are your **${recentTx.length} most recent transactions**:\n\n`;
      table += `| Date | Description | Category | Type | Amount |\n`;
      table += `| :--- | :--- | :--- | :--- | :--- |\n`;
      recentTx.forEach(t => {
        const dateStr = new Date(t.date).toLocaleDateString();
        const amtStr = `$${t.amount.toFixed(2)}`;
        const typeBadge = t.type === 'INCOME' ? '🟢 INCOME' : '🔴 EXPENSE';
        table += `| ${dateStr} | ${t.description} | ${t.category} | ${typeBadge} | ${amtStr} |\n`;
      });
      return table;
    }

    // Query: Search for specific transactions (e.g. coffee, uber)
    if (textLower.startsWith('search for') || textLower.startsWith('find ') || textLower.includes('did i buy') || textLower.includes('search ')) {
      let query = '';
      if (textLower.startsWith('search for ')) query = textLower.replace('search for ', '');
      else if (textLower.startsWith('find ')) query = textLower.replace('find ', '');
      else if (textLower.includes('did i buy ')) query = textLower.substring(textLower.indexOf('did i buy ') + 10);
      else if (textLower.startsWith('search ')) query = textLower.replace('search ', '');
      
      query = query.trim().replace(/[?.]/g, '');
      
      if (query) {
        const matches = transactions.filter(t => t.description.toLowerCase().includes(query));
        if (matches.length === 0) {
          return `I couldn't find any transactions matching "**${query}**".`;
        }
        const totalSearch = matches.reduce((sum, t) => sum + t.amount, 0);
        let table = `Found **${matches.length} transaction(s)** matching "**${query}**" (Total amount: **$${totalSearch.toFixed(2)}**):\n\n`;
        table += `| Date | Description | Category | Type | Amount |\n`;
        table += `| :--- | :--- | :--- | :--- | :--- |\n`;
        matches.slice(0, 10).forEach(t => {
          const dateStr = new Date(t.date).toLocaleDateString();
          const amtStr = `$${t.amount.toFixed(2)}`;
          const typeBadge = t.type === 'INCOME' ? '🟢 INCOME' : '🔴 EXPENSE';
          table += `| ${dateStr} | ${t.description} | ${t.category} | ${typeBadge} | ${amtStr} |\n`;
        });
        if (matches.length > 10) {
          table += `\n*(showing top 10 results)*`;
        }
        return table;
      }
    }

    // Query: Check specific categories spending
    const categoriesList = ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Housing', 'Healthcare', 'Salary', 'Freelance', 'Investments', 'Other'];
    const matchedCategory = categoriesList.find(c => textLower.includes(c.toLowerCase()) || 
      (c === 'Food' && (textLower.includes('grocery') || textLower.includes('groceries') || textLower.includes('restaurant') || textLower.includes('eat') || textLower.includes('dinner') || textLower.includes('lunch'))) ||
      (c === 'Transportation' && (textLower.includes('transit') || textLower.includes('uber') || textLower.includes('taxi') || textLower.includes('gas') || textLower.includes('fuel'))) ||
      (c === 'Entertainment' && (textLower.includes('netflix') || textLower.includes('spotify') || textLower.includes('movie') || textLower.includes('game'))) ||
      (c === 'Utilities' && (textLower.includes('bill') || textLower.includes('phone') || textLower.includes('internet') || textLower.includes('wifi') || textLower.includes('rent')))
    );
    
    if (matchedCategory) {
      const spent = categorySpending[matchedCategory] || 0;
      const budget = budgets.find(b => b.category === matchedCategory);
      
      let response = `This month, your total spending in **${matchedCategory}** is **$${spent.toFixed(2)}**.`;
      if (budget) {
        const percent = ((spent / budget.limitAmount) * 100).toFixed(0);
        response += ` This is **${percent}%** of your monthly budget limit of **$${budget.limitAmount.toFixed(2)}**.`;
        if (spent > budget.limitAmount) {
          response += ` You are currently over budget in this category by **$${(spent - budget.limitAmount).toFixed(2)}**! ⚠️`;
        } else {
          response += ` You have **$${(budget.limitAmount - spent).toFixed(2)}** remaining in this category.`;
        }
      } else {
        response += ` You do not have a budget limit set for this category.`;
      }
      return response;
    }

    // Query: Total Inflow/Income check
    if (textLower.includes('income') || textLower.includes('earn') || textLower.includes('freelance') || textLower.includes('salary') || textLower.includes('inflow')) {
      return `Your total inflow (income) for this month is **$${totalIncome.toFixed(2)}**, consisting of your salary, freelance payments, and investment dividends.`;
    }

    // Query: Total Outflow/Expenses check
    if (textLower.includes('expense') || textLower.includes('spent') || textLower.includes('spending') || textLower.includes('outflow')) {
      return `Your total expenses (outflow) for this month sum up to **$${totalExpense.toFixed(2)}**.`;
    }

    // Query: Savings check
    if (textLower.includes('savings') || textLower.includes('save') || textLower.includes('saving rate') || textLower.includes('saved')) {
      const netSavings = totalIncome - totalExpense;
      const rate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : '0';
      return `For the current month, you have saved **$${netSavings.toFixed(2)}**. This translates to a savings rate of **${rate}%** of your total income.`;
    }

    // Query: Financial Tip/Advice
    if (textLower.includes('tip') || textLower.includes('advice') || textLower.includes('recommendation') || textLower.includes('minimize') || textLower.includes('optimize')) {
      // Find highest spending category
      const sortedCategories = Object.entries(categorySpending).sort((a, b) => b[1] - a[1]);
      const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;
      
      let advice = `Here is a custom saving tip based on your spending:\n\n`;
      if (topCategory) {
        advice += `Your highest spending category is **${topCategory[0]}** ($${topCategory[1].toFixed(2)}). `;
        if (topCategory[0] === 'Food') {
          advice += `Consider dining out less and substituting 2 restaurant meals with home cooking. This simple adjustment could save you up to **$80-$100** this month!`;
        } else if (topCategory[0] === 'Transportation') {
          advice += `Try carpooling or using public transportation where possible, or bundle your weekly errands to reduce fuel consumption and ride-share expenses.`;
        } else if (topCategory[0] === 'Entertainment') {
          advice += `Review all active monthly subscriptions. Pausing service on channels or memberships you haven't accessed in the past 30 days is a quick win.`;
        } else if (topCategory[0] === 'Utilities') {
          advice += `Audit your monthly subscription charges and compare electric/internet options. Ensuring smart thermostats are set efficiently can reduce utility costs by 10%.`;
        } else {
          advice += `Audit transactions in this category. Allocating a strict weekly cash limit for discretionary purchases will help keep it under control.`;
        }
      } else {
        advice += `Automate a regular transfer of **10%** of your income directly to a high-yield savings account on pay day. This "pay yourself first" strategy enforces a consistent savings habit.`;
      }
      return advice;
    }

    // Query: Summarize trends / Monthly summary
    if (textLower.includes('summarize') || textLower.includes('summary') || textLower.includes('trends') || textLower.includes('report')) {
      const netSavings = totalIncome - totalExpense;
      const rate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(0) : '0';
      const sortedCategories = Object.entries(categorySpending).sort((a, b) => b[1] - a[1]);
      const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

      let summary = `### Monthly Financial Report & Trends\n\n`;
      summary += `- **Total Inflow (Income)**: $${totalIncome.toFixed(2)}\n`;
      summary += `- **Total Outflow (Expenses)**: $${totalExpense.toFixed(2)}\n`;
      summary += `- **Net Savings**: $${netSavings.toFixed(2)} (Savings Rate: **${rate}%**)\n\n`;
      
      if (topCategory) {
        summary += `#### Top Expense Categories\n`;
        sortedCategories.slice(0, 3).forEach(([cat, amt]) => {
          summary += `- **${cat}**: spent **$${amt.toFixed(2)}** (${totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(0) : 0}% of expenses)\n`;
        });
        summary += `\n`;
      }
      
      const breached = budgets.filter(b => (categorySpending[b.category] || 0) > b.limitAmount);
      if (breached.length > 0) {
        summary += `#### ⚠️ Budget Breaches\n`;
        breached.forEach(b => {
          const spent = categorySpending[b.category] || 0;
          summary += `- Exceeded **${b.category}** budget by **$${(spent - b.limitAmount).toFixed(2)}**\n`;
        });
      } else {
        summary += `#### ✅ Budget Health\n`;
        summary += `All categories are currently within their designated budget thresholds.\n`;
      }

      return summary;
    }

    // Default Fallback
    return `I can help you analyze your transactions and budgets! Here are some details from your account that you can ask about:
1. **Total income** ($${totalIncome.toFixed(2)}) or **expenses** ($${totalExpense.toFixed(2)})
2. Spending in category **Food** ($${(categorySpending['Food'] || 0).toFixed(2)}) or **Entertainment** ($${(categorySpending['Entertainment'] || 0).toFixed(2)})
3. Budget warnings or breaches
4. Saving tips and personalized recommendations
5. Latest transactions (you can ask **"show recent transactions"**)

Just type your question and I'll analyze it!`;
  }

  /**
   * Automatically categorizes a transaction description using AI
   */
  public static async categorizeDescription(description: string): Promise<string> {
    const allowedCategories = ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Salary', 'Other'];
    
    // 1. Try Groq API
    if (process.env.GROQ_API_KEY) {
      try {
        console.log(`Categorizing description "${description}" using Groq API...`);
        const systemPrompt = `
          Analyze the following transaction description: "${description}"
          Classify it into exactly one of these categories: ${allowedCategories.join(', ')}.
          Respond with ONLY the category name. Do not include punctuation, spaces, explanations, or any other characters.
        `;
        
        const reply = await this.callGroq(systemPrompt, `Classify this transaction: "${description}"`);
        if (reply) {
          const responseText = reply.trim();
          const matched = allowedCategories.find(c => c.toLowerCase() === responseText.toLowerCase());
          if (matched) return matched;
        }
      } catch (error) {
        console.error('Groq categorization failed, fallback to Gemini:', error);
      }
    }

    // 2. Try Google Gemini API
    const client = this.getGeminiClient();
    if (client) {
      try {
        console.log(`Categorizing description "${description}" using Gemini LLM...`);
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `
          Analyze the following transaction description: "${description}"
          Classify it into exactly one of these categories: ${allowedCategories.join(', ')}.
          Respond with ONLY the category name. Do not include punctuation, spaces, explanations, or any other characters.
        `;
        
        const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
        const responseText = result.response.text().trim();
        
        // Clean and match with allowed categories
        const matched = allowedCategories.find(c => c.toLowerCase() === responseText.toLowerCase());
        if (matched) return matched;
      } catch (error) {
        console.error('Gemini categorization failed, using local rules:', error);
      }
    }

    // 3. Local rule-based classification fallback
    console.log(`Categorizing description "${description}" using local rules...`);
    const descLower = description.toLowerCase();
    
    if (
      descLower.includes('uber') || 
      descLower.includes('lyft') || 
      descLower.includes('taxi') || 
      descLower.includes('cab') || 
      descLower.includes('bus') || 
      descLower.includes('train') || 
      descLower.includes('metro') || 
      descLower.includes('flight') || 
      descLower.includes('airline') || 
      descLower.includes('fuel') || 
      descLower.includes('gas')
    ) {
      return 'Transportation';
    }
    
    if (
      descLower.includes('starbucks') || 
      descLower.includes('coffee') || 
      descLower.includes('cafe') || 
      descLower.includes('food') || 
      descLower.includes('restaurant') || 
      descLower.includes('mcdonald') || 
      descLower.includes('burger') || 
      descLower.includes('pizza') || 
      descLower.includes('dinner') || 
      descLower.includes('lunch') || 
      descLower.includes('grocery') || 
      descLower.includes('supermarket') || 
      descLower.includes('market') || 
      descLower.includes('whole foods') || 
      descLower.includes('walmart') || 
      descLower.includes('eats')
    ) {
      return 'Food';
    }
    
    if (
      descLower.includes('netflix') || 
      descLower.includes('spotify') || 
      descLower.includes('hulu') || 
      descLower.includes('disney') || 
      descLower.includes('movie') || 
      descLower.includes('cinema') || 
      descLower.includes('show') || 
      descLower.includes('concert') || 
      descLower.includes('game') || 
      descLower.includes('gaming') || 
      descLower.includes('playstation') || 
      descLower.includes('xbox') || 
      descLower.includes('steam') || 
      descLower.includes('ticket')
    ) {
      return 'Entertainment';
    }
    
    if (
      descLower.includes('electric') || 
      descLower.includes('power') || 
      descLower.includes('water') || 
      descLower.includes('gas bill') || 
      descLower.includes('utility') || 
      descLower.includes('internet') || 
      descLower.includes('wifi') || 
      descLower.includes('phone') || 
      descLower.includes('mobile') || 
      descLower.includes('comcast') || 
      descLower.includes('aws') || 
      descLower.includes('hosting') || 
      descLower.includes('server') || 
      descLower.includes('rent') || 
      descLower.includes('mortgage')
    ) {
      return 'Utilities';
    }
    
    if (
      descLower.includes('salary') || 
      descLower.includes('paycheck') || 
      descLower.includes('dividend') || 
      descLower.includes('bonus') || 
      descLower.includes('freelance') || 
      descLower.includes('income') || 
      descLower.includes('refund') || 
      descLower.includes('payment from')
    ) {
      return 'Salary';
    }
    
    return 'Other';
  }
}
