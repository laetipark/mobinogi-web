package com.example.mobinogi.todo.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserTodoUpdateRequest{

	/** 저장할 TODO 데이터 페이로드 */
	private TodoDataDto todoData;
}

