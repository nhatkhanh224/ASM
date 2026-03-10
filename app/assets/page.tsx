'use client'


import { useEffect, useState } from 'react'
import { Asset } from '@/types/asset'
import AssetForm from '@/components/AssetForm'
import AssetList from '@/components/AssetList'
import AssetManagementApp from '@/components/AssestManagement'


export default function AssetsPage() {
// const [assets, setAssets] = useState<Asset[]>([])


// const fetchAssets = async () => {
// const res = await fetch('/api/assets')
// setAssets(await res.json())
// }


// useEffect(() => {
// fetchAssets()
// }, [])


return (
<>
<AssetManagementApp/></>
)
}