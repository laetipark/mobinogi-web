import React, {useCallback, useEffect, useMemo, useState} from "react";
import {Building2, Check, FileText, ShieldCheck, X} from "lucide-react";
import {useLocation, useNavigate} from "react-router-dom";
import {useAuth} from "@/hooks";
import {guildService, itemEditReportService} from "@/services";
import {normalizeMultilineText, toItemDetailPath} from "@/utils";
import type {GuildInfo, ItemEditSuggestion} from "@/types";
import styles from "./admin-guild-floating.module.scss";

/**
 * Constant POLL_MS.
 */
const POLL_MS = 60000;
/**
 * Constant MAX_RENDER_COUNT.
 */
const MAX_RENDER_COUNT = 6;

/**
 * Utility function formatDateTime.
 */
const formatDateTime = (value?:string | null):string => {
	if(!value){
		return "-";
	}
	const date = new Date(value);
	if(Number.isNaN(date.getTime())){
		return value;
	}
	return date.toLocaleString();
};

const AdminGuildFloating:React.FC = () => {
	const {user} = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingGuilds, setPendingGuilds] = useState<GuildInfo[]>([]);
	const [pendingReports, setPendingReports] = useState<ItemEditSuggestion[]>([]);
	const [actionGuildId, setActionGuildId] = useState<number | null>(null);
	const [actionReportId, setActionReportId] = useState<number | null>(null);
	const [pendingReportSuggestedEdits, setPendingReportSuggestedEdits] = useState<Record<number, string>>({});

	const loadPending = useCallback(async(showLoading:boolean = false) => {
		if(!user?.isAdmin){
			setPendingGuilds([]);
			setPendingReports([]);
			setPendingReportSuggestedEdits({});
			return;
		}
		if(showLoading){
			setLoading(true);
		}
		try{
			setError(null);
			const [dashboard, reports] = await Promise.all([
				guildService.getDashboard(),
				itemEditReportService.getPendingReports()
			]);
			const nextReports = reports ?? [];
			setPendingGuilds(dashboard.adminPendingGuilds ?? []);
			setPendingReports(nextReports);
			setPendingReportSuggestedEdits((prev) => {
				const next:Record<number, string> = {};
				for(const report of nextReports){
					next[report.suggestionId] = prev[report.suggestionId] ?? normalizeMultilineText(report.suggestedValue || "");
				}
				return next;
			});
		}catch(err:any){
			setError(err?.message || "관리자 대기 목록을 불러오지 못했습니다.");
		}finally{
			setLoading(false);
		}
	}, [user?.isAdmin]);

	useEffect(() => {
		if(!user?.isAdmin){
			setOpen(false);
			setPendingGuilds([]);
			setPendingReports([]);
			return;
		}
		void loadPending(true);
		const timer = window.setInterval(() => {
			void loadPending(false);
		}, POLL_MS);
		return () => window.clearInterval(timer);
	}, [loadPending, user?.isAdmin]);

	useEffect(() => {
		if(!user?.isAdmin){
			return;
		}
		void loadPending(false);
	}, [location.pathname, loadPending, user?.isAdmin]);

	const totalPending = useMemo(() => pendingGuilds.length + pendingReports.length, [pendingGuilds.length, pendingReports.length]);
	const visible = useMemo(() => totalPending > 0, [totalPending]);
	const isGuildPage = useMemo(() => {
		return location.pathname === "/guild" || location.pathname.startsWith("/guild/");
	}, [location.pathname]);

	/**
	 * Utility function getAdminSuggestedEditValue.
	 */
	const getAdminSuggestedEditValue = (report:ItemEditSuggestion):string => {
		return pendingReportSuggestedEdits[report.suggestionId] ?? normalizeMultilineText(report.suggestedValue || "");
	};

	/**
	 * Utility function handleAdminSuggestedEditChange.
	 */
	const handleAdminSuggestedEditChange = (reportId:number, nextValue:string) => {
		setPendingReportSuggestedEdits((prev) => ({
			...prev,
			[reportId] : normalizeMultilineText(nextValue)
		}));
	};

	/**
	 * Utility function async.
	 */
	const handleApproveGuild = async(guildId:number) => {
		setActionGuildId(guildId);
		try{
			setError(null);
			await guildService.approveGuild(guildId);
			await loadPending(false);
		}catch(err:any){
			setError(err?.message || "길드 승인 처리에 실패했습니다.");
		}finally{
			setActionGuildId(null);
		}
	};

	/**
	 * Utility function async.
	 */
	const handleRejectGuild = async(guildId:number) => {
		setActionGuildId(guildId);
		try{
			setError(null);
			await guildService.rejectGuild(guildId);
			await loadPending(false);
		}catch(err:any){
			setError(err?.message || "길드 반려 처리에 실패했습니다.");
		}finally{
			setActionGuildId(null);
		}
	};

	/**
	 * Utility function async.
	 */
	const handleAdminReview = async(report:ItemEditSuggestion, action:"approve" | "reject") => {
		setActionReportId(report.suggestionId);
		try{
			setError(null);
			if(action === "approve"){
				const editedSuggestedValue = getAdminSuggestedEditValue(report).trim();
				if(!editedSuggestedValue){
					setError("제안값이 비어 있으면 반영할 수 없습니다.");
					return;
				}
				await itemEditReportService.approveReport(report.suggestionId, {
					suggestedValue : editedSuggestedValue
				});
			}else{
				await itemEditReportService.rejectReport(report.suggestionId);
			}
			await loadPending(false);
		}catch(err:any){
			setError(err?.message || (action === "approve" ? "제보 반영 처리에 실패했습니다." : "제보 반려 처리에 실패했습니다."));
		}finally{
			setActionReportId(null);
		}
	};

	if(!user?.isAdmin || !visible || isGuildPage){
		return null;
	}

	return (
		<div className={styles.floating}>
			<button
				type="button"
				className={styles.toggle}
				onClick={() => setOpen((prev) => !prev)}
				aria-expanded={open}
			>
				<ShieldCheck size={15}/>
				<span>{"관리자 알림 " + totalPending + "건"}</span>
			</button>
			{open && (
				<div className={styles.panel}>
					<div className={styles.header}>
						<div className={styles.title}>관리자 승인 대기</div>
						<button type="button" className={styles.miniBtn} onClick={() => void loadPending(true)} disabled={loading}>
							{loading ? "갱신 중..." : "새로고침"}
						</button>
					</div>
					{error && <div className={styles.error}>{error}</div>}

					<div className={styles.section}>
						<div className={styles.sectionTitle}>
							<Building2 size={14}/>
							<span>{"길드 신청 " + pendingGuilds.length + "건"}</span>
						</div>
						{pendingGuilds.length === 0 && (
							<div className={styles.empty}>대기 중인 길드 신청이 없습니다.</div>
						)}
						{pendingGuilds.length > 0 && (
							<div className={styles.list}>
								{pendingGuilds.slice(0, MAX_RENDER_COUNT).map((guild) => (
									<div key={guild.guildId} className={styles.item}>
										<div className={styles.itemName}>{guild.guildName}</div>
										<div className={styles.meta}>
											<span>{guild.ownerNickname || guild.ownerUserId}</span>
											<span>{formatDateTime(guild.createdAt)}</span>
										</div>
										<div className={styles.itemActions}>
											<button
												type="button"
												className={`${styles.itemBtn} ${styles.itemApprove}`}
												onClick={() => void handleApproveGuild(guild.guildId)}
												disabled={actionGuildId === guild.guildId}
											>
												승인
											</button>
											<button
												type="button"
												className={`${styles.itemBtn} ${styles.itemReject}`}
												onClick={() => void handleRejectGuild(guild.guildId)}
												disabled={actionGuildId === guild.guildId}
											>
												반려
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div className={styles.section}>
						<div className={styles.sectionTitle}>
							<FileText size={14}/>
							<span>{"아이템 제보 " + pendingReports.length + "건"}</span>
						</div>
						{pendingReports.length === 0 && (
							<div className={styles.empty}>대기 중인 아이템 제보가 없습니다.</div>
						)}
						{pendingReports.length > 0 && (
							<div className={styles.list}>
								{pendingReports.slice(0, MAX_RENDER_COUNT).map((report) => (
									<div key={report.suggestionId} className={styles.item}>
										<button
											type="button"
											className={styles.link}
											onClick={() => {
												navigate(toItemDetailPath(report.itemName), {state : {openReportModal : true}});
												setOpen(false);
											}}
										>
											{report.itemName}
										</button>
										<div className={styles.meta}>
											<span>{report.targetType + " / " + report.fieldKey}</span>
											<span>{formatDateTime(report.createdAt)}</span>
										</div>
										<div className={styles.meta}>
											<span>{"제보자: " + (report.requesterNickname || "-")}</span>
										</div>
										<div className={styles.reportValues}>
											<div>
												<label>현재값</label>
												<pre>{normalizeMultilineText(report.currentValue) || "-"}</pre>
											</div>
											<div>
												<label>반영값</label>
												<textarea
													value={getAdminSuggestedEditValue(report)}
													onChange={(e) => handleAdminSuggestedEditChange(report.suggestionId, e.target.value)}
													rows={3}
													disabled={actionReportId === report.suggestionId}
												/>
											</div>
										</div>
										{report.reason && (
											<div className={styles.reason}>
												<label>사유</label>
												<p>{normalizeMultilineText(report.reason)}</p>
											</div>
										)}
										<div className={styles.itemActions}>
											<button
												type="button"
												className={`${styles.itemBtn} ${styles.itemApprove}`}
												onClick={() => void handleAdminReview(report, "approve")}
												disabled={actionReportId === report.suggestionId}
											>
												<Check size={13}/>
												<span>{actionReportId === report.suggestionId ? "처리 중..." : "반영"}</span>
											</button>
											<button
												type="button"
												className={`${styles.itemBtn} ${styles.itemReject}`}
												onClick={() => void handleAdminReview(report, "reject")}
												disabled={actionReportId === report.suggestionId}
											>
												<X size={13}/>
												<span>반려</span>
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					<div className={styles.actions}>
						<button
							type="button"
							className={styles.goBtn}
							onClick={() => {
								setOpen(false);
								navigate("/guild");
							}}
						>
							길드 페이지로 이동
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default AdminGuildFloating;
