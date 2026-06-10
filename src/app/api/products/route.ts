import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/lib/services/product.service";
import { serializeProduct } from "@/lib/dto";
import { toErrorMessage, toHttpStatus } from "@/lib/action-result";

// Always run on the Node.js runtime (Prisma requires it) and never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/products?search=&categoryId=&status=
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const products = await productService.list({
      search: params.get("search") ?? undefined,
      categoryId: params.get("categoryId") ?? undefined,
      status: (params.get("status") as never) ?? undefined,
    });
    return NextResponse.json(products.map(serializeProduct));
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}

// POST /api/products  { name, description, price, stock, categoryId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = await productService.create(body);
    return NextResponse.json(serializeProduct(product), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: toHttpStatus(error) });
  }
}
