type ValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }

const assetTypes = ['cash', 'bank', 'investment', 'property', 'digital', 'gold', 'other'] as const
type ValidAssetType = typeof assetTypes[number]
const has = (body: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(body, key)

export function validateAssetPayload(body: Record<string, unknown>): ValidationResult {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const type = body.type as ValidAssetType
  const originalValue = Number(body.originalValue)
  const value = Number(body.value)
  const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : ''
  const isFutures = body.isFutures === true

  if (!name || name.length > 120 || !assetTypes.includes(type))
    return { ok: false, error: 'Tên hoặc loại tài sản không hợp lệ' }
  if (!Number.isFinite(originalValue) || originalValue <= 0 || !Number.isFinite(value) || value < 0)
    return { ok: false, error: 'Giá trị tài sản không hợp lệ' }
  if (!/^[A-Z0-9]{2,15}$/.test(currency))
    return { ok: false, error: 'Đơn vị tiền tệ không hợp lệ' }

  const data: Record<string, unknown> = {
    name,
    type,
    originalValue,
    value,
    currency,
    note: typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '',
    isFutures,
  }

  if (isFutures) {
    const leverage = Number(body.leverage)
    const entryPrice = Number(body.entryPrice)
    const liquidationPrice = body.liquidationPrice == null || body.liquidationPrice === '' ? undefined : Number(body.liquidationPrice)
    if (!Number.isFinite(leverage) || leverage <= 0 || leverage > 1000 || !Number.isFinite(entryPrice) || entryPrice <= 0)
      return { ok: false, error: 'Thông tin vị thế futures không hợp lệ' }
    if (liquidationPrice !== undefined && (!Number.isFinite(liquidationPrice) || liquidationPrice <= 0))
      return { ok: false, error: 'Giá thanh lý không hợp lệ' }
    data.coinSymbol = typeof body.coinSymbol === 'string' ? body.coinSymbol.trim().toUpperCase().slice(0, 15) : currency
    data.leverage = leverage
    data.positionType = body.positionType === 'short' ? 'short' : 'long'
    data.entryPrice = entryPrice
    data.liquidationPrice = liquidationPrice ?? null
  } else {
    data.coinSymbol = null
    data.leverage = null
    data.positionType = null
    data.entryPrice = null
    data.liquidationPrice = null
  }

  return { ok: true, data }
}

function sanitizeGoalTasks(value: unknown) {
  if (!Array.isArray(value) || value.length > 200) return null
  const tasks = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const task = item as Record<string, unknown>
    const id = typeof task.id === 'string' ? task.id.slice(0, 100) : ''
    const title = typeof task.title === 'string' ? task.title.trim().slice(0, 300) : ''
    const amount = Number(task.amount)
    const currency = task.currency === 'USD' ? 'USD' : 'VND'
    if (!id || !title || !Number.isFinite(amount) || amount <= 0) return null
    tasks.push({ id, title, amount, currency, completed: task.completed === true })
  }
  return tasks
}

export function validateFinancialGoalPayload(body: Record<string, unknown>, partial = false): ValidationResult {
  const data: Record<string, unknown> = {}

  if (!partial || has(body, 'name')) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name || name.length > 200) return { ok: false, error: 'Tên mục tiêu không hợp lệ' }
    data.name = name
  }
  if (!partial || has(body, 'targetAmount')) {
    const value = Number(body.targetAmount)
    if (!Number.isFinite(value) || value <= 0) return { ok: false, error: 'Số tiền mục tiêu không hợp lệ' }
    data.targetAmount = value
  }
  if (!partial || has(body, 'currentAmount')) {
    const value = Number(body.currentAmount ?? 0)
    if (!Number.isFinite(value) || value < 0) return { ok: false, error: 'Số tiền hiện tại không hợp lệ' }
    data.currentAmount = value
  }
  if (!partial || has(body, 'currency')) {
    if (body.currency !== 'VND' && body.currency !== 'USD') return { ok: false, error: 'Đơn vị tiền tệ không hợp lệ' }
    data.currency = body.currency
  }
  if (has(body, 'deadline')) {
    if (body.deadline) {
      const deadline = new Date(String(body.deadline))
      if (Number.isNaN(deadline.getTime())) return { ok: false, error: 'Ngày mục tiêu không hợp lệ' }
      data.deadline = deadline
    } else data.deadline = null
  }
  if (has(body, 'note')) data.note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : ''
  if (has(body, 'linkAllAssets')) data.linkAllAssets = body.linkAllAssets === true
  if (has(body, 'linkedAssetIds')) {
    if (!Array.isArray(body.linkedAssetIds) || body.linkedAssetIds.length > 500 || !body.linkedAssetIds.every((id) => typeof id === 'string'))
      return { ok: false, error: 'Danh sách tài sản liên kết không hợp lệ' }
    data.linkedAssetIds = body.linkedAssetIds
  }
  if (has(body, 'tasks')) {
    const tasks = sanitizeGoalTasks(body.tasks)
    if (!tasks) return { ok: false, error: 'Danh sách công việc không hợp lệ' }
    data.tasks = tasks
  }

  return { ok: true, data }
}
