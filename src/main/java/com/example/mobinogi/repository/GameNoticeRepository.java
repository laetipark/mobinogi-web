package com.example.mobinogi.repository;

import com.example.mobinogi.entity.game.GameNotice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GameNoticeRepository extends JpaRepository<GameNotice, String>{

	@Query("""
		SELECT notice
		FROM GameNotice notice
		WHERE notice.deletedAt IS NULL
		ORDER BY notice.publishedDate DESC, notice.noticeId DESC
		""")
	List<GameNotice> findActiveNotices();

	@Query("""
		SELECT notice
		FROM GameNotice notice
		WHERE notice.deletedAt IS NULL
			AND notice.noticeType IN :noticeTypes
		ORDER BY notice.publishedDate DESC, notice.noticeId DESC
		""")
	List<GameNotice> findActiveNoticesByTypes(@Param("noticeTypes") List<String> noticeTypes);
}
