import { render, screen } from "@testing-library/react";
import { PillarCompareRow } from "@/components/compare/PillarCompareRow";
import type { PillarBreakdown } from "@/lib/types";

const pillarsHigh: PillarBreakdown = { transparency: 900, reliability: 900, security: 900, privacy: 900, safety_societal: 900, excessive_agency: 900 };
const pillarsLow:  PillarBreakdown = { transparency: 600, reliability: 600, security: 600, privacy: 600, safety_societal: 600, excessive_agency: 600 };
const pillarsMid:  PillarBreakdown = { transparency: 750, reliability: 750, security: 750, privacy: 750, safety_societal: 750, excessive_agency: 750 };

const services = [
  { id: "svc_1", pillars: pillarsHigh, composite_score: 900, name: "Service A" },
  { id: "svc_2", pillars: pillarsLow,  composite_score: 600, name: "Service B" },
  { id: "svc_3", pillars: pillarsMid,  composite_score: 750, name: "Service C" },
];

test("renders a score for each service", () => {
  render(
    <table><tbody>
      <PillarCompareRow pillarKey="security" services={services} />
    </tbody></table>
  );
  expect(screen.getByText("900")).toBeInTheDocument();
  expect(screen.getByText("600")).toBeInTheDocument();
  expect(screen.getByText("750")).toBeInTheDocument();
});

test("marks the highest score as best", () => {
  const { container } = render(
    <table><tbody>
      <PillarCompareRow pillarKey="security" services={services} />
    </tbody></table>
  );
  const cells = container.querySelectorAll("td[data-service-id]");
  expect(cells[0]).toHaveClass("bg-green-50");   // highest
  expect(cells[1]).toHaveClass("bg-red-50");     // lowest
  expect(cells[2]).not.toHaveClass("bg-green-50");
});
