import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { BoardTask, BoardStatus, BoardPriority } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";
import { ToastContext } from "../../contexts/ToastContext";

type Props = {
	boardId: number;
	tasks: BoardTask[];
	setTasks: React.Dispatch<React.SetStateAction<BoardTask[]>>;
};

export default function BoardKanban({ boardId, tasks, setTasks }: Props): React.JSX.Element {
	const { showToast } = useContext(ToastContext);
	const [statuses, setStatuses] = useState<BoardStatus[]>([]);
	const [priorities, setPriorities] = useState<BoardPriority[]>([]);
	const [newStatusName, setNewStatusName] = useState("");
	const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
	const [editingStatusName, setEditingStatusName] = useState("");
	const [newStatusColor, setNewStatusColor] = useState<string>("#f3f4f6");
	const [editingStatusColor, setEditingStatusColor] = useState<string>("#f3f4f6");

	const notifyStatusesUpdated = () => {
		try {
			window.dispatchEvent(new CustomEvent("planarc:board-statuses-updated", { detail: { boardId } }));
		} catch {
			/* no-op */
		}
	};

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const s = await boardService.listStatuses(boardId);
				if (mounted) {
					if (Array.isArray(s) && s.length > 0) {
						setStatuses(s);
					} else {
						setStatuses([
							{ id: -1, name: "todo", position: 0 },
							{ id: -2, name: "in_progress", position: 1 },
							{ id: -3, name: "review", position: 2 },
							{ id: -4, name: "done", position: 3 },
						]);
					}
				}
			} catch {
				if (mounted) {
					setStatuses([
						{ id: -1, name: "todo", position: 0 },
						{ id: -2, name: "in_progress", position: 1 },
						{ id: -3, name: "review", position: 2 },
						{ id: -4, name: "done", position: 3 },
					]);
				}
			}
		})();

		// listen for external status updates from pickers
		const onStatusesUpdated = async () => {
			try {
				const s = await boardService.listStatuses(boardId);
				if (mounted && Array.isArray(s)) { setStatuses(s); }
			} catch { /* ignore */ }
		};
		window.addEventListener("planarc:board-statuses-updated", onStatusesUpdated);
		return () => {
			mounted = false;
			window.removeEventListener("planarc:board-statuses-updated", onStatusesUpdated);
		};
	}, [boardId]);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const p = await boardService.listPriorities(boardId);
				if (mounted && Array.isArray(p) && p.length > 0) {
					setPriorities(p);
				} else if (mounted) {
					setPriorities([
						{ id: -1, name: "low", position: 0 },
						{ id: -2, name: "medium", position: 1 },
						{ id: -3, name: "high", position: 2 },
						{ id: -4, name: "critical", position: 3 },
					]);
				}
			} catch {
				if (mounted) {
					setPriorities([
						{ id: -1, name: "low", position: 0 },
						{ id: -2, name: "medium", position: 1 },
						{ id: -3, name: "high", position: 2 },
						{ id: -4, name: "critical", position: 3 },
					]);
				}
			}
		})();

		const onPrioritiesUpdated = async () => {
			try {
				const p = await boardService.listPriorities(boardId);
				if (mounted && Array.isArray(p)) { setPriorities(p); }
			} catch { /* ignore */ }
		};
		window.addEventListener("planarc:board-priorities-updated", onPrioritiesUpdated);
		return () => {
			mounted = false;
			window.removeEventListener("planarc:board-priorities-updated", onPrioritiesUpdated);
		};
	}, [boardId]);

	const columns = useMemo(() => {
		const map: Record<string, BoardTask[]> = {};
		// Guard against any unexpected undefined in tests or early render
		const safeStatuses = Array.isArray(statuses) ? statuses : [];
		safeStatuses.forEach(s => { map[s.name] = []; });
		tasks.forEach(t => {
			if (!map[t.status]) { map[t.status] = []; }
			map[t.status].push(t);
		});
		Object.keys(map).forEach(k => {
			map[k] = map[k].slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
		});
		return map;
	}, [tasks, statuses]);

	const [dragged, setDragged] = useState<BoardTask | null>(null);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [editDesc, setEditDesc] = useState("");
	const [editPriority, setEditPriority] = useState<string>("medium");
	const [editStatus, setEditStatus] = useState<string>("todo");
	const [editOrigStatus, setEditOrigStatus] = useState<string>("todo");
	const [editEstimate, setEditEstimate] = useState<string>("");
	const [editEffortUsed, setEditEffortUsed] = useState<string>("0");
	const estimateInputRef = useRef<HTMLInputElement | null>(null);
	const [focusEstimateNext, setFocusEstimateNext] = useState<number | null>(null);

	// --- UI color helpers for dynamic borders and readable contrast ---
	const parseHex = (hex?: string): { r: number; g: number; b: number } | null => {
		if (!hex) { return null; }
		let h = hex.trim().toLowerCase();
		if (h.startsWith("#")) { h = h.slice(1); }
		if (h.length === 3) { h = h.split("").map(ch => ch + ch).join(""); }
		if (h.length !== 6) { return null; }
		const num = parseInt(h, 16);
		const r = (num >> 16) & 255;
		const g = (num >> 8) & 255;
		const b = num & 255;
		return { r, g, b };
	};

	const toHex = (r: number, g: number, b: number) => {
		const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
		return `#${c(r)}${c(g)}${c(b)}`;
	};

	const getLuminance = (hex?: string): number | null => {
		const rgb = parseHex(hex);
		if (!rgb) { return null; }
		// relative luminance (sRGB)
		const srgb = [rgb.r, rgb.g, rgb.b].map(v => {
			const c = v / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
	};

	const adjustBrightness = (hex?: string, amount = 0): string | undefined => {
		const rgb = parseHex(hex);
		if (!rgb) { return undefined; }
		return toHex(rgb.r + amount, rgb.g + amount, rgb.b + amount);
	};

	const getBorderColorFor = (bg?: string): string => {
		// For very light backgrounds, slightly darken; for dark, slightly lighten.
		const lum = getLuminance(bg);
		if (lum == null) { return "#d1d5db"; } // gray-300 fallback
		return lum > 0.6 ? (adjustBrightness(bg, -28) || "#9ca3af") // gray-400 fallback
			: (adjustBrightness(bg, 36) || "#e5e7eb"); // gray-200 fallback
	};

	const getTextColorFor = (bg?: string): string | undefined => {
		const lum = getLuminance(bg);
		if (lum == null) { return undefined; }
		// If background is dark, prefer white text; else near-black.
		return lum < 0.45 ? "#ffffff" : "#111827"; // slate-900
	};

	// Track whether to show top/bottom scroll shadows for each column's task list
	const [scrollShadows, setScrollShadows] = useState<Record<number, { top: boolean; bottom: boolean }>>({});
	const listRefs = useRef<Record<number, HTMLDivElement | null>>({});
	const setShadowFor = (sid: number, el: HTMLElement | null) => {
		if (!el) { return; }
		const top = el.scrollTop > 0;
		const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
		setScrollShadows(prev => {
			const cur = prev[sid];
			if (cur && cur.top === top && cur.bottom === bottom) { return prev; }
			return { ...prev, [sid]: { top, bottom } };
		});
	};

	// Initialize scroll shadows after render (and when tasks/statuses change sizes)
	useEffect(() => {
		statuses.forEach(s => {
			const el = listRefs.current[s.id] as unknown as HTMLElement | null;
			if (el) { setShadowFor(s.id, el); }
		});
	}, [statuses, tasks.length]);

	useEffect(() => {
		if (editingId != null && focusEstimateNext === editingId && estimateInputRef.current) {
			estimateInputRef.current.focus();
			setFocusEstimateNext(null);
		}
	}, [editingId, focusEstimateNext]);

	const onDragStart = (t: BoardTask) => (e: React.DragEvent) => {
		setDragged(t);
		e.dataTransfer.setData("text/plain", String(t.id));
		e.dataTransfer.effectAllowed = "move";
	};
	const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
	const onDropCard = (toStatus: string, toIndex: number) => async (e: React.DragEvent) => {
		e.preventDefault();
		if (!dragged) { return; }
		await boardService.reorderTasks(boardId, [{ task_id: dragged.id, to_status: toStatus, to_position: toIndex }]);
		setTasks(prev => {
			const next = prev.map(t => t.id === dragged.id ? { ...t, status: toStatus, position: toIndex } : t);
			return next.sort((a, b) => (a.status > b.status ? 1 : a.status < b.status ? -1 : 0) || (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
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
		setEditEstimate(typeof t.estimate === "number" ? String(t.estimate) : "");
		setEditEffortUsed(typeof t.effort_used === "number" ? String(t.effort_used) : "0");
	};
	const cancelEdit = () => setEditingId(null);

	const saveEdit = async () => {
		if (editingId == null) { return; }
		try {
			const trimmed = editEstimate.trim();
			await boardService.updateTask(boardId, editingId, {
				title: editTitle,
				description: editDesc,
				priority: editPriority,
				estimate: trimmed === "" ? null : (/^\d+$/.test(trimmed) ? Number(trimmed) : undefined),
				effort_used: /^\d+$/.test(editEffortUsed.trim()) ? Number(editEffortUsed.trim()) : 0,
			});
			if (editStatus !== editOrigStatus) {
				const toPos = (columns[editStatus] ? columns[editStatus].length : 0);
				await boardService.reorderTasks(boardId, [{ task_id: editingId, to_status: editStatus, to_position: toPos }]);
				setTasks(prev => prev.map(t => t.id === editingId ? { ...t, status: editStatus, position: toPos } : t));
			}
			setTasks(prev => prev.map(t => t.id === editingId ? { ...t, title: editTitle, description: editDesc, priority: editPriority } : t));
			setTasks(prev => prev.map(t => t.id === editingId ? { ...t, title: editTitle, description: editDesc, priority: editPriority, estimate: (trimmed === "" ? undefined : (/^\d+$/.test(trimmed) ? Number(trimmed) : t.estimate)), effort_used: (/^\d+$/.test(editEffortUsed.trim()) ? Number(editEffortUsed.trim()) : 0) } : t));
			setEditingId(null);
		} catch (e) {
			showToast(e instanceof Error ? e.message : "Failed to update task", "error");
		}
	};

	const deleteTask = async (taskId: number) => {
		if (!window.confirm("Delete this task?")) { return; }
		try {
			await boardService.deleteTask(boardId, taskId);
			setTasks(prev => prev.filter(t => t.id !== taskId));
		} catch (e) {
			showToast(e instanceof Error ? e.message : "Failed to delete task", "error");
		}
	};

	// Status CRUD
	const addStatus = async () => {
		const name = newStatusName.trim();
		if (!name) { return; }
		try {
			const s = await boardService.createStatus(boardId, name, newStatusColor || undefined);
			setStatuses(prev => [...prev, s].sort((a, b) => a.position - b.position));
			setNewStatusName("");
			setNewStatusColor("#f3f4f6");
			notifyStatusesUpdated();
		} catch (e) {
			showToast(e instanceof Error ? e.message : "Failed to create status", "error");
		}
	};
	const startEditStatus = (s: BoardStatus) => { setEditingStatusId(s.id); setEditingStatusName(s.name); setEditingStatusColor(s.color || "#f3f4f6"); };
	const saveStatus = async (s: BoardStatus) => {
		try {
			await boardService.updateStatus(boardId, s.id, { name: editingStatusName, color: editingStatusColor });
			setStatuses(prev => prev.map(x => x.id === s.id ? { ...x, name: editingStatusName, color: editingStatusColor } : x));
			setEditingStatusId(null);
			notifyStatusesUpdated();
		} catch (e) {
			showToast(e instanceof Error ? e.message : "Failed to update status", "error");
		}
	};
	const moveStatus = async (s: BoardStatus, direction: -1 | 1) => {
		const sorted = [...statuses].sort((a, b) => a.position - b.position);
		const idx = sorted.findIndex(x => x.id === s.id);
		const newIdx = idx + direction;
		if (newIdx < 0 || newIdx >= sorted.length) { return; }
		// swap positions locally
		const a = sorted[idx];
		const b = sorted[newIdx];
		const aPos = a.position; const bPos = b.position;
		try {
			await Promise.all([
				boardService.updateStatus(boardId, a.id, { position: bPos }),
				boardService.updateStatus(boardId, b.id, { position: aPos }),
			]);
			const refreshed = await boardService.listStatuses(boardId);
			setStatuses(refreshed);
			notifyStatusesUpdated();
		} catch (e) {
			showToast(e instanceof Error ? e.message : "Failed to reorder columns", "error");
		}
	};
	const removeStatus = async (s: BoardStatus) => {
		if (!window.confirm(`Delete status "${s.name}"? Tasks will be moved to fallback.`)) { return; }
		try {
			await boardService.deleteStatus(boardId, s.id);
			const refreshed = await boardService.listStatuses(boardId);
			setStatuses(refreshed);
			const newTasks = await boardService.listTasks(boardId);
			setTasks(newTasks);
			notifyStatusesUpdated();
		} catch (e) {
			showToast(e instanceof Error ? e.message : "Failed to delete status", "error");
		}
	};

	return (
		<div className="space-y-3 h-full flex flex-col min-h-0">
			<div className="flex gap-2 items-center">
				<input className="border px-2 py-1 rounded" placeholder="Add status (column)" value={newStatusName} onChange={e => setNewStatusName(e.target.value)} />
				<input title="Column color" type="color" className="border rounded w-10 h-10 p-0" value={newStatusColor} onChange={e => setNewStatusColor(e.target.value)} />
				<button className="px-3 py-1 border rounded" onClick={addStatus}>Add</button>
			</div>
			<div className="overflow-x-auto min-h-0 flex-1">
				<div className="flex flex-nowrap items-stretch gap-4 pb-2 min-h-0 h-full">
					{statuses.map((s) => {
						const borderColor = getBorderColorFor(s.color);
						const textColor = getTextColorFor(s.color);
						return (
							<div
								key={s.id}
								className="rounded p-2 w-72 shrink-0 flex flex-col h-full min-h-0 border shadow-sm"
								style={{ backgroundColor: s.color || undefined, borderColor, color: textColor }}
								onDragOver={onDragOver}
								onDrop={onDropCard(s.name, (columns[s.name]?.length ?? 0))}
							>
								<div className="font-semibold capitalize mb-2 flex items-center justify-between">
									{editingStatusId === s.id ? (
										<div className="flex gap-2 items-center w-full">
											<input className="border px-2 py-1 rounded w-full" value={editingStatusName} onChange={e => setEditingStatusName(e.target.value)} />
											<input title="Column color" type="color" className="border rounded w-10 h-10 p-0" value={editingStatusColor} onChange={e => setEditingStatusColor(e.target.value)} />
											<button className="px-2 py-1 border rounded" onClick={() => saveStatus(s)}>Save</button>
											<button className="px-2 py-1 border rounded" onClick={() => setEditingStatusId(null)}>Cancel</button>
										</div>
									) : (
										<>
											<span>{s.name.replace("_", " ")}</span>
											<div className="text-xs space-x-2">
												<button className="underline" onClick={() => moveStatus(s, -1)}>◀</button>
												<button className="underline" onClick={() => moveStatus(s, 1)}>▶</button>
												<button className="underline" onClick={() => startEditStatus(s)}>Rename</button>
												<button className="underline text-red-600" onClick={() => removeStatus(s)}>Delete</button>
											</div>
										</>
									)}
								</div>
								<div className="relative flex-1 min-h-0">
									<div
										className="space-y-2 overflow-y-auto h-full pr-1"
										onScroll={(e) => setShadowFor(s.id, e.currentTarget)}
										ref={(el) => { listRefs.current[s.id] = el; }}
									>
										{(columns[s.name] ?? []).map((t, idx) => (
											<div
												key={t.id}
												draggable={editingId !== t.id}
												onDragStart={onDragStart(t)}
												onDragOver={onDragOver}
												onDrop={onDropCard(s.name, idx)}
												className={`bg-white border rounded p-2 shadow-sm ${editingId === t.id ? "relative z-10" : ""}`}
											>
												{editingId === t.id ? (
													<div className="space-y-2">
														<input className="border w-full px-2 py-1 rounded" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
														<textarea className="border w-full px-2 py-1 rounded" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
														<div className="flex flex-wrap gap-2">
															<select className="border px-2 py-1 rounded w-full sm:w-auto" value={editPriority} onChange={e => setEditPriority(e.target.value) }>
																{(priorities.length ? priorities : [
																	{ id: -1, name: "low", position: 0 },
																	{ id: -2, name: "medium", position: 1 },
																	{ id: -3, name: "high", position: 2 },
																	{ id: -4, name: "critical", position: 3 },
																]).map(p => (
																	<option key={p.id} value={p.name}>{p.name}</option>
																))}
															</select>
															<select className="border px-2 py-1 rounded capitalize w-full sm:w-auto" value={editStatus} onChange={e => setEditStatus(e.target.value) }>
																{statuses.map(st => <option key={st.id} value={st.name}>{st.name.replace("_", " ")}</option>)}
															</select>
															<div className="w-full sm:w-auto">
																<label htmlFor={`estimate-${t.id}`} className="block text-xs text-gray-700 mb-1">Estimate (points)</label>
																<input ref={estimateInputRef} id={`estimate-${t.id}`} className="border px-2 py-1 rounded w-full sm:w-24" type="number" min={0} value={editEstimate} onChange={e => setEditEstimate(e.target.value)} />
															</div>
															<div className="w-full sm:w-auto">
																<label htmlFor={`effort-${t.id}`} className="block text-xs text-gray-700 mb-1">Effort used</label>
																<input id={`effort-${t.id}`} className="border px-2 py-1 rounded w-full sm:w-24" type="number" min={0} value={editEffortUsed} onChange={e => setEditEffortUsed(e.target.value)} />
															</div>
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
														{(typeof t.effort_used === "number" || typeof t.estimate === "number") && (
															<div className="text-xs text-gray-500 mt-1">
																{typeof t.effort_used === "number"
																	? (typeof t.estimate === "number" ? (<span>Used: {t.effort_used} / Est: {t.estimate}</span>) : (<span>Used: {t.effort_used}</span>))
																	: (typeof t.estimate === "number" ? (<span>Estimate: {t.estimate}</span>) : null)
																}
																<button
																	className="ml-2 underline text-blue-600"
																	onClick={() => { setFocusEstimateNext(t.id); startEdit(t); }}
																>
													Change
																</button>
															</div>
														)}
													</div>
												)}
											</div>
										))}
									</div>
									{/* scroll shadows */}
									{scrollShadows[s.id]?.top && (
										<div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-gray-200/80 to-transparent rounded-t" />
									)}
									{scrollShadows[s.id]?.bottom && (
										<div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-gray-200/80 to-transparent rounded-b" />
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
