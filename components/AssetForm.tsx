'use client'

import { useState } from 'react'

export default function AssetForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    type: 'cash',
    value: 0,
  })

  const submit = async () => {
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('Create asset failed:', text)
        return
      }

      await res.json() // đảm bảo response là JSON

      setForm({ name: '', type: 'cash', value: 0 })
      onCreated()
    } catch (err) {
      console.error('Submit error:', err)
    }
  }

  return (
    <div className="border p-4 rounded space-y-2">
      <input
        className="input"
        placeholder="Tên tài sản"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
      />

      <select
        value={form.type}
        onChange={e => setForm({ ...form, type: e.target.value })}
      >
        <option value="cash">Tiền mặt</option>
        <option value="bank">Ngân hàng</option>
        <option value="investment">Đầu tư</option>
        <option value="property">Bất động sản</option>
        <option value="digital">Tài sản số</option>
        <option value="other">Khác</option>
      </select>

      <input
        type="number"
        value={form.value}
        onChange={e => setForm({ ...form, value: Number(e.target.value) })}
      />

      <button onClick={submit} className="btn">
        ➕ Thêm
      </button>
    </div>
  )
}
