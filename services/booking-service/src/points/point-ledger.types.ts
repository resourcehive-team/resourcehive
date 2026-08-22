import { Prisma } from "@resourcehive/database";

export type PointLedgerClient = Pick<
  Prisma.TransactionClient,
  "pointTransaction"
>;

export interface AppendBookingEntryInput {
  userId: string;
  bookingId: string;
  amount: number;
  description?: string;
}

export interface PointLedgerEntry {
  id: string;
  userId: string;
  amount: number;
  transactionType: string;
  bookingId: string | null;
  description: string | null;
  createdAt: Date;
}
