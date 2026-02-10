package com.example.mobinogi.dto.board;

import com.example.mobinogi.entity.BoardCategory;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardCategoryDto{
	private Long categoryId;
	private String categoryName;
	private Integer displayOrder;

	public static BoardCategoryDto fromEntity(BoardCategory entity){
		return BoardCategoryDto.builder()
			.categoryId(entity.getCategoryId())
			.categoryName(entity.getCategoryName())
			.displayOrder(entity.getCategoryOrder())
			.build();
	}
}
