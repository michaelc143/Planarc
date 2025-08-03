export type User = {
  userId: string;
  username: string;
  email: string;
  dateJoined: string;
  role: "admin" | "user";
}

export type LoginCredentials = {
  email: string;
  password: string;
}

export type RegisterData = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type AuthResponse = {
  user: User;
  token: string;
  message?: string;
}

export type AuthContextType = {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

export type Project = {
  id: number;
  name: string;
  description: string;
  status: "planning" | "active" | "completed" | "on_hold";
  start_date: string;
  end_date: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export type Task = {
  id: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "critical";
  project_id: number;
  assigned_to: number;
  created_by: number;
  due_date: string;
  created_at: string;
  updated_at: string;
}