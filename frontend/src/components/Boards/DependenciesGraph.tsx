import React, { useMemo } from "react";
import { BoardTask } from "../../interfaces/Interfaces";
import type { TaskDependency } from "../../interfaces/Interfaces";

type Props = {
  tasks: BoardTask[];
  dependencies: TaskDependency[];
};

// Simple DAG-ish layout by status columns with vertical stacking.
export default function DependenciesGraph({ tasks, dependencies }: Props): React.JSX.Element {
	const { nodes, edges, width, height } = useMemo(() => {
		const tasksArr = Array.isArray(tasks) ? tasks : [];
		const depsArr = Array.isArray(dependencies) ? dependencies : [];
		const statusOrder = Array.from(new Set(tasksArr.map(t => t.status)));
		if (statusOrder.length === 0) {
			statusOrder.push("todo", "in_progress", "review", "done");
		}
		// basic sizing
		const colWidth = 220;
		const colGap = 48;
		const rowHeight = 84;
		const padding = 24;
		// build columns
		const columns: Record<string, BoardTask[]> = {};
		statusOrder.forEach(s => { columns[s] = []; });
		tasksArr.forEach(t => {
			const key = columns[t.status] ? t.status : statusOrder[0];
			columns[key] = columns[key] || [];
			columns[key].push(t);
		});
		// position nodes
		const positions = new Map<number, { x: number; y: number }>();
		statusOrder.forEach((s, ci) => {
			const col = columns[s] || [];
			col.forEach((t, ri) => {
				const x = padding + ci * (colWidth + colGap);
				const y = padding + ri * rowHeight;
				positions.set(t.id, { x, y });
			});
		});
		const nodes = tasksArr.map(t => ({
			id: t.id,
			title: t.title,
			status: t.status,
			blocked: depsArr.some(d => d.blocked_task_id === t.id),
			pos: positions.get(t.id) || { x: padding, y: padding },
		}));
		const edges = depsArr
			.filter(d => positions.has(d.blocker_task_id) && positions.has(d.blocked_task_id))
			.map(d => ({
				from: d.blocker_task_id,
				to: d.blocked_task_id,
				p1: positions.get(d.blocker_task_id)!,
				p2: positions.get(d.blocked_task_id)!,
			}));
		const cols = statusOrder.length || 1;
		const maxRows = Math.max(1, ...statusOrder.map(s => (columns[s] || []).length));
		const width = padding * 2 + cols * colWidth + (cols - 1) * colGap;
		const height = padding * 2 + maxRows * rowHeight;
		return { nodes, edges, width, height } as const;
	}, [tasks, dependencies]);

	return (
		<div className="overflow-auto border rounded">
			<svg role="img" aria-label="Task dependency graph" width={Math.max(320, width)} height={Math.max(200, height)}>
				<title>Task dependency graph</title>
				<desc>Shows tasks by status with arrows from blockers to blocked tasks.</desc>
				<defs>
					<marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
						<path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
					</marker>
					<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
						<feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000000" floodOpacity="0.15" />
					</filter>
				</defs>
				{/* edges below nodes */}
				{edges.map((e, i) => {
					const x1 = e.p1.x + 200; // right edge of node box
					const y1 = e.p1.y + 24;
					const x2 = e.p2.x; // left edge of target
					const y2 = e.p2.y + 24;
					const mx = (x1 + x2) / 2;
					const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
					return <path key={i} d={d} stroke="#6b7280" strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" />;
				})}

				{/* nodes */}
				{nodes.map(n => (
					<g key={n.id} transform={`translate(${n.pos.x}, ${n.pos.y})`}>
						<rect width={200} height={48} rx={8} ry={8} fill={n.blocked ? "#fee2e2" : "#ffffff"} stroke={n.blocked ? "#ef4444" : "#e5e7eb"} filter="url(#shadow)" />
						<text x={12} y={28} fontSize={13} fill="#111827">{n.title}</text>
						<title>#{n.id} {n.title} — {n.status}{n.blocked ? " (blocked)" : ""}</title>
					</g>
				))}
			</svg>
		</div>
	);
}
