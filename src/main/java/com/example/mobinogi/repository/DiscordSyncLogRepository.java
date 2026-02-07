package com.example.mobinogi.repository;

import com.example.mobinogi.entity.DiscordSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscordSyncLogRepository extends JpaRepository<DiscordSyncLog, Long>{
}
