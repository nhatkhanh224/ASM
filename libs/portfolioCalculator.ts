import type { AssetPnlSummary, TransactionRecord } from "@/types/transaction";

type LedgerTransaction = Pick<TransactionRecord, "assetId" | "assetName" | "currency" | "type" | "quantity" | "totalValueVND" | "transactedAt">;

export function calculateTrackedQuantity(transactions: LedgerTransaction[]) {
  return transactions.reduce((quantity, tx) => {
    if (tx.type === "opening" || tx.type === "buy" || tx.type === "deposit") return quantity + tx.quantity;
    return Math.max(0, quantity - tx.quantity);
  }, 0);
}

export function calculatePortfolioPnl(transactions: LedgerTransaction[], exchangeRates: Record<string, number>): AssetPnlSummary[] {
  const groups = new Map<string, LedgerTransaction[]>();
  for (const tx of transactions) groups.set(tx.assetId, [...(groups.get(tx.assetId) ?? []), tx]);

  const rows: AssetPnlSummary[] = [];
  for (const [assetId, txs] of groups) {
    const sorted = [...txs].sort((a, b) => new Date(a.transactedAt).getTime() - new Date(b.transactedAt).getTime());
    let totalQuantity = 0;
    let totalCostVND = 0;
    let realizedPnlVND = 0;

    for (const tx of sorted) {
      if (tx.type === "opening" || tx.type === "buy") {
        totalQuantity += tx.quantity;
        totalCostVND += tx.totalValueVND;
      } else if (tx.type === "sell") {
        const quantity = Math.min(tx.quantity, totalQuantity);
        const averageCost = totalQuantity > 0 ? totalCostVND / totalQuantity : 0;
        const removedCost = averageCost * quantity;
        realizedPnlVND += tx.totalValueVND - removedCost;
        totalQuantity = Math.max(0, totalQuantity - quantity);
        totalCostVND = Math.max(0, totalCostVND - removedCost);
      } else if (tx.type === "deposit") {
        const averageCost = totalQuantity > 0 ? totalCostVND / totalQuantity : 0;
        totalQuantity += tx.quantity;
        totalCostVND += averageCost * tx.quantity;
      } else if (tx.type === "withdraw") {
        const quantity = Math.min(tx.quantity, totalQuantity);
        const averageCost = totalQuantity > 0 ? totalCostVND / totalQuantity : 0;
        totalQuantity = Math.max(0, totalQuantity - quantity);
        totalCostVND = Math.max(0, totalCostVND - averageCost * quantity);
      }
    }

    const last = sorted.at(-1);
    if (!last) continue;
    const currency = last.currency.toUpperCase();
    const currentPriceVND = exchangeRates[currency] ?? 0;
    const currentValueVND = totalQuantity * currentPriceVND;
    const unrealizedPnlVND = currentValueVND - totalCostVND;
    rows.push({ assetId, assetName: last.assetName, currency, totalQuantity, totalCostVND,
      avgCostVND: totalQuantity > 0 ? totalCostVND / totalQuantity : 0,
      currentPriceVND, currentValueVND, unrealizedPnlVND,
      unrealizedPnlPct: totalCostVND > 0 ? (unrealizedPnlVND / totalCostVND) * 100 : 0,
      realizedPnlVND });
  }
  return rows.sort((a, b) => Math.abs(b.currentValueVND) - Math.abs(a.currentValueVND));
}
