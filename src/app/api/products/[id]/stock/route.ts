import { NextRequest, NextResponse } from "next/server";
import { stockService } from "@/lib/services/stock.service";
import { serializeProduct } from "@/lib/dto";
import { toErrorMessage, toHttpStatus } from "@/lib/action-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/products/:id/stock  { delta: number, note?: string }
// Positive delta increases stock, negative decreases. Negative results are rejected.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const product = await stockService.adjust({
      productId: id,
      delta: body.delta,
      note: body.note,
    });
    return NextResponse.json(serializeProduct(product));
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}
