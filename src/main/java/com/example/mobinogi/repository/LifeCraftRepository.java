package com.example.mobinogi.repository;

import com.example.mobinogi.entity.LifeCraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LifeCraftRepository extends JpaRepository<LifeCraft, Integer>{
	List<LifeCraft> findByItemId(Integer itemId);
	
	void deleteAllByItemId(Integer itemId);
	
	void deleteByCraftIdGreaterThanEqual(int rowIndex);
}
