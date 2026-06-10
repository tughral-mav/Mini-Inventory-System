import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/lib/services/product.service";
import { serializeProduct } from "@/lib/dto";
import { toErrorMessage, toHttpStatus } from "@/lib/action-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/products/:id
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const product = await productService.getById(id);
    return NextResponse.json(serializeProduct(product));
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}

// PUT /api/products/:id
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const product = await productService.update(id, body);
    return NextResponse.json(serializeProduct(product));
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}

// DELETE /api/products/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await productService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}
