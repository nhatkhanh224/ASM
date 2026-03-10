import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Asset } from '@/models/Asset'


export async function GET() {
await connectDB()
const assets = await Asset.find().sort({ createdAt: -1 })
return NextResponse.json(assets)
}


export async function POST(req: Request) {
await connectDB()
const body = await req.json()
const asset = await Asset.create(body)
return NextResponse.json(asset)
}