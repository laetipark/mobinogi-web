package com.example.mobinogi.dto.photo;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
/**
 * 포토 게시글 생성 요청 DTO입니다.
 */
public class PhotoBoardPostCreateRequest{

	/** 게시글 제목 */
	private String title;

	/** 게시글 본문 설명 */
	private String description;

	/** 업로드할 이미지 URL 목록 */
	private List<String> imageUrls;

	/** 게시글 태그 목록 */
	private List<String> tags;
}
