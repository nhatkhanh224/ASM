import { NextResponse } from 'next/server';
import { connectDB } from '@/libs/db';
import { FinancialGoal } from '@/models/FinancialGoal';
import { getUserIdFromRequest } from '@/libs/auth';
import { validateFinancialGoalPayload } from '@/libs/apiValidation';
import { Asset } from '@/models/Asset';

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const goals = await FinancialGoal.find({ userId }).sort({ createdAt: -1 });
  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json() as Record<string, unknown>;
  const result = validateFinancialGoalPayload(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  const linkedAssetIds = (result.data.linkedAssetIds || []) as string[];
  if (linkedAssetIds.length > 0) {
    const ownedCount = await Asset.countDocuments({ _id: { $in: linkedAssetIds }, userId });
    if (ownedCount !== new Set(linkedAssetIds).size)
      return NextResponse.json({ error: 'Có tài sản liên kết không thuộc tài khoản này' }, { status: 400 });
  }
  const goal = await FinancialGoal.create({ ...result.data, userId });
  return NextResponse.json(goal, { status: 201 });
}
