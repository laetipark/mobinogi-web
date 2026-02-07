package com.example.mobinogi.repository;

import com.example.mobinogi.entity.NotionSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotionSyncLogRepository extends JpaRepository<NotionSyncLog, Long>{
}
