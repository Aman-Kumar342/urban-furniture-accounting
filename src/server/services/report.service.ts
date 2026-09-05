import type { Prisma } from "@prisma/client";
import { round2, sum } from "@/lib/money";
import { getAccountBalances, type AccountBalanceRow } from "@/server/repositories/ledger.repo";

export interface ReportLine {
  code: string;
  name: string;
  balance: Prisma.Decimal;
}

export interface ProfitAndLoss {
  year: number;
  income: ReportLine[];
  totalIncome: Prisma.Decimal;
  expenses: ReportLine[];
  totalExpenses: Prisma.Decimal;
  netIncome: Prisma.Decimal;
}

export interface BalanceSheet {
  year: number;
  asOf: string;
  assets: ReportLine[];
  totalAssets: Prisma.Decimal;
  liabilities: ReportLine[];
  totalLiabilities: Prisma.Decimal;
  capital: ReportLine[];
  totalCapital: Prisma.Decimal;
  currentYearEarnings: Prisma.Decimal;
  totalLiabilitiesAndCapital: Prisma.Decimal;
  difference: Prisma.Decimal;
  balanced: boolean;
}

const hasActivity = (r: AccountBalanceRow) => r.debit.plus(r.credit).greaterThan(0);
const debitNormal = (r: AccountBalanceRow) => round2(r.debit.minus(r.credit)); // ASSET, EXPENSE
const creditNormal = (r: AccountBalanceRow) => round2(r.credit.minus(r.debit)); // LIABILITY, INCOME, CAPITAL

// P&L: flow statement over the selected calendar year.
export async function getProfitAndLoss(year: number): Promise<ProfitAndLoss> {
  const rows = await getAccountBalances(`${year}-01-01`, `${year}-12-31`);

  const income = rows
    .filter((r) => r.type === "INCOME" && hasActivity(r))
    .map((r) => ({ code: r.code, name: r.name, balance: creditNormal(r) }));
  const expenses = rows
    .filter((r) => r.type === "EXPENSE" && hasActivity(r))
    .map((r) => ({ code: r.code, name: r.name, balance: debitNormal(r) }));

  const totalIncome = round2(sum(income.map((l) => l.balance)));
  const totalExpenses = round2(sum(expenses.map((l) => l.balance)));
  const netIncome = round2(totalIncome.minus(totalExpenses));

  return { year, income, totalIncome, expenses, totalExpenses, netIncome };
}

// Balance Sheet: cumulative snapshot as of Dec 31 of the selected year.
export async function getBalanceSheet(year: number): Promise<BalanceSheet> {
  const asOf = `${year}-12-31`;
  const rows = await getAccountBalances("1970-01-01", asOf);

  const assets = rows
    .filter((r) => r.type === "ASSET" && hasActivity(r))
    .map((r) => ({ code: r.code, name: r.name, balance: debitNormal(r) }));
  const liabilities = rows
    .filter((r) => r.type === "LIABILITY" && hasActivity(r))
    .map((r) => ({ code: r.code, name: r.name, balance: creditNormal(r) }));
  const capital = rows
    .filter((r) => r.type === "CAPITAL" && hasActivity(r))
    .map((r) => ({ code: r.code, name: r.name, balance: creditNormal(r) }));

  // Current Year Earnings = cumulative Income − Expenses, presented inside equity so the
  // accounting equation (Assets = Liabilities + Capital + Earnings) is shown correctly.
  const cumIncome = sum(rows.filter((r) => r.type === "INCOME").map((r) => r.credit.minus(r.debit)));
  const cumExpense = sum(rows.filter((r) => r.type === "EXPENSE").map((r) => r.debit.minus(r.credit)));
  const currentYearEarnings = round2(cumIncome.minus(cumExpense));

  const totalAssets = round2(sum(assets.map((l) => l.balance)));
  const totalLiabilities = round2(sum(liabilities.map((l) => l.balance)));
  const totalCapital = round2(sum(capital.map((l) => l.balance)));
  const totalLiabilitiesAndCapital = round2(
    totalLiabilities.plus(totalCapital).plus(currentYearEarnings),
  );
  const difference = round2(totalAssets.minus(totalLiabilitiesAndCapital));

  return {
    year,
    asOf,
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    capital,
    totalCapital,
    currentYearEarnings,
    totalLiabilitiesAndCapital,
    difference,
    balanced: difference.isZero(),
  };
}
