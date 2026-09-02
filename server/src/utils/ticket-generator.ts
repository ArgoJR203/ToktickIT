import { PrismaClient } from "@prisma/client";
import { getPrisma } from "../prisma.js";

/**
 * Generates an official, sequential Ticket Number in the format TKT-YYYY-XXXXXX.
 * Example: TKT-2026-000001
 * 
 * @param prisma Optional PrismaClient instance (defaults to getPrisma())
 * @param year Optional 4-digit year override (defaults to current calendar year)
 */
export async function generateTicketNumber(
  prisma: PrismaClient = getPrisma(),
  year?: string
): Promise<string> {
  const targetYear = year || new Date().getFullYear().toString();
  const prefix = `TKT-${targetYear}-`;

  // Find latest ticket for the specified year
  const latestTicket = await prisma.ticket.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      id: "desc",
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextSequence = 1;

  if (latestTicket && latestTicket.ticketNumber) {
    const parts = latestTicket.ticketNumber.split("-");
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  const paddedSeq = nextSequence.toString().padStart(6, "0");
  return `${prefix}${paddedSeq}`;
}
