import React, { useMemo, useState } from "react";
import { BoardTask } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";

const STATUSES: BoardTask["status"][] = ["todo", "in_progress", "review", "done"];

type Props = {
	boardId: number;
	tasks: BoardTask[];
	setTasks: React.Dispatch<React.SetStateAction<BoardTask[]>>;
};

export default function BoardKanban({ boardId, tasks, setTasks }: Props): React.JSX.Element {
	const columns = useMemo(() => {
		const map: Record<string, BoardTask[]> = { todo: [], in_progress: [], review: [], done: [] };
		tasks.forEach(t => {
			map[t.status].push(t);
		});
		STATUSES.forEach(s => map[s] = map[s].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id));
		return map;
	}, [tasks]);

	const [dragged, setDragged] = useState<BoardTask | null>(null);

	const onDragStart = (t: BoardTask) => (e: React.DragEvent) => {
		setDragged(t);
		e.dataTransfer.setData("text/plain", String(t.id));
		e.dataTransfer.effectAllowed = "move";
	};

	const onDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
	};

	const onDropCard = (toStatus: BoardTask["status"], toIndex: number) => async (e: React.DragEvent) => {
		e.preventDefault();
		if (!dragged) {
			return;
		}
		const moves = [{ task_id: dragged.id, to_status: toStatus, to_position: toIndex }];
		await boardService.reorderTasks(boardId, moves);
		// Optimistic update
		setTasks(prev => {
			const next = prev.map(t => t.id === dragged.id ? { ...t, status: toStatus, position: toIndex } : t);
			return next
				.sort((a, b) => (a.status > b.status ? 1 : a.status < b.status ? -1 : 0) || (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
		});
		setDragged(null);
	};

	return (
		<div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
			{STATUSES.map((status) => (
				<div key={status} className="bg-gray-100 rounded p-2 min-h-[200px]" onDragOver={onDragOver} onDrop={onDropCard(status, columns[status].length)}>
					<div className="font-semibold capitalize mb-2">{status.replace("_", " ")}</div>
					<div className="space-y-2">
						{columns[status].map((t, idx) => (
							<div
								key={t.id}
								draggable
								onDragStart={onDragStart(t)}
								onDragOver={onDragOver}
								onDrop={onDropCard(status, idx)}
								className="bg-white border rounded p-2 shadow-sm cursor-move"
							>
								<div className="font-medium">{t.title} <span className="text-xs text-gray-500">[{t.priority}]</span></div>
								<div className="text-sm text-gray-600">{t.description}</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
