package com.example.mobinogi.service.board;

import com.example.mobinogi.dto.board.BoardCommentCreateRequest;
import com.example.mobinogi.dto.board.BoardCommentDto;
import com.example.mobinogi.dto.board.BoardCommentUpdateRequest;
import com.example.mobinogi.entity.board.BoardComment;
import com.example.mobinogi.repository.BoardCommentRepository;
import com.example.mobinogi.repository.BoardPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Board comment service.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardCommentService{

	/** Board comment repository. */
	private final BoardCommentRepository commentRepository;

	/** Board post repository for parent-post validation. */
	private final BoardPostRepository postRepository;

	/**
	 * Returns hierarchical comments for a post.
	 *
	 * @param postId post ID
	 * @return root comments with nested replies
	 */
	public List<BoardCommentDto> getComments(Long postId){
		postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("Post not found."));

		List<BoardComment> allComments = commentRepository
			.findByPostIdAndDeletedAtIsNullOrderByCreatedAtAsc(postId);

		// Group child comments by parent-comment ID.
		Map<Long, List<BoardCommentDto>> repliesByParentId = allComments.stream()
			.filter(c -> c.getParentCommentId() != null)
			.map(BoardCommentDto::fromEntity)
			.collect(Collectors.groupingBy(BoardCommentDto::getParentCommentId));

		// Attach grouped replies to root comments.
		return allComments.stream()
			.filter(c -> c.getParentCommentId() == null)
			.map(BoardCommentDto::fromEntity)
			.peek(dto -> dto.setReplies(repliesByParentId.getOrDefault(dto.getCommentId(), List.of())))
			.collect(Collectors.toList());
	}

	/**
	 * Creates a new post comment or reply.
	 *
	 * @param postId post ID
	 * @param userId author user ID
	 * @param request create request payload
	 * @return created comment DTO
	 */
	@Transactional
	public BoardCommentDto createComment(Long postId, Long userId, BoardCommentCreateRequest request){
		postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("Post not found."));

		if(request.getParentCommentId() != null){
			commentRepository.findByCommentIdAndDeletedAtIsNull(request.getParentCommentId())
				.orElseThrow(() -> new RuntimeException("Parent comment not found."));
		}

		BoardComment comment = BoardComment.builder()
			.postId(postId)
			.userId(userId)
			.parentCommentId(request.getParentCommentId())
			.content(request.getContent())
			.build();

		comment = commentRepository.save(comment);
		return BoardCommentDto.fromEntity(comment);
	}

	/**
	 * Updates comment content.
	 *
	 * @param commentId comment ID
	 * @param userId requesting user ID
	 * @param request update request payload
	 * @return updated comment DTO
	 */
	@Transactional
	public BoardCommentDto updateComment(Long commentId, Long userId, BoardCommentUpdateRequest request){
		BoardComment comment = commentRepository.findByCommentIdAndDeletedAtIsNull(commentId)
			.orElseThrow(() -> new RuntimeException("Comment not found."));

		if(!comment.getUserId().equals(userId)){
			throw new RuntimeException("No permission to edit this comment.");
		}

		comment.setContent(request.getContent());
		comment = commentRepository.save(comment);
		return BoardCommentDto.fromEntity(comment);
	}

	/**
	 * Soft-deletes a comment.
	 *
	 * @param commentId comment ID
	 * @param userId requesting user ID
	 */
	@Transactional
	public void deleteComment(Long commentId, Long userId){
		BoardComment comment = commentRepository.findByCommentIdAndDeletedAtIsNull(commentId)
			.orElseThrow(() -> new RuntimeException("Comment not found."));

		if(!comment.getUserId().equals(userId)){
			throw new RuntimeException("No permission to delete this comment.");
		}

		comment.setDeletedAt(LocalDateTime.now());
		commentRepository.save(comment);
	}
}
