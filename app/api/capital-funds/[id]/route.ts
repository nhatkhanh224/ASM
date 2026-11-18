import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { getUserIdFromRequest } from '@/libs/auth';
import { CapitalFund } from '@/models/CapitalFund';
import { CapitalEntry } from '@/models/CapitalEntry';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  await connectDB();
  const body = await request.json();
  const initialCapital = Number(body.initialCapital);
  if (!body.name?.trim() || !['VND', 'USD'].includes(body.currency) || !Number.isFinite(initialCapital) || initialCapital < 0) {
    return NextResponse.json({ error: 'Thông tin quỹ không hợp lệ' }, { status: 400 });
  }
  const fund = await CapitalFund.findOneAndUpdate(
    { _id: id, userId },
    { name: body.name.trim(), currency: body.currency, initialCapital, status: body.status === 'paused' ? 'paused' : 'active', note: typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '' },
    { new: true, runValidators: true },
  );
  if (!fund) return NextResponse.json({ error: 'Không tìm thấy quỹ' }, { status: 404 });
  return NextResponse.json(fund);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  await connectDB();
  if (await CapitalEntry.exists({ fundId: id, userId })) {
    return NextResponse.json({ error: 'Quỹ đã có nhật ký. Hãy xóa các phiếu trước khi xóa quỹ.' }, { status: 409 });
  }
  const fund = await CapitalFund.findOneAndDelete({ _id: id, userId });
  if (!fund) return NextResponse.json({ error: 'Không tìm thấy quỹ' }, { status: 404 });
  return NextResponse.json({ success: true });
}
