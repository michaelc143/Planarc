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
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editTitle, setEditTitle] = useState<string>("");
	const [editDesc, setEditDesc] = useState<string>("");
	const [editPriority, setEditPriority] = useState<BoardTask["priority"]>("medium");
	const [editStatus, setEditStatus] = useState<BoardTask["status"]>("todo");
	const [editOrigStatus, setEditOrigStatus] = useState<BoardTask["status"]>("todo");

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

	const startEdit = (t: BoardTask) => {
		setEditingId(t.id);
		setEditTitle(t.title);
		setEditDesc(t.description ?? "");
		setEditPriority(t.priority);
		setEditStatus(t.status);
		setEditOrigStatus(t.status);
	};

	const cancelEdit = () => {
		setEditingId(null);
	};

	const saveEdit = async () => {
		if (editingId == null) {
			return;
		}
		try {
			// Update basic fields
			await boardService.updateTask(boardId, editingId, {
				title: editTitle,
				description: editDesc,
				priority: editPriority,
			});
			// If status changed, move to end of new column
			if (editStatus !== editOrigStatus) {
				const toPos = columns[editStatus].length; // current length becomes new index
				await boardService.reorderTasks(boardId, [{ task_id: editingId, to_status: editStatus, to_position: toPos }]);
				setTasks(prev => prev.map(t => t.id === editingId ? { ...t, status: editStatus, position: toPos } : t));
			}
			// Update local state for non-status fields
			setTasks(prev => prev.map(t => t.id === editingId ? { ...t, title: editTitle, description: editDesc, priority: editPriority } : t));
			setEditingId(null);
		} catch (e) {
			alert(e instanceof Error ? e.message : "Failed to update task");
		}
	};

	const deleteTask = async (taskId: number) => {
		if (!window.confirm("Delete this task?")) {
			return;
		}
		try {
			await boardService.deleteTask(boardId, taskId);
			setTasks(prev => prev.filter(t => t.id !== taskId));
		} catch (e) {
			alert(e instanceof Error ? e.message : "Failed to delete task");
		}
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
								draggable={editingId !== t.id}
								onDragStart={onDragStart(t)}
								onDragOver={onDragOver}
								onDrop={onDropCard(status, idx)}
								className="bg-white border rounded p-2 shadow-sm"
							>
								{editingId === t.id ? (
									<div className="space-y-2">
										<input className="border w-full px-2 py-1 rounded" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
										<textarea className="border w-full px-2 py-1 rounded" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
										<div className="flex gap-2">
											<select className="border px-2 py-1 rounded" value={editPriority} onChange={e => setEditPriority(e.target.value as BoardTask["priority"]) }>
												<option value="low">Low</option>
												<option value="medium">Medium</option>
												<option value="high">High</option>
												<option value="critical">Critical</option>
											</select>
											<select className="border px-2 py-1 rounded capitalize" value={editStatus} onChange={e => setEditStatus(e.target.value as BoardTask["status"]) }>
												{STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
											</select>
										</div>
										<div className="flex gap-2">
											<button className="bg-blue-600 text-white px-2 py-1 rounded" onClick={saveEdit}>Save</button>
											<button className="px-2 py-1 rounded border" onClick={cancelEdit}>Cancel</button>
										</div>
									</div>
								) : (
									<div className="cursor-move">
										<div className="font-medium flex items-center justify-between">
											<span>{t.title} <span className="text-xs text-gray-500">[{t.priority}]</span></span>
											<div className="text-xs space-x-2">
												<button className="underline" onClick={() => startEdit(t)}>Edit</button>
												<button className="underline text-red-600" onClick={() => deleteTask(t.id)}>Delete</button>
											</div>
										</div>
										<div className="text-sm text-gray-600">{t.description}</div>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
