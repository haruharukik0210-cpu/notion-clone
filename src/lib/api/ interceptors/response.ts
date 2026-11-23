import type { AxiosError } from "axios";

export const errorHandler = (error: AxiosError) => {
	if (
		error.response?.status === 401 &&
		error.config?.url !== "/auth/signup" &&
		error.config?.url !== "/auth/signin"
	) {
		localStorage.removeItem("token");
		window.location.href = "/signin";
	}
	return Promise.reject(error);
};
