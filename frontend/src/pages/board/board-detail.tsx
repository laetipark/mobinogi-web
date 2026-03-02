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

/**
 * Utility function renderReferenceTokenCard.
 */
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

	/**
	 * Utility function renderLinkOrText.
	 */
	const renderLinkOrText = (label:string, url?:string) => {
		/**
		 * Utility function normalizedLabel.
		 */
		const normalizedLabel = (label || "-").trim() || "-";
		/**
		 * Utility function normalizedUrl.
		 */
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
						<span
							className={styles.referenceCardValue}>{renderLinkOrText(ingredientName, ingredientUrl)}</span>
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
							<span
								className={styles.referenceCardValue}>{`${token.fields.region || "-"} / ${token.fields.npc || "-"}`}</span>
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
						<span
							className={styles.referenceCardValue}>{`${token.fields.level || "-"} / ${token.fields.time || "-"}`}</span>
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
	table : ({children, ...props}) => (
		<div className={styles.tableWrapper}>
			<table {...props}>{children}</table>
		</div>
	),
	a : ({children, href, ...props}) => {
		const normalizedHref = typeof href === "string" ? href : "";
		const isExternalLink = /^https?:\/\//i.test(normalizedHref);
		return (
			<a
				{...props}
				href={normalizedHref || undefined}
				target={isExternalLink ? "_blank" : undefined}
				rel={isExternalLink ? "noopener noreferrer" : undefined}
			>
				{children}
			</a>
		);
	},
	pre : ({children, ...props}) => {
		const child = React.Children.toArray(children)[0];
		if(React.isValidElement(child)){
			/**
			 * Utility function className.
			 */
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

/**
 * Constant markdownRehypePlugins.
 */
const markdownRehypePlugins = [rehypeRaw, rehypeSanitize];
/**
 * Constant markdownRemarkPlugins.
 */
const markdownRemarkPlugins = [remarkGfm, remarkSoftBreaks];

type BoardRouteState = {
	postId?:number;
};

/**
 * Utility function toPlainText.
 */
const toPlainText = (value:string):string => {
	return value.replace(/!\[[^\]]*]\([^)]+\)/g, " ").replace(/\[([^\]]+)]\([^)]+\)/g, "$1").replace(/`{1,3}[^`]*`{1,3}/g, " ").replace(/<[^>]*>/g, " ").replace(/[#>*_~\-]+/g, " ").replace(/\s+/g, " ").trim();
};

/**
 * Utility function toSeoDescription.
 */
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
	const [copiedLink, setCopiedLink] = useState(false);

	const routeState = location.state as BoardRouteState | undefined;
	const statePostId = routeState?.postId;
	const seoTitle = post?.title || "게시글";
	const seoDescription = post ? toSeoDescription(post.content) : "Sexynogi 게시글 상세 페이지입니다.";
	const seoCanonicalPath = post
		? createBoardPostPath(post.title)
		: (postSlug ? `/board/${toBoardSlug(postSlug) || postSlug}` : "/board");

	useSeo({
		title : seoTitle,
		description : seoDescription,
		canonicalPath : seoCanonicalPath,
		type : post ? "article" : "website",
		noindex : Boolean(error),
		publishedTime : post?.createdAt,
		modifiedTime : post?.updatedAt,
		author : post?.authorNickname || undefined
	});

	useEffect(() => {
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
	}, [postSlug, statePostId]);

	/**
	 * Utility function async.
	 */
	const loadPostById = async(targetPostId:number) => {
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

	/**
	 * Utility function async.
	 */
	const loadPostBySlug = async(targetPostSlug:string) => {
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

	/**
	 * Utility function async.
	 */
	const loadComments = async(targetPostId:number) => {
		try{
			const data = await boardService.getComments(targetPostId);
			setComments(data);
		}catch(err){
			console.error("Failed to load comments:", err);
		}
	};

	/**
	 * Utility function async.
	 */
	const loadHistory = async() => {
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

	/**
	 * Utility function handleToggleHistory.
	 */
	const handleToggleHistory = () => {
		if(!historyOpen && history.length === 0){
			void loadHistory();
		}
		setHistoryOpen(!historyOpen);
		setSelectedHistory(null);
	};

	/**
	 * Utility function async.
	 */
	const handleDeletePost = async() => {
		if(!window.confirm("Delete this post?")) return;
		if(!post?.postId) return;
		try{
			await boardService.deletePost(post.postId);
			navigate("/board");
		}catch(err:any){
			alert(err.message || "Failed to delete post.");
		}
	};

	/**
	 * Utility function async.
	 */
	const handleSubmitComment = async(e:React.FormEvent) => {
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
				parentCommentId : replyToId,
				content : commentContent.trim()
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

	/**
	 * Utility function handleReply.
	 */
	const handleReply = (parentId:number) => {
		setReplyToId(parentId);
		document.getElementById("commentInput")?.focus();
	};

	/**
	 * Utility function async.
	 */
	const handleEditComment = async(commentId:number, content:string) => {
		try{
			await boardService.updateComment(commentId, content);
			if(post?.postId){
				void loadComments(post.postId);
			}
		}catch(err:any){
			alert(err.message || "Failed to update comment.");
		}
	};

	/**
	 * Utility function async.
	 */
	const handleDeleteComment = async(commentId:number) => {
		if(!window.confirm("Delete this comment?")) return;
		if(!post?.postId) return;
		try{
			await boardService.deleteComment(commentId);
			void loadComments(post.postId);
		}catch(err:any){
			alert(err.message || "Failed to delete comment.");
		}
	};

	/**
	 * Utility function async.
	 */
	const handleCopyLink = async() => {
		if(!post){
			return;
		}

		const postUrl = `${window.location.origin}${createBoardPostPath(post.title)}`;
		try{
			if(navigator.clipboard?.writeText){
				await navigator.clipboard.writeText(postUrl);
			}else{
				const textarea = document.createElement("textarea");
				textarea.value = postUrl;
				textarea.style.position = "fixed";
				textarea.style.left = "-9999px";
				document.body.appendChild(textarea);
				textarea.focus();
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);
			}
			setCopiedLink(true);
			window.setTimeout(() => setCopiedLink(false), 1500);
		}catch{
			alert("Failed to copy link.");
		}
	};

	/**
	 * Utility function formatDate.
	 */
	const formatDate = (dateString:string) => {
		return new Date(dateString).toLocaleString("ko-KR");
	};

	if(loading){
		return <div className={styles.boardPage}>
			<div className={styles.container}>
				<div className={styles.loading}>Loading...</div>
			</div>
		</div>;
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

	/**
	 * Utility function isAuthor.
	 */
	const isAuthor = (user?.userId ?? user?.id) === post.userId;
	const canEdit = isAuthor || (!!user && post.isWiki);
	const canDelete = isAuthor;

	return (
		<div className={styles.boardPage}>
			<div className={styles.container}>
				<div className={styles.topBar}>
					<button onClick={() => navigate("/board")} className={styles.backBtn}>Back</button>
					<div className={styles.topActions}>
						<button onClick={handleCopyLink} className={styles.copyLinkBtn}>
							{copiedLink ? "Copied" : "Copy link"}
						</button>
						{(canEdit || canDelete) && (
							<div className={styles.postActions}>
								{canEdit && <button onClick={() => navigate(`/board/edit/${post.postId}`)}
													className={styles.editBtn}>Edit</button>}
								{canDelete &&
									<button onClick={handleDeletePost} className={styles.deleteBtn}>Delete</button>}
							</div>
						)}
					</div>
				</div>

				<article className={styles.post}>
					<div className={styles.postHeader}>
						{post.categoryName && <span className={styles.category}>[{post.categoryName}]</span>}
						<h1 className={styles.title}>{post.title}</h1>
					</div>

					<div className={styles.postMeta}>
						<div className={styles.authorInfo}>
							{post.authorProfileImage &&
								<img src={post.authorProfileImage} alt="" className={styles.avatar}/>}
							<span className={styles.authorName}>
								{post.authorNickname || "Anonymous"}
							</span>
						</div>
						<div className={styles.metaRight}>
							<span>{formatDate(post.createdAt)}</span>
							<span>Views {post.viewCount}</span>
						</div>
					</div>

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

				{post.isWiki && (
					<section className={styles.historySection}>
						<button className={styles.historyToggle} onClick={handleToggleHistory}>
							Revision history {historyOpen ? "▲" : "▼"}
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
												<span
													className={styles.historyEditor}>{h.editorNickname || "Anonymous"}</span>
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

				<section className={styles.commentsSection}>
					<h3 className={styles.commentsTitle}>Comments {comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)}</h3>

					{user ? (
						<form onSubmit={handleSubmitComment} className={styles.commentForm}>
							{replyToId && (
								<div className={styles.replyNotice}>
									Reply mode
									<button type="button" onClick={() => setReplyToId(null)}
											className={styles.cancelReply}>Cancel</button>
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
							<button type="submit" disabled={submitting || !commentContent.trim()}
									className={styles.submitBtn}>
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
			</div>
		</div>
	);
};

export default BoardDetailPage;
