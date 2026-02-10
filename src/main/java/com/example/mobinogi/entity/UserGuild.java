package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_guild")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuild{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(columnDefinition = "BIGINT UNSIGNED")
	private Long id;

	@Column(name = "member_name", nullable = false, length = 100)
	private String memberName;

	@Column(name = "class_type", length = 50)
	private String classType; // 계열 (예: 궁수 계열, 전사 계열, 마법사 계열)

	@Column(name = "class_name", length = 50)
	private String className; // 직업 (예: 석궁사수, 검술사, 마법사)

	@Column(name = "contribution_start")
	private Integer contributionStart; // 공헌도

	@Column(name = "contribution_middle_1")
	private Integer contributionMiddle1;

	@Column(name = "contribution_middle_2")
	private Integer contributionMiddle2;

	@Column(name = "contribution_middle_3")
	private Integer contributionMiddle3;

	@Column(name = "contribution_finish")
	private Integer contributionFinish; // 마무리

	@Column(name = "contribution_changed")
	private Integer contributionChanged; // 변화량

	@Column(name = "sub_character", length = 100)
	private String subCharacter; // 부캐릭터

	@Column(name = "text_info", length = 500)
	private String textInfo; // 텍스트 정보
	
	@Column(name = "notion_page_id", length = 100)
	private String notionPageId; // Notion 페이지 ID (중복 방지용)
	
	@Column(name = "last_edited_time")
	private LocalDateTime lastEditedTime; // Notion에서 마지막으로 수정된 시간

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
