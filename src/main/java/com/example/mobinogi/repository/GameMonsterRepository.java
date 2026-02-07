package com.example.mobinogi.repository;

import com.example.mobinogi.entity.GameMonster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameMonsterRepository extends JpaRepository<GameMonster, Integer>{

	List<GameMonster> findByMonsterType(String monsterType);

	void deleteByMonsterIdGreaterThanEqual(int monsterId);
}
