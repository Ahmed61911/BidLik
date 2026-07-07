import { describe, it, expect } from "vitest";
import { isSafePath } from "@/routes/api/storage/upload";

describe("isSafePath", () => {
  it("accepts a normal car-images path", () => {
    expect(isSafePath("cars/00001/commercial/abc-123.jpg")).toBe(true);
  });

  it("accepts a normal flat user path", () => {
    expect(isSafePath("f2554-80b-462a/abc-123.pdf")).toBe(true);
  });

  // Regression coverage: the character class alone (dots/dashes allowed as
  // path characters) does not reject ".." segments — confirmed this
  // previously passed before isSafePath()'s explicit per-segment check was
  // added. resolveStoragePath() in fs.server.ts is the actual enforcement
  // point (path.resolve() + containment check) and would still reject these
  // at write time, but this validation shouldn't silently let them through.
  it("rejects a '..' traversal segment", () => {
    expect(isSafePath("cars/../../../etc/passwd")).toBe(false);
  });

  it("rejects a leading '..' traversal", () => {
    expect(isSafePath("../../etc/passwd")).toBe(false);
  });

  it("rejects a bare '.' segment", () => {
    expect(isSafePath("cars/./00001/x.jpg")).toBe(false);
  });

  it("rejects an absolute path", () => {
    expect(isSafePath("/etc/passwd")).toBe(false);
  });

  it("rejects a path with disallowed characters", () => {
    expect(isSafePath("cars/00001/../<script>.jpg")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSafePath("")).toBe(false);
  });
});
