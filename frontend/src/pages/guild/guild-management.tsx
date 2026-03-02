import React, {useEffect, useMemo, useRef, useState} from "react";
import {ShieldCheck, Users, UserPlus, Crown, Settings, RefreshCw, Loader2, Eye, EyeOff, User as UserIcon} from "lucide-react";
import {useNavigate, useParams} from "react-router-dom";
import {guildService} from "@/services";
import {useAuth, useSeo} from "@/hooks";
import type {
	GuildDashboard,
	GuildMember,
	GuildMemberRankRefreshStatus,
	GuildMemberRankRefreshTarget,
	GuildRole
} from "@/types";
import styles from "./guild-management.module.scss";

const ROLE_LABELS:Record<number, string> = {
	0 : "길드원",
	1 : "부마스터",
	2 : "마스터"
};

const SERVER_OPTIONS:{id:number; name:string}[] = [
	{id : 1, name : "데이안"},
	{id : 2, name : "아이라"},
	{id : 3, name : "던컨"},
	{id : 4, name : "알리사"},
	{id : 5, name : "메이븐"},
	{id : 6, name : "라사"},
	{id : 7, name : "칼릭스"}
];
const getServerName = (serverId?:number | null):string => {
	if(serverId == null){
		return "-";
	}
	return SERVER_OPTIONS.find((server) => server.id === serverId)?.name ?? `서버 ${serverId}`;
};

const normalizeGuildRole = (role:unknown):GuildRole => {
	const value = Number(role);
	if(value === 1 || value === 2){
		return value;
	}
	return 0;
};

const getRoleLabel = (role:unknown):string => ROLE_LABELS[normalizeGuildRole(role)];
type SortDirection = "asc" | "desc";
type GuildMemberSortKey =
	| "memberName"
	| "serverId"
	| "guildRole"
	| "userPower"
	| "userVitality"
	| "userAttractiveness"
	| "rankUpdatedAt"
	| "memberStatus";

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

const toGuildSlug = (guildName:string):string => {
	return guildName
		.trim()
		.toLowerCase()
		.replace(/[/?#%]/g, "-")
		.replace(/\s+/g, "-");
};

const GuildManagementPage:React.FC = () => {
	useSeo({
		title : "길드 페이지 - Mobinogi",
		description : "길드 정보, 가입 신청, 길드원 관리"
	});
	const navigate = useNavigate();
	const {guildName : guildSlugParam} = useParams<{guildName?:string}>();
	const {user} = useAuth();
	const [dashboard, setDashboard] = useState<GuildDashboard | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const [registerName, setRegisterName] = useState("");
	const [registerServerId, setRegisterServerId] = useState<string>("");
	const [registerDescription, setRegisterDescription] = useState("");
	const [joinGuildId, setJoinGuildId] = useState<string>("");
	const [joinMemberName, setJoinMemberName] = useState("");
	const [manualMemberName, setManualMemberName] = useState("");
	const [guildDescriptionDraft, setGuildDescriptionDraft] = useState("");
	const [editingGuildDescription, setEditingGuildDescription] = useState(false);
	const [updatingGuildDescription, setUpdatingGuildDescription] = useState(false);
	const [refreshingMemberIds, setRefreshingMemberIds] = useState<Set<number>>(new Set());
	const [roleDrafts, setRoleDrafts] = useState<Record<number, GuildRole>>({});
	const [memberSort, setMemberSort] = useState<{key:GuildMemberSortKey; direction:SortDirection}>({
		key : "guildRole",
		direction : "desc"
	});
	const [refreshingMemberRanks, setRefreshingMemberRanks] = useState(false);
	const [refreshStatus, setRefreshStatus] = useState<GuildMemberRankRefreshStatus | null>(null);
	const pendingDashboardReloadAfterRankRefreshRef = useRef(false);
	const reloadingDashboardAfterRankRefreshRef = useRef(false);
	const [memberViewerMode, setMemberViewerMode] = useState(false);
	const isAnyRankRefreshInProgress = refreshingMemberRanks || refreshingMemberIds.size > 0;

	const loadDashboard = async(showLoading:boolean = false) => {
		if(showLoading){
			setLoading(true);
		}
		try{
			setError(null);
			const next = await guildService.getDashboard();
			setDashboard(next);
		}catch(err:any){
			setError(err?.message || "길드 데이터를 불러오지 못했습니다.");
		}finally{
			setLoading(false);
		}
	};

	useEffect(() => {
		loadDashboard(true);
	}, []);

	useEffect(() => {
		if(!dashboard){
			return;
		}
		if(!joinGuildId && dashboard.approvedGuilds.length > 0){
			setJoinGuildId(String(dashboard.approvedGuilds[0].guildId));
		}
	}, [dashboard, joinGuildId]);

	useEffect(() => {
		if(!dashboard){
			return;
		}
		const next:Record<number, GuildRole> = {};
		for(const member of dashboard.guildMembers){
			next[member.id] = normalizeGuildRole(member.guildRole);
		}
		setRoleDrafts(next);
	}, [dashboard]);

	const canRegisterGuild = useMemo(() => {
		if(!dashboard){
			return false;
		}
		if(dashboard.myApprovedGuild){
			return false;
		}
		return !dashboard.ownedGuildRequests.some((g) => g.status === "PENDING" || g.status === "APPROVED");
	}, [dashboard]);

	const canRequestJoin = useMemo(() => {
		if(!dashboard){
			return false;
		}
		if(dashboard.myApprovedGuild){
			return false;
		}
		return dashboard.approvedGuilds.length > 0;
	}, [dashboard]);

	const shouldShowOwnedGuildRequests = useMemo(() => {
		if(!dashboard){
			return false;
		}
		if(dashboard.myApprovedGuild){
			return false;
		}
		return !dashboard.ownedGuildRequests.some((guild) => guild.status === "APPROVED");
	}, [dashboard]);

	const guildMasterNames = useMemo(() => {
		if(!dashboard){
			return [];
		}
		const names = dashboard.guildMembers
			.filter((member) =>
				normalizeGuildRole(member.guildRole) === 2
				&& !!member.memberName?.trim()
			)
			.map((member) => member.memberName.trim());
		return Array.from(new Set(names));
	}, [dashboard]);

	const canRefreshMemberRanks = useMemo(() => !!dashboard?.myMembership, [dashboard]);
	const canRefreshAllMemberRanks = useMemo(() => {
		if(!dashboard?.myMembership){
			return false;
		}
		return normalizeGuildRole(dashboard.myMembership.guildRole) >= 1;
	}, [dashboard]);
	const canUseMemberViewerMode = !!dashboard?.canManageMembers && canRefreshAllMemberRanks;
	const isMemberViewerMode = canUseMemberViewerMode && memberViewerMode;
	const canManageMembersInCurrentView = !!dashboard?.canManageMembers && !isMemberViewerMode;
	const showRefreshOnlyActionColumn = canRefreshMemberRanks && !canManageMembersInCurrentView;
	const showActionColumn = canManageMembersInCurrentView || showRefreshOnlyActionColumn;

	useEffect(() => {
		if(!canUseMemberViewerMode){
			setMemberViewerMode(false);
		}
	}, [canUseMemberViewerMode]);

	useEffect(() => {
		if(!dashboard || !canRefreshMemberRanks){
			setRefreshStatus(null);
			setRefreshingMemberRanks(false);
			pendingDashboardReloadAfterRankRefreshRef.current = false;
			reloadingDashboardAfterRankRefreshRef.current = false;
			return;
		}

		let cancelled = false;
		let timer:number | null = null;
		const syncRefreshStatus = async():Promise<boolean> => {
			try{
				const status = await guildService.getRefreshMemberRanksStatus();
				if(cancelled){
					return false;
				}
				setRefreshStatus(status);
				setRefreshingMemberRanks(!!status.refreshing);
				if(!status.refreshing && pendingDashboardReloadAfterRankRefreshRef.current && !reloadingDashboardAfterRankRefreshRef.current){
					reloadingDashboardAfterRankRefreshRef.current = true;
					void loadDashboard().finally(() => {
						pendingDashboardReloadAfterRankRefreshRef.current = false;
						reloadingDashboardAfterRankRefreshRef.current = false;
					});
				}
				return !!status.refreshing;
			}catch{
				if(cancelled){
					return false;
				}
				return false;
			}
		};

		const initialKeepPolling = refreshingMemberRanks || !!refreshStatus?.refreshing;
		const poll = async(forceRepeat:boolean) => {
			const running = await syncRefreshStatus();
			if(cancelled){
				return;
			}
			if(forceRepeat || running){
				timer = window.setTimeout(() => {
					void poll(true);
				}, 4000);
			}
		};

		void poll(initialKeepPolling);
		return () => {
			cancelled = true;
			if(timer != null){
				window.clearTimeout(timer);
			}
		};
	}, [dashboard?.myApprovedGuild?.guildId, canRefreshMemberRanks, refreshingMemberRanks, refreshStatus?.refreshing]);

	useEffect(() => {
		if(!dashboard){
			return;
		}
		const myGuildName = dashboard.myApprovedGuild?.guildName?.trim();
		if(!myGuildName){
			if(guildSlugParam){
				navigate("/guild", {replace : true});
			}
			return;
		}
		const expectedSlug = toGuildSlug(myGuildName);
		if(guildSlugParam !== expectedSlug){
			navigate(`/guild/${expectedSlug}`, {replace : true});
		}
	}, [dashboard, guildSlugParam, navigate]);

	useEffect(() => {
		setGuildDescriptionDraft(dashboard?.myApprovedGuild?.description?.trim() ?? "");
		setEditingGuildDescription(false);
	}, [dashboard?.myApprovedGuild?.guildId, dashboard?.myApprovedGuild?.description]);

	const withPending = async(id:number, action:() => Promise<void>) => {
		setPendingIds((prev) => new Set(prev).add(id));
		try{
			await action();
		}finally{
			setPendingIds((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}
	};

	const handleRegister = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!registerName.trim()){
			setError("길드명을 입력해 주세요.");
			return;
		}
		if(!registerServerId){
			setError("서버를 선택해 주세요.");
			return;
		}
		setSubmitting(true);
		try{
			const parsedServerId = Number(registerServerId);
			if(!Number.isFinite(parsedServerId) || parsedServerId < 1 || parsedServerId > 7){
				throw new Error("유효한 서버를 선택해 주세요.");
			}
			await guildService.registerGuild(registerName.trim(), parsedServerId, registerDescription.trim() || undefined);
			setRegisterName("");
			setRegisterServerId("");
			setRegisterDescription("");
			await loadDashboard();
		}catch(err:any){
			setError(err?.message || "길드 등록에 실패했습니다.");
		}finally{
			setSubmitting(false);
		}
	};

	const handleJoinRequest = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!joinGuildId){
			setError("가입할 길드를 선택해 주세요.");
			return;
		}
		if(!joinMemberName.trim()){
			setError("캐릭터명을 입력해 주세요.");
			return;
		}
		setSubmitting(true);
		try{
			await guildService.requestJoinGuild(Number(joinGuildId), joinMemberName.trim());
			setJoinMemberName("");
			await loadDashboard();
		}catch(err:any){
			setError(err?.message || "길드 가입 요청에 실패했습니다.");
		}finally{
			setSubmitting(false);
		}
	};

	const handleApproveMember = async(member:GuildMember) => {
		await withPending(member.id, async() => {
			try{
				await guildService.approveMember(member.id);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드원 승인에 실패했습니다.");
			}
		});
	};

	const handleRejectMember = async(member:GuildMember) => {
		await withPending(member.id, async() => {
			try{
				await guildService.rejectMember(member.id);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드원 반려에 실패했습니다.");
			}
		});
	};

	const handleRoleUpdate = async(member:GuildMember) => {
		const nextRole = normalizeGuildRole(roleDrafts[member.id] ?? member.guildRole);
		await withPending(member.id, async() => {
			try{
				await guildService.updateMemberRole(member.id, nextRole);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드 역할 변경에 실패했습니다.");
			}
		});
	};

	const handleCreateMember = async(e:React.FormEvent) => {
		e.preventDefault();
		if(!manualMemberName.trim()){
			setError("추가할 길드원 캐릭터명을 입력해 주세요.");
			return;
		}

		setSubmitting(true);
		try{
			await guildService.createMember(manualMemberName.trim());
			setManualMemberName("");
			await loadDashboard();
		}catch(err:any){
			setError(err?.message || "길드원 정보 추가에 실패했습니다.");
		}finally{
			setSubmitting(false);
		}
	};

	const handleUpdateGuildDescription = async() => {
		if(!dashboard?.canManageMembers){
			return;
		}
		const normalizedDescription = guildDescriptionDraft.trim();
		if(normalizedDescription.length > 500){
			setError("길드 소개는 500자 이하로 입력해 주세요.");
			return;
		}
		setUpdatingGuildDescription(true);
		try{
			setError(null);
			await guildService.updateGuildDescription(normalizedDescription || undefined);
			await loadDashboard();
			setEditingGuildDescription(false);
		}catch(err:any){
			setError(err?.message || "길드 소개 수정에 실패했습니다.");
		}finally{
			setUpdatingGuildDescription(false);
		}
	};

	const handleStartGuildDescriptionEdit = () => {
		if(!dashboard?.canManageMembers){
			return;
		}
		setGuildDescriptionDraft(dashboard.myApprovedGuild?.description?.trim() ?? "");
		setEditingGuildDescription(true);
	};

	const handleCancelGuildDescriptionEdit = () => {
		setGuildDescriptionDraft(dashboard?.myApprovedGuild?.description?.trim() ?? "");
		setEditingGuildDescription(false);
	};

	const handleUpdateMemberInfo = async(member:GuildMember) => {
		const nextNameRaw = window.prompt("변경할 캐릭터명", member.memberName);
		if(nextNameRaw === null){
			return;
		}
		const nextName = nextNameRaw.trim();
		if(!nextName){
			setError("캐릭터명은 비울 수 없습니다.");
			return;
		}

		await withPending(member.id, async() => {
			try{
				await guildService.updateMemberInfo(member.id, nextName);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드원 정보 수정에 실패했습니다.");
			}
		});
	};

	const handleDeleteMember = async(member:GuildMember) => {
		if(!window.confirm(`\`${member.memberName}\` 길드원 정보를 삭제할까요?`)){
			return;
		}
		await withPending(member.id, async() => {
			try{
				await guildService.deleteMember(member.id);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드원 정보 삭제에 실패했습니다.");
			}
		});
	};

	const buildRefreshTarget = (member:GuildMember):GuildMemberRankRefreshTarget | null => {
		if(!dashboard){
			return null;
		}
		const memberName = member.memberName?.trim() ?? "";
		const resolvedServerId = member.serverId ?? dashboard.myApprovedGuild?.serverId ?? null;
		if(!memberName || resolvedServerId == null || resolvedServerId < 1 || resolvedServerId > 7){
			return null;
		}
		return {
			memberName,
			serverId : resolvedServerId
		};
	};

	const handleRefreshSingleMemberRank = async(member:GuildMember) => {
		if(!canRefreshMemberRanks){
			setError("길드원 정보 갱신 권한이 없습니다.");
			return;
		}
		if(!canRefreshAllMemberRanks && !isMyGuildMember(member)){
			setError("길드원은 본인 정보만 갱신할 수 있습니다.");
			return;
		}
		const target = buildRefreshTarget(member);
		if(!target){
			setError("갱신 가능한 길드원 데이터가 없습니다.");
			return;
		}

		setRefreshingMemberIds((prev) => {
			const next = new Set(prev);
			next.add(member.id);
			return next;
		});
		try{
			setError(null);
			await guildService.refreshMemberRanks([target]);
			const status = await guildService.getRefreshMemberRanksStatus().catch(() => null);
			if(status){
				setRefreshStatus(status);
				setRefreshingMemberRanks(!!status.refreshing);
				pendingDashboardReloadAfterRankRefreshRef.current = !!status.refreshing;
			}
			if(!status?.refreshing){
				pendingDashboardReloadAfterRankRefreshRef.current = false;
				await loadDashboard();
			}
		}catch(err:any){
			pendingDashboardReloadAfterRankRefreshRef.current = false;
			setError(err?.message || "길드원 정보 개별 갱신에 실패했습니다.");
		}finally{
			setRefreshingMemberIds((prev) => {
				const next = new Set(prev);
				next.delete(member.id);
				return next;
			});
		}
	};

	const handleRefreshMemberRanks = async() => {
		if(!canRefreshAllMemberRanks){
			setError("길드원 전체 갱신 권한이 없습니다.");
			return;
		}
		if(!dashboard){
			return;
		}
		const fallbackServerId = dashboard.myApprovedGuild?.serverId ?? null;
		const targets:GuildMemberRankRefreshTarget[] = dashboard.guildMembers
			.map((member) => {
				const memberName = member.memberName?.trim() ?? "";
				const resolvedServerId = member.serverId ?? fallbackServerId;
				return {
					memberName,
					serverId : resolvedServerId as number
				};
			})
			.filter((target) =>
				!!target.memberName
				&& Number.isFinite(target.serverId)
				&& target.serverId >= 1
				&& target.serverId <= 7
			);

		if(targets.length === 0){
			setError("갱신 가능한 길드원 데이터가 없습니다.");
			return;
		}

		setRefreshingMemberRanks(true);
		try{
			setError(null);
			const summary = await guildService.refreshMemberRanks(targets);
			const status = await guildService.getRefreshMemberRanksStatus().catch(() => null);
			if(status){
				setRefreshStatus(status);
				setRefreshingMemberRanks(!!status.refreshing);
				pendingDashboardReloadAfterRankRefreshRef.current = !!status.refreshing;
			}
			if(summary.requestedCount === 0){
				setError("갱신 가능한 길드원 데이터가 없습니다.");
			}
			if(!status?.refreshing){
				pendingDashboardReloadAfterRankRefreshRef.current = false;
				await loadDashboard();
			}
			if(summary.failedCount > 0){
				setError(`길드원 정보 갱신 중 일부 실패했습니다. (${summary.failedCount}/${summary.requestedCount})`);
			}
		}catch(err:any){
			pendingDashboardReloadAfterRankRefreshRef.current = false;
			setError(err?.message || "길드원 정보 갱신에 실패했습니다.");
		}
	};

	const handleApproveGuild = async(guildId:number) => {
		await withPending(guildId, async() => {
			try{
				await guildService.approveGuild(guildId);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드 승인에 실패했습니다.");
			}
		});
	};

	const handleRejectGuild = async(guildId:number) => {
		await withPending(guildId, async() => {
			try{
				await guildService.rejectGuild(guildId);
				await loadDashboard();
			}catch(err:any){
				setError(err?.message || "길드 반려에 실패했습니다.");
			}
		});
	};

	const getStatusClass = (status:string):string => {
		switch(status){
			case "APPROVED":
				return `${styles.statusBadge} ${styles.statusApproved}`;
			case "REJECTED":
				return `${styles.statusBadge} ${styles.statusRejected}`;
			default:
				return `${styles.statusBadge} ${styles.statusPending}`;
		}
	};

	const getMemberSortValue = (member:GuildMember, key:GuildMemberSortKey):number | string => {
		switch(key){
			case "memberName":
				return member.memberName || "";
			case "serverId":
				return member.serverId ?? -1;
			case "guildRole":
				return normalizeGuildRole(member.guildRole);
			case "userPower":
				return member.userPower ?? -1;
			case "userVitality":
				return member.userVitality ?? -1;
			case "userAttractiveness":
				return member.userAttractiveness ?? -1;
			case "rankUpdatedAt":{
				const timestamp = member.rankUpdatedAt ? new Date(member.rankUpdatedAt).getTime() : 0;
				return Number.isNaN(timestamp) ? 0 : timestamp;
			}
			case "memberStatus":
				if(member.memberStatus === "APPROVED"){
					return 2;
				}
				if(member.memberStatus === "PENDING"){
					return 1;
				}
				return 0;
			default:
				return 0;
		}
	};

	const sortedGuildMembers = useMemo(() => {
		if(!dashboard){
			return [];
		}
		const cloned = [...dashboard.guildMembers];
		cloned.sort((a, b) => {
			const left = getMemberSortValue(a, memberSort.key);
			const right = getMemberSortValue(b, memberSort.key);

			let comparison = 0;
			if(typeof left === "number" && typeof right === "number"){
				comparison = left - right;
			}else{
				comparison = String(left).localeCompare(String(right), "ko", {
					numeric : true,
					sensitivity : "base"
				});
			}

			if(comparison !== 0){
				return memberSort.direction === "asc" ? comparison : -comparison;
			}

			// Stable fallback: role desc, then name asc.
			const roleComparison = normalizeGuildRole(b.guildRole) - normalizeGuildRole(a.guildRole);
			if(roleComparison !== 0){
				return roleComparison;
			}
			const nameComparison = (a.memberName || "").localeCompare(b.memberName || "", "ko");
			if(nameComparison !== 0){
				return nameComparison;
			}
			return a.id - b.id;
		});
		return cloned;
	}, [dashboard, memberSort]);

	const handleMemberSort = (key:GuildMemberSortKey, defaultDirection:SortDirection = "asc") => {
		setMemberSort((prev) => {
			if(prev.key === key){
				return {
					key,
					direction : prev.direction === "asc" ? "desc" : "asc"
				};
			}
			return {
				key,
				direction : defaultDirection
			};
		});
	};

	const renderMemberSortIndicator = (key:GuildMemberSortKey):string => {
		if(memberSort.key !== key){
			return "↕";
		}
		return memberSort.direction === "asc" ? "↑" : "↓";
	};

	const isMyGuildMember = (member:GuildMember):boolean => {
		const currentUserId = user?.userId ?? user?.id;
		return currentUserId != null && member.userId != null && member.userId === currentUserId;
	};

	return (
		<div className={styles.guildPage}>
			<section className={styles.hero}>
				<div className={styles.heroTitle}>
					<ShieldCheck size={20}/>
					<span>길드 페이지</span>
				</div>
				<div className={styles.heroDesc}>
					관리자 승인 후 길드가 활성화되며, 등록자와 `role 1` 이상만 가입 요청을 승인할 수 있습니다.
				</div>
			</section>

			{error && <div className={styles.error}>{error}</div>}

			<section className={styles.section}>
				<div className={styles.sectionHead}>
					<div>
						<div className={styles.sectionTitle}>내 길드 정보</div>
						<div className={styles.sectionSub}>내가 소속된 길드 정보를 확인할 수 있습니다.</div>
					</div>
				</div>
				{loading && <div className={styles.muted}>불러오는 중...</div>}
				{!loading && dashboard && (
					<>
						{dashboard.myApprovedGuild ? (
							<div className={styles.guildInfoGrid}>
								<div className={styles.guildInfoCard}>
									<div className={styles.guildInfoLabel}>길드명</div>
									<div className={styles.guildInfoValue}>{dashboard.myApprovedGuild.guildName}</div>
								</div>
								<div className={styles.guildInfoCard}>
									<div className={styles.guildInfoLabel}>서버</div>
									<div className={styles.guildInfoValue}>{getServerName(dashboard.myApprovedGuild.serverId)}</div>
								</div>
								<div className={styles.guildInfoCard}>
									<div className={styles.guildInfoLabel}>길드장</div>
									<div className={styles.guildInfoValue}>
										{guildMasterNames.length > 0 ? guildMasterNames.join(", ") : "-"}
									</div>
								</div>
								<div className={`${styles.guildInfoCard} ${styles.guildInfoDescription}`}>
									<div className={styles.guildInfoLabel}>길드 소개</div>
									<div className={styles.guildInfoValue}>
										{dashboard.myApprovedGuild.description?.trim() || "등록된 길드 소개가 없습니다."}
									</div>
									{canManageMembersInCurrentView && (
										<div className={styles.buttonRow}>
											{editingGuildDescription ? (
												<>
													<textarea
														className={styles.textarea}
														value={guildDescriptionDraft}
														onChange={(e) => setGuildDescriptionDraft(e.target.value)}
														maxLength={500}
														placeholder="길드 소개를 입력하세요."
													/>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnPrimary}`}
														onClick={() => void handleUpdateGuildDescription()}
														disabled={updatingGuildDescription}
													>
														{updatingGuildDescription ? "저장 중..." : "저장"}
													</button>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnGhost}`}
														onClick={handleCancelGuildDescriptionEdit}
														disabled={updatingGuildDescription}
													>
														취소
													</button>
												</>
											) : (
												<button
													type="button"
													className={`${styles.btn} ${styles.btnGhost}`}
													onClick={handleStartGuildDescriptionEdit}
												>
													길드 소개 편집
												</button>
											)}
										</div>
									)}
								</div>
							</div>
						) : (
							<div className={styles.muted}>아직 승인된 길드 소속이 없습니다.</div>
						)}
					</>
				)}
			</section>

			{dashboard && canRegisterGuild && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div>
							<div className={styles.sectionTitle}>길드 등록</div>
							<div className={styles.sectionSub}>관리자 승인 후 생성됩니다.</div>
						</div>
					</div>
					<form onSubmit={handleRegister} className={styles.formGrid}>
						<div className={styles.field}>
							<label className={styles.label}>길드명</label>
							<input className={styles.input} value={registerName} onChange={(e) => setRegisterName(e.target.value)} maxLength={120}/>
						</div>
						<div className={styles.field}>
							<label className={styles.label}>서버</label>
							<select
								className={styles.select}
								value={registerServerId}
								onChange={(e) => setRegisterServerId(e.target.value)}
							>
								<option value="">서버 선택</option>
								{SERVER_OPTIONS.map((server) => (
									<option key={server.id} value={server.id}>{server.name}</option>
								))}
							</select>
						</div>
						<div className={`${styles.field} ${styles.fieldWide}`}>
							<label className={styles.label}>설명</label>
							<textarea className={styles.textarea} value={registerDescription} onChange={(e) => setRegisterDescription(e.target.value)} maxLength={500}/>
						</div>
						<div className={`${styles.field} ${styles.fieldWide}`}>
							<div className={styles.buttonRow}>
								<button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>등록 신청</button>
							</div>
						</div>
					</form>
				</section>
			)}

			{dashboard && shouldShowOwnedGuildRequests && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div>
							<div className={styles.sectionTitle}>내 길드 신청 상태</div>
							<div className={styles.sectionSub}>내가 등록한 길드 요청</div>
						</div>
					</div>
					{dashboard.ownedGuildRequests.length === 0 ? (
						<div className={styles.muted}>등록한 길드가 없습니다.</div>
					) : (
						<div className={styles.tableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>길드명</th>
										<th>상태</th>
										<th>검토일</th>
										<th>메모</th>
									</tr>
								</thead>
								<tbody>
									{dashboard.ownedGuildRequests.map((guild) => (
										<tr key={guild.guildId}>
											<td>{guild.guildName}</td>
											<td><span className={getStatusClass(guild.status)}>{guild.status}</span></td>
											<td>{formatDateTime(guild.reviewedAt)}</td>
											<td>{guild.reviewNote || "-"}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			)}

			{dashboard && canRequestJoin && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div>
							<div className={styles.sectionTitle}>길드 가입 요청</div>
							<div className={styles.sectionSub}>가입 승인 시 길드원으로 등록됩니다.</div>
						</div>
					</div>
					<form onSubmit={handleJoinRequest} className={styles.formGrid}>
						<div className={styles.field}>
							<label className={styles.label}>길드</label>
							<select className={styles.select} value={joinGuildId} onChange={(e) => setJoinGuildId(e.target.value)}>
								{dashboard.approvedGuilds.map((guild) => (
									<option key={guild.guildId} value={guild.guildId}>{guild.guildName}</option>
								))}
							</select>
						</div>
						<div className={styles.field}>
							<label className={styles.label}>캐릭터명</label>
							<input className={styles.input} value={joinMemberName} onChange={(e) => setJoinMemberName(e.target.value)} maxLength={100}/>
						</div>
						<div className={`${styles.field} ${styles.fieldWide}`}>
							<div className={styles.buttonRow}>
								<button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
									<UserPlus size={14}/>
									<span>가입 요청</span>
								</button>
							</div>
						</div>
					</form>
				</section>
			)}

			{dashboard && dashboard.myPendingJoinRequests.length > 0 && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>내 가입 대기 요청</div>
					</div>
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>길드</th>
									<th>캐릭터명</th>
									<th>상태</th>
									<th>요청일</th>
								</tr>
							</thead>
							<tbody>
								{dashboard.myPendingJoinRequests.map((member) => (
									<tr key={member.id}>
										<td>{member.guildName}</td>
										<td>{member.memberName}</td>
										<td><span className={getStatusClass(member.memberStatus)}>{member.memberStatus}</span></td>
										<td>{formatDateTime(member.createdAt)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{dashboard && dashboard.myApprovedGuild && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
							<div className={styles.sectionTitle}>
								<Users size={16}/>
								<span>{dashboard.myApprovedGuild.guildName} 길드원 목록 (총 {sortedGuildMembers.length}명)</span>
							</div>
						{canRefreshMemberRanks && (
							<div className={styles.buttonRow}>
								{!isMemberViewerMode && canRefreshAllMemberRanks && (
									<button
										type="button"
										className={`${styles.btn} ${styles.btnGhost}`}
										onClick={() => void handleRefreshMemberRanks()}
										disabled={isAnyRankRefreshInProgress || loading}
									>
										<RefreshCw size={14}/>
										<span>{isAnyRankRefreshInProgress ? "길드원 정보 갱신 중..." : "길드원 정보 갱신"}</span>
									</button>
								)}
								{canUseMemberViewerMode && (
									<button
										type="button"
										className={`${styles.btn} ${isMemberViewerMode ? styles.btnPrimary : styles.btnGhost}`}
										onClick={() => setMemberViewerMode((prev) => !prev)}
									>
										{isMemberViewerMode ? <EyeOff size={14}/> : <Eye size={14}/>}
										<span>{isMemberViewerMode ? "관리 모드" : "뷰어 모드"}</span>
									</button>
								)}
							</div>
						)}
					</div>
					{canManageMembersInCurrentView && (
						<form onSubmit={handleCreateMember} className={styles.formGrid}>
							<div className={styles.field}>
								<label className={styles.label}>길드원 추가</label>
								<input
									className={styles.input}
									value={manualMemberName}
									onChange={(e) => setManualMemberName(e.target.value)}
									maxLength={100}
									placeholder="캐릭터명"
								/>
							</div>
							<div className={styles.field}>
								<button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
									길드원 추가
								</button>
							</div>
						</form>
					)}
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>
										<button type="button" className={styles.sortButton} onClick={() => handleMemberSort("memberName", "asc")}>
											이름 <span className={styles.sortIndicator}>{renderMemberSortIndicator("memberName")}</span>
										</button>
									</th>
									<th>
										<button type="button" className={styles.sortButton} onClick={() => handleMemberSort("serverId", "asc")}>
											서버 <span className={styles.sortIndicator}>{renderMemberSortIndicator("serverId")}</span>
										</button>
									</th>
									<th>
										<button type="button" className={styles.sortButton} onClick={() => handleMemberSort("guildRole", "desc")}>
											역할 <span className={styles.sortIndicator}>{renderMemberSortIndicator("guildRole")}</span>
										</button>
									</th>
									<th>
										<button type="button" className={styles.sortButton} onClick={() => handleMemberSort("userPower", "desc")}>
											전투력 <span className={styles.sortIndicator}>{renderMemberSortIndicator("userPower")}</span>
										</button>
									</th>
									<th>
										<button type="button" className={styles.sortButton} onClick={() => handleMemberSort("userVitality", "desc")}>
											생활력 <span className={styles.sortIndicator}>{renderMemberSortIndicator("userVitality")}</span>
										</button>
									</th>
									<th>
										<button type="button" className={styles.sortButton} onClick={() => handleMemberSort("userAttractiveness", "desc")}>
											매력 <span className={styles.sortIndicator}>{renderMemberSortIndicator("userAttractiveness")}</span>
										</button>
									</th>
									<th>
										<button type="button" className={styles.sortButton} onClick={() => handleMemberSort("rankUpdatedAt", "desc")}>
											갱신시각 <span className={styles.sortIndicator}>{renderMemberSortIndicator("rankUpdatedAt")}</span>
										</button>
									</th>
									{showActionColumn && <th>관리</th>}
								</tr>
							</thead>
							<tbody>
								{sortedGuildMembers.map((member, index) => {
									const isMyMember = isMyGuildMember(member);
									return (
									<tr key={member.id}>
										<td>
											<div className={styles.memberNameCell}>
												<span className={styles.rowNumber}>{index + 1}.</span>
												<span>{member.memberName}</span>
												{isMyMember && (
													<span className={styles.myBadge}>
														<UserIcon size={12}/>
														<span>나</span>
													</span>
												)}
											</div>
										</td>
										<td>{getServerName(member.serverId)}</td>
										<td>{getRoleLabel(member.guildRole)}</td>
										<td className={styles.statCell}>{member.userPower ?? "-"}</td>
										<td className={styles.statCell}>{member.userVitality ?? "-"}</td>
										<td className={styles.statCell}>{member.userAttractiveness ?? "-"}</td>
										<td className={styles.timeCell}>{formatDateTime(member.rankUpdatedAt)}</td>
										{showActionColumn && (
											<td className={styles.actionCell}>
												{canManageMembersInCurrentView ? (
													<div className={styles.inline}>
														<select
															className={styles.select}
															value={normalizeGuildRole(roleDrafts[member.id] ?? member.guildRole)}
															onChange={(e) => setRoleDrafts((prev) => ({
																...prev,
																[member.id] : Number(e.target.value) as GuildRole
															}))}
														>
															<option value={0}>길드원</option>
															<option value={1}>부마스터</option>
															<option value={2}>마스터</option>
														</select>
														<button
															type="button"
															className={`${styles.btn} ${styles.btnGhost}`}
															onClick={() => handleRoleUpdate(member)}
															disabled={pendingIds.has(member.id)}
														>
															<Settings size={13}/>
															<span>적용</span>
														</button>
														<button
															type="button"
															className={`${styles.btn} ${styles.btnGhost}`}
															onClick={() => handleUpdateMemberInfo(member)}
															disabled={pendingIds.has(member.id)}
														>
															정보수정
														</button>
														{canRefreshAllMemberRanks && (
															<button
																type="button"
																className={`${styles.btn} ${styles.btnGhost}`}
																onClick={() => void handleRefreshSingleMemberRank(member)}
																disabled={pendingIds.has(member.id) || isAnyRankRefreshInProgress}
																title={
																	refreshingMemberIds.has(member.id)
																		? "갱신 중"
																		: (isAnyRankRefreshInProgress ? "다른 갱신 진행 중" : "개별 갱신")
																}
																aria-label={
																	refreshingMemberIds.has(member.id)
																		? "갱신 중"
																		: (isAnyRankRefreshInProgress ? "다른 갱신 진행 중" : "개별 갱신")
																}
															>
																{refreshingMemberIds.has(member.id)
																	? <Loader2 size={13} className={styles.spinningIcon}/>
																	: <RefreshCw size={13}/>}
															</button>
														)}
														<button
															type="button"
															className={`${styles.btn} ${styles.btnDanger}`}
															onClick={() => handleDeleteMember(member)}
															disabled={pendingIds.has(member.id)}
														>
															삭제
														</button>
													</div>
												) : (
													<div className={styles.inline}>
														{isMyMember ? (
															<button
																type="button"
																className={`${styles.btn} ${styles.btnGhost}`}
																onClick={() => void handleRefreshSingleMemberRank(member)}
																disabled={pendingIds.has(member.id) || isAnyRankRefreshInProgress}
																title={
																	refreshingMemberIds.has(member.id)
																		? "갱신 중"
																		: (isAnyRankRefreshInProgress ? "다른 갱신 진행 중" : "내 정보 갱신")
																}
																aria-label={
																	refreshingMemberIds.has(member.id)
																		? "갱신 중"
																		: (isAnyRankRefreshInProgress ? "다른 갱신 진행 중" : "내 정보 갱신")
																}
															>
																{refreshingMemberIds.has(member.id)
																	? <Loader2 size={13} className={styles.spinningIcon}/>
																	: <RefreshCw size={13}/>}
															</button>
														) : (
															<span className={styles.muted}>-</span>
														)}
													</div>
												)}
											</td>
										)}
									</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{dashboard && canManageMembersInCurrentView && dashboard.pendingGuildMembers.length > 0 && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>길드 가입 승인 대기</div>
					</div>
					<div className={styles.tableWrap}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th>캐릭터명</th>
									<th>서버</th>
									<th>요청일</th>
									<th>처리</th>
								</tr>
							</thead>
							<tbody>
								{dashboard.pendingGuildMembers.map((member) => (
									<tr key={member.id}>
										<td>{member.memberName}</td>
										<td>{getServerName(member.serverId)}</td>
										<td>{formatDateTime(member.createdAt)}</td>
										<td>
											<div className={styles.buttonRow}>
												<button
													type="button"
													className={`${styles.btn} ${styles.btnPrimary}`}
													onClick={() => handleApproveMember(member)}
													disabled={pendingIds.has(member.id)}
												>
													승인
												</button>
												<button
													type="button"
													className={`${styles.btn} ${styles.btnDanger}`}
													onClick={() => handleRejectMember(member)}
													disabled={pendingIds.has(member.id)}
												>
													반려
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{dashboard?.isAdmin && (
				<section className={styles.section}>
					<div className={styles.sectionHead}>
						<div className={styles.sectionTitle}>
							<Crown size={16}/>
							<span>관리자 길드 승인</span>
						</div>
					</div>
					{dashboard.adminPendingGuilds.length === 0 ? (
						<div className={styles.muted}>승인 대기 중인 길드가 없습니다.</div>
					) : (
						<div className={styles.tableWrap}>
							<table className={styles.table}>
								<thead>
									<tr>
										<th>길드명</th>
										<th>등록자</th>
										<th>설명</th>
										<th>신청일</th>
										<th>처리</th>
									</tr>
								</thead>
								<tbody>
									{dashboard.adminPendingGuilds.map((guild) => (
										<tr key={guild.guildId}>
											<td>{guild.guildName}</td>
											<td>{guild.ownerNickname || guild.ownerUserId}</td>
											<td>{guild.description || "-"}</td>
											<td>{formatDateTime(guild.createdAt)}</td>
											<td>
												<div className={styles.buttonRow}>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnPrimary}`}
														onClick={() => handleApproveGuild(guild.guildId)}
														disabled={pendingIds.has(guild.guildId)}
													>
														승인
													</button>
													<button
														type="button"
														className={`${styles.btn} ${styles.btnDanger}`}
														onClick={() => handleRejectGuild(guild.guildId)}
														disabled={pendingIds.has(guild.guildId)}
													>
														반려
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
			)}

			{!user && (
				<section className={styles.section}>
					<div className={styles.muted}>길드 페이지는 로그인 후 이용할 수 있습니다.</div>
				</section>
			)}
		</div>
	);
};

export default GuildManagementPage;
