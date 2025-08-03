import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import { ToastContext } from "../contexts/ToastContext";
import { UserContext } from "../contexts/UserContext";
import { User } from "../interfaces/Interfaces";
import { AuthResponse } from "../interfaces/APIResponseInterfaces";

export default function Login(): React.JSX.Element {
	const [username, setUsername] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const { setIsLoggedIn } = useContext(AuthContext);
	const { setUser } = useContext(UserContext);
	const { showToast } = useContext(ToastContext);

	const navigate = useNavigate();

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		try {
			const response = await fetch("http://localhost:5000/api/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ username, password }),
			});

			const data: AuthResponse = await response.json();

			if (response.ok) {
				setIsLoggedIn(true);
				setUser({
					userId: data.user_id,
					username: data.username,
					email: data.email,
					dateJoined: data.date_joined,
				} as User);
				showToast("Logged in successfully!", "success");
				navigate("/dashboard"); //todo: change to dashboard
			}
			else {
				showToast("Error logging in", "error");
			}
		} 
		catch (error) {
			showToast("Error connecting to db", "error");
		}
	};

	return (
		<div className="my-16 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Login</h2>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="rounded-md shadow-sm -space-y-px">
						<div>
							<label htmlFor="username" className="sr-only">Username</label>
							<input id="username" name="username" type="text" required 
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
								placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
						</div>
						<div>
							<label htmlFor="password" className="sr-only">Password</label>
							<input id="password" name="password" type="password" required 
								className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
								placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
						</div>
					</div>

					<div>
						<button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Login
						</button>
					</div>
				</form>
				<div className="mt-6 flex justify-between">
					<Link to="/" className="text-blue-500 hover:text-blue-700">
            Back to Home
					</Link>
					<Link to="/register" className="text-blue-500 hover:text-blue-700">
            Register
					</Link>
				</div>
			</div>
		</div>
	);
}