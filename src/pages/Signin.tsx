import { useState } from "react";
import "../styles/pages/auth.css";
import { authRepository } from "../modules/auth/auth.repository";
import { useAtom } from "jotai";
import { currentUserAtom } from "../modules/auth/current-user.state";
import { Navigate } from "react-router-dom";
import type { User } from "../modules/users/user.entity";

export default function Signin() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);

	const handleAuthSuccess = (user: User, token: string) => {
		setCurrentUser(user); //ログインした後もuserを使いまわせる
		localStorage.setItem("token", token);
	};

	const handleAuthError = (error: unknown) => {
		console.error(error);
		alert("ログインに失敗しました。");
	}

	const signin = async () => {
		setIsSubmitting(true);
		try {
			const { user, token } = await authRepository.signin(email, password);
			handleAuthSuccess(user, token);
		} catch (error) {
			handleAuthError(error);
		} finally {
			setIsSubmitting(false);
		}
	};

	// authRepository.guest() を呼んで、ログインと同じように user と token を保存する
	const signinAsGuest = async () => {
		setIsGuestSubmitting(true);
		try {
			const { user, token } = await authRepository.guest();
			handleAuthSuccess(user, token);
		} catch (error) {
			handleAuthError(error);
		} finally {
			setIsGuestSubmitting(false);
		}
	};

	if (currentUser) return <Navigate to="/" replace />;

	return (
		<div className="auth-container">
			<div className="auth-wrapper">
				<h2 className="auth-title">Notionクローン</h2>
				<div className="auth-form-container">
					<div className="auth-card">
						<div className="auth-form">
							<div>
								<label className="auth-label" htmlFor="email">
									メールアドレス
								</label>
								<div className="auth-input-container">
									<input
										value={email}
										onChange={(e) => {
											setEmail(e.target.value);
										}}
										id="email"
										name="email"
										placeholder="メールアドレス"
										required
										type="email"
										className="input-auth"
									/>
								</div>
							</div>
							<div>
								<label className="auth-label" htmlFor="password">
									パスワード
								</label>
								<div className="auth-input-container">
									<input
										value={password}
										onChange={(e) => {
											setPassword(e.target.value);
										}}
										id="password"
										name="password"
										placeholder="パスワード"
										required
										type="password"
										className="input-auth"
									/>
								</div>
							</div>
							<div>
								<button
									onClick={signin}
									disabled={!email || !password || isSubmitting || isGuestSubmitting}
									className="home-button"
									style={{ width: "100%" }}
								>
									{isSubmitting ? "準備中" : "ログイン"}
								</button>
							</div>
							<div className="auth-divider" role="separator">
								または
							</div>
							<div>
								<button
									type="button"
									onClick={signinAsGuest}
									disabled={isSubmitting || isGuestSubmitting}
									className="auth-guest-button"
								>
									{isGuestSubmitting ? "準備中" : "ゲストで試す"}
								</button>
								<p className="auth-guest-note">
									登録なしで試せます（データは 24 時間で消えます）
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
