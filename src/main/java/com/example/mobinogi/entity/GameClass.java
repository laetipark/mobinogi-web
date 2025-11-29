package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "game_class")
@Getter
@Setter
public class GameClass{
	
	@Id
	@Column(name = "class_id", nullable = false)
	private Long classId;
	
	@Column(name = "class_code", nullable = false, length = 50)
	private String classCode;
	
	@Column(name = "class_name", nullable = false, length = 50)
	private String className;
	
	@Column(name = "is_apprentice", nullable = true, columnDefinition = "TINYINT(1) DEFAULT 0")
	private Boolean isApprentice;
	
}