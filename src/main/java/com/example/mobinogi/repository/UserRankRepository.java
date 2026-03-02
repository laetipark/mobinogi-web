package com.example.mobinogi.repository;

import com.example.mobinogi.entity.user.UserRank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRankRepository extends JpaRepository<UserRank, Integer>{

	List<UserRank> findByUserNameContainingIgnoreCase(String userName);

	List<UserRank> findByServerIdAndUserNameIgnoreCaseAndDeletedAtIsNullOrderByUpdatedAtDesc(Integer serverId, String userName);

	default Optional<UserRank> findLatestActiveByServerIdAndUserName(Integer serverId, String userName){
		List<UserRank> ranks = findByServerIdAndUserNameIgnoreCaseAndDeletedAtIsNullOrderByUpdatedAtDesc(serverId, userName);
		if(ranks.isEmpty()){
			return Optional.empty();
		}
		for(UserRank rank : ranks){
			if(rank.getClassId() != null && rank.getClassId() == 0){
				return Optional.of(rank);
			}
		}
		return Optional.of(ranks.get(0));
	}

	@Query("""
		SELECT u
		FROM UserRank u
		WHERE u.serverId = :serverId
			AND u.deletedAt IS NULL
			AND LOWER(TRIM(u.userName)) = LOWER(TRIM(:userName))
		ORDER BY CASE WHEN u.classId = 0 THEN 0 ELSE 1 END, u.updatedAt DESC
		""")
	List<UserRank> findNormalizedByServerIdAndUserName(
		@Param("serverId") Integer serverId,
		@Param("userName") String userName
	);

	@Query("""
		SELECT u
		FROM UserRank u
		WHERE u.serverId = :serverId
			AND u.deletedAt IS NULL
			AND LOWER(TRIM(u.userName)) IN :normalizedUserNames
		ORDER BY CASE WHEN u.classId = 0 THEN 0 ELSE 1 END, u.updatedAt DESC
		""")
	List<UserRank> findByServerIdAndNormalizedUserNameIn(
		@Param("serverId") Integer serverId,
		@Param("normalizedUserNames") List<String> normalizedUserNames
	);

	@Query("""
		SELECT u
		FROM UserRank u
		WHERE u.serverId = :serverId
			AND u.deletedAt IS NULL
			AND LOWER(REPLACE(TRIM(u.userName), ' ', '')) = LOWER(REPLACE(TRIM(:userName), ' ', ''))
		ORDER BY CASE WHEN u.classId = 0 THEN 0 ELSE 1 END, u.updatedAt DESC
		""")
	List<UserRank> findCompactByServerIdAndUserName(
		@Param("serverId") Integer serverId,
		@Param("userName") String userName
	);

	@Query("""
		SELECT u
		FROM UserRank u
		WHERE u.serverId = :serverId
			AND u.deletedAt IS NULL
			AND LOWER(REPLACE(TRIM(u.userName), ' ', '')) IN :compactUserNames
		ORDER BY CASE WHEN u.classId = 0 THEN 0 ELSE 1 END, u.updatedAt DESC
		""")
	List<UserRank> findByServerIdAndCompactUserNameIn(
		@Param("serverId") Integer serverId,
		@Param("compactUserNames") List<String> compactUserNames
	);

	default Optional<UserRank> findLatestActiveByServerIdAndUserNameRobust(Integer serverId, String userName){
		if(serverId == null || userName == null || userName.isBlank()){
			return Optional.empty();
		}
		String normalized = userName.trim();
		Optional<UserRank> exact = findLatestActiveByServerIdAndUserName(serverId, normalized);
		if(exact.isPresent()){
			return exact;
		}
		List<UserRank> normalizedList = findNormalizedByServerIdAndUserName(serverId, normalized);
		if(!normalizedList.isEmpty()){
			return Optional.of(normalizedList.get(0));
		}
		List<UserRank> compactList = findCompactByServerIdAndUserName(serverId, normalized);
		if(!compactList.isEmpty()){
			return Optional.of(compactList.get(0));
		}
		return Optional.empty();
	}

	List<UserRank> findByUserNameIgnoreCaseAndDeletedAtIsNullOrderByUpdatedAtDescServerIdAsc(String userName);

	List<UserRank> findTop5ByUserNameContainingIgnoreCaseAndDeletedAtIsNullOrderByUpdatedAtDesc(String userName);
}

