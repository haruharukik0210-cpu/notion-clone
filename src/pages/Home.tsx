import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { FiPlus } from "react-icons/fi";
import "../styles/pages/home.css";
import { useState } from "react";
import { noteRepository } from "../modules/notes/note.repository";
import { useNoteStore } from "../modules/notes/notes.state";
import { useNavigate } from "react-router-dom";

export default function Home() {
	const [title, setTitle] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const noteStore = useNoteStore();
	const navigate = useNavigate();

	const createNote = async () => {
		setIsSubmitting(true);
		try {
			const newNote = await noteRepository.create({
				title,
			});
			setTitle("");
			noteStore.set([newNote]); 
			navigate(`/notes/${newNote.id}`);
			console.log("新しいノートが作成されました:", newNote);
		} catch (error) {
			console.error(error);
			alert("ノートの作成に失敗しました。");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="home-card">
			<CardHeader className="home-card-header">
				<CardTitle className="home-card-title">
					新しいノートを作成してみましょう
				</CardTitle>
			</CardHeader>
			<CardContent className="home-card-content">
				<div className="home-input-container">
					<input
						className="home-input"
						placeholder="ノートのタイトルを入力"
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
					/>
					<button
						className="home-button"
						onClick={createNote}
						disabled={isSubmitting}
					>
						<FiPlus size={16} />
						<span>ノート作成</span>
					</button>
				</div>
			</CardContent>
		</Card>
	);
}
