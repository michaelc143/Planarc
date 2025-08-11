import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BoardBurndown from "../Boards/BoardBurndown";
import { AuthContext } from "../../contexts/AuthContext";
import { ToastContext } from "../../contexts/ToastContext";
import { AuthContextType } from "../../interfaces/Interfaces";

// Minimal providers
function withProviders(ui: React.ReactNode) {
	const auth: Partial<AuthContextType> = { isLoggedIn: true, isAuthenticated: true };
	type ToastValue = React.ContextType<typeof ToastContext>;
	const toast: ToastValue = { showToast: jest.fn() as unknown as ToastValue["showToast"] };
	return (
		<AuthContext.Provider value={auth as AuthContextType}>
			<ToastContext.Provider value={toast}>{ui}</ToastContext.Provider>
		</AuthContext.Provider>
	);
}

function renderWithRoute(boardId = 1, initialPath = `/boards/${boardId}/burndown`) {
	return render(
		withProviders(
			<MemoryRouter initialEntries={[initialPath]}>
				<Routes>
					<Route path="/boards/:boardId/burndown" element={<BoardBurndown />} />
				</Routes>
			</MemoryRouter>,
		),
	);
}

describe("BoardBurndown", () => {
	beforeEach(() => {
		// Mock fetch for board and tasks endpoints used by boardService
		global.fetch = jest.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith("/boards/1")) {
				return new Response(JSON.stringify({ id: 1, name: "Board 1", owner_id: 1, created_at: "2024-01-01" }), { status: 200, headers: { "Content-Type": "application/json" } });
			}
			if (url.endsWith("/boards/1/tasks")) {
				const tasks = [
					{ id: 1, title: "T1", status: "todo", priority: "med", board_id: 1, created_by: 1, created_at: "2025-01-01", estimate: 8, effort_used: 2, due_date: "2025-01-08" },
					{ id: 2, title: "T2", status: "in_progress", priority: "high", board_id: 1, created_by: 1, created_at: "2025-01-02", estimate: 5, effort_used: 3, due_date: "2025-01-09" },
					{ id: 3, title: "T3", status: "done", priority: "low", board_id: 1, created_by: 1, created_at: "2025-01-03", estimate: 3, effort_used: 4, due_date: "2025-01-10" },
					{ id: 4, title: "No dates", status: "todo", priority: "low", board_id: 1, created_by: 1, created_at: "", estimate: 4, effort_used: 0 },
				];
				return new Response(JSON.stringify(tasks), { status: 200, headers: { "Content-Type": "application/json" } });
			}
			return new Response("Not Found", { status: 404 });
		}) as unknown as typeof fetch;
		// Lock time to Wed, Jan 8, 2025 UTC for predictability
		jest.useFakeTimers();
		jest.setSystemTime(new Date(Date.UTC(2025, 0, 8)));
		localStorage.clear();
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	test("computes totals, used, remaining, and clamped correctly", async () => {
		renderWithRoute();

		// Wait for main heading to ensure content loaded
		await screen.findByText(/Burndown & Effort/i);

		// Totals from mock: est=8+5+3+4=20, used total=2+3+4+0=9, remaining= (8-2)+(5-3)+(3-4->0)+(4-0)=6+2+0+4=12
		const totalLabel = screen.getByText(/^Total estimate$/i);
		expect(totalLabel.nextElementSibling).toHaveTextContent(/^20$/);
		const usedLabel = screen.getAllByText(/^Used$/i).find(el => el.tagName === "DIV");
		expect(usedLabel).toBeTruthy();
		if (!usedLabel) { throw new Error("Used label not found"); }
		expect(usedLabel.nextElementSibling).toHaveTextContent(/^9$/);
		const remainingLabel = screen.getAllByText(/^Remaining$/i).find(el => el.tagName === "DIV");
		expect(remainingLabel).toBeTruthy();
		if (!remainingLabel) { throw new Error("Remaining label not found"); }
		expect(remainingLabel.nextElementSibling).toHaveTextContent(/^12$/);

		// Done panel shows done est (3) and done used clamped (min(4,3)=3)
		const doneHeader = screen.getByText(/Done column/i);
		const donePanel = doneHeader.parentElement as HTMLElement;
		const estLine = within(donePanel).getByText(/^Est:/i);
		const estSpan = estLine.querySelector("span");
		expect(estSpan).toHaveTextContent(/^3$/);
		const usedLine = within(donePanel).getByText(/^Used:/i);
		const usedSpan = usedLine.querySelector("span");
		expect(usedSpan).toHaveTextContent(/^3$/);
	});

	test("progressbar exposes ARIA attributes and updates value", async () => {
		renderWithRoute();

		// Ensure data loaded first
		await screen.findByText(/^Total estimate$/i);
		const label = await screen.findByText(/Burndown Progress/i);
		const progress = label.parentElement?.nextElementSibling as HTMLElement | null;

		expect(progress).toHaveAttribute("role", "progressbar");
		expect(progress).toHaveAttribute("aria-valuemin", "0");
		expect(progress).toHaveAttribute("aria-valuemax", "100");

		// pct = usedClampedTotal / totalEstimate = (2+3+3+0)/20 = 8/20 = 40%
		expect(progress).toHaveAttribute("aria-valuenow", "40");
	});

	test("trend chart accessible with role img and labels", async () => {
		renderWithRoute();

		await screen.findByText(/^Total estimate$/i);
		const svg = await screen.findByRole("img", { name: /sprint trend chart/i });
		expect(svg).toBeInTheDocument();
		expect(screen.getByText(/^Day 1$/i)).toBeInTheDocument();
		// Scope Ideal label to the svg element to avoid matching non-graph text
		const idealText = within(svg as HTMLElement).getByText(/^Ideal$/i);
		expect(idealText).toBeInTheDocument();
	});

	test("sprint editor toggle has aria-expanded and controls the panel", async () => {
		renderWithRoute();

		await screen.findByText(/^Total estimate$/i);
		const btn = await screen.findByRole("button", { name: /edit sprint/i });
		expect(btn).toHaveAttribute("aria-expanded", "false");

		await userEvent.click(btn);
		expect(btn).toHaveAttribute("aria-expanded", "true");

		const startLabel = await screen.findByLabelText(/Sprint start/i);
		expect(startLabel).toBeInTheDocument();
	});

	test("date filtering includes tasks by due_date, created_at, or defaults when missing", async () => {
		renderWithRoute();

		await screen.findByText(/^Total estimate$/i);
		const overview = await screen.findByText(/Tasks overview/i);
		const card = overview.parentElement as HTMLElement;
		const totalLine = within(card).getByText(/^Tasks total:/i);
		const totalSpan = totalLine.querySelector("span");
		expect(totalSpan?.textContent?.trim()).toBe("4");
	});
});
