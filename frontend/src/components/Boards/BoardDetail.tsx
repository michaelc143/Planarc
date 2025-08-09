import React, { useEffect, useState, useContext } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { BoardTask, Board } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";
import { AuthContext } from "../../contexts/AuthContext";
import BoardKanban from "./BoardKanban";
import { StatusPicker, PriorityPicker } from "./StatusPriorityPickers";

export default function BoardDetail(): React.JSX.Element {
	const { isLoggedIn } = useContext(AuthContext);
	const { boardId } = useParams();
	const id = Number(boardId);
	const [board, setBoard] = useState<Board | null>(null);
	const [tasks, setTasks] = useState<BoardTask[]>([]);
	const [createStatusName, setCreateStatusName] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string>("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<string>("medium");
	const [editingBoard, setEditingBoard] = useState<boolean>(false);
	const [boardName, setBoardName] = useState<string>("");
	const [boardDesc, setBoardDesc] = useState<string>("");

	useEffect(() => {
		(async () => {
			try {
				const [b, t] = await Promise.all([
					boardService.getBoard(id),
					boardService.listTasks(id),
				]);
				setBoard(b);
				setBoardName(b.name);
				setBoardDesc(b.description ?? "");
				setTasks(t);
				setCreateStatusName("");
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Failed to load board";
				setError(msg);
			} finally {
				setLoading(false);
			}
		})();
	}, [id]);

	const onCreateTask = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const created = await boardService.createTask(id, {
				title,
				description,
				status: createStatusName || "todo",
				priority,
				assigned_to: undefined,
				due_date: undefined,
			});
			setTasks((prev) => [created, ...prev]);
			setTitle("");
			setDescription("");
			setPriority("medium");
			setCreateStatusName("");
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to create task";
			setError(msg);
		}
	};

	const onSaveBoard = async () => {
		try {
			await boardService.updateBoard(id, { name: boardName, description: boardDesc });
			setBoard(prev => prev ? { ...prev, name: boardName, description: boardDesc } : prev);
			setEditingBoard(false);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to update board";
			setError(msg);
		}
	};

	const onDeleteBoard = async () => {
		if (!window.confirm("Delete this board? This cannot be undone.")) {
			return;
		}
		try {
			await boardService.deleteBoard(id);
			window.location.href = "/boards";
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to delete board";
			setError(msg);
		}
	};

	if (!isLoggedIn) {
		return <Navigate to="/" />;
	}
	if (loading) {
		return <div className="p-4">Loading...</div>;
	}
	if (error) {
		return <div className="p-4 text-red-600">{error}</div>;
	}

	return (
		<div className="p-4 max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4">
				<Link className="text-blue-600 hover:underline" to="/boards">← Back to Boards</Link>
				<div className="space-x-2">
					<button onClick={() => setEditingBoard(v => !v)} className="px-3 py-1 border rounded">{editingBoard ? "Cancel" : "Edit Board"}</button>
					<button onClick={onDeleteBoard} className="px-3 py-1 border rounded text-red-600">Delete Board</button>
				</div>
			</div>

			{editingBoard ? (
				<div className="mb-6 grid gap-2 grid-cols-1 sm:grid-cols-2">
					<input className="border px-3 py-2 rounded" value={boardName} onChange={e => setBoardName(e.target.value)} />
					<textarea className="border px-3 py-2 rounded" value={boardDesc} onChange={e => setBoardDesc(e.target.value)} />
					<button onClick={onSaveBoard} className="bg-blue-600 text-white px-4 py-2 rounded sm:col-span-2">Save Board</button>
				</div>
			) : (
				<>
					<h1 className="text-2xl font-bold mb-1">{board?.name}</h1>
					<p className="text-gray-700 mb-6">{board?.description}</p>
				</>
			)}

			<form onSubmit={onCreateTask} className="mb-6 bg-white border rounded p-4 shadow-sm">
				<div className="grid gap-3 grid-cols-1 sm:grid-cols-4">
					<div className="sm:col-span-2">
						<label className="block text-sm text-gray-700 mb-1">Title</label>
						<input
							type="text"
							className="w-full border px-3 py-2 rounded"
							placeholder="Task title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							required
						/>
					</div>
					<div>
						<label className="block text-sm text-gray-700 mb-1">Priority</label>
						<PriorityPicker boardId={id} value={priority} onChange={setPriority} />
					</div>
					<div>
						<label className="block text-sm text-gray-700 mb-1">Status</label>
						<StatusPicker boardId={id} value={createStatusName} onChange={setCreateStatusName} />
					</div>
					<div className="sm:col-span-4">
						<label className="block text-sm text-gray-700 mb-1">Description</label>
						<textarea
							className="w-full border px-3 py-2 rounded"
							placeholder="Description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					<div className="sm:col-span-4 flex justify-end">
						<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Task</button>
					</div>
				</div>
			</form>

			<BoardKanban boardId={id} tasks={tasks} setTasks={setTasks} />
		</div>
	);
}
