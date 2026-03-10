export default function AssetFilter({ value, onChange }: {
value: string
onChange: (v: string) => void
}) {
return (
<select
className="border rounded px-3 py-1"
value={value}
onChange={e => onChange(e.target.value)}
>
<option value="">Tất cả</option>
<option value="cash">Tiền mặt</option>
<option value="bank">Ngân hàng</option>
<option value="investment">Đầu tư</option>
<option value="property">BĐS</option>
<option value="digital">Tài sản số</option>
<option value="other">Khác</option>
</select>
)
}