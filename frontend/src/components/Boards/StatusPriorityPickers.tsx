import React, { useEffect, useState } from "react";
import { BoardStatus, BoardPriority } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";

type CommonProps = {
	boardId: number;
};

type StatusPickerProps = CommonProps & {
	value: string;
	// eslint-disable-next-line no-unused-vars
	onChange: (name: string) => void;
	refreshKey?: number;
};

export function StatusPicker({ boardId, value, onChange, refreshKey }: StatusPickerProps): React.JSX.Element {
	const [statuses, setStatuses] = useState<BoardStatus[]>([]);
	const [newName, setNewName] = useState("");

	useEffect(() => {
		(async () => {
			try {
				const sRaw = await boardService.listStatuses(boardId);
				const s = Array.isArray(sRaw) ? sRaw : [];
				setStatuses(s);
			} catch {
				setStatuses([
					{ id: -1, name: "todo", position: 0 },
					{ id: -2, name: "in_progress", position: 1 },
					{ id: -3, name: "review", position: 2 },
					{ id: -4, name: "done", position: 3 },
				]);
			}
		})();
		const handler = () => {
			// refresh on external status changes
			void (async () => {
				try {
					const sRaw = await boardService.listStatuses(boardId);
					setStatuses(Array.isArray(sRaw) ? sRaw : []);
				} catch {
					/* ignore */
				}
			})();
		};
		window.addEventListener("planarc:board-statuses-updated", handler);
		return () => window.removeEventListener("planarc:board-statuses-updated", handler);
	}, [boardId, refreshKey]);

	const add = async () => {
		const name = newName.trim();
		if (!name) {
			return;
		}
		const created = await boardService.createStatus(boardId, name);
		const next = [...statuses, created].sort((a, b) => a.position - b.position);
		setStatuses(next);
		setNewName("");
		onChange(name);
		// notify others (e.g., Kanban) to refresh columns
		try {
			window.dispatchEvent(new CustomEvent("planarc:board-statuses-updated", { detail: { boardId } }));
		} catch { /* no-op */ }
	};

	return (
		<div className="space-y-2 min-w-0 max-w-full">
			<div className="flex gap-2 items-center min-w-0">
				<select className="border px-2 py-1 rounded capitalize w-full" value={value} onChange={(e) => onChange(e.target.value)}>
					<option value="" disabled>Select status…</option>
					{statuses.map((s) => (
						<option key={s.id} value={s.name}>{s.name.replace("_", " ")}</option>
					))}
				</select>
			</div>
			<div className="flex flex-wrap items-center gap-2 min-w-0">
				<input className="border px-2 py-1 rounded flex-1 min-w-0 w-full sm:w-auto" placeholder="New status" value={newName} onChange={(e) => setNewName(e.target.value)} />
				<button type="button" className="px-3 py-1 border rounded shrink-0" onClick={add}>Add</button>
			</div>
		</div>
	);
}

type PriorityPickerProps = CommonProps & {
  value: string;
  // eslint-disable-next-line no-unused-vars
  onChange: (name: string) => void;
};

export function PriorityPicker({ boardId, value, onChange }: PriorityPickerProps): React.JSX.Element {
	const [priorities, setPriorities] = useState<BoardPriority[]>([]);
	const [newName, setNewName] = useState("");

	useEffect(() => {
		(async () => {
			try {
				const pRaw = await boardService.listPriorities(boardId);
				const p = Array.isArray(pRaw) ? pRaw : [];
				setPriorities(p);
			} catch {
				const p = [
					{ id: -1, name: "low", position: 0 },
					{ id: -2, name: "medium", position: 1 },
					{ id: -3, name: "high", position: 2 },
					{ id: -4, name: "critical", position: 3 },
				];
				setPriorities(p);
			}
		})();
	}, [boardId]);

	const add = async () => {
		const name = newName.trim();
		if (!name) {
			return;
		}
		const created = await boardService.createPriority(boardId, name);
		const next = [...priorities, created].sort((a, b) => a.position - b.position);
		setPriorities(next);
		setNewName("");
		onChange(name);
		// notify others (e.g., Kanban) to refresh priorities
		try {
			window.dispatchEvent(new CustomEvent("planarc:board-priorities-updated", { detail: { boardId } }));
		} catch { /* no-op */ }
	};

	return (
		<div className="space-y-2 min-w-0 max-w-full">
			<div className="flex gap-2 items-center min-w-0">
				<select className="border px-2 py-1 rounded capitalize w-full" value={value} onChange={(e) => onChange(e.target.value)}>
					<option value="" disabled>Select priority…</option>
					{priorities.map((p) => (
						<option key={p.id} value={p.name}>{p.name}</option>
					))}
				</select>
			</div>
			<div className="flex flex-wrap items-center gap-2 min-w-0">
				<input className="border px-2 py-1 rounded flex-1 min-w-0 w-full sm:w-auto" placeholder="New priority" value={newName} onChange={(e) => setNewName(e.target.value)} />
				<button type="button" className="px-3 py-1 border rounded shrink-0" onClick={add}>Add</button>
			</div>
		</div>
	);
}
