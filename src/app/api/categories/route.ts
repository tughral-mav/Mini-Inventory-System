import { NextRequest, NextResponse } from "next/server";
import { categoryService } from "@/lib/services/category.service";
import { serializeCategory } from "@/lib/dto";
import { toErrorMessage, toHttpStatus } from "@/lib/action-result";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/categories
export async function GET() {
  try {
    const categories = await categoryService.list();
    return NextResponse.json(categories.map(serializeCategory));
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}

// POST /api/categories  { name, description? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const category = await categoryService.create(body);
    return NextResponse.json(serializeCategory(category), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}
