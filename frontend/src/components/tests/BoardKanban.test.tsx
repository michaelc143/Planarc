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
		listMembers: jest.fn().mockResolvedValue([]),
		reorderTasks: jest.fn(),
		updateTask: jest.fn(),
		deleteTask: jest.fn(),
		listPriorities: jest.fn().mockResolvedValue([
			{ id: 1, name: "low", position: 0 },
			{ id: 2, name: "medium", position: 1 },
			{ id: 3, name: "high", position: 2 },
			{ id: 4, name: "critical", position: 3 },
		]),
		listSprints: jest.fn().mockResolvedValue([
			{ id: 10, start_date: "2025-01-01", end_date: "2025-01-14", is_active: true },
		]),
	},
}));

import boardService from "../../services/board-service";

describe("BoardKanban", () => {
	beforeEach(() => {
		// Preserve mock implementations defined in jest.mock while clearing call history
		jest.clearAllMocks();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(window as any).confirm = jest.fn(() => true);
	});

	test("renders tasks by columns, supports edit (including estimate), delete, and status change reorder", async () => {
		const tasks = [
			{ id: 1, title: "T1", description: "d1", status: "todo" as const, priority: "medium" as const, estimate: 3, board_id: 1, created_by: 1, created_at: "" },
			{ id: 2, title: "T2", description: "d2", status: "in_progress" as const, priority: "high" as const, board_id: 1, created_by: 1, created_at: "" },
		];
		const setTasks = jest.fn();
		render(<BoardKanban boardId={1} tasks={tasks} setTasks={setTasks} />);

		// columns show tasks (statuses load async)
		await screen.findByText("T1");
		await screen.findByText("T2");
		// estimate is shown for T1
		expect(screen.getByText(/Estimate:\s*3/i)).toBeInTheDocument();

		// open actions menu on T1 and click Edit
		const t1 = await screen.findByText("T1");
		const t1Card = t1.closest("[draggable=\"true\"]") as HTMLElement;
		await userEvent.click(within(t1Card).getByLabelText(/Task actions/i));
		await userEvent.click(within(t1Card).getByRole("menuitem", { name: /Edit/i }));
		const titleInput = screen.getByDisplayValue("T1");
		await userEvent.clear(titleInput);
		await userEvent.type(titleInput, "T1+");
		// change status to in_progress (triggers reorder API in save)
		const selects = screen.getAllByRole("combobox");
		await userEvent.selectOptions(selects[1], "in_progress");
		// sprint selection is exercised in BoardDetail create flow; skip here to avoid async flake
		// change estimate to 8
		const estimateInput = screen.getByLabelText(/Estimate \(points\)/i);
		await userEvent.clear(estimateInput);
		await userEvent.type(estimateInput, "8");
		// set effort used to 5
		const effortInput = screen.getByLabelText(/Effort used/i);
		await userEvent.clear(effortInput);
		await userEvent.type(effortInput, "5");
		await act(async () => {
			await userEvent.click(screen.getByRole("button", { name: /Save/i }));
		});
		await waitFor(() => expect(boardService.updateTask).toHaveBeenCalled());
		// ensure estimate and effort_used in payload
		expect((boardService.updateTask as jest.Mock).mock.calls[0][2]).toEqual(expect.objectContaining({ estimate: 8, effort_used: 5 }));
		await waitFor(() => expect(boardService.reorderTasks).toHaveBeenCalled());

		// delete T2 via kebab menu
		const t2 = await screen.findByText("T2");
		const t2Card = t2.closest("[draggable=\"true\"]") as HTMLElement;
		await userEvent.click(within(t2Card).getByLabelText(/Task actions/i));
		await userEvent.click(within(t2Card).getByRole("menuitem", { name: /Delete/i }));
		await waitFor(() => expect(boardService.deleteTask).toHaveBeenCalledWith(1, 2));
	});
});
