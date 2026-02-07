package com.example.mobinogi.repository;

import com.example.mobinogi.entity.BoardCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BoardCategoryRepository extends JpaRepository<BoardCategory, Long>{
	List<BoardCategory> findByDeletedAtIsNullOrderByDisplayOrderAsc();
	Optional<BoardCategory> findByCategoryNameAndDeletedAtIsNull(String categoryName);
}
