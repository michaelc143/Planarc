import React, { useEffect, useState, useContext } from "react";
import { Board } from "../../interfaces/Interfaces";
import boardService from "../../services/board-service";
import { AuthContext } from "../../contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";

export default function BoardsPage(): React.JSX.Element {
	const { isLoggedIn } = useContext(AuthContext);
	const [boards, setBoards] = useState<Board[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string>("");
	const [newBoardName, setNewBoardName] = useState<string>("");
	const [newBoardDesc, setNewBoardDesc] = useState<string>("");

	useEffect(() => {
		(async () => {
			try {
				const data = await boardService.listBoards();
				setBoards(data);
			} catch (e) {
				const msg = e instanceof Error ? e.message : "Failed to load boards";
				setError(msg);
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const onCreateBoard = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const created = await boardService.createBoard({ name: newBoardName, description: newBoardDesc });
			setBoards((prev) => [created, ...prev]);
			setNewBoardName("");
			setNewBoardDesc("");
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Failed to create board";
			setError(msg);
		}
	};

	const onDeleteBoard = async (boardId: number) => {
		if (!window.confirm("Delete this board? This cannot be undone.")) { return; }
		try {
			await boardService.deleteBoard(boardId);
			setBoards(prev => prev.filter(b => b.id !== boardId));
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
								<div className="text-sm text-gray-600">{b.description}</div>
							</div>
							<button className="text-red-600 underline text-sm" onClick={() => onDeleteBoard(b.id)}>Delete</button>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}
