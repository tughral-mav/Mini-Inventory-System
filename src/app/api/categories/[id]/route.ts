import { NextRequest, NextResponse } from "next/server";
import { categoryService } from "@/lib/services/category.service";
import { serializeCategory } from "@/lib/dto";
import { toErrorMessage, toHttpStatus } from "@/lib/action-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/categories/:id
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const category = await categoryService.getById(id);
    return NextResponse.json(serializeCategory(category));
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}

// PUT /api/categories/:id
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json();
    const category = await categoryService.update(id, body);
    return NextResponse.json(serializeCategory(category));
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}

// DELETE /api/categories/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    await categoryService.remove(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}
