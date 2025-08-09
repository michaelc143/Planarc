import React from "react";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardKanban from "../Boards/BoardKanban";

jest.mock("../../services/board-service", () => ({
	__esModule: true,
	default: {
		listStatuses: jest.fn().mockResolvedValue([
			{ id: 1, name: "todo", position: 0 },
			{ id: 2, name: "in_progress", position: 1 },
			{ id: 3, name: "review", position: 2 },
			{ id: 4, name: "done", position: 3 },
		]),
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

		// columns show tasks (statuses load async)
		await screen.findByText("T1");
		await screen.findByText("T2");

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

		// delete T2 (target the delete inside the T2 card specifically)
		const t2 = await screen.findByText("T2");
		const t2Card = t2.closest("[draggable=\"true\"]") as HTMLElement | null;
		expect(t2Card).not.toBeNull();
		await userEvent.click(within(t2Card as HTMLElement).getByText("Delete"));
		await waitFor(() => expect(boardService.deleteTask).toHaveBeenCalledWith(1, 2));
	});
});
