package com.example.mobinogi.repository;

import com.example.mobinogi.entity.game.GameRegion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRegionRepository extends JpaRepository<GameRegion, Integer>{
	void deleteByRegionIdGreaterThanEqual(int itemId);
}
