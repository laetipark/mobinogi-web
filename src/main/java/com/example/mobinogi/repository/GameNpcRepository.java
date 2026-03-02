package com.example.mobinogi.repository;

import com.example.mobinogi.entity.game.GameNpc;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameNpcRepository extends JpaRepository<GameNpc, Integer>{
	void deleteByNpcIdGreaterThanEqual(int itemId);
}
