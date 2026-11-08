import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { FinancialGoal } from '@/models/FinancialGoal';
import { getUserIdFromRequest } from '@/libs/auth';
import { validateFinancialGoalPayload } from '@/libs/apiValidation';
import { Asset } from '@/models/Asset';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json() as Record<string, unknown>;
  const result = validateFinancialGoalPayload(body, true);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  if (Object.keys(result.data).length === 0) return NextResponse.json({ error: 'Không có dữ liệu hợp lệ' }, { status: 400 });
  const linkedAssetIds = result.data.linkedAssetIds as string[] | undefined;
  if (linkedAssetIds && linkedAssetIds.length > 0) {
    const ownedCount = await Asset.countDocuments({ _id: { $in: linkedAssetIds }, userId });
    if (ownedCount !== new Set(linkedAssetIds).size)
      return NextResponse.json({ error: 'Có tài sản liên kết không thuộc tài khoản này' }, { status: 400 });
  }
  const goal = await FinancialGoal.findOneAndUpdate(
    { _id: id, userId },
    result.data,
    { new: true, runValidators: true }
  );
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(goal);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const goal = await FinancialGoal.findOneAndDelete({ _id: id, userId });
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
