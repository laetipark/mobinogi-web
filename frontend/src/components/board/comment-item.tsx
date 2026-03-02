import React, {useState} from "react";
import {useAuth} from "@/hooks/use-auth";
import styles from "./comment-item.module.scss";
import type {CommentItemProps} from "@/types/ui";

const CommentItem:React.FC<CommentItemProps> = ({comment, onReply, onEdit, onDelete, isReply = false}) => {
	const {user} = useAuth();
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState(comment.content);

	/**
	 * Utility function isAuthor.
	 */
	const isAuthor = (user?.userId ?? user?.id) === comment.userId;

	/**
	 * Utility function handleSaveEdit.
	 */
	const handleSaveEdit = () => {
		if(!editContent.trim()) return;
		onEdit(comment.commentId, editContent.trim());
		setIsEditing(false);
	};

	/**
	 * Utility function formatDate.
	 */
	const formatDate = (dateString:string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if(days > 0) return `${days}일 전`;
		if(hours > 0) return `${hours}시간 전`;
		if(minutes > 0) return `${minutes}분 전`;
		return "방금 전";
	};

	return (
		<div className={`${styles.commentItem} ${isReply ? styles.reply : ""}`}>
			<div className={styles.commentHeader}>
				<div className={styles.authorInfo}>
					{comment.authorProfileImage && (
						<img src={comment.authorProfileImage} alt="" className={styles.avatar}/>
					)}
					<span className={styles.authorName}>{comment.authorNickname || "익명"}</span>
					<span className={styles.date}>{formatDate(comment.createdAt)}</span>
				</div>

				{isAuthor && !isEditing && (
					<div className={styles.actions}>
						<button onClick={() => setIsEditing(true)} className={styles.actionBtn}>수정</button>
						<button onClick={() => onDelete(comment.commentId)} className={styles.actionBtn}>삭제</button>
					</div>
				)}
			</div>

			{isEditing ? (
				<div className={styles.editForm}>
					<textarea
						value={editContent}
						onChange={(e) => setEditContent(e.target.value)}
						className={styles.editTextarea}
						rows={3}
					/>
					<div className={styles.editActions}>
						<button onClick={handleSaveEdit} className={styles.saveBtn}>저장</button>
						<button onClick={() => {setEditContent(comment.content); setIsEditing(false);}} className={styles.cancelBtn}>취소</button>
					</div>
				</div>
			) : (
				<>
					<p className={styles.commentContent}>{comment.content}</p>
					{!isReply && user && (
						<button onClick={() => onReply(comment.commentId)} className={styles.replyBtn}>답글</button>
					)}
				</>
			)}

			{comment.replies && comment.replies.length > 0 && (
				<div className={styles.replies}>
					{comment.replies.map(reply => (
						<CommentItem
							key={reply.commentId}
							comment={reply}
							onReply={onReply}
							onEdit={onEdit}
							onDelete={onDelete}
							isReply={true}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export default CommentItem;
