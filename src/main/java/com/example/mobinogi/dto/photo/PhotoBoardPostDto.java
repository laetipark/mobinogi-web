package com.example.mobinogi.dto.photo;

import com.example.mobinogi.entity.PhotoBoardPost;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhotoBoardPostDto{

	private Long photoPostId;
	private Long userId;
	private String authorNickname;
	private String authorProfileImage;
	private String title;
	private String description;
	private String imageUrl;
	private List<String> tags;
	private Integer viewCount;
	private Integer likeCount;
	private Boolean likedByCurrentUser;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

	public static PhotoBoardPostDto fromEntity(PhotoBoardPost entity){
		return fromEntity(entity, false);
	}

	public static PhotoBoardPostDto fromEntity(PhotoBoardPost entity, boolean likedByCurrentUser){
		String authorNickname = null;
		String authorProfileImage = null;

		if(entity.getUser() != null){
			authorNickname = entity.getUser().getNickname();
			authorProfileImage = entity.getUser().getProfileImage();
		}

		return PhotoBoardPostDto.builder()
			.photoPostId(entity.getPhotoPostId())
			.userId(entity.getUserId())
			.authorNickname(authorNickname)
			.authorProfileImage(authorProfileImage)
			.title(entity.getTitle())
			.description(entity.getDescription())
			.imageUrl(entity.getImageUrl())
			.tags(parseTags(entity.getTags()))
			.viewCount(entity.getViewCount())
			.likeCount(entity.getLikeCount())
			.likedByCurrentUser(likedByCurrentUser)
			.createdAt(entity.getCreatedAt())
			.updatedAt(entity.getUpdatedAt())
			.build();
	}

	private static List<String> parseTags(String tags){
		if(tags == null || tags.trim().isEmpty()){
			return Collections.emptyList();
		}
		return Arrays.stream(tags.split(","))
			.map(String::trim)
			.filter(tag -> !tag.isEmpty())
			.collect(Collectors.toList());
	}
}
