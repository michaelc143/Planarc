import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardKanban from "../Boards/BoardKanban";

jest.mock("../../services/board-service", () => ({
	__esModule: true,
	default: {
		reorderTasks: jest.fn(),
		updateTask: jest.fn(),
		deleteTask: jest.fn(),
	},
}));

import boardService from "../../services/board-service";

describe("BoardKanban", () => {
	beforeEach(() => {
		jest.resetAllMocks();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).confirm = jest.fn(() => true);
	});

	test("renders tasks by columns, supports edit, delete, and status change reorder", async () => {
		const tasks = [
			{ id: 1, title: "T1", description: "d1", status: "todo" as const, priority: "medium" as const, board_id: 1, created_by: 1, created_at: "" },
			{ id: 2, title: "T2", description: "d2", status: "in_progress" as const, priority: "high" as const, board_id: 1, created_by: 1, created_at: "" },
		];
		const setTasks = jest.fn();
		render(<BoardKanban boardId={1} tasks={tasks} setTasks={setTasks} />);

		// columns show tasks
		expect(screen.getByText("T1")).toBeInTheDocument();
		expect(screen.getByText("T2")).toBeInTheDocument();

		// edit T1
		await userEvent.click(screen.getAllByText("Edit")[0]);
		const titleInput = screen.getByDisplayValue("T1");
		await userEvent.clear(titleInput);
		await userEvent.type(titleInput, "T1+");
		// change status to in_progress (triggers reorder API in save)
		const selects = screen.getAllByRole("combobox");
		await userEvent.selectOptions(selects[1], "in_progress");
		await act(async () => {
			await userEvent.click(screen.getByRole("button", { name: /Save/i }));
		});
		await waitFor(() => expect(boardService.updateTask).toHaveBeenCalled());
		await waitFor(() => expect(boardService.reorderTasks).toHaveBeenCalled());

		// delete T2
		await userEvent.click(screen.getAllByText("Delete")[1]);
		await waitFor(() => expect(boardService.deleteTask).toHaveBeenCalledWith(1, 2));
	});
});
