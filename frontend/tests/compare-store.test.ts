import {
  getCompareItems,
  addToCompare,
  removeFromCompare,
  clearCompare,
  canAdd,
} from "@/lib/compare-store";

// localStorage is available in jest-environment-jsdom
beforeEach(() => localStorage.clear());

const modelItem = { id: "svc_1", service_type: "ai_model" as const, name: "Model A" };
const mcpItem   = { id: "svc_2", service_type: "mcp_server" as const, name: "MCP A" };
const modelItem2 = { id: "svc_3", service_type: "ai_model" as const, name: "Model B" };

test("starts empty", () => expect(getCompareItems()).toEqual([]));

test("add one item", () => {
  addToCompare(modelItem);
  expect(getCompareItems()).toHaveLength(1);
  expect(getCompareItems()[0].id).toBe("svc_1");
});

test("does not add duplicate", () => {
  addToCompare(modelItem);
  addToCompare(modelItem);
  expect(getCompareItems()).toHaveLength(1);
});

test("type-lock: rejects different type after first item", () => {
  addToCompare(modelItem);
  expect(canAdd("mcp_server")).toBe(false);
  addToCompare(mcpItem);
  expect(getCompareItems()).toHaveLength(1);
});

test("type-lock: accepts same type", () => {
  addToCompare(modelItem);
  expect(canAdd("ai_model")).toBe(true);
  addToCompare(modelItem2);
  expect(getCompareItems()).toHaveLength(2);
});

test("canAdd returns false when 4 items present", () => {
  for (let i = 0; i < 4; i++) {
    addToCompare({ id: `svc_${i}`, service_type: "ai_model", name: `Model ${i}` });
  }
  expect(canAdd("ai_model")).toBe(false);
});

test("remove removes by id", () => {
  addToCompare(modelItem);
  addToCompare(modelItem2);
  removeFromCompare("svc_1");
  expect(getCompareItems().map((i) => i.id)).toEqual(["svc_3"]);
});

test("clear empties set", () => {
  addToCompare(modelItem);
  clearCompare();
  expect(getCompareItems()).toHaveLength(0);
});

test("type unlocks after clearing", () => {
  addToCompare(modelItem);
  clearCompare();
  expect(canAdd("mcp_server")).toBe(true);
});
