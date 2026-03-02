package com.example.mobinogi.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_guild_member")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildMember{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "BIGINT UNSIGNED")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "guild_id",
        foreignKey = @ForeignKey(name = "fk_user_guild_member_guild")
    )
    private UserGuild guild;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "user_id",
        foreignKey = @ForeignKey(name = "fk_user_guild_member_user")
    )
    private User user;

    @Column(name = "member_name", nullable = false, length = 100)
    private String memberName;

    @Column(name = "server_id", columnDefinition = "INT UNSIGNED")
    private Integer serverId;

    @Column(name = "guild_name", length = 100)
    private String guildName;

    @Column(name = "sub_character", length = 1000)
    private String subCharacter;

    @Column(name = "class_type", length = 50)
    private String classType;

    @Column(name = "class_name", length = 50)
    private String className;

    @Column(name = "contribution_start")
    private Integer contributionStart;

    @Column(name = "contribution_middle_1")
    private Integer contributionMiddle1;

    @Column(name = "contribution_middle_2")
    private Integer contributionMiddle2;

    @Column(name = "contribution_middle_3")
    private Integer contributionMiddle3;

    @Column(name = "contribution_finish")
    private Integer contributionFinish;

    @Column(name = "contribution_changed")
    private Integer contributionChanged;

    @Column(name = "guild_role", columnDefinition = "TINYINT UNSIGNED DEFAULT 0")
    private Integer guildRole;

    @Column(name = "member_status", length = 20)
    private String memberStatus;

    @Column(name = "approved_by_user_id", columnDefinition = "BIGINT UNSIGNED")
    private Long approvedByUserId;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "created_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
    private LocalDateTime deletedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.guildRole == null) {
            this.guildRole = 0;
        }
        if (this.memberStatus == null || this.memberStatus.isBlank()) {
            this.memberStatus = "APPROVED";
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
