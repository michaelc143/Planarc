import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BoardsPage from "../Boards/BoardsPage";
import { AuthContext } from "../../contexts/AuthContext";

jest.mock("../../services/board-service", () => ({
	__esModule: true,
	default: {
		listBoards: jest.fn(),
		createBoard: jest.fn(),
	},
}));

import boardService from "../../services/board-service";

describe("BoardsPage", () => {
	const renderWithAuth = (ui: React.ReactElement) => {
		const setIsLoggedIn = jest.fn();
		return render(
			<Router>
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
					{ui}
				</AuthContext.Provider>
			</Router>,
		);
	};

	beforeEach(() => {
		jest.resetAllMocks();
	});

	test("lists boards and can create a new board", async () => {
		const boards = [
			{ id: 1, name: "Board A", description: "desc A", owner_id: 1, created_at: "", updated_at: "" },
			{ id: 2, name: "Board B", description: "desc B", owner_id: 1, created_at: "", updated_at: "" },
		];
		(boardService.listBoards as jest.Mock).mockResolvedValueOnce(boards);
		(boardService.createBoard as jest.Mock).mockResolvedValueOnce({ id: 3, name: "New Board", description: "new", owner_id: 1, created_at: "", updated_at: "" });

		renderWithAuth(<BoardsPage />);

		// shows loading then boards
		expect(screen.getByText(/Loading/i)).toBeInTheDocument();
		await waitFor(() => expect(screen.getByText("Board A")).toBeInTheDocument());
		expect(screen.getByText("Board B")).toBeInTheDocument();

		// create a new board
		await userEvent.type(screen.getByPlaceholderText(/Board name/i), "New Board");
		await userEvent.type(screen.getByPlaceholderText(/Description/i), "new");
		await userEvent.click(screen.getByRole("button", { name: /Create Board/i }));

		await waitFor(() => expect(boardService.createBoard).toHaveBeenCalled());
		// assert new board link appears
		await screen.findByRole("link", { name: "New Board" });
	});
});
