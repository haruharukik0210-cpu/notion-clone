import { FiAlertCircle } from "react-icons/fi";


// アプリを開いた直後の待ち画面（見た目だけを担当。どの状態かは親の App.tsx が決める）
// - waiting：返事を待っている。まだ何も言わない（すぐ返事が来たときに、文言がちらつかないように）
// - slow：しばらく返事がない。サーバーを起こしていることと、待つ時間の目安を伝える
// - error：つながらなかった。何が起きたかと、次にできること（もう一度試す）を伝える

export type StartupStatus = "waiting" | "slow" | "error";

type Props = {
	status: StartupStatus;
	onRetry?: () => void;
};

export default function StartupScreen({ status, onRetry }: Props) {
	if (status === "error") {
		return (
			<div className="startup-screen" role="alert">
				<FiAlertCircle className="startup-error-icon" size={28} />
				<p className="startup-message">サーバーにつながりませんでした</p>
				<p className="startup-sub-message">
					時間をおいて、もう一度お試しください。
					<br />
					インターネットの接続も確認してください。
				</p>
				<button type="button" onClick={onRetry} className="startup-retry-button">
					もう一度試す
				</button>
			</div>
		);
	}

	return (
		<div className="startup-screen" role="status" aria-live="polite">
			<span className="startup-spinner" aria-hidden="true" />
			{status === "slow" && (
				<>
					<p className="startup-message">サーバーを起動しています</p>
					<p className="startup-sub-message">
						しばらく使われていなかったため、1 分ほどかかることがあります。
					</p>
				</>
			)}
		</div>
	);
}
