package com.example.mobinogi.dto.user;

import lombok.Data;

import java.util.List;

@Data
/**
 * 길드 갤러리 이미지 생성 요청 DTO입니다.
 */
public class GuildGalleryImageCreateRequest{

	/** 업로드할 이미지 URL 목록 */
	private List<String> imageUrls;

	/** 갤러리 제목 */
	private String title;

	/** 갤러리 설명 */
	private String description;

	/** 쉼표 구분 태그 문자열 */
	private String tags;
}
