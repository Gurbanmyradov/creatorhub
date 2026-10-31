import { describe, expect, it } from "vitest";
import {
  compact,
  dateLabel,
  fromCents,
  label,
  money,
  percent,
  qs,
  toCents,
} from "./format";

describe("format", () => {
  it("formats numbers", () => {
    expect(money(123_456)).toBe("$1,235");
    expect(compact(1_250_000)).toBe("1.3M");
    expect(percent(50)).toBe("50%");
    expect(percent(4.87)).toBe("4.9%");
  });
  it("formats dates and labels", () => {
    expect(dateLabel("2026-03-05")).toBe("Mar 5, 2026");
    expect(dateLabel(null)).toBe("—");
    expect(label("changes_requested")).toBe("Changes requested");
  });
  it("converts between dollars and cents", () => {
    expect(toCents("1,250.50")).toBe(125_050);
    expect(toCents("0.1")).toBe(10);
    expect(fromCents(125_050)).toBe("1250.5");
  });
  it("builds query strings, skipping empties", () => {
    expect(qs({ a: "x", b: "", c: undefined, d: 2 })).toBe("?a=x&d=2");
    expect(qs({})).toBe("");
  });
});
