import { describe, it, expect } from "vitest";
import { makeUI } from "./ascii";
import type { KvpRow } from "./types";

const sampleRow = (overrides: Partial<KvpRow> = {}): KvpRow => ({
   id: 1,
   key: "alpha",
   value: "secret",
   created_at: new Date("2024-01-01T00:00:00Z"),
   updated_at: "2024-01-02T00:00:00Z",
   ...overrides,
});

describe("makeUI", () => {
   it("renders header, footer, and command hint", () => {
      const ui = makeUI([]);
      expect(ui).toContain("SSH SECRET VAULT");
      expect(ui).toContain("Write command and press enter to perform:");
      expect(ui).toContain("-  [add key value]: add new kvp to the vault");
      expect(ui).toContain("(kvps table is empty)");
   });

   it("includes all row fields in a single line per entry", () => {
      const row = sampleRow({ id: 42, key: "beta", value: "val" });
      const line = makeUI([row])
      .split("\n")
      .find((l) => l.includes("beta"));
      expect(line).toBeDefined();
      expect(line).toContain("42");
      expect(line).toContain("beta");
      expect(line).toContain("val");
   });
});
