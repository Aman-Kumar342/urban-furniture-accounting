import { Prisma } from "@prisma/client";

// Exact decimal money. Never use JS floats for currency.
type V = Prisma.Decimal.Value;

export const money = (v: V = 0): Prisma.Decimal => new Prisma.Decimal(v);

export const round2 = (v: V): Prisma.Decimal => money(v).toDecimalPlaces(2);

export const sum = (vals: V[]): Prisma.Decimal =>
  vals.reduce<Prisma.Decimal>((acc, v) => acc.plus(v), money(0));
