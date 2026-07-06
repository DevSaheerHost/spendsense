export type TransactionType = "income" | "expense";

export type FlagType = "green" | "yellow" | "red";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  flag: FlagType;
  date: string; // ISO date string (yyyy-MM-dd)
  time?: string; // 24h time of day (HH:mm), when the money moved
  createdAt: string; // ISO datetime string
}

export type NewTransaction = Omit<Transaction, "id" | "createdAt">;

export interface Loan {
  id: string;
  name: string;
  lender: string;
  totalAmount: number;
  amountPaid: number;
  monthlyEmi: number;
  dueDayOfMonth: number; // 1-28, day of month EMI is due
  startDate: string; // ISO date string
  notes?: string;
  status: "active" | "closed";
  createdAt: string;
}

export type NewLoan = Omit<Loan, "id" | "createdAt" | "amountPaid" | "status"> & {
  amountPaid?: number;
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  // The user's fixed/regular monthly income (e.g. salary), set once. Distinct
  // from one-off income transactions (shop sales, tips, gifts), which are
  // tracked separately as "extra income".
  monthlyIncome?: number;
  monthlyBudget?: number;
  createdAt: string;
  fcmTokens?: string[];
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// Result of parsing a spoken/typed sentence into a draft transaction.
export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  flag: FlagType;
}

// A trimmed transaction the AI can reason about (esp. the free-text
// description, which explains exactly how the money was earned or spent).
export interface AdviceTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  flag: FlagType;
  date: string;
  time?: string; // HH:mm
}

// A trimmed loan the AI can reason about for debt advice.
export interface AdviceLoan {
  name: string;
  lender: string;
  totalAmount: number;
  amountPaid: number;
  pending: number;
  monthlyEmi: number;
  dueDayOfMonth: number;
  status: "active" | "closed";
}

export const EXPENSE_CATEGORIES = [
  "Housing",
  "Utilities",
  "Groceries",
  "Transportation",
  "Healthcare",
  "Insurance",
  "Debt & Loans",
  "Dining & Entertainment",
  "Shopping",
  "Subscriptions",
  "Travel",
  "Gambling & Betting",
  "Gifts & Donations",
  "Education",
  "Other Expense",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Business",
  "Freelance",
  "Investment Returns",
  "Rental Income",
  "Gift Received",
  "Refund",
  "Other Income",
] as const;

// Maps expense categories to the 50/30/20 budgeting bucket used by the
// recommendation engine's fallback logic.
export const CATEGORY_BUCKET: Record<string, "needs" | "wants" | "savings"> = {
  Housing: "needs",
  Utilities: "needs",
  Groceries: "needs",
  Transportation: "needs",
  Healthcare: "needs",
  Insurance: "needs",
  "Debt & Loans": "needs",
  Education: "needs",
  "Dining & Entertainment": "wants",
  Shopping: "wants",
  Subscriptions: "wants",
  Travel: "wants",
  "Gambling & Betting": "wants",
  "Gifts & Donations": "wants",
  "Other Expense": "wants",
};
