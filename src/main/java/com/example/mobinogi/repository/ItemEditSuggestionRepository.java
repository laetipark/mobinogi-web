package com.example.mobinogi.repository;

import com.example.mobinogi.entity.ItemEditSuggestion;
import com.example.mobinogi.entity.ItemEditSuggestionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemEditSuggestionRepository extends JpaRepository<ItemEditSuggestion, Long>{

	List<ItemEditSuggestion> findByItemNameOrderByCreatedAtDesc(String itemName);

	List<ItemEditSuggestion> findByItemNameAndStatusOrderByCreatedAtDesc(String itemName, ItemEditSuggestionStatus status);
}
