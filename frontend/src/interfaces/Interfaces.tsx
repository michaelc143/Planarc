export type User = {
  id?: number;
  userId: string;
  username: string;
  email: string;
  dateJoined: string;
  role: "admin" | "user";
}

export type LoginCredentials = {
  username: string;
  password: string;
}

export type RegisterData = {
  username: string;
  email: string;
  password: string;
}

export type AuthResponse = {
  user: User;
  token: string;
  message?: string;
}

export type AuthContextType = {
  user: User | null;
  // eslint-disable-next-line no-unused-vars
  login: (credentials: LoginCredentials) => Promise<boolean>;
  // eslint-disable-next-line no-unused-vars
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  isLoggedIn: boolean;
  // eslint-disable-next-line no-unused-vars
  setIsLoggedIn: (loggedIn: boolean) => void;
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

// Boards Feature
export type Board = {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
  updated_at?: string;
}

export type BoardTask = {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  board_id: number;
  assigned_to?: number;
  created_by: number;
  due_date?: string;
  position?: number;
  created_at: string;
  updated_at?: string;
}

export type BoardStatus = {
  id: number;
  name: string;
  position: number;
}

export type BoardPriority = {
  id: number;
  name: string;
  position: number;
}

export type BoardMember = {
  id: number;
  board_id: number;
  user_id: number;
  username?: string;
  role: string;
  joined_at: string;
}