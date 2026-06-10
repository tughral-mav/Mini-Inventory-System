"use server";

import { revalidatePath } from "next/cache";
import { categoryService } from "@/lib/services/category.service";
import { serializeCategory, type CategoryDTO } from "@/lib/dto";
import { runAction, type ActionResult } from "@/lib/action-result";

function parseCategoryForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
}

export async function createCategoryAction(
  formData: FormData,
): Promise<ActionResult<CategoryDTO>> {
  const result = await runAction(async () => {
    const category = await categoryService.create(parseCategoryForm(formData));
    return serializeCategory(category);
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function updateCategoryAction(
  id: string,
  formData: FormData,
): Promise<ActionResult<CategoryDTO>> {
  const result = await runAction(async () => {
    const category = await categoryService.update(id, parseCategoryForm(formData));
    return serializeCategory(category);
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function deleteCategoryAction(id: string): Promise<ActionResult<null>> {
  const result = await runAction(async () => {
    await categoryService.remove(id);
    return null;
  });
  if (result.ok) revalidatePath("/");
  return result;
}
