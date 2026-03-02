import React from "react";
import {RefreshCw, Search} from "lucide-react";
import {getItemRarityInfo} from "@/utils";
import type {BarterFilterRegionOption, CraftFilterTypeOption, GameItemFilterSubMenuOption} from "@/types";
import type {TabType} from "../game-items-domain";
import styles from "@/pages/game/game-items.module.scss";

export type SearchSuggestion = {
	key:string;
	keyword:string;
	title:string;
	subtitle?:string;
	meta?:string;
};

export type SortOption = {
	value:string;
	label:string;
};

type GameItemsControlsProps = {
	activeTab:TabType;
	loading:boolean;
	tabTitle:string;
	searchInput:string;
	showSearchSuggestions:boolean;
	searchSuggestions:SearchSuggestion[];
	searchSuggestionsLoading:boolean;
	onSearchInputChange:(value:string) => void;
	onSearchInputFocus:() => void;
	onSearchInputKeyPress:(event:React.KeyboardEvent<HTMLInputElement>) => void;
	onApplySearchSuggestion:(keyword:string) => void;
	onSearch:() => void;
	onReset:() => void;
	searchBoxRef:React.RefObject<HTMLDivElement | null>;
	sortBy:string;
	sortDir:"asc" | "desc";
	sortOptions:SortOption[];
	onSortChange:(newSortBy:string, newSortDir:"asc" | "desc") => void;
	useHierarchicalItemFilters:boolean;
	availableItemMainMenus:string[];
	selectedItemMainMenu:string;
	onItemMainMenuChange:(value:string) => void;
	availableItemSubMenus:GameItemFilterSubMenuOption[];
	selectedItemSubMenu:string;
	onItemSubMenuChange:(value:string) => void;
	availableItemTypes:string[];
	selectedItemType:string;
	onItemTypeChange:(value:string) => void;
	isItemSubMenuDisabled:boolean;
	isItemTypeDisabled:boolean;
	availableRarities:string[];
	selectedRarities:string[];
	onToggleRarity:(rarity:string) => void;
	barterRegionOptions:BarterFilterRegionOption[];
	selectedBarterRegionId:string;
	onBarterRegionChange:(value:string) => void;
	availableBarterNpcs:Array<{npcId:number; npcName:string}>;
	selectedBarterNpcId:string;
	onBarterNpcChange:(value:string) => void;
	craftTypeOptions:CraftFilterTypeOption[];
	selectedCraftType:string;
	onCraftTypeChange:(value:string) => void;
	availableCraftNames:string[];
	selectedCraftName:string;
	onCraftNameChange:(value:string) => void;
};

const GameItemsControls:React.FC<GameItemsControlsProps> = ({
	activeTab,
	loading,
	tabTitle,
	searchInput,
	showSearchSuggestions,
	searchSuggestions,
	searchSuggestionsLoading,
	onSearchInputChange,
	onSearchInputFocus,
	onSearchInputKeyPress,
	onApplySearchSuggestion,
	onSearch,
	onReset,
	searchBoxRef,
	sortBy,
	sortDir,
	sortOptions,
	onSortChange,
	useHierarchicalItemFilters,
	availableItemMainMenus,
	selectedItemMainMenu,
	onItemMainMenuChange,
	availableItemSubMenus,
	selectedItemSubMenu,
	onItemSubMenuChange,
	availableItemTypes,
	selectedItemType,
	onItemTypeChange,
	isItemSubMenuDisabled,
	isItemTypeDisabled,
	availableRarities,
	selectedRarities,
	onToggleRarity,
	barterRegionOptions,
	selectedBarterRegionId,
	onBarterRegionChange,
	availableBarterNpcs,
	selectedBarterNpcId,
	onBarterNpcChange,
	craftTypeOptions,
	selectedCraftType,
	onCraftTypeChange,
	availableCraftNames,
	selectedCraftName,
	onCraftNameChange
}) => (
	<div className={styles.controlsSection}>
		<div className={styles.controlsTopRow}>
			<div className={styles.searchContainer}>
				<div className={styles.searchBox} ref={searchBoxRef}>
					<Search size={20} className={styles.searchIcon}/>
					<input
						type="text"
						placeholder={`${tabTitle} 이름으로 검색..`}
						value={searchInput}
						onChange={(e) => onSearchInputChange(e.target.value)}
						onKeyPress={onSearchInputKeyPress}
						onFocus={onSearchInputFocus}
						className={styles.searchInput}
					/>
					{showSearchSuggestions && searchInput.trim() && (
						<div className={styles.searchSuggestionDropdown}>
							{searchSuggestions.length > 0 ? (
								searchSuggestions.map((suggestion) => (
									<button
										key={suggestion.key}
										type="button"
										className={styles.searchSuggestionItem}
										onClick={() => onApplySearchSuggestion(suggestion.keyword)}
									>
										<span className={styles.searchSuggestionTitle}>{suggestion.title}</span>
										{suggestion.subtitle && <span className={styles.searchSuggestionSubtitle}>{suggestion.subtitle}</span>}
										{suggestion.meta && <span className={styles.searchSuggestionMeta}>{suggestion.meta}</span>}
									</button>
								))
							) : (
								<div className={styles.searchSuggestionEmpty}>
									{searchSuggestionsLoading ? "검색 중..." : "추천 검색 결과가 없습니다."}
								</div>
							)}
						</div>
					)}
				</div>
				<button onClick={onSearch} className={styles.searchBtn} disabled={loading}>
					{loading ? <RefreshCw className={styles.spinning} size={16}/> : "검색"}
				</button>
				<button onClick={onReset} className={styles.resetBtn} disabled={loading}>
					{"초기화"}
				</button>
			</div>

			<div className={styles.sortContainer}>
				<label>{"정렬"}</label>
				<select
					value={`${sortBy}-${sortDir}`}
					onChange={(e) => {
						const [newSortBy, newSortDir] = e.target.value.split("-");
						onSortChange(newSortBy, newSortDir as "asc" | "desc");
					}}
					className={styles.sortSelect}
				>
					{sortOptions.map((option) => (
						<option key={option.value} value={option.value}>{option.label}</option>
					))}
				</select>
			</div>
		</div>
		<div className={styles.filtersSection}>
			{activeTab === "items" && (
				<div className={`${styles.filterGrid} ${styles.itemFilterGrid}`}>
					<div className={styles.filterField}>
						<label htmlFor="item-main-menu-filter">{"상위 메뉴"}</label>
						<select
							id="item-main-menu-filter"
							value={selectedItemMainMenu}
							onChange={(e) => onItemMainMenuChange(e.target.value)}
							className={styles.filterSelect}
							disabled={!useHierarchicalItemFilters}
						>
							<option value="">{"전체"}</option>
							{availableItemMainMenus.map((itemMainMenu) => (
								<option key={itemMainMenu} value={itemMainMenu}>{itemMainMenu}</option>
							))}
						</select>
					</div>

					<div className={styles.filterField}>
						<label htmlFor="item-sub-menu-filter">{"하위 메뉴"}</label>
						<select
							id="item-sub-menu-filter"
							value={selectedItemSubMenu}
							onChange={(e) => onItemSubMenuChange(e.target.value)}
							className={styles.filterSelect}
							disabled={isItemSubMenuDisabled}
						>
							<option value="">{"전체"}</option>
							{availableItemSubMenus.map((subMenu) => (
								<option key={subMenu.itemSubMenu} value={subMenu.itemSubMenu}>{subMenu.itemSubMenu}</option>
							))}
						</select>
					</div>

					<div className={styles.filterField}>
						<label htmlFor="item-type-filter">{"유형"}</label>
						<select
							id="item-type-filter"
							value={selectedItemType}
							onChange={(e) => onItemTypeChange(e.target.value)}
							className={styles.filterSelect}
							disabled={isItemTypeDisabled}
						>
							<option value="">{"전체"}</option>
							{availableItemTypes.map((itemType) => (
								<option key={itemType} value={itemType}>{itemType}</option>
							))}
						</select>
					</div>

					<div className={`${styles.filterField} ${styles.itemRarityFilter} ${styles.filterFieldFullWidth}`}>
						<span className={styles.rarityLabel}>{"아이템 등급"}</span>
						<div className={styles.rarityOptions}>
							{availableRarities.map((rarity) => {
								const rarityInfo = getItemRarityInfo(rarity);
								const checked = selectedRarities.includes(rarity);
								return (
									<label key={rarity} className={`${styles.rarityOption} ${checked ? styles.selected : ""}`}>
										<input
											type="checkbox"
											checked={checked}
											onChange={() => onToggleRarity(rarity)}
										/>
										<span
											className={styles.rarityBadge}
											style={{
												color : rarityInfo.color,
												borderColor : rarityInfo.color,
												backgroundColor : rarityInfo.bg
											}}
										>
											{rarityInfo.label}
										</span>
									</label>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{activeTab === "barter" && (
				<div className={styles.filterGrid}>
					<div className={styles.filterField}>
						<label htmlFor="barter-region-filter">{"지역(대분류)"}</label>
						<select
							id="barter-region-filter"
							value={selectedBarterRegionId}
							onChange={(e) => onBarterRegionChange(e.target.value)}
							className={styles.filterSelect}
						>
							<option value="">{"전체 지역"}</option>
							{barterRegionOptions.map((region) => (
								<option key={region.regionId} value={region.regionId}>{region.regionName}</option>
							))}
						</select>
					</div>

					<div className={styles.filterField}>
						<label htmlFor="barter-npc-filter">{"NPC (분류)"}</label>
						<select
							id="barter-npc-filter"
							value={selectedBarterNpcId}
							onChange={(e) => onBarterNpcChange(e.target.value)}
							className={styles.filterSelect}
							disabled={!selectedBarterRegionId}
						>
							<option value="">{"전체 NPC"}</option>
							{availableBarterNpcs.map((npc) => (
								<option key={npc.npcId} value={npc.npcId}>{npc.npcName}</option>
							))}
						</select>
					</div>
				</div>
			)}

			{activeTab === "craft" && (
				<div className={styles.filterGrid}>
					<div className={styles.filterField}>
						<label htmlFor="craft-type-filter">{"가공/제작 (대분류)"}</label>
						<select
							id="craft-type-filter"
							value={selectedCraftType}
							onChange={(e) => onCraftTypeChange(e.target.value)}
							className={styles.filterSelect}
						>
							<option value="">{"전체"}</option>
							{craftTypeOptions.map((option) => (
								<option key={option.craftType} value={option.craftType}>{option.craftType}</option>
							))}
						</select>
					</div>

					<div className={styles.filterField}>
						<label htmlFor="craft-name-filter">{"세부분류"}</label>
						<select
							id="craft-name-filter"
							value={selectedCraftName}
							onChange={(e) => onCraftNameChange(e.target.value)}
							className={styles.filterSelect}
							disabled={!selectedCraftType}
						>
							<option value="">{"전체"}</option>
							{availableCraftNames.map((craftName) => (
								<option key={craftName} value={craftName}>{craftName}</option>
							))}
						</select>
					</div>
				</div>
			)}
		</div>
	</div>
);

export default GameItemsControls;
