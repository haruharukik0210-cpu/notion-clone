import { BrowserRouter, Route, Routes } from "react-router-dom";
import Signin from "./pages/Signin";
import Signup from "./pages/Signup";
import Layout from "./Layout";
import Home from "./pages/Home";
import NoteDetail from "./pages/NoteDetail";
import { useEffect, useState } from "react";
import { currentUserAtom } from "./modules/auth/current-user.state";
import { useAtomValue, useSetAtom } from "jotai";
import { authRepository } from "./modules/auth/auth.repository";
import { themeAtom } from "./modules/theme/theme.state";
import type {StartupStatus} from "./components/StartupScreen";
import StartupScreen from "./components/StartupScreen";



function App() {
	const [isLoading, setIsLoading] = useState(true);
	const [status, setStatus] = useState<StartupStatus>("waiting");
	const setCurrentUser = useSetAtom(currentUserAtom);
	const theme = useAtomValue(themeAtom);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("theme", theme);
	}, [theme]);

	useEffect(() => {
		const fetchCurrentUser = async () => {
			const timerId = setTimeout(() => {
					setStatus("slow");
			}, 3000);
			try {
				const user = await authRepository.getCurrentUser();
				setCurrentUser(user);
				setIsLoading(false);
			} catch (error) {
				console.error(error);
				setStatus("error");
			} finally {
				clearTimeout(timerId);
			}
		};
		fetchCurrentUser();
	}, [setCurrentUser]);

	const handleRetry = () => {
		window.location.reload();
	};

	if (isLoading) return <StartupScreen status={status} onRetry={handleRetry} />;

	return (
		<BrowserRouter>
			<div className="app-container">
				<Routes>
					<Route path="/signin" element={<Signin />}></Route>
					<Route path="/signup" element={<Signup />}></Route>
					<Route path="/" element={<Layout />}>
						<Route index element={<Home />} />
						<Route path="/notes/:id" element={<NoteDetail />} />
					</Route>
				</Routes>
			</div>
		</BrowserRouter>
	);
}

export default App;
