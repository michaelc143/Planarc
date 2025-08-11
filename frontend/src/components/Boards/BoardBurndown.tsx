import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { BoardTask, Board } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";
import { ToastContext } from "../../contexts/ToastContext";
import { AuthContext } from "../../contexts/AuthContext";

export default function BoardBurndown(): React.JSX.Element {
	const { boardId } = useParams();
	const id = Number(boardId);
	const { showToast } = useContext(ToastContext);
	const { isLoggedIn } = useContext(AuthContext);
	const [board, setBoard] = useState<Board | null>(null);
	const [tasks, setTasks] = useState<BoardTask[]>([]);
	const [loading, setLoading] = useState(true);
	const [timeframe, setTimeframe] = useState<"current-sprint" | "all">("current-sprint");
	const [showSprintEditor, setShowSprintEditor] = useState(false);
	const [sprintOverrideStartStr, setSprintOverrideStartStr] = useState<string | null>(null);
	const [sprintOverrideEndStr, setSprintOverrideEndStr] = useState<string | null>(null);

	// Derive a simple 2-week current sprint starting this week's Monday; allow override via sprint editor
	const sprint = useMemo(() => {
		const now = new Date();
		const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
		const day = d.getUTCDay(); // 0=Sun..6=Sat
		const mondayOffset = (day === 0 ? -6 : 1 - day); // move back to Monday
		const baseStart = new Date(d);
		baseStart.setUTCDate(d.getUTCDate() + mondayOffset);
		const baseEnd = new Date(baseStart);
		baseEnd.setUTCDate(baseStart.getUTCDate() + 13); // 14-day sprint

		const parseIso = (s: string) => {
			const [yy, mm, dd] = s.split("-").map(Number);
			if (!yy || !mm || !dd) { return null; }
			return new Date(Date.UTC(yy, mm - 1, dd));
		};
		let start = baseStart;
		let end = baseEnd;
		if (sprintOverrideStartStr && sprintOverrideEndStr) {
			const ps = parseIso(sprintOverrideStartStr);
			const pe = parseIso(sprintOverrideEndStr);
			if (ps && pe && ps.getTime() <= pe.getTime()) {
				start = ps;
				end = pe;
			}
		}
		return { start, end };
	}, [sprintOverrideStartStr, sprintOverrideEndStr]);

	const fmtDate = (date: Date) => {
		const y = date.getUTCFullYear();
		const m = String(date.getUTCMonth() + 1).padStart(2, "0");
		const dd = String(date.getUTCDate()).padStart(2, "0");
		return `${y}-${m}-${dd}`;
	};

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
				showToast(e instanceof Error ? e.message : "Failed to load burndown", "error");
			} finally {
				setLoading(false);
			}
		})();
		// Load any saved sprint override for this board
		try {
			const key = `planarc:board:${id}:sprintRange`;
			const raw = localStorage.getItem(key);
			if (raw) {
				const saved = JSON.parse(raw) as { start: string; end: string };
				if (saved?.start && saved?.end) {
					setSprintOverrideStartStr(saved.start);
					setSprintOverrideEndStr(saved.end);
				}
			}
		} catch { /* ignore */ }
	}, [id]);

	const inSprint = (t: BoardTask) => {
		const parse = (s?: string) => {
			if (!s) { return undefined; }
			// accept yyyy-mm-dd or ISO string
			const parts = s.length === 10 ? s.split("-") : new Date(s);
			if (Array.isArray(parts)) {
				const dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
				return isNaN(dt.getTime()) ? undefined : dt;
			}
			const dt = new Date(parts as Date);
			return isNaN(dt.getTime()) ? undefined : dt;
		};
		const due = parse(t.due_date);
		const created = parse(t.created_at);
		const s = sprint.start.getTime();
		const e = sprint.end.getTime();
		if (due) {
			const time = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
			return time >= s && time <= e;
		}
		if (created) {
			const time = Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate());
			return time >= s && time <= e;
		}
		// If no valid dates, include by default so such tasks aren't missed in the sprint view
		return true;
	};

	const filteredTasks = useMemo(() => {
		const list = Array.isArray(tasks) ? tasks : [];
		return timeframe === "current-sprint" ? list.filter(inSprint) : list;
	}, [tasks, timeframe]);

	const stats = useMemo(() => {
		let totalEstimate = 0;
		let usedClampedTotal = 0;
		let usedTotal = 0;
		let remainingTotal = 0;
		let doneEstimate = 0;
		let doneUsedClamped = 0;

		for (const t of filteredTasks) {
			const est = typeof t.estimate === "number" && t.estimate > 0 ? t.estimate : 0;
			const used = typeof t.effort_used === "number" && t.effort_used > 0 ? t.effort_used : 0;
			const usedClamped = Math.min(used, est);
			totalEstimate += est;
			usedTotal += used;
			usedClampedTotal += usedClamped;
			remainingTotal += Math.max(est - used, 0);
			if (t.status === "done") {
				doneEstimate += est;
				doneUsedClamped += usedClamped;
			}
		}
		const pct = totalEstimate > 0 ? Math.min(100, Math.round((usedClampedTotal / totalEstimate) * 100)) : 0;
		return { totalEstimate, usedClampedTotal, usedTotal, remainingTotal, doneEstimate, doneUsedClamped, pct };
	}, [filteredTasks]);

	// Simple trend: ideal line across sprint, and a dot for today's actual remaining
	const trend = useMemo(() => {
		const days = Math.max(1, Math.round((sprint.end.getTime() - sprint.start.getTime()) / (24 * 3600 * 1000)) + 1);
		const now = new Date();
		const todayIdx = Math.min(days - 1, Math.max(0, Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - sprint.start.getTime()) / (24 * 3600 * 1000))));
		const idealToday = stats.totalEstimate * (1 - (todayIdx / (days - 1)));
		return { days, todayIdx, idealToday, actualRemaining: stats.remainingTotal };
	}, [sprint.start, sprint.end, stats.totalEstimate, stats.remainingTotal]);

	const yTicks = useMemo(() => {
		const total = stats.totalEstimate;
		if (total <= 0) { return [0]; }
		const mid = Math.round(total / 2);
		return [total, mid, 0];
	}, [stats.totalEstimate]);

	if (!isLoggedIn) {
		return <Navigate to="/" />;
	}
	if (loading) {
		return <div className="p-4">Loading…</div>;
	}

	return (
		<div className="p-4 max-w-screen-lg mx-auto">
			<div className="flex items-center justify-between mb-4">
				<Link to={`/boards/${id}`} className="text-blue-600 hover:underline">← Back to Board</Link>
				<div className="text-sm text-gray-600">Board: <span className="font-medium">{board?.name}</span></div>
			</div>
			<h1 className="text-2xl font-bold mb-2">Burndown & Effort</h1>
			<div className="flex flex-wrap items-center gap-3 mb-3">
				<div className="text-sm">
					<span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200 mr-2">Current sprint</span>
					<span className="text-gray-700">{fmtDate(sprint.start)} → {fmtDate(sprint.end)}</span>
				</div>
				<div className="text-sm">
					<label className="mr-2" htmlFor="scope-select">Scope:</label>
					<select id="scope-select" className="border px-2 py-1 rounded" value={timeframe} onChange={e => setTimeframe(e.target.value as typeof timeframe)}>
						<option value="current-sprint">Current sprint</option>
						<option value="all">All tasks</option>
					</select>
				</div>
				<div>
					<button
						className="px-2 py-1 border rounded text-sm"
						aria-expanded={showSprintEditor}
						aria-controls="sprint-editor-panel"
						onClick={() => setShowSprintEditor(v => !v)}
					>
						{showSprintEditor ? "Close sprint editor" : "Edit sprint"}
					</button>
				</div>
			</div>
			{showSprintEditor && (
				<div id="sprint-editor-panel" className="mb-4 bg-white border rounded p-3 flex flex-wrap items-end gap-3">
					<div>
						<label htmlFor="sprint-start" className="block text-xs text-gray-700 mb-1">Sprint start</label>
						<input id="sprint-start" type="date" className="border px-2 py-1 rounded" value={(sprintOverrideStartStr ?? fmtDate(sprint.start))} onChange={e => setSprintOverrideStartStr(e.target.value)} />
					</div>
					<div>
						<label htmlFor="sprint-end" className="block text-xs text-gray-700 mb-1">Sprint end</label>
						<input id="sprint-end" type="date" className="border px-2 py-1 rounded" value={(sprintOverrideEndStr ?? fmtDate(sprint.end))} onChange={e => setSprintOverrideEndStr(e.target.value)} />
					</div>
					<div className="flex gap-2">
						<button
							className="px-3 py-1 bg-blue-600 text-white rounded"
							onClick={() => {
								try {
									if (!sprintOverrideStartStr || !sprintOverrideEndStr) { return; }
									const s = new Date(sprintOverrideStartStr);
									const e = new Date(sprintOverrideEndStr);
									if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) { return; }
									localStorage.setItem(`planarc:board:${id}:sprintRange`, JSON.stringify({ start: sprintOverrideStartStr, end: sprintOverrideEndStr }));
									showToast("Sprint updated", "success");
								} catch { /* ignore */ }
							}}
						>
							Save
						</button>
						<button
							className="px-3 py-1 border rounded"
							onClick={() => {
								try {
									localStorage.removeItem(`planarc:board:${id}:sprintRange`);
									setSprintOverrideStartStr(null);
									setSprintOverrideEndStr(null);
									showToast("Sprint reset to default", "success");
								} catch { /* ignore */ }
							}}
						>
							Reset to default
						</button>
					</div>
				</div>
			)}
			<p className="text-gray-600 mb-6">Track total estimate, used effort, and remaining capacity for this board.</p>

			{stats.totalEstimate === 0 ? (
				<div className="p-4 border rounded bg-yellow-50 text-yellow-800">No estimates yet. Add estimates to tasks to see burndown stats.</div>
			) : (
				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div className="p-4 border rounded bg-white shadow-sm">
							<div className="text-sm text-gray-500">Total estimate</div>
							<div className="text-xl font-semibold">{stats.totalEstimate}</div>
						</div>
						<div className="p-4 border rounded bg-white shadow-sm">
							<div className="text-sm text-gray-500">Used</div>
							<div className="text-xl font-semibold">{stats.usedTotal}</div>
						</div>
						<div className="p-4 border rounded bg-white shadow-sm">
							<div className="text-sm text-gray-500">Remaining</div>
							<div className="text-xl font-semibold">{stats.remainingTotal}</div>
						</div>
					</div>

					<div>
						<div className="flex items-center justify-between mb-1 text-sm text-gray-600">
							<span id="burndown-progress-label">Burndown Progress</span>
							<span>{stats.pct}%</span>
						</div>
						<div
							className="h-3 w-full bg-gray-200 rounded"
							role="progressbar"
							aria-labelledby="burndown-progress-label"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={stats.pct}
						>
							<div className="h-3 bg-blue-600 rounded" style={{ width: `${stats.pct}%` }} />
						</div>
						{/* Trend chart: ideal vs actual (today) */}
						<div className="mt-3 bg-white border rounded p-3">
							<div className="text-xs text-gray-600 mb-1">Sprint trend (ideal vs actual today)</div>
							<svg role="img" aria-label="Sprint trend chart" aria-labelledby="trend-title trend-desc" viewBox="0 0 110 50" className="w-full h-24">
								<title id="trend-title">Sprint trend chart</title>
								<desc id="trend-desc">Ideal burn line from start to end of sprint and today&apos;s remaining work point.</desc>
								{/* axes */}
								<line x1="8" y1="5" x2="8" y2="45" stroke="#9ca3af" strokeWidth="0.5" />
								<line x1="8" y1="45" x2="105" y2="45" stroke="#9ca3af" strokeWidth="0.5" />
								{/* y ticks and labels */}
								{stats.totalEstimate > 0 && yTicks.map((v, i) => (
									<g key={i}>
										<line x1="6" x2="8" y1={String(45 - (v / stats.totalEstimate) * 30)} y2={String(45 - (v / stats.totalEstimate) * 30)} stroke="#9ca3af" strokeWidth="0.5" />
										<text x="2" y={String(46 - (v / stats.totalEstimate) * 30)} fontSize="3" fill="#6b7280" textAnchor="start">{v}</text>
									</g>
								))}
								<text x="2" y="10" fontSize="3" fill="#374151" transform="rotate(-90 2,10)">Points</text>
								{/* ideal line */}
								<line x1="8" y1="45" x2="105" y2="15" stroke="#93c5fd" strokeWidth="1.5" />
								{/* actual today point */}
								{stats.totalEstimate > 0 && (
									<circle
										cx={String(8 + (trend.todayIdx / Math.max(1, trend.days - 1)) * 97)}
										cy={String(45 - (Math.min(stats.totalEstimate, trend.actualRemaining) / stats.totalEstimate) * 30)}
										r="2.5"
										fill="#1d4ed8"
									/>
								)}
								{/* x labels */}
								<text x="8" y="49" fontSize="3" fill="#6b7280" textAnchor="start">Day 1</text>
								<text x="56" y="49" fontSize="3" fill="#6b7280" textAnchor="middle">Mid</text>
								<text x="105" y="49" fontSize="3" fill="#6b7280" textAnchor="end">Day {trend.days}</text>
								<text x="90" y="10" fontSize="3" fill="#374151">Ideal</text>
							</svg>
							<div className="text-[11px] text-gray-500">Point shows remaining today. Ideal is a straight line.</div>
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="p-4 border rounded bg-white shadow-sm">
							<div className="text-sm text-gray-500 mb-1">Done column</div>
							<div className="text-sm">Est: <span className="font-medium">{stats.doneEstimate}</span></div>
							<div className="text-sm">Used: <span className="font-medium">{stats.doneUsedClamped}</span></div>
						</div>
						<div className="p-4 border rounded bg-white shadow-sm">
							<div className="text-sm text-gray-500 mb-1">Tasks overview ({timeframe === "current-sprint" ? "current sprint" : "all"})</div>
							<div className="text-sm">Tasks total: <span className="font-medium">{filteredTasks.length}</span></div>
							<div className="text-sm">With estimate: <span className="font-medium">{filteredTasks.filter(t => typeof t.estimate === "number").length}</span></div>
							<div className="text-sm mt-2">Tasks remaining (not done): <span className="font-medium">{filteredTasks.filter(t => t.status !== "done").length}</span></div>
							{filteredTasks.filter(t => t.status !== "done").length > 0 && (
								<ul className="mt-1 text-sm list-disc list-inside text-gray-700">
									{filteredTasks.filter(t => t.status !== "done").slice(0, 5).map(t => (
										<li key={t.id}>{t.title}</li>
									))}
									{filteredTasks.filter(t => t.status !== "done").length > 5 && (
										<li className="text-gray-500">…and {filteredTasks.filter(t => t.status !== "done").length - 5} more</li>
									)}
								</ul>
							)}
						</div>
					</div>

					{/* Task contributions: per-task breakdown for the selected scope */}
					<div className="mt-4 p-4 border rounded bg-white shadow-sm">
						<div className="text-sm text-gray-500 mb-2">Task contributions ({timeframe === "current-sprint" ? "current sprint" : "all"})</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="text-left text-gray-600">
										<th className="py-1 pr-2">Task</th>
										<th className="py-1 pr-2">Estimate</th>
										<th className="py-1 pr-2">Used</th>
										<th className="py-1 pr-2">Remaining</th>
									</tr>
								</thead>
								<tbody>
									{filteredTasks.slice(0, 10).map(t => {
										const est = typeof t.estimate === "number" && t.estimate > 0 ? t.estimate : 0;
										const used = typeof t.effort_used === "number" && t.effort_used > 0 ? t.effort_used : 0;
										const remaining = Math.max(est - used, 0);
										return (
											<tr key={t.id} className="border-t">
												<td className="py-1 pr-2">{t.title}</td>
												<td className="py-1 pr-2">{est}</td>
												<td className="py-1 pr-2">{used}</td>
												<td className="py-1 pr-2">{remaining}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
						{filteredTasks.length > 10 && (
							<div className="text-xs text-gray-500 mt-1">…and {filteredTasks.length - 10} more</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
