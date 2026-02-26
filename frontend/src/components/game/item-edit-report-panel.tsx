import React, {useEffect, useMemo, useRef, useState} from "react";
import {AlertCircle, Check, ClipboardCheck, Pencil, Send, ShieldCheck, X} from "lucide-react";
import {useAuth} from "@/hooks";
import itemEditReportService from "@/services/item-edit-report-service";
import {normalizeMultilineText} from "@/utils";
import type {
	GameItemData,
	GameItemSummary,
	LifeBarter,
	LifeCraft,
	ItemEditSuggestion,
	ItemEditSuggestionTargetType
} from "@/types";
import styles from "./item-edit-report-panel.module.scss";

type FieldOption = {
	value:string;
	label:string;
};

type ChangeEntry = {
	id:number;
	fieldKey:string;
	currentValue:string;
	suggestedValue:string;
};

type ChangeEditMode = "PARTIAL" | "BULK";

type Props = {
	itemName:string;
	itemData:GameItemData;
	itemSummary:GameItemSummary | null;
};

const ITEM_FIELD_OPTIONS:FieldOption[] = [
	{value : "itemMainMenu", label : "상위 메뉴"},
	{value : "itemSubMenu", label : "하위 메뉴"},
	{value : "itemType", label : "유형"},
	{value : "itemRarity", label : "등급"},
	{value : "itemName", label : "아이템 이름"},
	{value : "itemEffect", label : "아이템 효과"},
	{value : "itemTranscendence", label : "초월"},
	{value : "itemSource", label : "획득처"}
];

const BARTER_FIELD_OPTIONS:FieldOption[] = [
	{value : "regionId", label : "지역 ID"},
	{value : "npcId", label : "NPC ID"},
	{value : "itemId", label : "아이템 ID"},
	{value : "itemWeight", label : "1회 획득 수량"},
	{value : "exchangeId", label : "교환 아이템 ID"},
	{value : "exchangeCost", label : "교환 비용"},
	{value : "barterQty", label : "교환 가능 횟수"},
	{value : "barterInitCycle", label : "초기 사이클"},
	{value : "barterInitDate", label : "초기 날짜"},
	{value : "barterInitDay", label : "초기 요일"},
	{value : "barterServer", label : "서버 공유"},
	{value : "barterNpc", label : "NPC 공유"}
];

const CRAFT_FIELD_OPTIONS:FieldOption[] = [
	{value : "itemId", label : "아이템 ID"},
	{value : "craftType", label : "제작 유형"},
	{value : "craftName", label : "제작명"},
	{value : "itemName", label : "아이템 이름"},
	{value : "craftIngredientId", label : "재료 ID"},
	{value : "ingredientName", label : "재료 이름"},
	{value : "craftIngredientCost", label : "재료 수량"},
	{value : "craftableLevel", label : "제작 가능 레벨"},
	{value : "processingTime", label : "가공 시간"},
	{value : "craftSubId", label : "제작 서브 ID"}
];

const getFieldOptions = (targetType:ItemEditSuggestionTargetType):FieldOption[] => {
	switch(targetType){
		case "ITEM":
			return ITEM_FIELD_OPTIONS;
		case "BARTER":
			return BARTER_FIELD_OPTIONS;
		case "CRAFT":
			return CRAFT_FIELD_OPTIONS;
		default:
			return ITEM_FIELD_OPTIONS;
	}
};

const stringifyValue = (value:unknown):string => {
	if(value === null || value === undefined){
		return "";
	}
	return String(value);
};

const createChangeEntry = (id:number, fieldKey:string, currentValue = ""):ChangeEntry => ({
	id,
	fieldKey,
	currentValue,
	suggestedValue : ""
});

const displayMultilineValue = (value:string | null | undefined):string => {
	const normalized = normalizeMultilineText(value);
	return normalized || "-";
};

const normalizeComparableText = (value:string | null | undefined):string => {
	return normalizeMultilineText(value).trim();
};

const getErrorMessage = (error:unknown):string => {
	if(typeof error === "object" && error !== null){
		const maybeResponse = error as {response?:{data?:{message?:string}}; message?:string};
		if(maybeResponse.response?.data?.message){
			return maybeResponse.response.data.message;
		}
		if(maybeResponse.message){
			return maybeResponse.message;
		}
	}
	return "요청 처리 중 오류가 발생했습니다.";
};

const formatDateTime = (value:string | null | undefined):string => {
	if(!value){
		return "-";
	}
	const date = new Date(value);
	if(Number.isNaN(date.getTime())){
		return value;
	}
	return date.toLocaleString();
};

const getBarterFieldValue = (barter:LifeBarter, fieldKey:string):string => {
	switch(fieldKey){
		case "regionId":
			return stringifyValue(barter.regionId);
		case "npcId":
			return stringifyValue(barter.npcId);
		case "itemId":
			return stringifyValue(barter.itemId);
		case "itemWeight":
			return stringifyValue(barter.itemWeight);
		case "exchangeId":
			return stringifyValue(barter.exchangeId);
		case "exchangeCost":
			return stringifyValue(barter.exchangeCost);
		case "barterQty":
			return stringifyValue(barter.barterQty);
		case "barterInitCycle":
			return stringifyValue(barter.barterInitCycle);
		case "barterInitDate":
			return stringifyValue(barter.barterInitDate);
		case "barterInitDay":
			return stringifyValue(barter.barterInitDay);
		case "barterServer":
			return stringifyValue(barter.barterServer);
		case "barterNpc":
			return stringifyValue(barter.barterNpc);
		default:
			return "";
	}
};

const getCraftFieldValue = (craft:LifeCraft, fieldKey:string):string => {
	switch(fieldKey){
		case "itemId":
			return stringifyValue(craft.itemId);
		case "craftType":
			return stringifyValue(craft.craftType);
		case "craftName":
			return stringifyValue(craft.craftName);
		case "itemName":
			return stringifyValue(craft.itemName);
		case "craftIngredientId":
			return stringifyValue(craft.craftIngredientId);
		case "ingredientName":
			return stringifyValue(craft.ingredientName);
		case "craftIngredientCost":
			return stringifyValue(craft.craftIngredientCost);
		case "craftableLevel":
			return stringifyValue(craft.craftableLevel);
		case "processingTime":
			return stringifyValue(craft.processingTime);
		case "craftSubId":
			return stringifyValue(craft.craftSubId);
		default:
			return "";
	}
};

const ItemEditReportPanel:React.FC<Props> = ({itemName, itemData, itemSummary}) => {
	const {user} = useAuth();
	const [targetType, setTargetType] = useState<ItemEditSuggestionTargetType>("ITEM");
	const [targetRecordId, setTargetRecordId] = useState<number | "">("");
	const [changeEditMode, setChangeEditMode] = useState<ChangeEditMode>("PARTIAL");
	const [changeEntries, setChangeEntries] = useState<ChangeEntry[]>([
		createChangeEntry(1, "itemEffect", "")
	]);
	const [reason, setReason] = useState<string>("");
	const [submitLoading, setSubmitLoading] = useState(false);
	const [submitMessage, setSubmitMessage] = useState<string | null>(null);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [pendingReports, setPendingReports] = useState<ItemEditSuggestion[]>([]);
	const [adminLoading, setAdminLoading] = useState(false);
	const [adminActionId, setAdminActionId] = useState<number | null>(null);
	const [adminError, setAdminError] = useState<string | null>(null);
	const [adminSuggestedEdits, setAdminSuggestedEdits] = useState<Record<number, string>>({});
	const nextChangeEntryIdRef = useRef(2);

	const allBarters = useMemo(() => {
		const map = new Map<number, LifeBarter>();
		for(const barter of itemData.bartersByItemId || []){
			map.set(barter.barterId, barter);
		}
		for(const barter of itemData.bartersByExchangeId || []){
			map.set(barter.barterId, barter);
		}
		return Array.from(map.values()).sort((a, b) => a.barterId - b.barterId);
	}, [itemData.bartersByExchangeId, itemData.bartersByItemId]);

	const allCrafts = useMemo(() => {
		return Object.values(itemData.craftsBySubId || {})
			.flat()
			.sort((a, b) => a.craftId - b.craftId);
	}, [itemData.craftsBySubId]);

	const isItemSubMenuSameAsType = useMemo(() => {
		const subMenu = normalizeComparableText(itemSummary?.itemSubMenu ?? itemData.itemSubMenu ?? "");
		const itemType = normalizeComparableText(itemSummary?.itemType ?? itemData.itemType ?? "");
		return Boolean(subMenu) && subMenu === itemType;
	}, [itemData.itemSubMenu, itemData.itemType, itemSummary?.itemSubMenu, itemSummary?.itemType]);

	const fieldOptions = useMemo(() => {
		const options = getFieldOptions(targetType);
		if(targetType === "ITEM" && isItemSubMenuSameAsType){
			return options.filter((option) => option.value !== "itemSubMenu");
		}
		return options;
	}, [isItemSubMenuSameAsType, targetType]);

	const fieldLabelMap = useMemo(() => {
		const labels = [...ITEM_FIELD_OPTIONS, ...BARTER_FIELD_OPTIONS, ...CRAFT_FIELD_OPTIONS]
			.reduce<Record<string, string>>((acc, option) => {
				acc[option.value] = option.label;
				return acc;
			}, {});
		if(isItemSubMenuSameAsType){
			labels.itemSubMenu = "유형";
		}
		return labels;
	}, [isItemSubMenuSameAsType]);

	const itemFieldValues = useMemo(() => {
		return {
			itemMainMenu : itemSummary?.itemMainMenu ?? itemData.itemMainMenu ?? "",
			itemSubMenu : itemSummary?.itemSubMenu ?? itemData.itemSubMenu ?? "",
			itemType : itemSummary?.itemType ?? itemData.itemType ?? "",
			itemRarity : itemSummary?.itemRarity ?? itemData.itemRarity ?? "",
			itemName : itemData.itemName ?? itemName,
			itemEffect : itemSummary?.itemEffect ?? itemData.itemEffect ?? "",
			itemTranscendence : itemSummary?.itemTranscendence ?? itemData.itemTranscendence ?? "",
			itemSource : itemSummary?.itemSource ?? itemData.itemSource ?? ""
		};
	}, [
		itemData.itemEffect,
		itemData.itemMainMenu,
		itemData.itemName,
		itemData.itemRarity,
		itemData.itemSource,
		itemData.itemSubMenu,
		itemData.itemTranscendence,
		itemData.itemType,
		itemName,
		itemSummary
	]);

	const targetOptions = useMemo(() => {
		if(targetType === "BARTER"){
			return allBarters.map((barter) => ({
				value : barter.barterId,
				label : `#${barter.barterId} ${barter.exchangeItem?.itemName ?? "N/A"} x${barter.exchangeCost} -> ${barter.gameItem?.itemName ?? "N/A"} x${barter.itemWeight} (최대 ${barter.barterQty}회)`
				}));
		}
		if(targetType === "CRAFT"){
			return allCrafts.map((craft) => ({
				value : craft.craftId,
				label : `#${craft.craftId} ${craft.craftName} | ${craft.ingredientName} x${craft.craftIngredientCost}`
			}));
		}
		return [];
	}, [allBarters, allCrafts, targetType]);

	const selectedBarter = useMemo(
		() => (typeof targetRecordId === "number" ? allBarters.find((barter) => barter.barterId === targetRecordId) ?? null : null),
		[allBarters, targetRecordId]
	);
	const selectedCraft = useMemo(
		() => (typeof targetRecordId === "number" ? allCrafts.find((craft) => craft.craftId === targetRecordId) ?? null : null),
		[allCrafts, targetRecordId]
	);
	const activeChangeEntryCount = useMemo(
		() => changeEntries.filter((entry) => entry.suggestedValue.trim().length > 0).length,
		[changeEntries]
	);

	const resolveCurrentFieldValue = (nextFieldKey:string):string => {
		if(targetType === "ITEM"){
			return normalizeMultilineText(stringifyValue(itemFieldValues[nextFieldKey as keyof typeof itemFieldValues]));
		}
		if(targetType === "BARTER"){
			return normalizeMultilineText(selectedBarter ? getBarterFieldValue(selectedBarter, nextFieldKey) : "");
		}
		return normalizeMultilineText(selectedCraft ? getCraftFieldValue(selectedCraft, nextFieldKey) : "");
	};

	const buildEntriesForFieldOptions = (options:FieldOption[], prevEntries:ChangeEntry[]):ChangeEntry[] => {
		const prevByField = new Map(prevEntries.map((entry) => [entry.fieldKey, entry]));
		return options.map((option) => {
			const prev = prevByField.get(option.value);
			const entryId = prev?.id ?? nextChangeEntryIdRef.current++;
			return {
				id : entryId,
				fieldKey : option.value,
				currentValue : resolveCurrentFieldValue(option.value),
				suggestedValue : prev?.suggestedValue ?? ""
			};
		});
	};

	const handleChangeEditMode = (nextMode:ChangeEditMode) => {
		setChangeEditMode(nextMode);
		setChangeEntries((prev) => {
			if(nextMode === "BULK"){
				return buildEntriesForFieldOptions(fieldOptions, prev);
			}

			if(prev.length > 0){
				return prev;
			}

			const defaultFieldKey = fieldOptions[0]?.value ?? "";
			return [createChangeEntry(nextChangeEntryIdRef.current++, defaultFieldKey, resolveCurrentFieldValue(defaultFieldKey))];
		});
	};

	const loadPendingReports = async() => {
		if(!user?.isAdmin || !itemName){
			setPendingReports([]);
			setAdminSuggestedEdits({});
			return;
		}
		setAdminLoading(true);
		setAdminError(null);
		try{
			const reports = await itemEditReportService.getItemReports(itemName, "PENDING");
			setPendingReports(reports);
			setAdminSuggestedEdits((prev) => {
				const next:Record<number, string> = {};
				for(const report of reports){
					next[report.suggestionId] = prev[report.suggestionId] ?? normalizeMultilineText(report.suggestedValue || "");
				}
				return next;
			});
		}catch(error){
			setAdminError(getErrorMessage(error));
		}finally{
			setAdminLoading(false);
		}
	};

	useEffect(() => {
		loadPendingReports();
		// `user?.isAdmin` and itemName are the only meaningful triggers.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.isAdmin, itemName]);

	useEffect(() => {
		if(targetType === "ITEM"){
			setTargetRecordId("");
			return;
		}

		if(targetType === "BARTER"){
			if(typeof targetRecordId !== "number" || !allBarters.some((barter) => barter.barterId === targetRecordId)){
				setTargetRecordId(allBarters[0]?.barterId ?? "");
			}
			return;
		}

		if(typeof targetRecordId !== "number" || !allCrafts.some((craft) => craft.craftId === targetRecordId)){
			setTargetRecordId(allCrafts[0]?.craftId ?? "");
		}
	}, [allBarters, allCrafts, targetRecordId, targetType]);

	useEffect(() => {
		const defaultFieldKey = fieldOptions[0]?.value ?? "";
		setChangeEntries((prev) => {
			if(changeEditMode === "BULK"){
				const nextEntries = buildEntriesForFieldOptions(fieldOptions, prev);
				const same =
					prev.length === nextEntries.length &&
					prev.every((entry, index) => {
						const next = nextEntries[index];
						return (
							next &&
							entry.id === next.id &&
							entry.fieldKey === next.fieldKey &&
							entry.currentValue === next.currentValue &&
							entry.suggestedValue === next.suggestedValue
						);
					});
				return same ? prev : nextEntries;
			}

			let changed = false;
			const nextEntries = prev.map((entry) => {
				const nextFieldKey = fieldOptions.some((option) => option.value === entry.fieldKey)
					? entry.fieldKey
					: defaultFieldKey;
				const nextCurrentValue = resolveCurrentFieldValue(nextFieldKey);
				if(entry.fieldKey !== nextFieldKey || entry.currentValue !== nextCurrentValue){
					changed = true;
					return {
						...entry,
						fieldKey : nextFieldKey,
						currentValue : nextCurrentValue
					};
				}
				return entry;
			});
			return changed ? nextEntries : prev;
		});
	}, [changeEditMode, fieldOptions, itemFieldValues, selectedBarter, selectedCraft, targetType]);

	const updateChangeEntry = (entryId:number, updater:(entry:ChangeEntry) => ChangeEntry) => {
		setChangeEntries((prev) => prev.map((entry) => (entry.id === entryId ? updater(entry) : entry)));
	};

	const handleChangeEntryFieldKey = (entryId:number, nextFieldKey:string) => {
		updateChangeEntry(entryId, (entry) => ({
			...entry,
			fieldKey : nextFieldKey,
			currentValue : resolveCurrentFieldValue(nextFieldKey)
		}));
	};

	const handleChangeEntryCurrentValue = (entryId:number, nextValue:string) => {
		updateChangeEntry(entryId, (entry) => ({
			...entry,
			currentValue : normalizeMultilineText(nextValue)
		}));
	};

	const handleChangeEntrySuggestedValue = (entryId:number, nextValue:string) => {
		updateChangeEntry(entryId, (entry) => ({
			...entry,
			suggestedValue : normalizeMultilineText(nextValue)
		}));
	};

	const handleAddChangeEntry = () => {
		if(changeEditMode === "BULK"){
			return;
		}
		const defaultFieldKey = fieldOptions[0]?.value ?? "";
		const nextId = nextChangeEntryIdRef.current++;
		setChangeEntries((prev) => [
			...prev,
			createChangeEntry(nextId, defaultFieldKey, resolveCurrentFieldValue(defaultFieldKey))
		]);
	};

	const handleRemoveChangeEntry = (entryId:number) => {
		if(changeEditMode === "BULK"){
			return;
		}
		setChangeEntries((prev) => {
			if(prev.length <= 1){
				return prev;
			}
			return prev.filter((entry) => entry.id !== entryId);
		});
	};

		const handleSubmit = async() => {
		if(!user){
			setSubmitError("로그인 후 제보할 수 있습니다.");
			setSubmitMessage(null);
			return;
		}

		const entriesToSubmit = changeEntries
			.map((entry) => ({
				...entry,
				suggestedValue : entry.suggestedValue.trim()
			}))
			.filter((entry) => Boolean(entry.fieldKey) && entry.suggestedValue.length > 0);

		if(entriesToSubmit.length === 0){
			setSubmitError("제안값을 1개 이상 입력해주세요.");
			setSubmitMessage(null);
			return;
		}
		if(targetType !== "ITEM" && typeof targetRecordId !== "number"){
			setSubmitError("대상 행을 선택해주세요.");
			setSubmitMessage(null);
			return;
		}

		setSubmitLoading(true);
		setSubmitError(null);
		setSubmitMessage(null);
		try{
			const createdReports:ItemEditSuggestion[] = [];
			for(const entry of entriesToSubmit){
				const createdReport = await itemEditReportService.createReport({
					itemName,
					targetType,
					targetRecordId : typeof targetRecordId === "number" ? targetRecordId : undefined,
					fieldKey : entry.fieldKey,
					currentValue : entry.currentValue,
					suggestedValue : entry.suggestedValue,
					reason : reason.trim() || undefined
				});
				createdReports.push(createdReport);
			}

			setChangeEntries((prev) => prev.map((entry) => ({
				...entry,
				suggestedValue : ""
			})));
			setReason("");

			if(createdReports.length === 1){
				const createdReport = createdReports[0];
				if(createdReport.status === "APPROVED"){
					if(createdReport.sheetSyncStatus === "SYNCED"){
						setSubmitMessage("관리자 제보로 즉시 반영되었습니다.");
					}else{
						setSubmitMessage("관리자 제보로 즉시 승인되었습니다. 시트 반영 상태를 확인해주세요.");
					}
				}else{
					setSubmitMessage("제보가 등록되었습니다. 관리자 확인 후 반영됩니다.");
				}
			}else{
				const approvedCount = createdReports.filter((report) => report.status === "APPROVED").length;
				const syncedCount = createdReports.filter((report) => report.sheetSyncStatus === "SYNCED").length;
				if(approvedCount === createdReports.length){
					if(syncedCount === createdReports.length){
						setSubmitMessage(`${createdReports.length}건 제보가 즉시 반영되었습니다.`);
					}else{
						setSubmitMessage(`${createdReports.length}건 제보가 즉시 승인되었습니다. 시트 반영 상태를 확인해주세요.`);
					}
				}else{
					setSubmitMessage(`${createdReports.length}건 제보가 등록되었습니다. 관리자 확인 후 반영됩니다.`);
				}
			}

			if(user.isAdmin){
				await loadPendingReports();
			}
		}catch(error){
			setSubmitError(getErrorMessage(error));
		}finally{
			setSubmitLoading(false);
		}
	};
	const getAdminSuggestedEditValue = (report:ItemEditSuggestion):string => {
		return adminSuggestedEdits[report.suggestionId] ?? normalizeMultilineText(report.suggestedValue || "");
	};

	const handleAdminSuggestedEditChange = (suggestionId:number, nextValue:string) => {
		setAdminSuggestedEdits((prev) => ({
			...prev,
			[suggestionId] : normalizeMultilineText(nextValue)
		}));
	};

const handleReview = async(report:ItemEditSuggestion, action:"approve" | "reject") => {
		setAdminActionId(report.suggestionId);
		setAdminError(null);
		try{
			if(action === "approve"){
				const editedSuggestedValue = getAdminSuggestedEditValue(report).trim();
				if(!editedSuggestedValue){
					setAdminError("제안값이 비어 있으면 반영할 수 없습니다.");
					return;
				}
				await itemEditReportService.approveReport(report.suggestionId, {
					suggestedValue : editedSuggestedValue
				});
			}else{
				await itemEditReportService.rejectReport(report.suggestionId);
			}
			await loadPendingReports();
		}catch(error){
			setAdminError(getErrorMessage(error));
		}finally{
			setAdminActionId(null);
		}
	};

	const setQuickPreset = (nextType:ItemEditSuggestionTargetType, nextFieldKey:string) => {
		setTargetType(nextType);
		setChangeEntries((prev) => {
			if(prev.length === 0){
				return [createChangeEntry(1, nextFieldKey, "")];
			}
			return prev.map((entry, index) => (index === 0 ? {...entry, fieldKey : nextFieldKey} : entry));
		});
		if(nextType === "BARTER" && allBarters.length > 0){
			setTargetRecordId(allBarters[0].barterId);
		}
		if(nextType === "CRAFT" && allCrafts.length > 0){
			setTargetRecordId(allCrafts[0].craftId);
		}
		if(nextType === "ITEM"){
			setTargetRecordId("");
		}
	};

	return (
		<section className={styles.panel}>
			<div className={styles.header}>
				<div className={styles.titleWrap}>
					<div className={styles.iconBadge}>
						<Pencil size={16}/>
					</div>
					<div>
						<h3>아이템 수정사항 제보</h3>
						<p>아이템 정보 / 물물교환 / 제작 데이터를 제보하면 관리자가 승인 후 시트에 반영합니다.</p>
					</div>
				</div>
				{user ? (
					<div className={styles.userTag}>
						<ClipboardCheck size={14}/>
						<span>{user.nickname || user.username}</span>
					</div>
				) : (
					<div className={styles.userTag}>
						<AlertCircle size={14}/>
						<span>로그인 필요</span>
					</div>
				)}
			</div>

			<div className={styles.quickPresets}>
				<button type="button" onClick={() => setQuickPreset("ITEM", "itemEffect")}>아이템 효과 제보</button>
				<button type="button" onClick={() => setQuickPreset("ITEM", "itemTranscendence")}>초월 수치 제보</button>
				<button type="button" onClick={() => setQuickPreset("BARTER", "exchangeCost")} disabled={allBarters.length === 0}>물교 비용 제보</button>
				<button type="button" onClick={() => setQuickPreset("CRAFT", "craftIngredientCost")} disabled={allCrafts.length === 0}>제작 재료 제보</button>
			</div>

			<div className={styles.formGrid}>
				<label className={styles.field}>
					<span>대상 분류</span>
					<select value={targetType} onChange={(e) => setTargetType(e.target.value as ItemEditSuggestionTargetType)}>
						<option value="ITEM">아이템 정보</option>
						<option value="BARTER">물물교환</option>
						<option value="CRAFT">제작</option>
					</select>
				</label>

				{targetType !== "ITEM" && (
					<label className={`${styles.field} ${styles.wide}`}>
						<span>대상 행</span>
						<select
							value={typeof targetRecordId === "number" ? String(targetRecordId) : ""}
							onChange={(e) => setTargetRecordId(e.target.value ? Number(e.target.value) : "")}
						>
							<option value="">선택하세요</option>
							{targetOptions.map((option) => (
								<option key={`${targetType}-${option.value}`} value={option.value}>{option.label}</option>
							))}
						</select>
					</label>
				)}

				<div className={`${styles.wide} ${styles.changeList}`}>
					<div className={styles.changeModeToggle} role="tablist" aria-label="change edit mode">
						<button
							type="button"
							role="tab"
							aria-selected={changeEditMode === "PARTIAL"}
							className={changeEditMode === "PARTIAL" ? styles.changeModeActive : ""}
							onClick={() => handleChangeEditMode("PARTIAL")}
						>
							일부 수정
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={changeEditMode === "BULK"}
							className={changeEditMode === "BULK" ? styles.changeModeActive : ""}
							onClick={() => handleChangeEditMode("BULK")}
						>
							일괄 수정
						</button>
					</div>

					<div className={styles.changeListHeader}>
						<div>
							<strong>변경 항목</strong>
							<p>{changeEditMode === "BULK" ? "전체 필드를 한 번에 확인하며 제보할 수 있습니다." : "필드별로 추가해서 한 번에 여러 건 제보할 수 있습니다."}</p>
						</div>
						{changeEditMode === "PARTIAL" && (
							<button type="button" className={styles.addChangeBtn} onClick={handleAddChangeEntry}>
								항목 추가
							</button>
						)}
					</div>

					<div className={styles.changeEntryList}>
						{changeEntries.map((entry, index) => (
							<div key={entry.id} className={styles.changeEntryCard}>
								<div className={styles.changeEntryHeader}>
									<div className={styles.changeEntryTitle}>
										<span className={styles.changeEntryIndex}>#{index + 1}</span>
										<span>{fieldLabelMap[entry.fieldKey] ?? entry.fieldKey}</span>
									</div>
									<button
										type="button"
										className={styles.removeChangeBtn}
										onClick={() => handleRemoveChangeEntry(entry.id)}
										disabled={changeEditMode === "BULK" || changeEntries.length <= 1}
									>
										삭제
									</button>
								</div>

								<div className={styles.changeEntryGrid}>
									<label className={styles.field}>
										<span>수정 필드</span>
										<select
											value={entry.fieldKey}
											onChange={(e) => handleChangeEntryFieldKey(entry.id, e.target.value)}
											disabled={changeEditMode === "BULK"}
										>
											{fieldOptions.map((option) => (
												<option key={`${entry.id}-${targetType}-${option.value}`} value={option.value}>{option.label}</option>
											))}
										</select>
									</label>

									<label className={`${styles.field} ${styles.wide}`}>
										<span>현재값 (참고)</span>
										<textarea
											value={entry.currentValue}
											onChange={(e) => handleChangeEntryCurrentValue(entry.id, e.target.value)}
											placeholder="현재값이 자동으로 채워집니다"
											rows={2}
										/>
									</label>

									<label className={`${styles.field} ${styles.wide}`}>
										<span>제안값</span>
										<textarea
											value={entry.suggestedValue}
											onChange={(e) => handleChangeEntrySuggestedValue(entry.id, e.target.value)}
											placeholder="수정될 값을 입력하세요 (\\n 입력 시 줄바꿈 변환)"
											rows={3}
										/>
									</label>
								</div>

								<div className={styles.changeEntryPreview}>
									<div>
										<span className={styles.label}>현재값 미리보기</span>
										<pre>{displayMultilineValue(entry.currentValue)}</pre>
									</div>
									<div>
										<span className={styles.label}>제안값 미리보기</span>
										<pre>{displayMultilineValue(entry.suggestedValue)}</pre>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				<label className={`${styles.field} ${styles.wide}`}>
					<span>제보 사유 (선택)</span>
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="예: 패치 후 실제 값 변경 / 게임 내 확인"
						rows={2}
					/>
				</label>
			</div>

			<div className={styles.actions}>
				<div className={styles.hint}>
					<span>대상: {targetType}</span>
					<span>변경 항목: {changeEntries.length}</span>
					<span>제안 입력 완료: {activeChangeEntryCount}</span>
					{targetType !== "ITEM" && <span>행 ID: {typeof targetRecordId === "number" ? targetRecordId : "-"}</span>}
				</div>
				<button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={submitLoading}>
					<Send size={15}/>
					<span>{submitLoading ? "등록 중.." : "제보 등록"}</span>
				</button>
			</div>
			{submitMessage && (
				<div className={`${styles.feedback} ${styles.success}`}>
					<Check size={14}/>
					<span>{submitMessage}</span>
				</div>
			)}
			{submitError && (
				<div className={`${styles.feedback} ${styles.error}`}>
					<AlertCircle size={14}/>
					<span>{submitError}</span>
				</div>
			)}

			{user?.isAdmin && (
				<div className={styles.adminPanel}>
					<div className={styles.adminHeader}>
						<div className={styles.adminTitle}>
							<ShieldCheck size={16}/>
							<h4>관리자 승인 대기 목록</h4>
						</div>
						<button type="button" className={styles.refreshBtn} onClick={loadPendingReports} disabled={adminLoading}>
							{adminLoading ? "불러오는 중..." : "새로고침"}
						</button>
					</div>

					{adminError && (
						<div className={`${styles.feedback} ${styles.error}`}>
							<AlertCircle size={14}/>
							<span>{adminError}</span>
						</div>
					)}

					{!adminLoading && pendingReports.length === 0 && (
						<div className={styles.emptyAdmin}>이 아이템에 승인 대기 중인 제보가 없습니다.</div>
					)}

					<div className={styles.reviewList}>
						{pendingReports.map((report) => (
							<div key={report.suggestionId} className={styles.reviewCard}>
								<div className={styles.reviewTop}>
									<div className={styles.reviewBadges}>
										<span className={styles.badge}>{report.targetType}</span>
										<span className={styles.badge}>{fieldLabelMap[report.fieldKey] ?? report.fieldKey}</span>
										{report.targetRecordId !== null && <span className={styles.badge}>#{report.targetRecordId}</span>}
									</div>
									<div className={styles.reviewMeta}>
										<span>{report.requesterNickname ?? "unknown"}</span>
										<span>{formatDateTime(report.createdAt)}</span>
									</div>
								</div>

								<div className={styles.reviewBody}>
									<div className={styles.compareGrid}>
										<div>
											<span className={styles.label}>현재값</span>
											<pre>{displayMultilineValue(report.currentValue)}</pre>
										</div>
										<div>
											<span className={styles.label}>제안값</span>
											<textarea
												value={getAdminSuggestedEditValue(report)}
												onChange={(e) => handleAdminSuggestedEditChange(report.suggestionId, e.target.value)}
												rows={3}
												disabled={adminActionId === report.suggestionId}
											/>
										</div>
									</div>
									{report.reason && (
										<div className={styles.reasonBox}>
											<span className={styles.label}>사유</span>
											<p>{normalizeMultilineText(report.reason)}</p>
										</div>
									)}
								</div>

								<div className={styles.reviewActions}>
									<button
										type="button"
										className={styles.approveBtn}
										onClick={() => handleReview(report, "approve")}
										disabled={adminActionId === report.suggestionId}
									>
										<Check size={14}/>
										<span>승인</span>
									</button>
									<button
										type="button"
										className={styles.rejectBtn}
										onClick={() => handleReview(report, "reject")}
										disabled={adminActionId === report.suggestionId}
									>
										<X size={14}/>
										<span>거절</span>
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</section>
	);
};

export default ItemEditReportPanel;
