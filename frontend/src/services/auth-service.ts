import { LoginCredentials, RegisterData, AuthResponse, User } from "../interfaces/Interfaces";

const API_BASE_URL = process.env.REACT_APP_API_URL;

class AuthService {
	async login(credentials: LoginCredentials): Promise<AuthResponse> {
		const response = await fetch(`${API_BASE_URL}/auth/login`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(credentials),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || "Login failed");
		}

		const data = await response.json();
    
		// Store token in localStorage
		localStorage.setItem("token", data.token);
		localStorage.setItem("user", JSON.stringify(data.user));
    
		return data;
	}

	async register(registerData: RegisterData): Promise<AuthResponse> {
		const response = await fetch(`${API_BASE_URL}/auth/register`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(registerData),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message || "Registration failed");
		}

		const data = await response.json();

		// Store token in localStorage
		localStorage.setItem("token", data.token);
		localStorage.setItem("user", JSON.stringify(data.user));

		return data;
	}

	logout(): void {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
	}

	getCurrentUser(): User | null {
		const userStr = localStorage.getItem("user");
		return userStr ? JSON.parse(userStr) : null;
	}

	getToken(): string | null {
		return localStorage.getItem("token");
	}

	async validateToken(): Promise<boolean> {
		const token = this.getToken();
		if (!token) {return false;}

		try {
			const response = await fetch(`${API_BASE_URL}/auth/validate`, {
				headers: {
					"Authorization": `Bearer ${token}`,
				},
			});
			return response.ok;
		} catch {
			return false;
		}
	}
}

export default new AuthService();