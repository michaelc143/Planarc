import React from "react";
import { useContext } from "react";
import { Link } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import logo from "../assets/planarc-logo.png"; // Adjust the path as necessary
import settingsIcon from "../assets/settings-icon.png"; // Adjust the path as necessary

export default function Navbar(): React.JSX.Element {

	const { isLoggedIn } = useContext(AuthContext);

	return (
		<header className="flex flex-wrap sm:justify-start sm:flex-nowrap w-full bg-white text-sm py-4 dark:bg-neutral-900">
			<nav className="flex items-center justify-between bg-white border-gray-200 dark:bg-gray-900 w-full px-4">
				<div className="flex items-center">
					<Link to="/">
						<img src={logo} alt="Logo" className="h-10 w-auto" />
					</Link>
				</div>
				<div className="flex items-center">
					{isLoggedIn ? (
						<>
							<Link to="/dashboard" className="text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 px-4 py-2">Dashboard</Link>
							<Link to="/logout" className="text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 px-4 py-2">Logout</Link>
							<Link to="/deleteaccount" className="text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 px-4 py-2">Delete Account</Link>
							<Link to="/userinfo" className="text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 px-4 py-2">
								<img src={settingsIcon} alt="User Info" className="h-10 w-auto inline-block" />
							</Link>
						</>
					) : (
						<>
							<Link to="/login" className="text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 px-4 py-2">Login</Link>
							<Link to="/register" className="text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-800 px-4 py-2">Register</Link>
						</>
					)}
				</div>
			</nav>
		</header>
	);
}