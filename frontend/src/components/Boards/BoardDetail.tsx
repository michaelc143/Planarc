import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { BoardTask, Board } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";
import { AuthContext } from "../../contexts/AuthContext";
import BoardKanban from "./BoardKanban";
import { StatusPicker, PriorityPicker } from "./StatusPriorityPickers";
import { ToastContext } from "../../contexts/ToastContext";

export default function BoardDetail(): React.JSX.Element {
	const { isLoggedIn, user } = useContext(AuthContext);
	const { showToast } = useContext(ToastContext);
	const { boardId } = useParams();
	const id = Number(boardId);
	const [board, setBoard] = useState<Board | null>(null);
	const [tasks, setTasks] = useState<BoardTask[]>([]);
	const [createStatusName, setCreateStatusName] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(true);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<string>("medium");
	const [estimate, setEstimate] = useState<string>("");
	const [editingBoard, setEditingBoard] = useState<boolean>(false);
	const [boardName, setBoardName] = useState<string>("");
	const [boardDesc, setBoardDesc] = useState<string>("");
	const [members, setMembers] = useState<Array<{ id: number; board_id: number; user_id: number; username?: string; role: string; joined_at: string }>>([]);
	const [newMemberUsername, setNewMemberUsername] = useState<string>("");
	const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
	const headerRef = useRef<HTMLDivElement | null>(null);
	const [kanbanHeight, setKanbanHeight] = useState<number>(0);

	// Recompute available viewport height for Kanban when header changes or viewport resizes
	useEffect(() => {
		const compute = () => {
			const rect = headerRef.current?.getBoundingClientRect();
			const bottom = rect ? rect.bottom : 0;
			const vh = window.innerHeight || document.documentElement.clientHeight;
			const available = Math.max(120, vh - bottom);
			setKanbanHeight(available);
		};
		compute();
		let ro: ResizeObserver | null = null;
		const RO = (window as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
		if (typeof RO === "function") {
			ro = new RO(() => compute());
			if (headerRef.current) {
				ro.observe(headerRef.current);
			}
		}
		window.addEventListener("resize", compute);
		return () => {
			window.removeEventListener("resize", compute);
			if (ro) {
				ro.disconnect();
			}
		};
	}, [editingBoard, showCreateForm, boardName, boardDesc, title, description, estimate, priority, createStatusName]);

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
				try {
					const m = await boardService.listMembers(id);
					setMembers(m);
				} catch { /* ignore if forbidden/not found */ }
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Failed to load board";
				showToast(msg, "error");
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
				estimate: estimate && /^\d+$/.test(estimate) ? Number(estimate) : undefined,
			});
			setTasks((prev) => [created, ...prev]);
			setTitle("");
			setDescription("");
			setPriority("medium");
			setEstimate("");
			setCreateStatusName("");
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to create task";
			showToast(msg, "error");
		}
	};

	const onSaveBoard = async () => {
		try {
			await boardService.updateBoard(id, { name: boardName, description: boardDesc });
			setBoard(prev => prev ? { ...prev, name: boardName, description: boardDesc } : prev);
			setEditingBoard(false);
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to update board";
			showToast(msg, "error");
		}
	};

	const onAddMember = async () => {
		const uname = newMemberUsername.trim();
		if (!uname) { return; }
		try {
			await boardService.addMemberByUsername(id, uname);
			const m = await boardService.listMembers(id);
			setMembers(m);
			setNewMemberUsername("");
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to add member";
			showToast(msg, "error");
		}
	};

	const onRemoveMember = async (uid: number) => {
		try {
			await boardService.removeMember(id, uid);
			setMembers(prev => prev.filter(m => m.user_id !== uid));
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to remove member";
			showToast(msg, "error");
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
			showToast(msg, "error");
		}
	};

	if (!isLoggedIn) {
		return <Navigate to="/" />;
	}
	if (loading) {
		return <div className="p-4">Loading...</div>;
	}

	const myUserId = Number(user?.userId);
	const myMembership = members.find(m => m.user_id === myUserId);
	const canManageMembers = !!board && (myUserId === board.owner_id || (myMembership && (myMembership.role === "owner" || myMembership.role === "admin")));

	return (
		<div className="p-4 max-w-screen-2xl mx-auto min-h-screen flex flex-col">
			<div className="flex items-center justify-between mb-4">
				<Link className="text-blue-600 hover:underline" to="/boards">← Back to Boards</Link>
				<div className="space-x-2">
					{board && (
						<Link to={`/boards/${id}/burndown`} className="px-3 py-1 border rounded">Burndown</Link>
					)}
					<button onClick={() => setEditingBoard(v => !v)} className="px-3 py-1 border rounded">{editingBoard ? "Cancel" : "Edit Board"}</button>
					{board && Number(user?.userId) === board.owner_id && (
						<button onClick={onDeleteBoard} className="px-3 py-1 border rounded text-red-600">Delete Board</button>
					)}
				</div>
			</div>

			{editingBoard ? (
				<div className="mb-6 grid gap-2 grid-cols-1 sm:grid-cols-2">
					<input className="border px-3 py-2 rounded" value={boardName} onChange={e => setBoardName(e.target.value)} />
					<textarea className="border px-3 py-2 rounded" value={boardDesc} onChange={e => setBoardDesc(e.target.value)} />
					<button onClick={onSaveBoard} className="bg-blue-600 text-white px-4 py-2 rounded sm:col-span-2">Save Board</button>
					<div className="sm:col-span-2 mt-4 border-t pt-4">
						<h3 className="font-semibold mb-2">Members</h3>
						<ul className="mb-3 space-y-1">
							{members.map(m => (
								<li key={m.id} className="flex justify-between items-center">
									<span>{m.username ? `@${m.username}` : `User #${m.user_id}`} — {m.role}</span>
									{canManageMembers && board && m.user_id !== board.owner_id && (
										<button type="button" className="text-red-600 text-sm" onClick={() => onRemoveMember(m.user_id)}>Remove</button>
									)}
								</li>
							))}
						</ul>
						{canManageMembers && (
							<div className="flex gap-2">
								<input className="border px-2 py-1 rounded" placeholder="Add by username (e.g. alice)" value={newMemberUsername} onChange={e => setNewMemberUsername(e.target.value)} />
								<button type="button" className="px-3 py-1 border rounded" onClick={onAddMember}>Add</button>
							</div>
						)}
					</div>
				</div>
			) : (
				<>
					<div className="flex items-center gap-2 mb-1">
						<h1 className="text-2xl font-bold">{board?.name}</h1>
						{board && Number(user?.userId) !== board.owner_id && (
							<span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 border">Shared with me</span>
						)}
					</div>
					<p className="text-gray-700 mb-6">{board?.description}</p>
				</>
			)}

			{/* Header block we measure for dynamic height calculations */}
			<div className="mb-4" ref={headerRef}>
				<button
					type="button"
					className="bg-blue-600 text-white px-4 py-2 rounded"
					aria-expanded={showCreateForm}
					aria-controls="new-task-form"
					onClick={() => setShowCreateForm(v => !v)}
				>
					{showCreateForm ? "Hide New Task" : "New Task"}
				</button>
			</div>

			{showCreateForm && (
				<form onSubmit={onCreateTask} className="mb-6 bg-white border rounded p-4 shadow-sm" id="new-task-form">
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
						<div className="sm:col-span-1">
							<label className="block text-sm text-gray-700 mb-1">Estimate (points)</label>
							<input
								type="number"
								min={0}
								className="w-full border px-3 py-2 rounded"
								placeholder="e.g. 3"
								value={estimate}
								onChange={(e) => setEstimate(e.target.value)}
							/>
						</div>
						<div className="sm:col-span-4 flex justify-end">
							<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add Task</button>
						</div>
					</div>
				</form>
			)}

			<div className="min-h-0" style={{ height: kanbanHeight ? `${kanbanHeight}px` : undefined }}>
				<BoardKanban boardId={id} tasks={tasks} setTasks={setTasks} />
			</div>
		</div>
	);
}
