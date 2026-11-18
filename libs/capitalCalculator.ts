import type { CapitalEntry, CapitalFundSummary } from "@/types/capital";

export function calculateFundSummary(initialCapital: number, entries: CapitalEntry[]): CapitalFundSummary {
  let deposits = 0;
  let withdrawals = 0;
  let settledProfitLoss = 0;
  let pendingStake = 0;
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let totalBets = 0;

  for (const entry of entries) {
    if (entry.kind === "cashflow") {
      if (entry.cashflowType === "deposit") deposits += entry.amount || 0;
      if (entry.cashflowType === "withdrawal") withdrawals += entry.amount || 0;
      continue;
    }
    totalBets += 1;
    if (entry.result === "pending") {
      pendingStake += entry.stake || 0;
      continue;
    }
    settledProfitLoss += entry.profitLoss || 0;
    if (entry.result === "win") wins += 1;
    if (entry.result === "half_win") { wins += 0.5; pushes += 0.5; }
    if (entry.result === "loss") losses += 1;
    if (entry.result === "half_loss") { losses += 0.5; pushes += 0.5; }
    if (entry.result === "push") pushes += 1;
  }

  const currentCapital = initialCapital + deposits - withdrawals + settledProfitLoss;
  const settledBets = wins + losses + pushes;
  return {
    currentCapital,
    availableCapital: currentCapital - pendingStake,
    pendingStake,
    settledProfitLoss,
    deposits,
    withdrawals,
    totalBets,
    settledBets,
    wins,
    losses,
    pushes,
    winRate: wins + losses > 0 ? wins / (wins + losses) * 100 : 0,
    roi: initialCapital > 0 ? settledProfitLoss / initialCapital * 100 : 0,
  };
}

export function calculateBetPayout(stake: number, odds: number, result: string, payout?: number) {
  if (result === "pending") return { payout: 0, profitLoss: 0 };
  const resolvedPayout = Number.isFinite(payout)
    ? Math.max(0, payout as number)
    : result === "win" ? stake * odds
      : result === "half_win" ? stake / 2 * odds + stake / 2
        : result === "push" ? stake
          : result === "half_loss" ? stake / 2
            : 0;
  return { payout: resolvedPayout, profitLoss: resolvedPayout - stake };
}
