import { beforeEach, describe, expect, it, vi } from "vitest";

const renderSpy = vi.fn();
const createRootSpy = vi.fn(() => ({ render: renderSpy }));

vi.mock("react-dom/client", () => ({
  createRoot: createRootSpy,
}));

vi.mock("./App", () => ({
  default: () => <div>App Root</div>,
}));

describe("main entrypoint", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    renderSpy.mockClear();
    createRootSpy.mockClear();
    vi.resetModules();
  });

  it("mounts the application into #root", async () => {
    await import("./main");

    expect(createRootSpy).toHaveBeenCalledWith(document.getElementById("root"));
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
