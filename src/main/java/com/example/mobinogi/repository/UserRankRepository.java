package com.example.mobinogi.repository;

import com.example.mobinogi.entity.UserRank;
import org.springframework.data.jpa.repository.JpaRepository;

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

	List<UserRank> findByUserNameIgnoreCaseAndDeletedAtIsNullOrderByUpdatedAtDescServerIdAsc(String userName);

	List<UserRank> findTop5ByUserNameContainingIgnoreCaseAndDeletedAtIsNullOrderByUpdatedAtDesc(String userName);
}
