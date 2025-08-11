import { Board, BoardTask, BoardStatus, BoardPriority } from "../interfaces/Interfaces";
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

	async createBoard(payload: Pick<Board, "name" | "description"> & { invite_usernames?: string[]; invite_user_ids?: number[]; background_color?: string; statuses?: string[]; priorities?: string[] }): Promise<Board> {
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

	async updateBoard(boardId: number, payload: Partial<Pick<Board, "name" | "description" | "background_color">> & { add_usernames?: string[]; add_user_ids?: number[]; remove_user_ids?: number[] }): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}`, {
			method: "PUT",
			headers: this.authHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to update board");
		}
	}

	// Members
	async listMembers(boardId: number): Promise<Array<{ id: number; board_id: number; user_id: number; username?: string; role: string; joined_at: string }>> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/members`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to fetch members");
		}
		return res.json();
	}

	async addMember(boardId: number, user_id: number, role = "member"): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/members`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({ user_id, role }),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to add member");
		}
	}

	async addMemberByUsername(boardId: number, username: string, role = "member"): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/members`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({ username, role }),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to add member");
		}
	}

	async removeMember(boardId: number, user_id: number): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/members/${user_id}`, {
			method: "DELETE",
			headers: this.authHeaders(),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to remove member");
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

	async createTask(boardId: number, payload: Pick<BoardTask, "title" | "description" | "status" | "priority" | "assigned_to" | "due_date" | "estimate" | "effort_used">): Promise<BoardTask> {
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

	async updateTask(
		boardId: number,
		taskId: number,
		payload: Partial<Pick<BoardTask, "title" | "description" | "status" | "priority" | "assigned_to" | "due_date" | "position"> & { estimate?: number | null; effort_used?: number }>,
	): Promise<void> {
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

	async reorderTasks(boardId: number, moves: Array<{ task_id: number; to_status: string; to_position: number }>): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/tasks/reorder`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({ moves }),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to reorder tasks");
		}
	}

	// Dependencies
	async listDependencies(boardId: number): Promise<Array<{ id: number; board_id: number; blocker_task_id: number; blocked_task_id: number; created_at?: string }>> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/dependencies`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to fetch dependencies");
		}
		return res.json();
	}

	async createDependency(boardId: number, blocker_task_id: number, blocked_task_id: number): Promise<{ id: number }> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/dependencies`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({ blocker_task_id, blocked_task_id }),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to create dependency");
		}
		return res.json();
	}

	async deleteDependency(boardId: number, depId: number): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/dependencies/${depId}`, { method: "DELETE", headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to delete dependency");
		}
	}

	// Templates
	async listBoardTemplates(): Promise<Array<{ id: string; name: string; statuses: string[]; priorities: string[] }>> {
		const res = await fetch(`${API_BASE_URL}/boards/templates`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to load templates");
		}
		return res.json();
	}

	// Statuses
	async listStatuses(boardId: number): Promise<BoardStatus[]> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/statuses`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to fetch statuses");
		}
		return res.json();
	}

	async createStatus(boardId: number, name: string, color?: string): Promise<BoardStatus> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/statuses`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({ name, color }),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to create status");
		}
		return res.json();
	}

	async updateStatus(boardId: number, statusId: number, payload: Partial<Pick<BoardStatus, "name" | "position" | "color">>): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/statuses/${statusId}`, {
			method: "PUT",
			headers: this.authHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to update status");
		}
	}

	async deleteStatus(boardId: number, statusId: number): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/statuses/${statusId}`, {
			method: "DELETE",
			headers: this.authHeaders(),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to delete status");
		}
	}

	// Priorities
	async listPriorities(boardId: number): Promise<BoardPriority[]> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/priorities`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to fetch priorities");
		}
		return res.json();
	}

	async createPriority(boardId: number, name: string): Promise<BoardPriority> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/priorities`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({ name }),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to create priority");
		}
		return res.json();
	}

	async updatePriority(boardId: number, priorityId: number, payload: Partial<Pick<BoardPriority, "name" | "position">>): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/priorities/${priorityId}`, {
			method: "PUT",
			headers: this.authHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to update priority");
		}
	}

	async deletePriority(boardId: number, priorityId: number): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/boards/${boardId}/priorities/${priorityId}`, {
			method: "DELETE",
			headers: this.authHeaders(),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to delete priority");
		}
	}
}

export default new BoardService();
