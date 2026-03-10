// File: app/api/assets/[id]/route.ts
// Next.js 15 - params phải được await

import { NextResponse } from 'next/server'
import { connectDB } from '@/libs/db'
import { Asset } from '@/models/Asset'

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params // Await params
    console.log('=== PUT REQUEST RECEIVED ===')
    console.log('ID from params:', params.id)
    
    await connectDB()
    
    const body = await request.json()
    console.log('Request body:', body)
    
    const asset = await Asset.findByIdAndUpdate(
      params.id,
      body,
      { 
        new: true,
        runValidators: true
      }
    )
    
    console.log('Updated asset:', asset)
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Không tìm thấy tài sản' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(asset)
    
  } catch (error: any) {
    console.error('PUT error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params // Await params
    console.log('=== DELETE REQUEST RECEIVED ===')
    console.log('ID from params:', params.id)
    
    await connectDB()
    
    const asset = await Asset.findByIdAndDelete(params.id)
    
    console.log('Deleted asset:', asset)
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Không tìm thấy tài sản' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ 
      message: 'Xóa thành công',
      asset 
    })
    
  } catch (error: any) {
    console.error('DELETE error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params // Await params
    console.log('=== GET REQUEST RECEIVED ===')
    console.log('ID from params:', params.id)
    
    await connectDB()
    
    const asset = await Asset.findById(params.id)
    
    if (!asset) {
      return NextResponse.json(
        { error: 'Không tìm thấy tài sản' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(asset)
    
  } catch (error: any) {
    console.error('GET error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}