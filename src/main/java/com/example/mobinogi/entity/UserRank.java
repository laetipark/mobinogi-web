package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

// Composite key class
@EqualsAndHashCode
class UserRankId implements Serializable{
	
	private Integer serverId;
	private String userName;
	
	// Default constructor
	public UserRankId(){
	}
	
	// Constructor with all key fields
	public UserRankId(Integer serverId, String userName){
		this.serverId = serverId;
		this.userName = userName;
	}
}

@Entity
@Table(name = "user_rank")
@IdClass(UserRankId.class)
@Getter
@Setter
public class UserRank{
	
	@Id
	@Column(name = "server_id", nullable = false, columnDefinition = "int unsigned")
	private Integer serverId;
	
	@Id
	@Column(name = "user_name", nullable = false, length = 255)
	private String userName;
	
	@Column(name = "class_id", nullable = false, columnDefinition = "int unsigned")
	private Integer classId;
	
	@Column(name = "user_power", columnDefinition = "int unsigned")
	private Integer userPower;
	
	@Column(name = "user_vitality", columnDefinition = "int unsigned")
	private Integer userVitality;
	
	@Column(name = "user_attractiveness", columnDefinition = "int unsigned")
	private Integer userAttractiveness;
	
	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	private LocalDateTime createdAt;

	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	private LocalDateTime deletedAt;
	
	@PrePersist
	public void prePersist(){
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
	}
	
	@PreUpdate
	public void preUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}
