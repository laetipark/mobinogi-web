export interface ItemTranscendenceTierValue{
	tier:string;
	value:string;
}

export interface ItemTranscendenceRow{
	key:string;
	label:string;
	value?:string;
	tierValues?:ItemTranscendenceTierValue[];
}

export interface ParsedItemTranscendence{
	rows:ItemTranscendenceRow[];
	rawText:string | null;
	parseError:boolean;
}

const ITEM_TRANSCENDENCE_KEY_LABELS:Record<string, string> = {
	crit_chance_pct : "치명타 확률",
	extra_hit_chance_pct : "추가타 확률",
	basic_extra_hit_chance_pct : "기본 공격 추가타 확률",
	smash_damage_pct : "강타 피해",
	multi_hit_damage_pct : "연타 피해",
	multihit_damage_pct : "멀티 히트 피해",
	crit_damage_pct : "치명타 피해",
	damage_to_enemy_pct : "적에게 주는 피해",
	attack_pct : "공격력",
	skill_damage_pct : "스킬 피해",
	cdr_recovery_pct : "재사용 대기시간 회복 속도",
	cast_charge_speed_pct : "캐스팅/차지 속도",
	skill_use_speed_pct : "스킬 사용 속도",
	cast_charge_and_skill_use_speed_pct : "캐스팅/차지 및 스킬 사용 속도",
	attack_speed_pct : "공격 속도",
	move_speed_pct : "이동 속도",
	defense_pct : "방어력",
	heal_amount_pct : "치유량",
	final_damage_pct : "최종 피해",
	awakening_skill_damage_pct : "각성 스킬 피해",
	passive_damage_to_enemy_pct : "상시 효과: 적에게 주는 피해",
	damage_to_enemy_pct_on_ult : "궁극기 사용 시 적에게 주는 피해",
	ultimate_gauge_gain_pct : "궁극기 게이지 획득량",
	awakening_multi_hit_damage_pct : "각성 연타 피해",
	passive_multi_hit_damage_pct : "상시 효과: 연타 피해",
	passive_cdr_recovery_pct : "상시 효과: 재사용 대기시간 회복 속도",
	ally_attack_pct_on_ult : "궁극기 사용 시 아군 공격력 증가",
	self_attack_pct_on_ally_heal : "아군 회복 시 자신의 공격력 증가",
	awakening_attack_pct : "각성 공격력",
	passive_attack_speed_pct : "상시 효과: 공격 속도",
	passive_extra_hit_chance_pct : "상시 효과: 추가타 확률",
	awakening_smash_damage_pct : "각성 강타 피해",
	passive_smash_damage_pct : "상시 효과: 강타 피해",
	awakening_crit_damage_pct : "각성 치명타 피해",
	awakening_followup_attack_damage_pct : "각성 추가 공격 피해",
	passive_damage_atk_pct : "상시 피해 (공격력 계수)",
	attack_pct_per_stack : "중첩당 공격력",
	damage_to_enemy_pct_per_stack : "중첩당 적에게 주는 피해",
	cdr_recovery_pct_per_stack : "중첩당 재사용 대기시간 회복 속도",
	skill_damage_pct_per_stack : "중첩당 스킬 피해",
	attack_pct_per_stack_on_ult : "궁극기 사용 시 중첩당 공격력",
	damage_to_enemy_pct_per_stack_on_ult : "궁극기 사용 시 중첩당 적에게 주는 피해",
	all_related_stats_pct : "관련 능력치 일괄 증가",
	attack_pct_per_sec : "초당 공격력",
	crit_damage_pct_per_sec : "초당 치명타 피해",
	attack_and_damage_to_enemy_pct_per_10s : "10초마다 공격력/적 피해",
	next_basic_bonus_damage_atk_pct : "다음 기본 공격 추가 피해 (공격력 계수)",
	next_hit_bonus_damage_atk_pct : "다음 공격 추가 피해 (공격력 계수)",
	next_hit_bonus_damage_atk_pct_on_proc : "발동 시 다음 공격 추가 피해 (공격력 계수)",
	bonus_damage_atk_pct : "추가 피해 (공격력 계수)",
	direct_damage_atk_pct : "직접 피해 (공격력 계수)",
	projectile_damage_atk_pct : "투사체 피해 (공격력 계수)",
	periodic_damage_atk_pct : "주기 피해 (공격력 계수)",
	tick_damage_atk_pct : "틱 피해 (공격력 계수)",
	whirlwind_tick_atk_pct : "회오리 틱 피해 (공격력 계수)",
	consume_3stacks_damage_atk_pct : "3중첩 소모 피해 (공격력 계수)",
	min_damage_atk_pct : "최소 피해 (공격력 계수)",
	max_damage_atk_pct : "최대 피해 (공격력 계수)",
	dark_tick_atk_pct : "암흑 틱 피해 (공격력 계수)",
	heal_tick_atk_pct : "회복 틱량 (공격력 계수)",
	break_skill_damage_pct : "브레이크 스킬 피해",
	break_damage_pct : "브레이크 피해",
	exposed_damage_pct : "무방비 피해",
	armor_break_received_damage_pct : "방어구 파괴: 받는 피해 증가",
	heal_max_hp_pct : "회복량 (최대 체력 비율)",
	shield_absorb_max_hp_pct : "보호막 흡수량 (최대 체력 비율)",
	condition_hp_gte_pct : "조건 체력 이상",
	condition_hp_lte_pct : "조건 체력 이하",
	condition_resource_lt_pct : "조건 자원 미만",
	condition_target_hp_gte_pct : "대상 체력 이상 조건",
	condition_target_hp_lte_pct : "대상 체력 이하 조건",
	damage_taken_reduction_pct_after_proc : "발동 후 받는 피해 감소",
	damage_taken_reduction_pct_min : "받는 피해 감소 최소값",
	damage_taken_reduction_pct_max : "받는 피해 감소 최대값",
	damage_to_enemy_pct_min : "적에게 주는 피해 최소값",
	damage_to_enemy_pct_max : "적에게 주는 피해 최대값",
	low_hp_bonus_attack_pct : "저체력 추가 공격력",
	start_attack_pct : "시작 공격력 보너스",
	decay_pct_every_3s : "3초마다 감소량",
	periodic_bonus_pct_per_30s : "30초마다 추가 증가",
	periodic_max_stacks : "주기 중첩 최대",
	stack_gain_interval_sec : "중첩 획득 주기",
	start_stacks : "시작 중첩",
	max_stacks : "최대 중첩",
	stacks_needed : "필요 중첩 수",
	duration_sec : "지속 시간",
	debuff_duration_sec : "디버프 지속 시간",
	buff_duration_sec : "버프 지속 시간",
	ult_buff_duration_sec : "궁극기 버프 지속 시간",
	cooldown_sec : "재사용 대기시간",
	per_target_cooldown_sec : "대상별 재사용 대기시간",
	check_interval_sec : "판정 주기",
	tick_interval_sec : "틱 간격",
	trigger_smash_hits : "강타 적중 조건 횟수",
	trigger_skill_uses : "스킬 사용 조건 횟수",
	trigger_actions : "행동 조건 횟수",
	trigger_crit_hits : "치명타 적중 조건 횟수",
	trigger_extra_hits : "추가타 적중 조건 횟수",
	trigger_move_m : "이동 조건 거리",
	required_stationary_sec : "정지 필요 시간",
	range_m : "범위",
	radius_m : "반경",
	max_distance_m : "최대 거리",
	max_effect_enemy_count : "최대 적용 적 수",
	extra_potion_count : "추가 포션 수",
	extra_bandage_count : "추가 붕대 수",
	extra_stack_gain : "추가 중첩 획득",
	duplicate_accumulation : "누적 효과 추가 발동",
	proc_chance_pct : "발동 확률",
	max_procs_per_10s : "10초당 최대 발동 횟수",
	reactivation_delay_sec : "재활성화 지연 시간",
	all_skill_cooldown_reduction_sec : "모든 스킬 쿨타임 감소",
	awakening_cooldown_reduction_sec : "각성 재사용 대기시간 감소",
	double_stats_on_awakening_duration_sec : "각성 시 능력치 2배 지속 시간",
	passive_skill_use_speed_pct : "상시 효과: 스킬 사용 속도",
	passive_cast_charge_speed_pct : "상시 효과: 캐스팅/차지 속도",
	passive_cast_charge_skill_damage_pct : "상시 효과: 캐스팅/차지 스킬 피해"
};

const TOKEN_LABELS:Record<string, string> = {
	atk : "공격력 계수",
	attack : "공격력",
	and : "및",
	armor : "방어구",
	awakening : "각성",
	basic : "기본 공격",
	bonus : "추가",
	break : "브레이크",
	buff : "버프",
	cast : "캐스팅",
	cdr : "재사용 대기시간",
	charge : "차지",
	chance : "확률",
	check : "판정",
	consume : "소모",
	cooldown : "재사용 대기시간",
	count : "개수",
	crit : "치명타",
	damage : "피해",
	dark : "암흑",
	debuff : "디버프",
	defense : "방어력",
	delay : "지연",
	direct : "직접",
	double : "2배",
	duration : "지속 시간",
	enemy : "적",
	exposed : "무방비",
	extra : "추가",
	final : "최종",
	followup : "추가타",
	gain : "획득량",
	heal : "회복",
	hit : "적중",
	hits : "적중 횟수",
	hp : "체력",
	interval : "간격",
	max : "최대",
	min : "최소",
	move : "이동",
	multi : "연타",
	multihit : "멀티 히트",
	next : "다음",
	on : "시",
	passive : "상시 효과",
	periodic : "주기",
	per : "당",
	pct : "%",
	proc : "발동",
	projectile : "투사체",
	radius : "반경",
	range : "범위",
	recovery : "회복 속도",
	reduction : "감소",
	required : "필요",
	resource : "자원",
	self : "자신",
	sec : "초",
	shield : "보호막",
	skill : "스킬",
	smash : "강타",
	speed : "속도",
	stack : "중첩",
	stacks : "중첩",
	start : "시작",
	taken : "받는",
	target : "대상",
	tick : "틱",
	trigger : "조건",
	ult : "궁극기",
	ultimate : "궁극기",
	use : "사용",
	uses : "사용 횟수",
	value : "값",
	whirlwind : "회오리",
	m : "m"
};

const UNIT_SUFFIXES:Array<{suffix:string; unit:string}> = [
	{suffix : "_pct", unit : "%"},
	{suffix : "_sec", unit : "초"},
	{suffix : "_m", unit : "m"},
	{suffix : "_count", unit : "개"}
];

/**
 * Utility function isRecord.
 */
const isRecord = (value:unknown):value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Utility function isPrimitive.
 */
const isPrimitive = (value:unknown):value is string | number | boolean | null =>
	value === null || ["string", "number", "boolean"].includes(typeof value);

/**
 * Utility function formatNumber.
 */
const formatNumber = (value:number):string => {
	if(Number.isInteger(value)){
		return `${value}`;
	}
	return `${value}`.replace(/(\.\d*?[1-9])0+$/u, "$1").replace(/\.0$/u, "");
};

/**
 * Utility function formatScalarValue.
 */
const formatScalarValue = (key:string, value:unknown):string => {
	if(value === null){
		return "-";
	}
	if(typeof value === "boolean"){
		return value ? "예" : "아니오";
	}
	if(typeof value === "number"){
		const matchedUnit = UNIT_SUFFIXES.find(({suffix}) => key.endsWith(suffix))?.unit;
		const num = formatNumber(value);
		return matchedUnit ? `${num}${matchedUnit}` : num;
	}
	if(typeof value === "string"){
		return value;
	}
	return JSON.stringify(value);
};

/**
 * Utility function humanizeFallbackKey.
 */
const humanizeFallbackKey = (key:string):string => {
	const normalized = key.trim();
	if(!normalized){
		return "초월 수치";
	}

	let unitLabel = "";
	let baseKey = normalized;
	for(const {suffix, unit} of UNIT_SUFFIXES){
		if(baseKey.endsWith(suffix)){
			baseKey = baseKey.slice(0, -suffix.length);
			unitLabel = unit;
			break;
		}
	}

	const tokens = baseKey.split("_").filter(Boolean).map((token) => {
		const lower = token.toLowerCase();
		if(TOKEN_LABELS[lower]){
			return TOKEN_LABELS[lower];
		}
		const stackMatch = lower.match(/^(\d+)stacks$/u);
		if(stackMatch){
			return `${stackMatch[1]}중첩`;
		}
		return token.toUpperCase() === token ? token : token;
	});

	const label = tokens.join(" ").replace(/\s+/gu, " ").trim() || normalized;
	return unitLabel ? `${label} (${unitLabel})` : label;
};

/**
 * Utility function getKeyLabel.
 */
const getKeyLabel = (key:string):string => ITEM_TRANSCENDENCE_KEY_LABELS[key] ?? humanizeFallbackKey(key);

/**
 * Utility function isTierValueObject.
 */
const isTierValueObject = (value:unknown):value is Record<string, string | number | boolean | null> => {
	if(!isRecord(value)){
		return false;
	}
	const keys = Object.keys(value);
	if(keys.length === 0){
		return false;
	}
	return keys.every((key) => /^\d+$/u.test(key) && isPrimitive(value[key]));
};

/**
 * Utility function parseItemTranscendence.
 */
export const parseItemTranscendence = (raw:string | null | undefined):ParsedItemTranscendence => {
	if(!raw || !raw.trim()){
		return {rows : [], rawText : null, parseError : false};
	}

	/**
	 * Utility function tryParse.
	 */
	const tryParse = (text:string):unknown => {
		try{
			return JSON.parse(text);
		}catch{
			return undefined;
		}
	};

	try{
		const candidates = [raw];
		const trimmed = raw.trim();
		if(trimmed.includes('""')){
			candidates.push(trimmed.replace(/""/gu, '"'));
			if(trimmed.startsWith('"') && trimmed.endsWith('"')){
				candidates.push(trimmed.slice(1, -1).replace(/""/gu, '"'));
			}
		}

		let parsed:unknown = undefined;
		for(const candidate of candidates){
			parsed = tryParse(candidate);
			if(parsed !== undefined){
				break;
			}
		}

		// Some import paths store a JSON object as a JSON string literal.
		if(typeof parsed === "string"){
			const nested = tryParse(parsed);
			if(nested !== undefined){
				parsed = nested;
			}
		}

		if(!isRecord(parsed)){
			return {rows : [], rawText : raw, parseError : true};
		}

		const rows:ItemTranscendenceRow[] = Object.entries(parsed).map(([key, value]) => {
			if(isTierValueObject(value)){
				const tierValues = Object.entries(value)
					.sort((a, b) => Number(a[0]) - Number(b[0]))
					.map(([tier, tierValue]) => ({
						tier : `+${tier}`,
						value : formatScalarValue(key, tierValue)
					}));
				return {
					key,
					label : getKeyLabel(key),
					tierValues
				};
			}

			return {
				key,
				label : getKeyLabel(key),
				value : isRecord(value) ? JSON.stringify(value) : formatScalarValue(key, value)
			};
		});

		return {
			rows,
			rawText : raw,
			parseError : false
		};
	}catch{
		return {
			rows : [],
			rawText : raw,
			parseError : true
		};
	}
};
