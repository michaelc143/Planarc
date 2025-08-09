import { Board, BoardTask } from "../interfaces/Interfaces";
import authService from "./auth-service";

const API_BASE_URL = process.env.REACT_APP_API_URL;

class BoardService {
	private authHeaders() {
		const token = authService.getToken();
		return {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		} as HeadersInit;
	}

	async listBoards(): Promise<Board[]> {
		const res = await fetch(`${API_BASE_URL}/boards`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to fetch boards");
		}
		return res.json();
	}

	async createBoard(payload: Pick<Board, "name" | "description">): Promise<Board> {
		const res = await fetch(`${API_BASE_URL}/boards`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to create board");
		}
		return res.json();
	}

	async getBoard(boardId: number): Promise<Board> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to fetch board");
		}
		return res.json();
	}

	async updateBoard(boardId: number, payload: Partial<Pick<Board, "name" | "description">>): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
			method: "PUT",
			headers: this.authHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to update board");
		}
	}

	async deleteBoard(boardId: number): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
			method: "DELETE",
			headers: this.authHeaders(),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to delete board");
		}
	}

	async listTasks(boardId: number): Promise<BoardTask[]> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to fetch tasks");
		}
		return res.json();
	}

	async createTask(boardId: number, payload: Pick<BoardTask, "title" | "description" | "status" | "priority" | "assigned_to" | "due_date">): Promise<BoardTask> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to create task");
		}
		return res.json();
	}

	async updateTask(boardId: number, taskId: number, payload: Partial<Pick<BoardTask, "title" | "description" | "status" | "priority" | "assigned_to" | "due_date" | "position">>): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/${taskId}`, {
			method: "PUT",
			headers: this.authHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to update task");
		}
	}

	async deleteTask(boardId: number, taskId: number): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/${taskId}`, {
			method: "DELETE",
			headers: this.authHeaders(),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to delete task");
		}
	}

	async reorderTasks(boardId: number, moves: Array<{ task_id: number; to_status: BoardTask["status"]; to_position: number }>): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/reorder`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({ moves }),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to reorder tasks");
		}
	}
}

export default new BoardService();
