package com.example.mobinogi.service.user;

import com.example.mobinogi.entity.UserGuildMember;
import com.example.mobinogi.repository.UserGuildRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UserGuildService {

    private final UserGuildRepository userGuildRepository;

    public Page<UserGuildMember> getAllUserGuilds(int page, int size, String sortBy, String sortDir) {
        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return userGuildRepository.findAll(pageable);
    }

    public List<UserGuildMember> searchByMemberName(String memberName) {
        return userGuildRepository.findByMemberNameContaining(memberName);
    }

    public Optional<UserGuildMember> getByExactMemberName(String memberName) {
        return userGuildRepository.findByMemberName(memberName);
    }

    public List<UserGuildMember> getByClassName(String className) {
        return userGuildRepository.findByClassName(className);
    }

    public List<UserGuildMember> getByClassType(String classType) {
        return userGuildRepository.findByClassType(classType);
    }

    public List<UserGuildMember> getTopContributionStartRanking(int limit) {
        return userGuildRepository.findTopByContributionStart(limit);
    }

    public List<UserGuildMember> getTopContributionFinishRanking(int limit) {
        return userGuildRepository.findTopByContributionFinish(limit);
    }

    public List<UserGuildMember> getTopContributionChangedRanking(int limit) {
        return userGuildRepository.findTopByContributionChanged(limit);
    }

    public List<UserGuildMember> getUpdatedAfter(LocalDateTime dateTime) {
        return userGuildRepository.findByUpdatedAtAfter(dateTime);
    }

    public LocalDateTime getLastSyncTime() {
        return userGuildRepository.findTopByOrderByUpdatedAtDesc()
            .map(UserGuildMember::getUpdatedAt)
            .orElse(null);
    }

    public long getTotalMemberCount() {
        return userGuildRepository.count();
    }

    public Optional<UserGuildMember> getById(Long id) {
        return userGuildRepository.findById(id);
    }

    public List<UserGuildMember> getBySubCharacter(String subCharacter) {
        return userGuildRepository.findBySubCharacterContaining(subCharacter);
    }

    public List<UserGuildMember> getByContributionRange(Integer minContribution, Integer maxContribution) {
        return userGuildRepository.findByContributionFinishBetween(minContribution, maxContribution);
    }

    @Transactional
    public void triggerManualSync() {
        log.info("Manual user guild sync requested");
    }
}
