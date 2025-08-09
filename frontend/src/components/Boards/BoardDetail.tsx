import React, { useEffect, useState, useContext } from "react";
import { useParams, Navigate } from "react-router-dom";
import { BoardTask, Board } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";
import { AuthContext } from "../../contexts/AuthContext";
import BoardKanban from "./BoardKanban";

export default function BoardDetail(): React.JSX.Element {
	const { isLoggedIn } = useContext(AuthContext);
	const { boardId } = useParams();
	const id = Number(boardId);
	const [board, setBoard] = useState<Board | null>(null);
	const [tasks, setTasks] = useState<BoardTask[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string>("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<BoardTask["priority"]>("medium");

	useEffect(() => {
		(async () => {
			try {
				const [b, t] = await Promise.all([
					boardService.getBoard(id),
					boardService.listTasks(id),
				]);
				setBoard(b);
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
			<h1 className="text-2xl font-bold mb-4">{board?.name}</h1>
			<p className="text-gray-700 mb-6">{board?.description}</p>

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

			<BoardKanban boardId={id} tasks={tasks} setTasks={setTasks} />
		</div>
	);
}
