import { FiInfo } from "react-icons/fi";

// ゲストで使っているときに、サイドバーの上に出すお知らせ（見た目だけを担当。ゲストかどうかは親が判断する）
export default function GuestBanner() {
	return (
		<div className="guest-banner" role="status">
			<FiInfo className="guest-banner-icon" size={14} />
			<p className="guest-banner-message">
				ゲストとして利用中です。
				<br />
				データは 24 時間で消えます。
			</p>
		</div>
	);
}
