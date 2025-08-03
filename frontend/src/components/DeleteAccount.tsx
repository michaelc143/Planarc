import React from "react";
import { useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import { ToastContext } from "../contexts/ToastContext";
import { UserContext } from "../contexts/UserContext";

export default function DeleteAccount(): React.JSX.Element {
	const { user, setUser } = useContext(UserContext);
	const { isLoggedIn, setIsLoggedIn } = useContext(AuthContext);
	const { showToast } = useContext(ToastContext);
	const navigate = useNavigate();

	if (!isLoggedIn) {
		return <Navigate to="/" />;
	}

	const deleteUser = async () => {
		try {
			const response = await fetch(`http://localhost:5000/api/users/${user.username}`, {
				method: "DELETE",
			});

			if(response.ok) {
				setIsLoggedIn(false);
				setUser({
					userId: "",
					username: "",
					email: "",
					dateJoined: "",
					role: "user",
				});
				showToast("User deleted successfully", "success");
				navigate("/");
			}

			else {
				showToast("Error deleting user", "error");
			}

		} catch (err) {
			showToast("Error connecting to db", "error");
		}
	};

	return (
		<div className="flex flex-col items-center justify-center my-16">
			<h1 className="mb-8 font-bold text-4xl">Are you sure you want to delete your account?</h1>
			<button onClick={deleteUser} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Delete Account</button>
		</div>
	);
}