import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardBurndown from "../Boards/BoardBurndown";
import { AuthContext } from "../../contexts/AuthContext";
import { ToastContext } from "../../contexts/ToastContext";

function renderWithProviders() {
	const auth = { isLoggedIn: true, isAuthenticated: true };
	const toast = { showToast: jest.fn() };
	return render(
		<AuthContext.Provider value={auth as unknown as React.ContextType<typeof AuthContext>}>
			<ToastContext.Provider value={toast as unknown as React.ContextType<typeof ToastContext>}>
				<MemoryRouter initialEntries={["/boards/1/burndown"]}>
					<Routes>
						<Route path="/boards/:boardId/burndown" element={<BoardBurndown />} />
					</Routes>
				</MemoryRouter>
			</ToastContext.Provider>
		</AuthContext.Provider>,
	);
}

describe("BoardBurndown Set active", () => {
	let updateCalled = false;

	beforeEach(() => {
		updateCalled = false;
		// Mock fetch endpoints used by boardService
		global.fetch = (jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = (init?.method || "GET").toUpperCase();
			if (url.endsWith("/boards/1") && method === "GET") {
				return new Response(JSON.stringify({ id: 1, name: "Board 1", owner_id: 1, created_at: "2025-01-01" }), { status: 200, headers: { "Content-Type": "application/json" } });
			}
			if (url.endsWith("/boards/1/tasks") && method === "GET") {
				return new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } });
			}
			if (url.endsWith("/boards/1/sprints") && method === "GET") {
				return new Response(JSON.stringify([
					{ id: 1, start_date: "2025-01-01", end_date: "2025-01-14", is_active: false },
					{ id: 2, start_date: "2025-01-15", end_date: "2025-01-28", is_active: true },
				]), { status: 200, headers: { "Content-Type": "application/json" } });
			}
			if (url.endsWith("/boards/1/sprints/active") && method === "GET") {
				return new Response(JSON.stringify({ sprint: { id: 2, start_date: "2025-01-15", end_date: "2025-01-28", is_active: true } }), { status: 200, headers: { "Content-Type": "application/json" } });
			}
			if (url.endsWith("/boards/1/sprints/1") && method === "PUT") {
				updateCalled = true;
				return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
			}
			return new Response("Not Found", { status: 404 });
		}) as unknown) as typeof fetch;
	});

	test("enables Set active when selecting a non-active sprint and calls update", async () => {
		renderWithProviders();

		// Wait for heading to ensure component loaded
		await screen.findByText(/Burndown & Effort/i);

		// Initially active sprint is id 2; wait for service call and options to load then select sprint 1
		// Wait for sprints to be requested and options to populate
		const select = screen.getByLabelText(/Sprint:/i);
		await waitFor(() => {
			const opts = select.querySelectorAll("option");
			expect(opts.length).toBeGreaterThan(1);
		});
		await userEvent.selectOptions(select, "1");

		const setActiveBtn = screen.getByRole("button", { name: /Set active/i });
		expect(setActiveBtn).not.toBeDisabled();

		await userEvent.click(setActiveBtn);

		await waitFor(() => expect(updateCalled).toBe(true));
		// After local state update, the selected sprint becomes active, button should disable
		expect(setActiveBtn).toBeDisabled();
	});
});
