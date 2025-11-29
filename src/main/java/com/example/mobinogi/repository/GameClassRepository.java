package com.example.mobinogi.repository;

import com.example.mobinogi.entity.GameClass;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GameClassRepository extends JpaRepository<GameClass, Long> {
    // Custom query to find GameClass by classCode
    GameClass findByClassCode(String classCode);
}