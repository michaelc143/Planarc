import React, { useEffect, useState } from "react";
import userSettingsService, { UserDefaultsDTO } from "../../services/user-settings-service";

export default function DefaultBoardSettings(): React.JSX.Element {
	const [statuses, setStatuses] = useState<string[]>([]);
	const [priorities, setPriorities] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string>("");
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				const data = await userSettingsService.getDefaults();
				setStatuses(Array.isArray(data.statuses) ? data.statuses : []);
				setPriorities(Array.isArray(data.priorities) ? data.priorities : []);
			} catch (e) {
				setError(e instanceof Error ? e.message : "Failed to load defaults");
			}
		})();
	}, []);

	const onAdd = (listSetter: React.Dispatch<React.SetStateAction<string[]>>) => {
		listSetter(prev => [...prev, ""]);
	};

	const onChangeItem = (idx: number, value: string, listSetter: React.Dispatch<React.SetStateAction<string[]>>) => {
		listSetter(prev => prev.map((v, i) => i === idx ? value : v));
	};

	const onRemove = (idx: number, listSetter: React.Dispatch<React.SetStateAction<string[]>>) => {
		listSetter(prev => prev.filter((_, i) => i !== idx));
	};

	const onSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		setSaved(false);
		const payload: UserDefaultsDTO = {
			statuses: statuses.map(s => s.trim()).filter(Boolean),
			priorities: priorities.map(p => p.trim()).filter(Boolean),
		};
		try {
			await userSettingsService.setDefaults(payload);
			setSaved(true);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to save defaults");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="p-4 max-w-3xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">Default Board Settings</h1>
			<p className="text-sm text-gray-600 mb-6">These defaults will be used when you create a new board unless you specify custom values during creation.</p>
			{error && <div className="text-red-600 mb-3">{error}</div>}
			<form onSubmit={onSave} className="space-y-6">
				<section>
					<h2 className="font-semibold mb-2">Default Statuses</h2>
					<div className="space-y-2">
						{statuses.map((s, idx) => (
							<div key={idx} className="flex gap-2 items-center">
								<input className="border px-2 py-1 rounded flex-1" value={s} onChange={e => onChangeItem(idx, e.target.value, setStatuses)} placeholder="e.g. todo" />
								<button type="button" className="text-red-600 text-sm" onClick={() => onRemove(idx, setStatuses)}>Remove</button>
							</div>
						))}
						<button type="button" className="text-blue-600 text-sm" onClick={() => onAdd(setStatuses)}>+ Add status</button>
					</div>
				</section>
				<section>
					<h2 className="font-semibold mb-2">Default Priorities</h2>
					<div className="space-y-2">
						{priorities.map((p, idx) => (
							<div key={idx} className="flex gap-2 items-center">
								<input className="border px-2 py-1 rounded flex-1" value={p} onChange={e => onChangeItem(idx, e.target.value, setPriorities)} placeholder="e.g. medium" />
								<button type="button" className="text-red-600 text-sm" onClick={() => onRemove(idx, setPriorities)}>Remove</button>
							</div>
						))}
						<button type="button" className="text-blue-600 text-sm" onClick={() => onAdd(setPriorities)}>+ Add priority</button>
					</div>
				</section>
				<div className="flex gap-3">
					<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={saving}>{saving ? "Saving..." : "Save Defaults"}</button>
					{saved && <span className="text-green-700 self-center">Saved</span>}
				</div>
			</form>
		</div>
	);
}
