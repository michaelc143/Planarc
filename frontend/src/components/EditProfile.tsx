import React from "react";
import { useContext } from "react";
import { Navigate, Link } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";

export default function EditProfile(): React.JSX.Element {

	const { isLoggedIn } = useContext(AuthContext);

	if (!isLoggedIn) {
		return <Navigate to="/" />;
	}

	return (
		<div className="flex flex-col items-center justify-center my-16 dark:bg-neutral-900 pt-8 pb-8 max-w-2xl w-full mx-auto rounded-lg shadow-lg">

			<div className="mb-8 font-bold text-4xl text-white">Edit User</div>
			<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4 mt-4">
				<Link to="/editusername"> Edit Username </Link>
			</button>
			<button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
				<Link to="/deleteaccount">Delete Account</Link>
			</button>
		</div>
	);
}
