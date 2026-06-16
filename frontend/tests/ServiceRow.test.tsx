import { render, screen, fireEvent } from "@testing-library/react";
import { ServiceRow } from "@/components/browse/ServiceRow";
import type { ServiceListItem } from "@/lib/types";

const mockService: ServiceListItem = {
  id: "svc_abc",
  name: "Claude Sonnet 4.6 (Direct API)",
  slug: "claude-sonnet-4-6-direct-api",
  service_type: "ai_model",
  composite_score: 923,
  grade: "A",
  confidence: 3,
  is_stale: false,
  scored_at: new Date().toISOString(),
};

const mockStaleService: ServiceListItem = {
  ...mockService,
  id: "svc_stale",
  is_stale: true,
};

test("renders service name", () => {
  render(<table><tbody><ServiceRow service={mockService} onAddToCompare={() => {}} canAddToCompare /></tbody></table>);
  expect(screen.getByText("Claude Sonnet 4.6 (Direct API)")).toBeInTheDocument();
});

test("renders composite score", () => {
  render(<table><tbody><ServiceRow service={mockService} onAddToCompare={() => {}} canAddToCompare /></tbody></table>);
  expect(screen.getByText("923")).toBeInTheDocument();
});

test("stale row has amber styling", () => {
  const { container } = render(
    <table><tbody><ServiceRow service={mockStaleService} onAddToCompare={() => {}} canAddToCompare /></tbody></table>
  );
  expect(container.querySelector("tr")).toHaveClass("bg-amber-50");
});

test("add to compare button calls handler", () => {
  const handler = jest.fn();
  render(<table><tbody><ServiceRow service={mockService} onAddToCompare={handler} canAddToCompare /></tbody></table>);
  fireEvent.click(screen.getByRole("button", { name: /add to compare/i }));
  expect(handler).toHaveBeenCalledWith(mockService);
});

test("add to compare button disabled when canAddToCompare is false", () => {
  render(<table><tbody><ServiceRow service={mockService} onAddToCompare={() => {}} canAddToCompare={false} /></tbody></table>);
  expect(screen.getByRole("button", { name: /add to compare/i })).toBeDisabled();
});
