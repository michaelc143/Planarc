import React from "react";

export default function PageNotFound(): React.JSX.Element {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<h1 className="text-5xl text-center font-extrabold text-gray-900">404</h1>
				<p className="mt-2 text-center text-3xl font-extrabold text-gray-900">
				Page Not Found
				</p>
			</div>
		</div>
	);
}