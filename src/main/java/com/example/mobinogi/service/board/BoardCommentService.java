package com.example.mobinogi.service.board;

import com.example.mobinogi.dto.board.*;
import com.example.mobinogi.entity.BoardComment;
import com.example.mobinogi.repository.BoardCommentRepository;
import com.example.mobinogi.repository.BoardPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardCommentService{

	private final BoardCommentRepository commentRepository;
	private final BoardPostRepository postRepository;

	public List<BoardCommentDto> getComments(Long postId){
		postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

		List<BoardComment> allComments = commentRepository
			.findByPostIdAndDeletedAtIsNullOrderByCreatedAtAsc(postId);

		// 대댓글을 부모 댓글 ID별로 그룹화
		Map<Long, List<BoardCommentDto>> repliesByParentId = allComments.stream()
			.filter(c -> c.getParentCommentId() != null)
			.map(BoardCommentDto::fromEntity)
			.collect(Collectors.groupingBy(BoardCommentDto::getParentCommentId));

		// 최상위 댓글에 대댓글 연결
		return allComments.stream()
			.filter(c -> c.getParentCommentId() == null)
			.map(BoardCommentDto::fromEntity)
			.peek(dto -> dto.setReplies(repliesByParentId.getOrDefault(dto.getCommentId(), List.of())))
			.collect(Collectors.toList());
	}

	@Transactional
	public BoardCommentDto createComment(Long postId, Long userId, BoardCommentCreateRequest request){
		postRepository.findByPostIdAndDeletedAtIsNull(postId)
			.orElseThrow(() -> new RuntimeException("게시글을 찾을 수 없습니다."));

		if(request.getParentCommentId() != null){
			commentRepository.findByCommentIdAndDeletedAtIsNull(request.getParentCommentId())
				.orElseThrow(() -> new RuntimeException("부모 댓글을 찾을 수 없습니다."));
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

	@Transactional
	public BoardCommentDto updateComment(Long commentId, Long userId, BoardCommentUpdateRequest request){
		BoardComment comment = commentRepository.findByCommentIdAndDeletedAtIsNull(commentId)
			.orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

		if(!comment.getUserId().equals(userId)){
			throw new RuntimeException("댓글 수정 권한이 없습니다.");
		}

		comment.setContent(request.getContent());
		comment = commentRepository.save(comment);
		return BoardCommentDto.fromEntity(comment);
	}

	@Transactional
	public void deleteComment(Long commentId, Long userId){
		BoardComment comment = commentRepository.findByCommentIdAndDeletedAtIsNull(commentId)
			.orElseThrow(() -> new RuntimeException("댓글을 찾을 수 없습니다."));

		if(!comment.getUserId().equals(userId)){
			throw new RuntimeException("댓글 삭제 권한이 없습니다.");
		}

		comment.setDeletedAt(LocalDateTime.now());
		commentRepository.save(comment);
	}
}
