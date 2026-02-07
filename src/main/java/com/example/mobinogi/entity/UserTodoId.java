package com.example.mobinogi.entity;

import lombok.EqualsAndHashCode;

import java.io.Serializable;

@EqualsAndHashCode
public class UserTodoId implements Serializable{

	private Long userId;
	private Long characterId;

	public UserTodoId(){
	}

	public UserTodoId(Long userId, Long characterId){
		this.userId = userId;
		this.characterId = characterId;
	}
}
