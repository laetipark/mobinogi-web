package com.example.mobinogi.dto.photo;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PhotoBoardPostCreateRequest{
	private String title;
	private String description;
	private String imageUrl;
	private List<String> tags;
}
