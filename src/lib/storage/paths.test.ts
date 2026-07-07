import { describe, it, expect } from "vitest";
import { parseCarIdFromPath, parseUserIdFromPath, extFromFile } from "@/lib/storage/paths";

describe("parseCarIdFromPath", () => {
  it("extracts the carId from a normal car-images path", () => {
    expect(parseCarIdFromPath("cars/00001/commercial/abc.jpg")).toBe("00001");
  });

  it("returns null for a path with no cars/ prefix", () => {
    expect(parseCarIdFromPath("something/00001/x.jpg")).toBeNull();
  });

  // Not a live vulnerability (see upload.ts's isSafePath + fs.server.ts's
  // resolveStoragePath, both of which reject ".." independently before this
  // value could ever reach the filesystem or a DB write), but worth pinning
  // down explicitly: this function alone has no opinion on whether the
  // captured segment is a real car id, so callers must not treat its output
  // as pre-validated.
  it("does not itself reject a '..' segment as the carId", () => {
    expect(parseCarIdFromPath("cars/../etc/passwd")).toBe("..");
  });
});

describe("parseUserIdFromPath", () => {
  it("extracts the userId from a flat path", () => {
    expect(parseUserIdFromPath("f2554-80b/abc.pdf")).toBe("f2554-80b");
  });

  it("returns null when there's no slash at all", () => {
    expect(parseUserIdFromPath("abc.pdf")).toBeNull();
  });
});

describe("extFromFile", () => {
  it("takes the extension from the filename when present", () => {
    expect(extFromFile({ name: "photo.JPG" })).toBe("jpg");
  });

  it("takes the last extension for a multi-dot filename", () => {
    expect(extFromFile({ name: "archive.tar.gz" })).toBe("gz");
  });

  it("falls back to mime type when the filename has no dot", () => {
    expect(extFromFile({ name: "noext", type: "image/png" })).toBe("png");
  });

  it("falls back to 'bin' when neither name nor a known mime type is present", () => {
    expect(extFromFile({})).toBe("bin");
  });

  it("sanitizes an overly long or unexpected extension to 'bin'", () => {
    expect(extFromFile({ name: "file.reallylongext" })).toBe("bin");
  });
});
