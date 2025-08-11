import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { BoardTask, Board, TaskDependency } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";
import { AuthContext } from "../../contexts/AuthContext";
import BoardKanban from "./BoardKanban";
import DependenciesGraph from "./DependenciesGraph";
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
	const [boardBg, setBoardBg] = useState<string>("");
	const [members, setMembers] = useState<Array<{ id: number; board_id: number; user_id: number; username?: string; role: string; joined_at: string }>>([]);
	const [newMemberUsername, setNewMemberUsername] = useState<string>("");
	const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
	const headerRef = useRef<HTMLDivElement | null>(null);
	const [kanbanHeight, setKanbanHeight] = useState<number>(0);
	// Dependencies UI state
	const [deps, setDeps] = useState<TaskDependency[]>([]);
	const [depBlockerId, setDepBlockerId] = useState<string>("");
	const [depBlockedId, setDepBlockedId] = useState<string>("");
	const [showGraph, setShowGraph] = useState<boolean>(false);

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
				setBoardBg(b.background_color ?? "");
				setTasks(t);
				setCreateStatusName("");
				try {
					const m = await boardService.listMembers(id);
					setMembers(m);
				} catch { /* ignore if forbidden/not found */ }
				try {
					const d = await boardService.listDependencies(id);
					setDeps(Array.isArray(d) ? d : []);
				} catch { /* ignore */ }
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
			await boardService.updateBoard(id, { name: boardName, description: boardDesc, background_color: boardBg || undefined });
			setBoard(prev => prev ? { ...prev, name: boardName, description: boardDesc, background_color: boardBg || undefined } : prev);
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

	// Dependencies handlers
	const addDependency = async () => {
		const blocker = Number(depBlockerId);
		const blocked = Number(depBlockedId);
		if (!blocker || !blocked) { return; }
		try {
			const created = await boardService.createDependency(id, blocker, blocked);
			setDeps(prev => [...prev, { id: created.id, board_id: id, blocker_task_id: blocker, blocked_task_id: blocked }]);
			setDepBlockerId("");
			setDepBlockedId("");
		} catch (e) {
			showToast(e instanceof Error ? e.message : "Failed to add dependency", "error");
		}
	};

	const removeDependency = async (depId: number) => {
		try {
			await boardService.deleteDependency(id, depId);
			setDeps(prev => prev.filter(d => d.id !== depId));
		} catch (e) {
			showToast(e instanceof Error ? e.message : "Failed to remove dependency", "error");
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
		<div className="p-4 max-w-screen-2xl mx-auto min-h-screen">
			<div className="border rounded-xl shadow-lg p-4 sm:p-6 bg-white" style={{ backgroundColor: board?.background_color || undefined }}>
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
						<div className="flex items-center gap-2">
							<label className="text-sm text-gray-700">Board background</label>
							<input type="color" className="border rounded w-12 h-10 p-0" value={boardBg || "#ffffff"} onChange={e => setBoardBg(e.target.value)} />
							<input className="border px-2 py-1 rounded flex-1" placeholder="#ffffff or css color" value={boardBg} onChange={e => setBoardBg(e.target.value)} />
						</div>
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
				<div className="mt-4 flex items-center justify-between">
					<h3 className="font-semibold">Dependencies</h3>
					<button type="button" className="px-3 py-1 border rounded" aria-pressed={showGraph} onClick={() => setShowGraph(v => !v)}>
						{showGraph ? "Hide Graph" : "Show Graph"}
					</button>
				</div>
				{showGraph && (
					<div className="mt-2">
						<DependenciesGraph tasks={tasks} dependencies={deps} />
					</div>
				)}
				<div className="mt-6 border-t pt-4">
					<h3 className="font-semibold mb-2">Manage Dependencies</h3>
					<div className="flex flex-wrap gap-2 items-end">
						<div>
							<label className="block text-sm text-gray-700 mb-1">Blocker task</label>
							<select className="border px-2 py-1 rounded min-w-[10rem]" value={depBlockerId} onChange={e => setDepBlockerId(e.target.value)}>
								<option value="">Select…</option>
								{tasks.map(t => <option key={t.id} value={t.id}>{t.title} (#{t.id})</option>)}
							</select>
						</div>
						<div>
							<label className="block text-sm text-gray-700 mb-1">Blocked task</label>
							<select className="border px-2 py-1 rounded min-w-[10rem]" value={depBlockedId} onChange={e => setDepBlockedId(e.target.value)}>
								<option value="">Select…</option>
								{tasks.map(t => <option key={t.id} value={t.id}>{t.title} (#{t.id})</option>)}
							</select>
						</div>
						<button type="button" className="px-3 py-1 border rounded" onClick={addDependency}>Add</button>
					</div>
					<ul className="mt-3 space-y-1">
						{deps.map(d => (
							<li key={d.id} className="flex items-center justify-between">
								<span>Task #{d.blocker_task_id} blocks Task #{d.blocked_task_id}</span>
								<button className="text-red-600 text-sm" onClick={() => removeDependency(d.id)}>Remove</button>
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}
