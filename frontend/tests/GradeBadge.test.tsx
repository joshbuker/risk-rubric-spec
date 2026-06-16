import { render, screen } from "@testing-library/react";
import { GradeBadge } from "@/components/ui/GradeBadge";

test("renders the grade letter", () => {
  render(<GradeBadge grade="A" />);
  expect(screen.getByText("A")).toBeInTheDocument();
});

test("A grade has green styling", () => {
  const { container } = render(<GradeBadge grade="A" />);
  expect(container.firstChild).toHaveClass("bg-green-100");
});

test("F grade has red styling", () => {
  const { container } = render(<GradeBadge grade="F" />);
  expect(container.firstChild).toHaveClass("bg-red-100");
});

test("large variant applies larger text", () => {
  const { container } = render(<GradeBadge grade="B" size="lg" />);
  expect(container.firstChild).toHaveClass("text-4xl");
});
