import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BoardBurndown from "../Boards/BoardBurndown";
import { AuthContext } from "../../contexts/AuthContext";

jest.mock("../../services/board-service", () => ({
	__esModule: true,
	default: {
		getBoard: jest.fn(),
		listTasks: jest.fn(),
	},
}));

import boardService from "../../services/board-service";

describe("BoardBurndown", () => {
	const renderWithAuth = (ui: React.ReactElement) => {
		const setIsLoggedIn = jest.fn();
		return render(
			<MemoryRouter initialEntries={["/boards/1/burndown"]}>
				<AuthContext.Provider value={{
					isLoggedIn: true,
					setIsLoggedIn,
					user: { userId: "1", username: "u", email: "e", dateJoined: "d", role: "user" },
					login: jest.fn(),
					register: jest.fn(),
					logout: jest.fn(),
					isAuthenticated: true,
					loading: false,
				}}>
					<Routes>
						<Route path="/boards/:boardId/burndown" element={ui} />
					</Routes>
				</AuthContext.Provider>
			</MemoryRouter>,
		);
	};

	beforeEach(() => {
		jest.resetAllMocks();
	});

	test("renders totals from tasks", async () => {
		(boardService.getBoard as jest.Mock).mockResolvedValueOnce({ id: 1, name: "Board A", description: "d", owner_id: 1, created_at: "", updated_at: "" });
		(boardService.listTasks as jest.Mock).mockResolvedValueOnce([
			{ id: 1, title: "T1", description: "", status: "todo", priority: "medium", estimate: 5, effort_used: 2, board_id: 1, created_by: 1, created_at: "" },
			{ id: 2, title: "T2", description: "", status: "done", priority: "medium", estimate: 3, effort_used: 4, board_id: 1, created_by: 1, created_at: "" },
		]);

		renderWithAuth(<BoardBurndown />);

		await waitFor(() => expect(screen.getByText(/Burndown & Effort/i)).toBeInTheDocument());
		// Switch scope to All tasks so our mocked tasks are included
		await userEvent.selectOptions(screen.getByRole("combobox", { name: /Scope/i }), "all");

		// Total estimate = 5 + 3 = 8
		const totalLabel = screen.getByText(/^Total estimate$/i);
		expect(totalLabel.nextElementSibling).toHaveTextContent(/^8$/);
		// Used total = 2 + 4 = 6 (actual used, not clamped to estimate)
		const usedLabels = screen.getAllByText(/^Used$/i);
		const usedLabel = usedLabels.find(el => el.tagName === "DIV");
		expect(usedLabel).toBeTruthy();
		if (!usedLabel) { throw new Error("Used label not found"); }
		expect(usedLabel.nextElementSibling).toHaveTextContent(/^6$/);
		// Remaining = max(5-2,0)+max(3-4,0)=3+0=3 (target the stat label, not the description)
		const remainingLabels = screen.getAllByText(/^Remaining$/i);
		const remainingLabel = remainingLabels.find(el => el.tagName === "DIV");
		expect(remainingLabel).toBeTruthy();
		if (!remainingLabel) {
			throw new Error("Remaining label not found");
		}
		expect(remainingLabel.nextElementSibling).toHaveTextContent(/^3$/);
	});
});
