package com.example.mobinogi.entity.guild;

import com.example.mobinogi.entity.user.User;
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
    /**
     * Field id.
     */
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "guild_id",
        foreignKey = @ForeignKey(name = "fk_user_guild_member_guild")
    )
    /**
     * Field guild.
     */
    private UserGuild guild;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "user_id",
        foreignKey = @ForeignKey(name = "fk_user_guild_member_user")
    )
    /**
     * Field user.
     */
    private User user;

    @Column(name = "member_name", nullable = false, length = 100)
    /**
     * Field memberName.
     */
    private String memberName;

    @Column(name = "server_id", columnDefinition = "INT UNSIGNED")
    /**
     * Field serverId.
     */
    private Integer serverId;

    @Column(name = "guild_name", length = 100)
    /**
     * Field guildName.
     */
    private String guildName;

    @Column(name = "sub_character", length = 1000)
    /**
     * Field subCharacter.
     */
    private String subCharacter;

    @Column(name = "class_type", length = 50)
    /**
     * Field classType.
     */
    private String classType;

    @Column(name = "class_name", length = 50)
    /**
     * Field className.
     */
    private String className;

    @Column(name = "contribution_start")
    /**
     * Field contributionStart.
     */
    private Integer contributionStart;

    @Column(name = "contribution_middle_1")
    /**
     * Field contributionMiddle1.
     */
    private Integer contributionMiddle1;

    @Column(name = "contribution_middle_2")
    /**
     * Field contributionMiddle2.
     */
    private Integer contributionMiddle2;

    @Column(name = "contribution_middle_3")
    /**
     * Field contributionMiddle3.
     */
    private Integer contributionMiddle3;

    @Column(name = "contribution_finish")
    /**
     * Field contributionFinish.
     */
    private Integer contributionFinish;

    @Column(name = "contribution_changed")
    /**
     * Field contributionChanged.
     */
    private Integer contributionChanged;

    @Column(name = "guild_role", columnDefinition = "TINYINT UNSIGNED DEFAULT 0")
    /**
     * Field guildRole.
     */
    private Integer guildRole;

    @Column(name = "member_status", length = 20)
    /**
     * Field memberStatus.
     */
    private String memberStatus;

    @Column(name = "approved_by_user_id", columnDefinition = "BIGINT UNSIGNED")
    /**
     * Field approvedByUserId.
     */
    private Long approvedByUserId;

    @Column(name = "approved_at")
    /**
     * Field approvedAt.
     */
    private LocalDateTime approvedAt;

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
     * Initializes default values before insert.
     */
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

    /**
     * Updates timestamp before update.
     */
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

