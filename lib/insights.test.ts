import { describe, it, expect } from "vitest";
import { headingSlug, tocFromBody, type InsightBlock } from "./insights";

describe("headingSlug", () => {
  it("lowercases + replaces non-alnum with dashes", () => {
    expect(headingSlug("Why Most Operator CRMs Fail")).toBe("why-most-operator-crms-fail");
  });
  it("strips leading/trailing dashes", () => {
    expect(headingSlug("— Heading —")).toBe("heading");
  });
  it("caps length at 80", () => {
    const long = "a".repeat(200);
    expect(headingSlug(long).length).toBe(80);
  });
  it("handles diacritics conservatively (they become dashes)", () => {
    expect(headingSlug("Salderingsregeling — wat nú?")).toBe("salderingsregeling-wat-n");
  });
});

describe("tocFromBody", () => {
  const body: InsightBlock[] = [
    { type: "p", text: "intro" },
    { type: "h2", text: "The test before you buy" },
    { type: "ul", items: ["a", "b"] },
    { type: "h2", text: "A simple test" },
    { type: "p", text: "x" },
  ];

  it("extracts h2 blocks only", () => {
    const toc = tocFromBody(body);
    expect(toc.map((t) => t.text)).toEqual(["The test before you buy", "A simple test"]);
  });

  it("assigns slug ids", () => {
    const toc = tocFromBody(body);
    expect(toc[0].id).toBe("the-test-before-you-buy");
    expect(toc[1].id).toBe("a-simple-test");
  });

  it("disambiguates duplicate headings", () => {
    const dup: InsightBlock[] = [
      { type: "h2", text: "Summary" },
      { type: "h2", text: "Summary" },
      { type: "h2", text: "Summary" },
    ];
    const toc = tocFromBody(dup);
    expect(toc.map((t) => t.id)).toEqual(["summary", "summary-2", "summary-3"]);
  });

  it("returns empty for body without h2s", () => {
    expect(tocFromBody([{ type: "p", text: "just prose" }])).toEqual([]);
  });
});
