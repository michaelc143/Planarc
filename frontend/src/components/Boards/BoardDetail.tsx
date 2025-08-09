import React, { useEffect, useState, useContext } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { BoardTask, Board } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";
import { AuthContext } from "../../contexts/AuthContext";
import BoardKanban from "./BoardKanban";

export default function BoardDetail(): React.JSX.Element {
	const { isLoggedIn } = useContext(AuthContext);
	const { boardId } = useParams();
	const navigate = useNavigate();
	const id = Number(boardId);
	const [board, setBoard] = useState<Board | null>(null);
	const [tasks, setTasks] = useState<BoardTask[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string>("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<BoardTask["priority"]>("medium");
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
				status: "todo",
				priority,
				assigned_to: undefined,
				due_date: undefined,
			});
			setTasks((prev) => [created, ...prev]);
			setTitle("");
			setDescription("");
			setPriority("medium");
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to create task";
			setError(msg);
		}
	};

	const onUpdateTask = async (task: BoardTask, updates: Partial<BoardTask>) => {
		try {
			await boardService.updateTask(id, task.id, updates);
			setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t));
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to update task";
			setError(msg);
		}
	};

	const onDeleteTask = async (task: BoardTask) => {
		try {
			await boardService.deleteTask(id, task.id);
			setTasks(prev => prev.filter(t => t.id !== task.id));
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to delete task";
			setError(msg);
		}
	};

	const onSaveBoard = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await boardService.updateBoard(id, { name: boardName, description: boardDesc });
			setBoard(prev => (prev ? { ...prev, name: boardName, description: boardDesc } : prev));
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
			navigate("/boards");
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
		<div className="p-4 max-w-6xl mx-auto">
			<div className="mb-4 flex items-center justify-between">
				<Link to="/boards" className="text-blue-600 hover:underline">← Back to Boards</Link>
				<button onClick={onDeleteBoard} className="text-red-600 hover:underline">Delete Board</button>
			</div>

			{editingBoard ? (
				<form onSubmit={onSaveBoard} className="mb-4 space-y-2">
					<input className="border px-3 py-2 rounded w-full" value={boardName} onChange={(e) => setBoardName(e.target.value)} />
					<textarea className="border px-3 py-2 rounded w-full" value={boardDesc} onChange={(e) => setBoardDesc(e.target.value)} />
					<div className="space-x-2">
						<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
						<button type="button" className="px-4 py-2 rounded border" onClick={() => setEditingBoard(false)}>Cancel</button>
					</div>
				</form>
			) : (
				<div className="mb-6">
					<h1 className="text-2xl font-bold">{board?.name}</h1>
					<p className="text-gray-700">{board?.description}</p>
					<button className="mt-2 text-blue-600 hover:underline" onClick={() => setEditingBoard(true)}>Edit Board</button>
				</div>
			)}

			<form onSubmit={onCreateTask} className="mb-6 grid gap-2 grid-cols-1 sm:grid-cols-2">
				<input
					type="text"
					className="border px-3 py-2 rounded"
					placeholder="Task title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					required
				/>
				<select className="border px-3 py-2 rounded" value={priority} onChange={(e) => setPriority(e.target.value as BoardTask["priority"]) }>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
					<option value="critical">Critical</option>
				</select>
				<textarea
					className="border px-3 py-2 rounded sm:col-span-2"
					placeholder="Description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
				<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded sm:col-span-2">Add Task</button>
			</form>

			{/* Kanban with inline editing actions */}
			<div className="mb-8">
				<BoardKanban boardId={id} tasks={tasks} setTasks={setTasks} />
			</div>

			{/* Simple editable list for quick edits */}
			<ul className="space-y-2">
				{tasks.map((t) => (
					<li key={t.id} className="border rounded p-3">
						<div className="flex flex-wrap items-center gap-2">
							<input className="border px-2 py-1 rounded" value={t.title} onChange={(e) => onUpdateTask(t, { title: e.target.value })} />
							<select className="border px-2 py-1 rounded" value={t.status} onChange={(e) => onUpdateTask(t, { status: e.target.value as BoardTask["status"] })}>
								<option value="todo">Todo</option>
								<option value="in_progress">In Progress</option>
								<option value="review">Review</option>
								<option value="done">Done</option>
							</select>
							<select className="border px-2 py-1 rounded" value={t.priority} onChange={(e) => onUpdateTask(t, { priority: e.target.value as BoardTask["priority"] })}>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="critical">Critical</option>
							</select>
							<button className="text-red-600" onClick={() => onDeleteTask(t)}>Delete</button>
						</div>
						<textarea className="border w-full mt-2 px-2 py-1 rounded" value={t.description ?? ""} onChange={(e) => onUpdateTask(t, { description: e.target.value })} />
					</li>
				))}
			</ul>
		</div>
	);
}
