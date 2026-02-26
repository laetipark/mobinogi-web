import React, {useState, useEffect, useRef, useCallback} from "react";
import {useNavigate, useParams} from "react-router-dom";
import ReactMarkdown, {type Components} from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type {BoardCategory, BoardPostCreateRequest, BoardPostUpdateRequest} from "@/types";
import {boardService} from "@/services/board-service";
import {uploadService} from "@/services/upload-service";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";
import {createBoardPostPath} from "@/utils/board-url";
import {remarkSoftBreaks} from "@/utils/remark-soft-breaks";
import {ImagePlus} from "lucide-react";
import MarkdownToolbar from "@/components/board/markdown-toolbar";
import styles from "./board-write.module.scss";

const markdownComponents:Components = {
	table: ({children, ...props}) => (
		<div className={styles.tableWrapper}>
			<table {...props}>{children}</table>
		</div>
	)
};

const markdownRehypePlugins = [rehypeRaw, rehypeSanitize];
const markdownRemarkPlugins = [remarkGfm, remarkSoftBreaks];

const BoardWritePage:React.FC = () => {
	const {postId} = useParams<{postId:string}>();
	const navigate = useNavigate();
	const {user} = useAuth();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [categories, setCategories] = useState<BoardCategory[]>([]);
	const [categoryId, setCategoryId] = useState<number | null>(null);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [isWiki, setIsWiki] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showPreview, setShowPreview] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<number | null>(null);

	const isEditMode = !!postId;

	useSeo({
		title : isEditMode ? "게시글 수정" : "게시글 작성",
		description : isEditMode ? "게시판 글을 수정하는 페이지입니다." : "새 게시판 글을 작성하는 페이지입니다.",
		canonicalPath : isEditMode ? `/board/edit/${postId}` : "/board/write",
		noindex : true
	});

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
			if(!post.isWiki && post.userId !== (user?.userId ?? user?.id)){
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
			setIsWiki(!!post.isWiki);
			setTitle(post.title);
			setContent(post.content);
		}catch(err:any){
			alert(err.message || "게시글을 불러오는데 실패했습니다.");
			navigate("/board");
		}
	};

	const insertImageMarkdown = (url:string) => {
		const textarea = textareaRef.current;
		if(!textarea){
			setContent(prev => prev + `\n![이미지](${url})\n`);
			return;
		}
		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const imageText = `![이미지](${url})`;
		const newContent = content.substring(0, start) + imageText + content.substring(end);
		setContent(newContent);

		setTimeout(() => {
			textarea.focus();
			const newPos = start + imageText.length;
			textarea.setSelectionRange(newPos, newPos);
		}, 0);
	};

	const handleImageUpload = useCallback(async (file:File) => {
		setUploadProgress(0);
		try{
			const result = await uploadService.uploadImage(file, "board", (progress) => {
				setUploadProgress(progress);
			});
			if(result.success && result.url){
				insertImageMarkdown(result.url);
			}else{
				setError(result.message || "이미지 업로드에 실패했습니다.");
			}
		}catch(err:any){
			setError("이미지 업로드에 실패했습니다.");
		}finally{
			setUploadProgress(null);
		}
	}, [content]);

	const handleFileSelect = (e:React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if(file) handleImageUpload(file);
		e.target.value = "";
	};

	const handleDrop = useCallback((e:React.DragEvent) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if(file && file.type.startsWith("image/")){
			handleImageUpload(file);
		}
	}, [handleImageUpload]);

	const handleDragOver = (e:React.DragEvent) => {
		e.preventDefault();
	};

	const handlePaste = useCallback((e:React.ClipboardEvent) => {
		const items = e.clipboardData.items;
		for(let i = 0; i < items.length; i++){
			if(items[i].type.startsWith("image/")){
				e.preventDefault();
				const file = items[i].getAsFile();
				if(file) handleImageUpload(file);
				return;
			}
		}
	}, [handleImageUpload]);

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
					categoryId, title: title.trim(), content: content.trim(), isWiki
				};
				const updatedPost = await boardService.updatePost(parseInt(postId!), request);
				navigate(createBoardPostPath(updatedPost.title), {state : {postId : updatedPost.postId}});
			}else{
				const request:BoardPostCreateRequest = {
					categoryId, title: title.trim(), content: content.trim(), isWiki
				};
				const newPost = await boardService.createPost(request);
				navigate(createBoardPostPath(newPost.title), {state : {postId : newPost.postId}});
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

					<label className={styles.wikiToggle}>
						<input
							type="checkbox"
							checked={isWiki}
							onChange={(e) => setIsWiki(e.target.checked)}
						/>
						<span>위키로 등록</span>
					</label>

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
							<div className={styles.contentActions}>
								{!showPreview && (
									<>
										<input
											ref={fileInputRef}
											type="file"
											accept="image/jpeg,image/png,image/gif,image/webp"
											onChange={handleFileSelect}
											className={styles.fileInput}
										/>
										<button
											type="button"
											className={styles.uploadBtn}
											onClick={() => fileInputRef.current?.click()}
											disabled={uploadProgress !== null}
										>
											<ImagePlus size={16}/>
											이미지
										</button>
									</>
								)}
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
						</div>

						{uploadProgress !== null && (
							<div className={styles.progressBar}>
								<div className={styles.progressFill} style={{width: `${uploadProgress}%`}}/>
							</div>
						)}

						{showPreview ? (
							<div className={styles.preview}>
								{content.trim() ? (
									<ReactMarkdown
										remarkPlugins={markdownRemarkPlugins}
										rehypePlugins={markdownRehypePlugins}
										components={markdownComponents}
									>
										{content}
									</ReactMarkdown>
								) : (
									<span className={styles.previewEmpty}>내용을 입력하면 미리보기가 표시됩니다.</span>
								)}
							</div>
						) : (
							<div className={styles.editorWrap}>
								<MarkdownToolbar
									textareaRef={textareaRef}
									content={content}
									setContent={setContent}
								/>
								<textarea
									ref={textareaRef}
									value={content}
									onChange={(e) => setContent(e.target.value)}
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onPaste={handlePaste}
									placeholder="마크다운 형식으로 작성할 수 있습니다.&#10;&#10;# 제목&#10;**굵게** *기울임*&#10;- 목록&#10;![이미지](url)&#10;[링크](url)&#10;&#10;이미지를 드래그하거나 붙여넣기(Ctrl+V)할 수 있습니다."
									className={styles.textarea}
									rows={15}
								/>
							</div>
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
