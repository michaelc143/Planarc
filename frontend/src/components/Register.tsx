import React from "react";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import { ToastContext } from "../contexts/ToastContext";
import { UserContext } from "../contexts/UserContext";

export default function Register(): React.JSX.Element {
	const [username, setUsername] = useState<string>("");
	const [email, setEmail] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const { showToast } = useContext(ToastContext);
	const { setUser } = useContext(UserContext);
	const { register } = useContext(AuthContext);
	const navigate = useNavigate();

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
	
		if (!username || !email || !password) {
			showToast("Please fill out all fields.", "error");
			return;
		}
		try {
			const success = await register({ username, email, password });
			if (success) {
				const userStr = localStorage.getItem("user");
				if (userStr) {
					try {
						setUser(JSON.parse(userStr));
					} catch {
						showToast("Error parsing user data", "error");
					}
				}
				showToast("Registered successfully!", "success");
				navigate("/dashboard");
			}
			else {
				showToast("Failed to register", "error");
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
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Register</h2>
				</div>
				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="rounded-md shadow-sm -space-y-px">
						<div>
							<label htmlFor="username" className="sr-only">Username</label>
							<input id="username" name="username" type="text" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
						</div>
						<div>
							<label htmlFor="email" className="sr-only">Email</label>
							<input id="email" name="email" type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
						</div>
						<div>
							<label htmlFor="password" className="sr-only">Password</label>
							<input id="password" name="password" type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
						</div>
					</div>
					<div>
						<button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
							Register
						</button>
					</div>
				</form>
				<div className="mt-6 flex justify-between">
					<Link to="/" className="text-blue-500 hover:text-blue-500">
			Back to Home
					</Link>
					<Link to="/login" className="text-blue-500 hover:text-blue-500">
			Login
					</Link>
				</div>
			</div>
		</div>
	);
}