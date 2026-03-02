package com.example.mobinogi.dto.user;

import com.example.mobinogi.entity.UserGuildMember;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGuildMemberListDto {

    private Long id;
    private String memberName;
    private String guildName;
    private String category;
    private String jobClass;
    private Integer contributionStart;
    private Integer contributionMiddle1;
    private Integer contributionMiddle2;
    private Integer contributionMiddle3;
    private Integer contributionFinish;
    private Integer contributionChanged;
    private Integer guildRole;
    private String subCharacter;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static UserGuildMemberListDto from(UserGuildMember entity) {
        return UserGuildMemberListDto.builder()
            .id(entity.getId())
            .memberName(entity.getMemberName())
            .guildName(entity.getGuildName())
            .category(entity.getClassType())
            .jobClass(entity.getClassName())
            .contributionStart(entity.getContributionStart())
            .contributionMiddle1(entity.getContributionMiddle1())
            .contributionMiddle2(entity.getContributionMiddle2())
            .contributionMiddle3(entity.getContributionMiddle3())
            .contributionFinish(entity.getContributionFinish())
            .contributionChanged(entity.getContributionChanged())
            .guildRole(entity.getGuildRole())
            .subCharacter(entity.getSubCharacter())
            .createdAt(entity.getCreatedAt())
            .updatedAt(entity.getUpdatedAt())
            .build();
    }
}
