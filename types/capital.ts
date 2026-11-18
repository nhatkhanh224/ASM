export type CapitalFundStatus = "active" | "paused";
export type CapitalEntryKind = "bet" | "cashflow";
export type BetResult = "pending" | "win" | "half_win" | "push" | "half_loss" | "loss";
export type CashflowType = "deposit" | "withdrawal";

export interface CapitalFund {
  _id: string;
  name: string;
  currency: "VND" | "USD";
  initialCapital: number;
  status: CapitalFundStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapitalEntry {
  _id: string;
  fundId: string;
  kind: CapitalEntryKind;
  occurredAt: string;
  note?: string;
  matchName?: string;
  bankrollBefore?: number;
  odds?: number;
  stake?: number;
  result?: BetResult;
  payout?: number;
  profitLoss?: number;
  cashflowType?: CashflowType;
  amount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CapitalFundSummary {
  currentCapital: number;
  availableCapital: number;
  pendingStake: number;
  settledProfitLoss: number;
  deposits: number;
  withdrawals: number;
  totalBets: number;
  settledBets: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  roi: number;
}
