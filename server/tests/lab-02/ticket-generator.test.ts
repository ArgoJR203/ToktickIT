import { describe, it, expect, vi } from "vitest";
import { generateTicketNumber } from "../../src/utils/ticket-generator.js";
import { PrismaClient } from "@prisma/client";

describe("Ticket Number Generator Unit Test (UNIT-01, BR-01)", () => {
  it("generates initial ticket number format TKT-YYYY-000001 when no existing tickets exist", async () => {
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;

    const ticketNumber = await generateTicketNumber(mockPrisma, "2026");

    expect(ticketNumber).toBe("TKT-2026-000001");
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
  });

  it("increments sequence number when previous tickets exist for current year", async () => {
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue({
          ticketNumber: "TKT-2026-000042",
        }),
      },
    } as unknown as PrismaClient;

    const ticketNumber = await generateTicketNumber(mockPrisma, "2026");

    expect(ticketNumber).toBe("TKT-2026-000043");
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
  });
});
