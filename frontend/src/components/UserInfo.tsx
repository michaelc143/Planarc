import React from "react";
import { useContext } from "react";
import { Navigate, Link } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import { UserContext } from "../contexts/UserContext";

export default function UserInfo(): React.JSX.Element {

	const { isLoggedIn } = useContext(AuthContext);
	const { user } = useContext(UserContext);

	if (!isLoggedIn) {
		return <Navigate to="/" />;
	}

	return (
		<div className="border-l-2 border-slate-500 flex flex-col items-center justify-center my-16 bg-slate-500 pt-8 pb-8 max-w-2xl w-full mx-auto rounded-lg shadow-lg">
			<div className="mb-8 font-bold text-4xl text-white">User Info</div>
			<div className="text-2xl text-white">Username: {user.username}</div>
			<div className="text-2xl text-white">Email: {user.email}</div>
			<div className="text-2xl text-white">Date Joined: {user.dateJoined}</div>
			<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4 mt-4">
				<Link to="/editprofile"> Edit Profile</Link>
			</button>
			<button className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded mb-4">
				<Link to="/settings/defaults">Default Board Settings</Link>
			</button>
			<button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
				<Link to="/deleteaccount">Delete Account</Link>
			</button>
		</div>
	);
}
