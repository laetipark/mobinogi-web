import {normalizeMultilineText} from "./helpers";

interface ItemTranscendenceRoot{
	[key:string]:unknown;
}

export interface ItemEffectSegment{
	text:string;
	highlighted:boolean;
}

export interface ResolvedItemEffectTemplate{
	text:string;
	lines:ItemEffectSegment[][];
	hasResolvedValue:boolean;
}

/**
 * Constant PLACEHOLDER_PATTERN.
 */
const PLACEHOLDER_PATTERN = /\{(\d+)\}/gu;
const PLACEHOLDER_UNIT_SUFFIXES:Array<{suffix:string; unit:string}> = [
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
	value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";

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
 * Utility function formatPlaceholderValue.
 */
const formatPlaceholderValue = (key:string, value:string | number | boolean | null):string => {
	if(value === null){
		return "-";
	}
	if(typeof value === "number"){
		const matchedUnit = PLACEHOLDER_UNIT_SUFFIXES.find(({suffix}) => key.endsWith(suffix))?.unit;
		const numeric = formatNumber(value);
		return matchedUnit ? `${numeric}${matchedUnit}` : numeric;
	}
	return `${value}`;
};

/**
 * Utility function parseTranscendenceRaw.
 */
const parseTranscendenceRaw = (raw:string | null | undefined):ItemTranscendenceRoot | null => {
	if(!raw || !raw.trim()){
		return null;
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

	const trimmed = raw.trim();
	const candidates = [raw];
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

	if(typeof parsed === "string"){
		const nested = tryParse(parsed);
		if(nested !== undefined){
			parsed = nested;
		}
	}

	return isRecord(parsed) ? parsed : null;
};

/**
 * Utility function getPlaceholderValues.
 */
const getPlaceholderValues = (raw:string | null | undefined):Array<string | undefined> => {
	const parsed = parseTranscendenceRaw(raw);
	if(!parsed){
		return [];
	}

	return Object.entries(parsed).map(([key, value]) => {
		if(isRecord(value)){
			const tierZero = value["0"];
			if(isPrimitive(tierZero)){
				return formatPlaceholderValue(key, tierZero);
			}
			return undefined;
		}
		if(isPrimitive(value)){
			return formatPlaceholderValue(key, value);
		}
		return undefined;
	});
};

/**
 * Utility function resolveItemEffectTemplate.
 */
export const resolveItemEffectTemplate = (
	itemEffectRaw:string | null | undefined,
	itemTranscendenceRaw:string | null | undefined
):ResolvedItemEffectTemplate => {
	const text = normalizeMultilineText(itemEffectRaw);
	if(!text.trim()){
		return {
			text : "",
			lines : [],
			hasResolvedValue : false
		};
	}

	const placeholderValues = getPlaceholderValues(itemTranscendenceRaw);
	let hasResolvedValue = false;
	const lines = text.split("\n").map((line) => {
		const segments:ItemEffectSegment[] = [];
		let startIndex = 0;
		PLACEHOLDER_PATTERN.lastIndex = 0;

		for(const match of line.matchAll(PLACEHOLDER_PATTERN)){
			const matchStart = match.index ?? 0;
			if(matchStart > startIndex){
				segments.push({
					text : line.slice(startIndex, matchStart),
					highlighted : false
				});
			}

			const placeholderIndex = Number(match[1]);
			const replacement = Number.isNaN(placeholderIndex) ? undefined : placeholderValues[placeholderIndex];
			if(replacement !== undefined){
				segments.push({
					text : replacement,
					highlighted : true
				});
				hasResolvedValue = true;
			}else{
				segments.push({
					text : match[0],
					highlighted : false
				});
			}
			startIndex = matchStart + match[0].length;
		}

		if(startIndex < line.length){
			segments.push({
				text : line.slice(startIndex),
				highlighted : false
			});
		}

		if(segments.length === 0){
			segments.push({
				text : "",
				highlighted : false
			});
		}

		return segments;
	});

	return {
		text,
		lines,
		hasResolvedValue
	};
};
