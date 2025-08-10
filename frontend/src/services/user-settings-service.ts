import authService from "./auth-service";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export interface UserDefaultsDTO {
  statuses: string[];
  priorities: string[];
}

class UserSettingsService {
	private authHeaders() {
		const token = authService.getToken();
		return {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		} as HeadersInit;
	}

	async getDefaults(): Promise<UserDefaultsDTO> {
		const res = await fetch(`${API_BASE_URL}/users/defaults`, { headers: this.authHeaders() });
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to fetch defaults");
		}
		return res.json();
	}

	async setDefaults(payload: UserDefaultsDTO): Promise<void> {
		const res = await fetch(`${API_BASE_URL}/users/defaults`, {
			method: "PUT",
			headers: this.authHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			throw new Error((await res.json()).message || "Failed to save defaults");
		}
	}
}

export default new UserSettingsService();
