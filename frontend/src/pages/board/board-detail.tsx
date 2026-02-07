import React, {useState, useEffect} from "react";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {BoardPost, BoardComment, BoardCommentCreateRequest} from "@/types";
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

	const isAuthor = user?.id === post.userId;
	const canEdit = isAuthor && post.sourceType === "USER";

	return (
		<div className={styles.boardPage}>
			<div className={styles.container}>
				<div className={styles.topBar}>
					<button onClick={() => navigate("/board")} className={styles.backBtn}>목록</button>
					{canEdit && (
						<div className={styles.postActions}>
							<button onClick={() => navigate(`/board/edit/${post.postId}`)} className={styles.editBtn}>수정</button>
							<button onClick={handleDeletePost} className={styles.deleteBtn}>삭제</button>
						</div>
					)}
				</div>

				<article className={styles.post}>
					<div className={styles.postHeader}>
						{post.categoryName && <span className={styles.category}>[{post.categoryName}]</span>}
						<h1 className={styles.title}>{post.title}</h1>
						{post.sourceType !== "USER" && (
							<span className={`${styles.badge} ${post.sourceType === "NOTION" ? styles.notion : styles.discord}`}>
								{post.sourceType === "NOTION" ? "Notion" : "Discord"}
							</span>
						)}
					</div>

					<div className={styles.postMeta}>
						<div className={styles.authorInfo}>
							{post.authorProfileImage && <img src={post.authorProfileImage} alt="" className={styles.avatar}/>}
							<span className={styles.authorName}>{post.authorNickname || post.externalAuthor || "익명"}</span>
						</div>
						<div className={styles.metaRight}>
							<span>{formatDate(post.createdAt)}</span>
							{!isExternal && <span>조회 {post.viewCount}</span>}
						</div>
					</div>

					{post.sourceType !== "USER" && post.externalUrl && (
						<div className={styles.externalNotice}>
							이 글은 {post.sourceType === "NOTION" ? "Notion" : "Discord"}에서 동기화되었습니다.
							<a href={post.externalUrl} target="_blank" rel="noopener noreferrer">원본 보기</a>
						</div>
					)}

					<div className={styles.content}>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
					</div>
				</article>

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
