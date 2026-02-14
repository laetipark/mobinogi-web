import React, {useState, useEffect} from "react";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {BoardPost, BoardComment, BoardCommentCreateRequest, BoardPostHistory} from "@/types";
import {boardService} from "@/services/board-service";
import {useAuth} from "@/hooks/use-auth";
import CommentItem from "@/components/board/comment-item";
import styles from "./board-detail.module.scss";

const BoardDetailPage:React.FC = () => {
	const {postId} = useParams<{postId:string}>();
	const navigate = useNavigate();
	const location = useLocation();
	const {user} = useAuth();

	const [post, setPost] = useState<BoardPost | null>(null);
	const [comments, setComments] = useState<BoardComment[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [commentContent, setCommentContent] = useState("");
	const [replyToId, setReplyToId] = useState<number | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [history, setHistory] = useState<BoardPostHistory[]>([]);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [selectedHistory, setSelectedHistory] = useState<BoardPostHistory | null>(null);

	// 외부 게시글 여부 (location.state로 전달된 경우)
	const externalPost = (location.state as any)?.post as BoardPost | undefined;
	const isExternal = !!externalPost && externalPost.sourceType !== "USER";

	useEffect(() => {
		if(isExternal){
			setPost(externalPost);
			setLoading(false);
		}else if(postId){
			loadPost();
			loadComments();
		}
	}, [postId]);

	const loadPost = async () => {
		try{
			setLoading(true);
			const data = await boardService.getPost(parseInt(postId!));
			setPost(data);
		}catch(err:any){
			setError(err.message || "게시글을 불러오는데 실패했습니다.");
		}finally{
			setLoading(false);
		}
	};

	const loadComments = async () => {
		try{
			const data = await boardService.getComments(parseInt(postId!));
			setComments(data);
		}catch(err){
			console.error("댓글 로드 실패:", err);
		}
	};

	const loadHistory = async () => {
		try{
			const data = await boardService.getPostHistory(parseInt(postId!));
			setHistory(data);
		}catch(err){
			console.error("히스토리 로드 실패:", err);
		}
	};

	const handleToggleHistory = () => {
		if(!historyOpen && history.length === 0){
			loadHistory();
		}
		setHistoryOpen(!historyOpen);
		setSelectedHistory(null);
	};

	const handleDeletePost = async () => {
		if(!window.confirm("게시글을 삭제하시겠습니까?")) return;
		try{
			await boardService.deletePost(parseInt(postId!));
			navigate("/board");
		}catch(err:any){
			alert(err.message || "삭제에 실패했습니다.");
		}
	};

	const handleSubmitComment = async (e:React.FormEvent) => {
		e.preventDefault();
		if(!user){
			alert("로그인이 필요합니다.");
			return;
		}
		if(!commentContent.trim()) return;

		try{
			setSubmitting(true);
			const request:BoardCommentCreateRequest = {
				parentCommentId: replyToId,
				content: commentContent.trim()
			};
			await boardService.createComment(parseInt(postId!), request);
			setCommentContent("");
			setReplyToId(null);
			loadComments();
		}catch(err:any){
			alert(err.message || "댓글 작성에 실패했습니다.");
		}finally{
			setSubmitting(false);
		}
	};

	const handleReply = (parentId:number) => {
		setReplyToId(parentId);
		document.getElementById("commentInput")?.focus();
	};

	const handleEditComment = async (commentId:number, content:string) => {
		try{
			await boardService.updateComment(commentId, content);
			loadComments();
		}catch(err:any){
			alert(err.message || "댓글 수정에 실패했습니다.");
		}
	};

	const handleDeleteComment = async (commentId:number) => {
		if(!window.confirm("댓글을 삭제하시겠습니까?")) return;
		try{
			await boardService.deleteComment(commentId);
			loadComments();
		}catch(err:any){
			alert(err.message || "댓글 삭제에 실패했습니다.");
		}
	};

	const formatDate = (dateString:string) => {
		return new Date(dateString).toLocaleString("ko-KR");
	};

	if(loading){
		return <div className={styles.boardPage}><div className={styles.container}><div className={styles.loading}>로딩 중...</div></div></div>;
	}

	if(error || !post){
		return (
			<div className={styles.boardPage}>
				<div className={styles.container}>
					<div className={styles.error}>{error || "게시글을 찾을 수 없습니다."}</div>
					<button onClick={() => navigate("/board")} className={styles.backBtn}>목록으로</button>
				</div>
			</div>
		);
	}

	const isAuthor = (user?.userId ?? user?.id) === post.userId;
	const canEdit = post.sourceType === "USER" && (isAuthor || (!!user && post.isWiki));
	const canDelete = isAuthor && post.sourceType === "USER";

	return (
		<div className={styles.boardPage}>
			<div className={styles.container}>
				<div className={styles.topBar}>
					<button onClick={() => navigate("/board")} className={styles.backBtn}>목록</button>
					{(canEdit || canDelete) && (
						<div className={styles.postActions}>
							{canEdit && <button onClick={() => navigate(`/board/edit/${post.postId}`)} className={styles.editBtn}>수정</button>}
							{canDelete && <button onClick={handleDeletePost} className={styles.deleteBtn}>삭제</button>}
						</div>
					)}
				</div>

				<article className={styles.post}>
					<div className={styles.postHeader}>
						{post.categoryName && <span className={styles.category}>[{post.categoryName}]</span>}
						<h1 className={styles.title}>{post.title}</h1>
						{post.sourceType !== "USER" && (
							<span className={`${styles.badge} ${post.sourceType === "DISCORD" ? styles.discord : styles.external}`}>
								{post.sourceType === "DISCORD" ? "Discord" : "외부"}
							</span>
						)}
					</div>

					<div className={styles.postMeta}>
						<div className={styles.authorInfo}>
							{post.authorProfileImage && <img src={post.authorProfileImage} alt="" className={styles.avatar}/>}
							<span className={styles.authorName}>
								{post.authorNickname || post.externalAuthor || "익명"}
								{post.sourceType === "DISCORD" && post.authorDiscordId && post.authorNickname && (
									<svg width="14" height="14" viewBox="0 0 24 24" fill="#5865F2" style={{marginLeft: "4px", verticalAlign: "middle"}} aria-label="Discord linked account" role="img"><title>Discord linked account</title>
										<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
									</svg>
								)}
							</span>
						</div>
						<div className={styles.metaRight}>
							<span>{formatDate(post.createdAt)}</span>
							{!isExternal && <span>조회 {post.viewCount}</span>}
						</div>
					</div>

					{post.sourceType !== "USER" && post.externalUrl && (
						<div className={styles.externalNotice}>
							이 글은 {post.sourceType === "DISCORD" ? "Discord" : "외부"}에서 동기화되었습니다.
							<a href={post.externalUrl} target="_blank" rel="noopener noreferrer">원본 보기</a>
						</div>
					)}

					<div className={styles.content}>
						<ReactMarkdown remarkPlugins={[remarkGfm]} components={{
							table: ({children, ...props}) => (
								<div style={{overflowX:"auto"}}>
									<table {...props}>{children}</table>
								</div>
							)
						}}>{post.content}</ReactMarkdown>
					</div>
				</article>

				{!isExternal && post.isWiki && (
					<section className={styles.historySection}>
						<button className={styles.historyToggle} onClick={handleToggleHistory}>
							수정 내역 {historyOpen ? "\u25B2" : "\u25BC"}
						</button>
						{historyOpen && (
							<div className={styles.historyList}>
								{history.length === 0 ? (
									<p className={styles.noComments}>수정 내역이 없습니다.</p>
								) : (
									history.map(h => (
										<div key={h.historyId}>
											<div
												className={`${styles.historyItem} ${selectedHistory?.historyId === h.historyId ? styles.active : ""}`}
												onClick={() => setSelectedHistory(selectedHistory?.historyId === h.historyId ? null : h)}
											>
												<span>{formatDate(h.createdAt)}</span>
												<span className={styles.historyEditor}>{h.editorNickname || "익명"}</span>
											</div>
											{selectedHistory?.historyId === h.historyId && (
												<div className={styles.historyDetail}>
													<h4>{h.title}</h4>
													<ReactMarkdown remarkPlugins={[remarkGfm]}>{h.content}</ReactMarkdown>
												</div>
											)}
										</div>
									))
								)}
							</div>
						)}
					</section>
				)}

				{!isExternal && (
					<section className={styles.commentsSection}>
						<h3 className={styles.commentsTitle}>댓글 {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}</h3>

						{user ? (
							<form onSubmit={handleSubmitComment} className={styles.commentForm}>
								{replyToId && (
									<div className={styles.replyNotice}>
										답글 작성 중
										<button type="button" onClick={() => setReplyToId(null)} className={styles.cancelReply}>취소</button>
									</div>
								)}
								<textarea
									id="commentInput"
									value={commentContent}
									onChange={(e) => setCommentContent(e.target.value)}
									placeholder="댓글을 입력하세요..."
									className={styles.commentTextarea}
									rows={4}
								/>
								<button type="submit" disabled={submitting || !commentContent.trim()} className={styles.submitBtn}>
									{submitting ? "작성 중..." : "댓글 작성"}
								</button>
							</form>
						) : (
							<div className={styles.loginNotice}>
								댓글을 작성하려면 <a onClick={() => navigate("/login")}>로그인</a>이 필요합니다.
							</div>
						)}

						<div className={styles.commentsList}>
							{comments.length === 0 ? (
								<p className={styles.noComments}>아직 댓글이 없습니다.</p>
							) : (
								comments.map(comment => (
									<CommentItem
										key={comment.commentId}
										comment={comment}
										onReply={handleReply}
										onEdit={handleEditComment}
										onDelete={handleDeleteComment}
									/>
								))
							)}
						</div>
					</section>
				)}
			</div>
		</div>
	);
};

export default BoardDetailPage;
