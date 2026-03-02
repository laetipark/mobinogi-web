package com.example.mobinogi.entity.user;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

// Composite key class
@EqualsAndHashCode
class UserRankId implements Serializable{
	
	/**
	 * Field serverId.
	 */
	private Integer serverId;
	/**
	 * Field userName.
	 */
	private String userName;
	
	/**
	 * 기본 생성자.
	 */
	public UserRankId(){
	}

	/**
	 * 복합키 생성자.
	 *
	 * @param serverId 서버 ID
	 * @param userName 사용자명
	 */
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
	/**
	 * Field serverId.
	 */
	private Integer serverId;
	
	@Id
	@Column(name = "user_name", nullable = false, length = 255)
	/**
	 * Field userName.
	 */
	private String userName;
	
	@Column(name = "class_id", nullable = false, columnDefinition = "int unsigned")
	/**
	 * Field classId.
	 */
	private Integer classId;
	
	@Column(name = "user_power", columnDefinition = "int unsigned")
	/**
	 * Field userPower.
	 */
	private Integer userPower;
	
	@Column(name = "user_vitality", columnDefinition = "int unsigned")
	/**
	 * Field userVitality.
	 */
	private Integer userVitality;
	
	@Column(name = "user_attractiveness", columnDefinition = "int unsigned")
	/**
	 * Field userAttractiveness.
	 */
	private Integer userAttractiveness;
	
	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	/**
	 * Field createdAt.
	 */
	private LocalDateTime createdAt;

	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	/**
	 * Field updatedAt.
	 */
	private LocalDateTime updatedAt;

	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	/**
	 * Field deletedAt.
	 */
	private LocalDateTime deletedAt;
	
	/**
	 * 엔티티 최초 저장 시 타임스탬프를 초기화합니다.
	 */
	@PrePersist
	public void prePersist(){
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
	}
	
	/**
	 * 엔티티 수정 시 갱신 시각을 반영합니다.
	 */
	@PreUpdate
	public void preUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}

