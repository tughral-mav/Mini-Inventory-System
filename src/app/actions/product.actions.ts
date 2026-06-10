"use server";

import { revalidatePath } from "next/cache";
import { productService } from "@/lib/services/product.service";
import { stockService } from "@/lib/services/stock.service";
import { serializeProduct } from "@/lib/dto";
import { runAction, type ActionResult } from "@/lib/action-result";
import type { ProductDTO } from "@/lib/dto";

/**
 * Server actions are the thin adapter between the UI and the business logic
 * layer. They validate-via-service, then revalidate the dashboard.
 */

function parseProductForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    stock: String(formData.get("stock") ?? "0"),
    categoryId: String(formData.get("categoryId") ?? ""),
  };
}

export async function createProductAction(formData: FormData): Promise<ActionResult<ProductDTO>> {
  const result = await runAction(async () => {
    const product = await productService.create(parseProductForm(formData));
    return serializeProduct(product);
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function updateProductAction(
  id: string,
  formData: FormData,
): Promise<ActionResult<ProductDTO>> {
  const result = await runAction(async () => {
    const product = await productService.update(id, parseProductForm(formData));
    return serializeProduct(product);
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function deleteProductAction(id: string): Promise<ActionResult<null>> {
  const result = await runAction(async () => {
    await productService.remove(id);
    return null;
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function adjustStockAction(
  productId: string,
  delta: number,
  note?: string,
): Promise<ActionResult<ProductDTO>> {
  const result = await runAction(async () => {
    const product = await stockService.adjust({ productId, delta, note });
    return serializeProduct(product);
  });
  if (result.ok) revalidatePath("/");
  return result;
}
