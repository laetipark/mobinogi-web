import React, {useState, useEffect} from "react";
import {useParams, useNavigate, useLocation} from "react-router-dom";
import ReactMarkdown, {type Components} from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type {BoardPost, BoardComment, BoardCommentCreateRequest, BoardPostHistory} from "@/types";
import {boardService} from "@/services/board-service";
import {useAuth} from "@/hooks/use-auth";
import {useSeo} from "@/hooks/use-seo";
import {createBoardPostPath, toBoardSlug} from "@/utils/board-url";
import {parseBoardReferenceToken} from "@/utils/board-reference-token";
import {remarkSoftBreaks} from "@/utils/remark-soft-breaks";
import CommentItem from "@/components/board/comment-item";
import styles from "./board-detail.module.scss";

const renderReferenceTokenCard = (className:string | undefined, rawValue:string) => {
	const token = parseBoardReferenceToken(className, rawValue);
	if(!token){
		return null;
	}

	const itemUrl = token.fields.itemUrl || token.fields.rewardUrl || token.fields.productUrl || "";
	const itemName = token.fields.itemName || token.fields.rewardName || token.fields.productName || "-";
	const ingredientName = token.fields.ingredientName || token.fields.exchangeName || "-";
	const ingredientUrl = token.fields.ingredientUrl || token.fields.exchangeUrl || "";
	const cardTitle = token.type === "item"
		? "아이템 정보"
		: token.type === "barter"
			? "물물교환 정보"
			: "제작 정보";
	const typeLabel = token.type === "item"
		? "ITEM"
		: token.type === "barter"
			? "BARTER"
			: "CRAFT";

	const renderLinkOrText = (label:string, url?:string) => {
		const normalizedLabel = (label || "-").trim() || "-";
		const normalizedUrl = (url || "").trim();
		if(!normalizedUrl){
			return <span>{normalizedLabel}</span>;
		}
		return <a href={normalizedUrl}>{normalizedLabel}</a>;
	};

	return (
		<div className={`${styles.referenceCard} ${styles[`referenceCard_${token.type}`]}`}>
			<div className={styles.referenceCardHeader}>
				<strong>{cardTitle}</strong>
				<span>{typeLabel}</span>
			</div>
			<div className={styles.referenceCardRows}>
				<div className={styles.referenceCardRow}>
					<span className={styles.referenceCardKey}>{token.type === "barter" ? "획득 아이템" : "아이템"}</span>
					<span className={styles.referenceCardValue}>{renderLinkOrText(itemName, itemUrl)}</span>
				</div>
				{token.type !== "item" && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>{token.type === "barter" ? "교환 아이템" : "재료"}</span>
						<span className={styles.referenceCardValue}>{renderLinkOrText(ingredientName, ingredientUrl)}</span>
					</div>
				)}
				{token.fields.category && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>분류</span>
						<span className={styles.referenceCardValue}>{token.fields.category}</span>
					</div>
				)}
				{token.fields.rarity && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>등급</span>
						<span className={styles.referenceCardValue}>{token.fields.rarity}</span>
					</div>
				)}
				{token.type === "barter" && (
					<>
						<div className={styles.referenceCardRow}>
							<span className={styles.referenceCardKey}>지역/NPC</span>
							<span className={styles.referenceCardValue}>{`${token.fields.region || "-"} / ${token.fields.npc || "-"}`}</span>
						</div>
						<div className={styles.referenceCardRow}>
							<span className={styles.referenceCardKey}>횟수/보상</span>
							<span className={styles.referenceCardValue}>
								{`최대 ${token.fields.maxTrades || "-"}회, 1회 x${token.fields.rewardPerTrade || "-"}`}
							</span>
						</div>
					</>
				)}
				{token.type === "craft" && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>레벨/시간</span>
						<span className={styles.referenceCardValue}>{`${token.fields.level || "-"} / ${token.fields.time || "-"}`}</span>
					</div>
				)}
				{token.fields.source && (
					<div className={styles.referenceCardRow}>
						<span className={styles.referenceCardKey}>출처</span>
						<span className={styles.referenceCardValue}>{token.fields.source}</span>
					</div>
				)}
			</div>
		</div>
	);
};

const markdownComponents:Components = {
	table: ({children, ...props}) => (
		<div className={styles.tableWrapper}>
			<table {...props}>{children}</table>
		</div>
	),
	pre: ({children, ...props}) => {
		const child = React.Children.toArray(children)[0];
		if(React.isValidElement(child)){
			const className = (child.props as {className?:string}).className;
			const rawValue = String((child.props as {children?:React.ReactNode}).children ?? "").trim();
			const referenceCard = renderReferenceTokenCard(className, rawValue);
			if(referenceCard){
				return referenceCard;
			}
		}
		return <pre {...props}>{children}</pre>;
	}
};

const markdownRehypePlugins = [rehypeRaw, rehypeSanitize];
const markdownRemarkPlugins = [remarkGfm, remarkSoftBreaks];

type BoardRouteState = {
	post?:BoardPost;
	postId?:number;
};

const toPlainText = (value:string):string => {
	return value
		.replace(/!\[[^\]]*]\([^)]+\)/g, " ")
		.replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
		.replace(/`{1,3}[^`]*`{1,3}/g, " ")
		.replace(/<[^>]*>/g, " ")
		.replace(/[#>*_~\-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
};

const toSeoDescription = (content:string):string => {
	const plainText = toPlainText(content);
	if(!plainText){
		return "Sexynogi 게시글 상세 페이지입니다.";
	}
	return plainText.length > 160
		? `${plainText.slice(0, 157)}...`
		: plainText;
};

const BoardDetailPage:React.FC = () => {
	const {postSlug} = useParams<{postSlug:string}>();
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

	const routeState = location.state as BoardRouteState | undefined;
	const externalPost = routeState?.post;
	const statePostId = routeState?.postId;
	const isExternal = !!externalPost && externalPost.sourceType !== "USER";
	const seoTitle = post?.title || (isExternal ? "외부 연동 게시글" : "게시글");
	const seoDescription = post ? toSeoDescription(post.content) : "Sexynogi 게시글 상세 페이지입니다.";
	const seoCanonicalPath = post
		? (isExternal ? "/board/external" : createBoardPostPath(post.title))
		: (postSlug ? `/board/${toBoardSlug(postSlug) || postSlug}` : "/board");

	useSeo({
		title : seoTitle,
		description : seoDescription,
		canonicalPath : seoCanonicalPath,
		type : post && !isExternal ? "article" : "website",
		noindex : isExternal || Boolean(error),
		publishedTime : post?.createdAt,
		modifiedTime : post?.updatedAt,
		author : post?.authorNickname || post?.externalAuthor || undefined
	});

	useEffect(() => {
		if(isExternal){
			setPost(externalPost);
			setLoading(false);
			return;
		}

		if(statePostId){
			void loadPostById(statePostId);
			return;
		}

		if(postSlug){
			void loadPostBySlug(postSlug);
			return;
		}

		setError("Post not found.");
		setLoading(false);
	}, [postSlug, statePostId, isExternal]);

	const loadPostById = async (targetPostId:number) => {
		try{
			setLoading(true);
			setError(null);
			const data = await boardService.getPost(targetPostId);
			setPost(data);
			await loadComments(targetPostId);
		}catch(err:any){
			setError(err.message || "Failed to load post.");
		}finally{
			setLoading(false);
		}
	};

	const loadPostBySlug = async (targetPostSlug:string) => {
		try{
			setLoading(true);
			setError(null);
			const normalizedSlug = toBoardSlug(targetPostSlug);
			const data = await boardService.getPostBySlug(normalizedSlug);
			setPost(data);
			await loadComments(data.postId);

			const normalizedRoutePath = `/board/${normalizedSlug}`;
			const canonicalPath = createBoardPostPath(data.title);
			if(normalizedRoutePath !== canonicalPath){
				navigate(canonicalPath, {replace : true, state : {postId : data.postId}});
			}
		}catch(err:any){
			setError(err.message || "Failed to load post.");
		}finally{
			setLoading(false);
		}
	};

	const loadComments = async (targetPostId:number) => {
		try{
			const data = await boardService.getComments(targetPostId);
			setComments(data);
		}catch(err){
			console.error("Failed to load comments:", err);
		}
	};

	const loadHistory = async () => {
		if(!post?.postId){
			return;
		}
		try{
			const data = await boardService.getPostHistory(post.postId);
			setHistory(data);
		}catch(err){
			console.error("Failed to load history:", err);
		}
	};

	const handleToggleHistory = () => {
		if(!historyOpen && history.length === 0){
			void loadHistory();
		}
		setHistoryOpen(!historyOpen);
		setSelectedHistory(null);
	};

	const handleDeletePost = async () => {
		if(!window.confirm("Delete this post?")) return;
		if(!post?.postId) return;
		try{
			await boardService.deletePost(post.postId);
			navigate("/board");
		}catch(err:any){
			alert(err.message || "Failed to delete post.");
		}
	};

	const handleSubmitComment = async (e:React.FormEvent) => {
		e.preventDefault();
		if(!user){
			alert("Login is required.");
			return;
		}
		if(!commentContent.trim()) return;
		if(!post?.postId) return;

		try{
			setSubmitting(true);
			const request:BoardCommentCreateRequest = {
				parentCommentId: replyToId,
				content: commentContent.trim()
			};
			await boardService.createComment(post.postId, request);
			setCommentContent("");
			setReplyToId(null);
			void loadComments(post.postId);
		}catch(err:any){
			alert(err.message || "Failed to create comment.");
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
			if(post?.postId){
				void loadComments(post.postId);
			}
		}catch(err:any){
			alert(err.message || "Failed to update comment.");
		}
	};

	const handleDeleteComment = async (commentId:number) => {
		if(!window.confirm("Delete this comment?")) return;
		if(!post?.postId) return;
		try{
			await boardService.deleteComment(commentId);
			void loadComments(post.postId);
		}catch(err:any){
			alert(err.message || "Failed to delete comment.");
		}
	};

	const formatDate = (dateString:string) => {
		return new Date(dateString).toLocaleString("ko-KR");
	};

	if(loading){
		return <div className={styles.boardPage}><div className={styles.container}><div className={styles.loading}>Loading...</div></div></div>;
	}

	if(error || !post){
		return (
			<div className={styles.boardPage}>
				<div className={styles.container}>
					<div className={styles.error}>{error || "Post not found."}</div>
					<button onClick={() => navigate("/board")} className={styles.backBtn}>Back to list</button>
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
					<button onClick={() => navigate("/board")} className={styles.backBtn}>Back</button>
					{(canEdit || canDelete) && (
						<div className={styles.postActions}>
							{canEdit && <button onClick={() => navigate(`/board/edit/${post.postId}`)} className={styles.editBtn}>Edit</button>}
							{canDelete && <button onClick={handleDeletePost} className={styles.deleteBtn}>Delete</button>}
						</div>
					)}
				</div>

				<article className={styles.post}>
					<div className={styles.postHeader}>
						{post.categoryName && <span className={styles.category}>[{post.categoryName}]</span>}
						<h1 className={styles.title}>{post.title}</h1>
						{post.sourceType !== "USER" && (
							<span className={`${styles.badge} ${post.sourceType === "DISCORD" ? styles.discord : styles.external}`}>
								{post.sourceType === "DISCORD" ? "Discord" : "External"}
							</span>
						)}
					</div>

					<div className={styles.postMeta}>
						<div className={styles.authorInfo}>
							{post.authorProfileImage && <img src={post.authorProfileImage} alt="" className={styles.avatar}/>}
							<span className={styles.authorName}>
								{post.authorNickname || post.externalAuthor || "Anonymous"}
								{post.sourceType === "DISCORD" && post.authorDiscordId && post.authorNickname && (
									<svg width="14" height="14" viewBox="0 0 24 24" fill="#5865F2" style={{marginLeft: "4px", verticalAlign: "middle"}} aria-label="Discord linked account" role="img"><title>Discord linked account</title>
										<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
									</svg>
								)}
							</span>
						</div>
						<div className={styles.metaRight}>
							<span>{formatDate(post.createdAt)}</span>
							{!isExternal && <span>Views {post.viewCount}</span>}
						</div>
					</div>

					{post.sourceType !== "USER" && post.externalUrl && (
						<div className={styles.externalNotice}>
							This post was synced from {post.sourceType === "DISCORD" ? "Discord" : "external source"}.
							<a href={post.externalUrl} target="_blank" rel="noopener noreferrer">View original</a>
						</div>
					)}

					<div className={styles.content}>
						<ReactMarkdown
							remarkPlugins={markdownRemarkPlugins}
							rehypePlugins={markdownRehypePlugins}
							components={markdownComponents}
						>
							{post.content}
						</ReactMarkdown>
					</div>
				</article>

				{!isExternal && post.isWiki && (
					<section className={styles.historySection}>
						<button className={styles.historyToggle} onClick={handleToggleHistory}>
							Revision history {historyOpen ? "\u25B2" : "\u25BC"}
						</button>
						{historyOpen && (
							<div className={styles.historyList}>
								{history.length === 0 ? (
									<p className={styles.noComments}>No history available.</p>
								) : (
									history.map(h => (
										<div key={h.historyId}>
											<div
												className={`${styles.historyItem} ${selectedHistory?.historyId === h.historyId ? styles.active : ""}`}
												onClick={() => setSelectedHistory(selectedHistory?.historyId === h.historyId ? null : h)}
											>
												<span>{formatDate(h.createdAt)}</span>
												<span className={styles.historyEditor}>{h.editorNickname || "Anonymous"}</span>
											</div>
											{selectedHistory?.historyId === h.historyId && (
												<div className={styles.historyDetail}>
													<h4>{h.title}</h4>
													<ReactMarkdown
														remarkPlugins={markdownRemarkPlugins}
														rehypePlugins={markdownRehypePlugins}
														components={markdownComponents}
													>
														{h.content}
													</ReactMarkdown>
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
						<h3 className={styles.commentsTitle}>Comments {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}</h3>

						{user ? (
							<form onSubmit={handleSubmitComment} className={styles.commentForm}>
								{replyToId && (
									<div className={styles.replyNotice}>
										Reply mode
										<button type="button" onClick={() => setReplyToId(null)} className={styles.cancelReply}>Cancel</button>
									</div>
								)}
								<textarea
									id="commentInput"
									value={commentContent}
									onChange={(e) => setCommentContent(e.target.value)}
									placeholder="Write a comment..."
									className={styles.commentTextarea}
									rows={4}
								/>
								<button type="submit" disabled={submitting || !commentContent.trim()} className={styles.submitBtn}>
									{submitting ? "Submitting..." : "Submit comment"}
								</button>
							</form>
						) : (
							<div className={styles.loginNotice}>
								To write a comment, <a onClick={() => navigate("/login")}>log in</a> first.
							</div>
						)}

						<div className={styles.commentsList}>
							{comments.length === 0 ? (
								<p className={styles.noComments}>No comments yet.</p>
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
