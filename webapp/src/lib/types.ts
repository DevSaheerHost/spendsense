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
  monthlyBudget?: number;
  createdAt: string;
  fcmTokens?: string[];
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
