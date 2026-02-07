import React, {useState, useEffect} from "react";
import {useNavigate, useParams} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {BoardCategory, BoardPostCreateRequest, BoardPostUpdateRequest} from "@/types";
import {boardService} from "@/services/board-service";
import {useAuth} from "@/hooks/use-auth";
import styles from "./board-write.module.scss";

const BoardWritePage:React.FC = () => {
	const {postId} = useParams<{postId:string}>();
	const navigate = useNavigate();
	const {user} = useAuth();

	const [categories, setCategories] = useState<BoardCategory[]>([]);
	const [categoryId, setCategoryId] = useState<number | null>(null);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showPreview, setShowPreview] = useState(false);

	const isEditMode = !!postId;

	useEffect(() => {
		if(!user){
			alert("로그인이 필요합니다.");
			navigate("/login");
			return;
		}
		loadCategories();
		if(isEditMode) loadPost();
	}, []);

	const loadCategories = async () => {
		try{
			const data = await boardService.getCategories();
			setCategories(data);
			if(data.length > 0 && !categoryId && !isEditMode){
				setCategoryId(data[0].categoryId);
			}
		}catch(err){
			console.error("카테고리 로드 실패:", err);
		}
	};

	const loadPost = async () => {
		try{
			const post = await boardService.getPost(parseInt(postId!));
			if(post.userId !== user?.id){
				alert("수정 권한이 없습니다.");
				navigate("/board");
				return;
			}
			if(post.sourceType !== "USER"){
				alert("외부 연동 게시글은 수정할 수 없습니다.");
				navigate("/board");
				return;
			}
			setCategoryId(post.categoryId);
			setTitle(post.title);
			setContent(post.content);
		}catch(err:any){
			alert(err.message || "게시글을 불러오는데 실패했습니다.");
			navigate("/board");
		}
	};

	const handleSubmit = async (e:React.FormEvent) => {
		e.preventDefault();
		if(!title.trim()){
			alert("제목을 입력하세요.");
			return;
		}
		if(!content.trim()){
			alert("내용을 입력하세요.");
			return;
		}

		try{
			setLoading(true);
			setError(null);

			if(isEditMode){
				const request:BoardPostUpdateRequest = {
					categoryId, title: title.trim(), content: content.trim()
				};
				await boardService.updatePost(parseInt(postId!), request);
				navigate(`/board/${postId}`);
			}else{
				const request:BoardPostCreateRequest = {
					categoryId, title: title.trim(), content: content.trim()
				};
				const newPost = await boardService.createPost(request);
				navigate(`/board/${newPost.postId}`);
			}
		}catch(err:any){
			setError(err.message || "게시글 저장에 실패했습니다.");
		}finally{
			setLoading(false);
		}
	};

	return (
		<div className={styles.boardPage}>
			<div className={styles.container}>
				<div className={styles.header}>
					<button onClick={() => navigate(-1)} className={styles.backBtn}>취소</button>
					<h2 className={styles.pageTitle}>{isEditMode ? "게시글 수정" : "게시글 작성"}</h2>
				</div>

				{error && <div className={styles.error}>{error}</div>}

				<form onSubmit={handleSubmit} className={styles.form}>
					<div className={styles.formGroup}>
						<label>카테고리</label>
						<select
							value={categoryId || ""}
							onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
							className={styles.select}
						>
							<option value="">선택 안함</option>
							{categories.map(cat => (
								<option key={cat.categoryId} value={cat.categoryId}>{cat.categoryName}</option>
							))}
						</select>
					</div>

					<div className={styles.formGroup}>
						<label>제목</label>
						<input
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="제목을 입력하세요"
							className={styles.input}
							maxLength={200}
						/>
					</div>

					<div className={styles.formGroup}>
						<div className={styles.contentHeader}>
							<label>내용</label>
							<div className={styles.tabToggle}>
								<button
									type="button"
									className={`${styles.toggleBtn} ${!showPreview ? styles.active : ""}`}
									onClick={() => setShowPreview(false)}
								>
									편집
								</button>
								<button
									type="button"
									className={`${styles.toggleBtn} ${showPreview ? styles.active : ""}`}
									onClick={() => setShowPreview(true)}
								>
									미리보기
								</button>
							</div>
						</div>
						{showPreview ? (
							<div className={styles.preview}>
								{content.trim() ? (
									<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
								) : (
									<span className={styles.previewEmpty}>내용을 입력하면 미리보기가 표시됩니다.</span>
								)}
							</div>
						) : (
							<textarea
								value={content}
								onChange={(e) => setContent(e.target.value)}
								placeholder="마크다운 형식으로 작성할 수 있습니다.&#10;&#10;# 제목&#10;**굵게** *기울임*&#10;- 목록&#10;![이미지](url)&#10;[링크](url)"
								className={styles.textarea}
								rows={15}
							/>
						)}
					</div>

					<button type="submit" disabled={loading} className={styles.submitBtn}>
						{loading ? "저장 중..." : isEditMode ? "수정" : "작성"}
					</button>
				</form>
			</div>
		</div>
	);
};

export default BoardWritePage;
