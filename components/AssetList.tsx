import { Asset } from '@/types/asset'


export default function AssetList({ assets }: { assets: Asset[] }) {
const total = assets.reduce((s, a) => s + a.value, 0)


return (
<div>
<p className="font-semibold">💰 Tổng tài sản: {total.toLocaleString()} VND</p>
<ul className="divide-y">
{assets.map(a => (
<li key={a._id} className="py-2 flex justify-between">
<span>{a.name}</span>
<span>{a.value.toLocaleString()}</span>
</li>
))}
</ul>
</div>
)
}