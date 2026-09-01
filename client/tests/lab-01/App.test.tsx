import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders the TokTickIT heading", () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([]);
    render(<App />);
    expect(screen.getAllByText(/TokTickIT/i).length).toBeGreaterThan(0);
  });

  it("checkSystem API function returns online and categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });

    const result = await api.checkSystem();
    expect(result.online).toBe(true);
    expect(result.categories).toHaveLength(4);
    expect(result.categories[0].name).toBe("Account and Access");
  });

  it("checkSystem API function throws an error when API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(
      new Error("Unable to connect to API at http://localhost:3000"),
    );

    await expect(api.checkSystem()).rejects.toThrow("Unable to connect");
  });
});

