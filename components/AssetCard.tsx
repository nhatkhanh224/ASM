import { Asset } from '@/types/asset'
import { ASSET_TYPE_COLOR, ASSET_TYPE_LABEL } from '@/libs/constants'


export default function AssetCard({ asset, onEdit, onDelete }: {
asset: Asset
onEdit: (a: Asset) => void
onDelete: (id: string) => void
}) {
return (
<div className="border rounded-lg p-4 shadow-sm bg-white space-y-2">
<div className="flex justify-between items-center">
<h3 className="font-semibold">{asset.name}</h3>
<span className={`text-xs px-2 py-1 rounded ${ASSET_TYPE_COLOR[asset.type]}`}>
{ASSET_TYPE_LABEL[asset.type]}
</span>
</div>


<p className="text-lg font-bold">
{asset.value.toLocaleString()} {asset.currency || 'VND'}
</p>


{asset.note && <p className="text-sm text-gray-500">{asset.note}</p>}


<div className="flex gap-2 pt-2">
<button
className="text-sm text-blue-600"
onClick={() => onEdit(asset)}
>
✏️ Sửa
</button>
<button
className="text-sm text-red-600"
onClick={() => onDelete(asset._id!)}
>
🗑️ Xoá
</button>
</div>
</div>
)
}