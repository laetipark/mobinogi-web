package com.example.mobinogi.repository;

import com.example.mobinogi.entity.UserRank;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRankRepository extends JpaRepository<UserRank, Integer> {
}