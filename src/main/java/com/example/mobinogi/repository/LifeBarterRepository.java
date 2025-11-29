package com.example.mobinogi.repository;

import com.example.mobinogi.entity.LifeBarter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LifeBarterRepository extends JpaRepository<LifeBarter, Integer>{
	List<LifeBarter> findByItemId(Integer itemId);
	
	List<LifeBarter> findByExchangeId(Integer itemId);
	
	List<LifeBarter> findByGameItem_ItemName(String itemName);
	
	void deleteAllByItemId(Integer itemId);
	
	void deleteAllByExchangeId(Integer itemId);
	
	void deleteByBarterIdGreaterThanEqual(int rowIndex);
}
