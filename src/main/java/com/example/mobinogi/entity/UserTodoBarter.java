package com.example.mobinogi.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_todo_barter")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class UserTodoBarter{
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", columnDefinition = "BIGINT UNSIGNED")
	private Long id;
	
	@Column(name = "user_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long userId;
	
	@Column(name = "character_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long characterId;
	
	@Column(name = "barter_id", nullable = false, columnDefinition = "BIGINT UNSIGNED")
	private Long barterId;
	
	@Column(name = "barter_cycle", length = 10)
	private String barterCycle;
	
	@Column(name = "completed", nullable = false)
	private Boolean completed;
	
	@Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
	private LocalDateTime createdAt;
	
	@Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
	private LocalDateTime updatedAt;
	
	@Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
	private LocalDateTime deletedAt;
	
	@ManyToOne(fetch = FetchType.EAGER)
	@JoinColumn(name = "barter_id", insertable = false, updatable = false)
	private LifeBarter lifeBarter;
	
	@PrePersist
	public void prePersist(){
		this.createdAt = LocalDateTime.now();
		this.updatedAt = LocalDateTime.now();
		if(this.completed == null){
			this.completed = false;
		}
	}
	
	@PreUpdate
	public void preUpdate(){
		this.updatedAt = LocalDateTime.now();
	}
}
