import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import { NotFound } from "@/lib/errors";
import type { CreateProductInput } from "@/server/validation/sales";

export async function createProduct(input: CreateProductInput) {
  let categoryId = input.categoryId ?? null;
  if (!categoryId && input.categoryName) {
    // Category create-on-fly (Many2one) per the mockup.
    const cat = await prisma.productCategory.upsert({
      where: { name: input.categoryName },
      update: {},
      create: { name: input.categoryName },
    });
    categoryId = cat.id;
  } else if (categoryId) {
    const cat = await prisma.productCategory.findUnique({ where: { id: categoryId } });
    if (!cat) throw NotFound("Category not found.");
  }
  return prisma.product.create({
    data: {
      name: input.name,
      type: input.type,
      categoryId,
      salesPrice: round2(input.salesPrice),
      cost: round2(input.cost),
    },
  });
}

export function listProducts() {
  return prisma.product.findMany({
    where: { isArchived: false },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
