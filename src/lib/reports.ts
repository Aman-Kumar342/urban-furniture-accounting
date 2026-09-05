// Report response shapes (money fields are Decimal strings). These mirror report.service.ts.
export interface ReportLine {
  code: string;
  name: string;
  balance: string;
}

export interface ProfitAndLoss {
  year: number;
  income: ReportLine[];
  totalIncome: string;
  expenses: ReportLine[];
  totalExpenses: string;
  netIncome: string;
}

export interface BalanceSheet {
  year: number;
  asOf: string;
  assets: ReportLine[];
  totalAssets: string;
  liabilities: ReportLine[];
  totalLiabilities: string;
  capital: ReportLine[];
  totalCapital: string;
  currentYearEarnings: string;
  totalLiabilitiesAndCapital: string;
  difference: string;
  balanced: boolean;
}

// Years offered in the report selector: the current year plus a small window around it.
export function reportYears(): number[] {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now + 1; y >= now - 4; y--) years.push(y);
  return years;
}
