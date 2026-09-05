import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import { NotFound } from "@/lib/errors";
import type { CreateProductInput, UpdateProductInput } from "@/server/validation/sales";

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

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true } });
  if (!product) throw NotFound("Product not found.");
  return product;
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw NotFound("Product not found.");

  let categoryId: string | undefined = input.categoryId;
  if (!categoryId && input.categoryName) {
    const cat = await prisma.productCategory.upsert({
      where: { name: input.categoryName },
      update: {},
      create: { name: input.categoryName },
    });
    categoryId = cat.id;
  } else if (input.categoryId) {
    const cat = await prisma.productCategory.findUnique({ where: { id: input.categoryId } });
    if (!cat) throw NotFound("Category not found.");
  }

  return prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      type: input.type,
      categoryId,
      salesPrice: input.salesPrice !== undefined ? round2(input.salesPrice) : undefined,
      cost: input.cost !== undefined ? round2(input.cost) : undefined,
    },
    include: { category: true },
  });
}

export async function archiveProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw NotFound("Product not found.");
  return prisma.product.update({ where: { id }, data: { isArchived: true } });
}

export async function unarchiveProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw NotFound("Product not found.");
  return prisma.product.update({ where: { id }, data: { isArchived: false } });
}
