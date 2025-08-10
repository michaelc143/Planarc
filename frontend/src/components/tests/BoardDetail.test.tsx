import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BoardDetail from "../Boards/BoardDetail";
import { AuthContext } from "../../contexts/AuthContext";

jest.mock("../../services/board-service", () => ({
	__esModule: true,
	default: {
		getBoard: jest.fn(),
		listTasks: jest.fn(),
		listStatuses: jest.fn(),
		updateBoard: jest.fn(),
		createTask: jest.fn(),
	},
}));

jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	useParams: () => ({ boardId: "1" }),
}));

jest.mock("../Boards/BoardKanban", () => ({
	__esModule: true,
	default: ({ tasks }: { tasks: Array<{ id: number; title: string }> }) => (
		<div data-testid="kanban">Tasks: {tasks.length}</div>
	),
}));

import boardService from "../../services/board-service";

describe("BoardDetail", () => {
	const renderWithAuth = (ui: React.ReactElement) => {
		const setIsLoggedIn = jest.fn();
		return render(
			<MemoryRouter initialEntries={["/boards/1"]}>
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
			</MemoryRouter>,
		);
	};

	beforeEach(() => {
		jest.resetAllMocks();
	});

	test("loads board and tasks, allows editing board and creating task", async () => {
		(boardService.getBoard as jest.Mock).mockResolvedValueOnce({ id: 1, name: "Board A", description: "desc", owner_id: 1, created_at: "", updated_at: "" });
		(boardService.listTasks as jest.Mock).mockResolvedValueOnce([
			{ id: 11, title: "T1", description: "d1", status: "todo", priority: "medium", board_id: 1, created_by: 1, created_at: "" },
		]);
		(boardService.listStatuses as jest.Mock).mockResolvedValueOnce([
			{ id: 1, name: "todo", position: 0 },
			{ id: 2, name: "in_progress", position: 1 },
			{ id: 3, name: "review", position: 2 },
			{ id: 4, name: "done", position: 3 },
		]);
		(boardService.updateBoard as jest.Mock).mockResolvedValueOnce(undefined);
		(boardService.createTask as jest.Mock).mockResolvedValueOnce({ id: 12, title: "NewT", description: "nd", status: "todo", priority: "medium", estimate: 5, board_id: 1, created_by: 1, created_at: "" });

		renderWithAuth(<BoardDetail />);

		await waitFor(() => expect(screen.getByText("Board A")).toBeInTheDocument());
		// Open the collapsible New Task form
		await userEvent.click(screen.getByRole("button", { name: /New Task/i }));
		// statuses are loaded async for the create form
		await screen.findByRole("button", { name: /Add Task/i });
		expect(screen.getByTestId("kanban")).toHaveTextContent("Tasks: 1");

		// edit board
		await userEvent.click(screen.getByRole("button", { name: /Edit Board/i }));
		const nameInput = screen.getByDisplayValue("Board A");
		await userEvent.clear(nameInput);
		await userEvent.type(nameInput, "Board A+");
		await userEvent.click(screen.getByRole("button", { name: /Save Board/i }));
		await waitFor(() => expect(boardService.updateBoard).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Board A+" })));

		// create task
		await userEvent.type(screen.getByPlaceholderText(/Task title/i), "NewT");
		await userEvent.type(screen.getByPlaceholderText(/Description/i), "nd");
		// set estimate
		await userEvent.type(screen.getByPlaceholderText(/e\.g\. 3/i), "5");
		await userEvent.click(screen.getByRole("button", { name: /Add Task/i }));
		await waitFor(() => expect(boardService.createTask).toHaveBeenCalled());
		// ensure estimate persisted in payload
		expect((boardService.createTask as jest.Mock).mock.calls[0][1]).toEqual(expect.objectContaining({ estimate: 5 }));
		await waitFor(() => expect(screen.getByTestId("kanban")).toHaveTextContent("Tasks: 2"));
	});
});
