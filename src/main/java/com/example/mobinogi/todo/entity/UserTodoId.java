package com.example.mobinogi.todo.entity;

import lombok.EqualsAndHashCode;

import java.io.Serializable;

/**
 * Composite key class for {@link UserTodo}.
 */
@EqualsAndHashCode
public class UserTodoId implements Serializable{

	/** User ID key part. */
	private Long userId;

	/** Character ID key part. */
	private Long characterId;

	/**
	 * Default constructor for JPA.
	 */
	public UserTodoId(){
	}

	/**
	 * Creates composite key.
	 *
	 * @param userId user ID
	 * @param characterId character ID
	 */
	public UserTodoId(Long userId, Long characterId){
		this.userId = userId;
		this.characterId = characterId;
	}
}
