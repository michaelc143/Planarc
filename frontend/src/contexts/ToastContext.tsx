import React, { createContext, ReactNode } from "react";
import { toast, ToastContent, ToastOptions } from "react-toastify";

export const ToastContext = createContext<ToastContextType>({
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	showToast: () => {},
});

interface ToastContextType {
	// eslint-disable-next-line no-unused-vars
	showToast: (message: ToastContent, type: "success" | "error", options?: ToastOptions) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
	const showToast = (message: ToastContent, type: "success" | "error", options?: ToastOptions) => {
		toast[type](message, options);
	};

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
		</ToastContext.Provider>
	);
};