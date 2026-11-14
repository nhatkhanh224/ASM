import { NextResponse } from "next/server";
import { connectDB } from "@/libs/db";
import { Asset } from "@/models/Asset";
import { getUserIdFromRequest } from "@/libs/auth";
import { AssetHistory } from "@/models/AssetHistory";
import { validateAssetPayload } from "@/libs/apiValidation";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromRequest(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await connectDB();

  const asset = await Asset.findOne({ _id: id, userId });
  if (!asset)
    return NextResponse.json(
      { error: "Không tìm thấy tài sản" },
      { status: 404 },
    );

  return NextResponse.json(asset);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromRequest(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await connectDB();

  const body = await request.json() as Record<string, unknown>;
  const result = validateAssetPayload(body);
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 });
  const asset = await Asset.findOneAndUpdate(
    { _id: id, userId }, // chỉ update nếu đúng chủ
    result.data,
    { new: true, runValidators: true },
  );
  if (!asset)
    return NextResponse.json(
      { error: "Không tìm thấy tài sản" },
      { status: 404 },
    );
  if (asset) {
    await AssetHistory.create({
      assetId: asset._id,
      userId,
      originalValue: asset.originalValue,
      valueInVND: asset.value,
      currency: asset.currency,
      note: typeof body.historyNote === "string" ? body.historyNote.slice(0, 500) : "",
      changedAt: new Date(),
    });
  }

  return NextResponse.json(asset);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromRequest(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json() as Record<string, unknown>;
  const monthlyDcaBudgetVND = Number(body.monthlyDcaBudgetVND);
  const monthlyDcaBudgetAmount = Number(body.monthlyDcaBudgetAmount);
  const dcaBudgetCurrency = body.dcaBudgetCurrency;
  const dcaDayOfMonth = Number(body.dcaDayOfMonth);

  if (!Number.isFinite(monthlyDcaBudgetVND) || monthlyDcaBudgetVND < 0 || monthlyDcaBudgetVND > 1_000_000_000_000) {
    return NextResponse.json({ error: "Ngân sách DCA không hợp lệ" }, { status: 400 });
  }
  if (!Number.isFinite(monthlyDcaBudgetAmount) || monthlyDcaBudgetAmount < 0 || monthlyDcaBudgetAmount > 1_000_000_000_000) {
    return NextResponse.json({ error: "Số tiền ngân sách không hợp lệ" }, { status: 400 });
  }
  if (dcaBudgetCurrency !== "VND" && dcaBudgetCurrency !== "USD") {
    return NextResponse.json({ error: "Đơn vị ngân sách không hợp lệ" }, { status: 400 });
  }
  if (!Number.isInteger(dcaDayOfMonth) || dcaDayOfMonth < 1 || dcaDayOfMonth > 28) {
    return NextResponse.json({ error: "Ngày DCA phải từ 1 đến 28" }, { status: 400 });
  }

  await connectDB();
  const asset = await Asset.findOneAndUpdate(
    { _id: id, userId },
    { monthlyDcaBudgetVND, monthlyDcaBudgetAmount, dcaBudgetCurrency, dcaDayOfMonth },
    { new: true, runValidators: true },
  );
  if (!asset)
    return NextResponse.json({ error: "Không tìm thấy tài sản" }, { status: 404 });

  return NextResponse.json(asset);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromRequest(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  await connectDB();

  const asset = await Asset.findOneAndDelete({ _id: id, userId }); // chỉ xóa nếu đúng chủ
  if (!asset)
    return NextResponse.json(
      { error: "Không tìm thấy tài sản" },
      { status: 404 },
    );

  return NextResponse.json({ message: "Xóa thành công", asset });
}
