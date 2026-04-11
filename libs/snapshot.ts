export async function takeSnapshot(
  assets: any[],
  exchangeRates: Record<string, number>
) {
  const totalVND = assets.reduce((sum, a) => {
    const rate = exchangeRates[a.currency] ?? 1
    return sum + (a.originalValue * rate)
  }, 0)

  const byType: Record<string, number> = {}
  const assetList = assets.map((a) => {
    const rate = exchangeRates[a.currency] ?? 1
    const valueInVND = a.originalValue * rate
    byType[a.type] = (byType[a.type] ?? 0) + valueInVND
    return { name: a.name, type: a.type, currency: a.currency, originalValue: a.originalValue, valueInVND }
  })

  await fetch('/api/snapshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalVND, byType, assets: assetList }),
  })
}