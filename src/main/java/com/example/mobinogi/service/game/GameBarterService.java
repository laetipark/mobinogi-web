package com.example.mobinogi.service.game;

import com.example.mobinogi.dto.game.BarterFilterNpcDto;
import com.example.mobinogi.dto.game.BarterFilterOptionsDto;
import com.example.mobinogi.dto.game.BarterFilterRegionDto;
import com.example.mobinogi.entity.life.LifeBarter;
import com.example.mobinogi.repository.LifeBarterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Barter lookup service.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GameBarterService{

	/** Barter repository. */
	private final LifeBarterRepository lifeBarterRepository;

	/**
	 * Returns barter rows by source item ID.
	 *
	 * @param itemId source item ID
	 * @return barter rows
	 */
	public List<LifeBarter> getBartersByItemId(Long itemId){
		return lifeBarterRepository.findByItemId(itemId);
	}

	/**
	 * Returns barter rows by exchange item ID.
	 *
	 * @param itemId exchange item ID
	 * @return barter rows
	 */
	public List<LifeBarter> getBartersByExchangeId(Long itemId){
		return lifeBarterRepository.findByExchangeId(itemId);
	}

	/**
	 * Returns barter rows by exact item name.
	 *
	 * @param itemName item name
	 * @return barter rows
	 */
	public List<LifeBarter> getBartersByItemName(String itemName){
		return lifeBarterRepository.findByGameItem_ItemName(itemName);
	}

	/**
	 * Returns paged barter rows by keyword and filter IDs.
	 *
	 * @param page page index
	 * @param size page size
	 * @param sortBy sort field
	 * @param sortDir sort direction
	 * @param keyword keyword filter
	 * @param regionId region ID filter
	 * @param npcId NPC ID filter
	 * @return barter page
	 */
	public Page<LifeBarter> getBarters(
		int page,
		int size,
		String sortBy,
		String sortDir,
		String keyword,
		Long regionId,
		Long npcId){
		Sort sort = sortDir.equalsIgnoreCase("desc")
			? Sort.by(sortBy).descending()
			: Sort.by(sortBy).ascending();

		Pageable pageable = PageRequest.of(page, size, sort);
		String normalizedKeyword = (keyword != null && !keyword.trim().isEmpty())
			? keyword.trim()
			: null;

		return lifeBarterRepository.findByFilters(normalizedKeyword, regionId, npcId, pageable);
	}

	/**
	 * Returns paged barter rows by obtained item keyword.
	 *
	 * @param page page index
	 * @param size page size
	 * @param sortBy sort field
	 * @param sortDir sort direction
	 * @param keyword obtained item keyword
	 * @return barter page
	 */
	public Page<LifeBarter> getBartersByObtainedItem(int page, int size, String sortBy, String sortDir, String keyword){
		return getBartersByObtainedItem(page, size, sortBy, sortDir, keyword, null);
	}

	/**
	 * Returns paged barter rows by obtained item keyword and cycle.
	 *
	 * @param page page index
	 * @param size page size
	 * @param sortBy sort field
	 * @param sortDir sort direction
	 * @param keyword obtained item keyword
	 * @param cycle barter cycle filter
	 * @return barter page
	 */
	public Page<LifeBarter> getBartersByObtainedItem(
		int page,
		int size,
		String sortBy,
		String sortDir,
		String keyword,
		Integer cycle
	){
		Sort sort = sortDir.equalsIgnoreCase("desc")
			? Sort.by(sortBy).descending()
			: Sort.by(sortBy).ascending();
		Pageable pageable = PageRequest.of(page, size, sort);

		if(keyword != null && !keyword.trim().isEmpty()){
			String normalizedKeyword = keyword.trim();
			if(cycle != null){
				return lifeBarterRepository.findByItemNameKeywordAndCycle(normalizedKeyword, cycle, pageable);
			}
			return lifeBarterRepository.findByItemNameKeyword(normalizedKeyword, pageable);
		}

		if(cycle != null){
			return lifeBarterRepository.findByBarterInitCycle(cycle, pageable);
		}

		return lifeBarterRepository.findAll(pageable);
	}

	/**
	 * Returns grouped barter filter options.
	 *
	 * @return barter filter option payload
	 */
	public BarterFilterOptionsDto getBarterFilterOptions(){
		List<LifeBarterRepository.BarterFilterRow> rows = lifeBarterRepository.findFilterRows();
		Map<Long, BarterFilterRegionDto> regions = new LinkedHashMap<>();

		for(LifeBarterRepository.BarterFilterRow row : rows){
			if(row.getRegionId() == null){
				continue;
			}

			BarterFilterRegionDto region = regions.computeIfAbsent(
				row.getRegionId(),
				regionId -> new BarterFilterRegionDto(
					regionId,
					(row.getRegionName() == null || row.getRegionName().isBlank())
						? "Uncategorized Region"
						: row.getRegionName(),
					new ArrayList<>()
				)
			);

			if(row.getNpcId() == null){
				continue;
			}

			boolean exists = region.getNpcs().stream().anyMatch((npc) -> npc.getNpcId().equals(row.getNpcId()));
			if(!exists){
				region.getNpcs().add(
					new BarterFilterNpcDto(
						row.getNpcId(),
						(row.getNpcName() == null || row.getNpcName().isBlank())
							? "Uncategorized NPC"
							: row.getNpcName()
					)
				);
			}
		}

		return new BarterFilterOptionsDto(new ArrayList<>(regions.values()));
	}
}
