import React, { useEffect, useState, useContext } from "react";
import { Board } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";
import { AuthContext } from "../../contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { ToastContext } from "../../contexts/ToastContext";

export default function BoardsPage(): React.JSX.Element {
	const { isLoggedIn, user } = useContext(AuthContext);
	const { showToast } = useContext(ToastContext);
	const [boards, setBoards] = useState<Board[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [newBoardName, setNewBoardName] = useState<string>("");
	const [newBoardDesc, setNewBoardDesc] = useState<string>("");
	const [inviteUsernames, setInviteUsernames] = useState<string>("");

	useEffect(() => {
		(async () => {
			try {
				const data = await boardService.listBoards();
				setBoards(data);
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Failed to load boards";
				showToast(msg, "error");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const onCreateBoard = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const created = await boardService.createBoard({ name: newBoardName, description: newBoardDesc, invite_usernames: inviteUsernames.split(",").map((s) => s.trim()).filter(Boolean) });
			setBoards((prev) => [created, ...prev]);
			setNewBoardName("");
			setNewBoardDesc("");
			setInviteUsernames("");
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to create board";
			showToast(msg, "error");
		}
	};

	const onDeleteBoard = async (boardId: number) => {
		if (!window.confirm("Delete this board? This cannot be undone.")) { return; }
		try {
			await boardService.deleteBoard(boardId);
			setBoards(prev => prev.filter(b => b.id !== boardId));
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

	return (
		<div className="p-4 max-w-3xl mx-auto">
			<h1 className="text-2xl font-bold mb-4">Boards</h1>
			<form onSubmit={onCreateBoard} className="mb-6 space-y-2">
				<input
					type="text"
					className="w-full border px-3 py-2 rounded"
					placeholder="Board name"
					value={newBoardName}
					onChange={(e) => setNewBoardName(e.target.value)}
					required
				/>
				<textarea
					className="w-full border px-3 py-2 rounded"
					placeholder="Description (optional)"
					value={newBoardDesc}
					onChange={(e) => setNewBoardDesc(e.target.value)}
				/>
				<input
					type="text"
					className="w-full border px-3 py-2 rounded"
					placeholder="Invite usernames (comma-separated)"
					value={inviteUsernames}
					onChange={(e) => setInviteUsernames(e.target.value)}
				/>
				<button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Create Board</button>
			</form>
			<ul className="space-y-3">
				{boards.map((b) => (
					<li key={b.id} className="border rounded p-3">
						<div className="flex items-start justify-between gap-2">
							<div className="font-semibold">
								<Link className="text-blue-600 hover:underline" to={`/boards/${b.id}`}>
									{b.name}
								</Link>
								<div className="text-sm text-gray-600 flex items-center gap-2">
									<span>{b.description}</span>
									{Number(user?.userId) !== b.owner_id && (
										<span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 border">Shared with me</span>
									)}
								</div>
							</div>
							{Number(user?.userId) === b.owner_id && (
								<button className="text-red-600 underline text-sm" onClick={() => onDeleteBoard(b.id)}>Delete</button>
							)}
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
