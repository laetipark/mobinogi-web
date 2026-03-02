package com.example.mobinogi.dto.board;

import com.example.mobinogi.entity.board.BoardCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Board category DTO.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BoardCategoryDto{

	/** Category ID. */
	private Long categoryId;

	/** Category display name. */
	private String categoryName;

	/** Category sort order. */
	private Integer displayOrder;

	/**
	 * Converts entity to DTO.
	 *
	 * @param entity board category entity
	 * @return DTO instance
	 */
	public static BoardCategoryDto fromEntity(BoardCategory entity){
		return BoardCategoryDto.builder()
			.categoryId(entity.getCategoryId())
			.categoryName(entity.getCategoryName())
			.displayOrder(entity.getCategoryOrder())
			.build();
	}
}
