import type {GameEvent} from "@/types";
import type {NormalizedGameEvent} from "@/types/ui";
import {DAY_IN_MS} from "./events-domain";

/**
 * Utility function toDate.
 */
export const toDate = (value:string):Date => {
	const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if(matched){
		const [, year, month, day] = matched;
		return new Date(Number(year), Number(month) - 1, Number(day));
	}

	const parsed = new Date(value);
	if(Number.isNaN(parsed.getTime())){
		return new Date();
	}

	return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

/**
 * Utility function startOfDay.
 */
export const startOfDay = (date:Date):Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Utility function startOfWeek.
 */
export const startOfWeek = (date:Date):Date => {
	const day = date.getDay();
	const start = new Date(date);
	start.setDate(date.getDate() - day);
	return startOfDay(start);
};

/**
 * Utility function addDays.
 */
export const addDays = (date:Date, days:number):Date => {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
};

/**
 * Utility function dayDiff.
 */
export const dayDiff = (a:Date, b:Date):number => Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_IN_MS);

/**
 * Utility function minDate.
 */
export const minDate = (a:Date, b:Date):Date => a.getTime() <= b.getTime() ? a : b;

/**
 * Utility function normalizeEvent.
 */
export const normalizeEvent = (event:GameEvent):NormalizedGameEvent => {
	const start = toDate(event.startDate);
	const eventEnd = toDate(event.endDate);
	const fallbackEnd = addDays(start, 30);
	const end = event.permanent ? (Number.isNaN(eventEnd.getTime()) ? fallbackEnd : eventEnd) : eventEnd;
	if(end.getTime() < start.getTime()){
		return {...event, start, end: start};
	}
	return {...event, start, end};
};

/**
 * Utility function formatDate.
 */
export const formatDate = (date:Date):string =>
	`${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

/**
 * Utility function formatShortDate.
 */
export const formatShortDate = (date:Date):string =>
	`${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;

/**
 * Utility function toDayKey.
 */
export const toDayKey = (date:Date):string =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Utility function formatPeriod.
 */
export const formatPeriod = (event:NormalizedGameEvent):string => {
	if(event.permanent){
		return "상시 이벤트";
	}
	return `${formatDate(event.start)} ~ ${formatDate(event.end)}`;
};

/**
 * Utility function formatTimeLeft.
 */
export const formatTimeLeft = (endDate:Date):string => {
	const diff = endDate.getTime() - Date.now();
	if(diff <= 0) return "종료";
	const days = Math.floor(diff / DAY_IN_MS);
	const hours = Math.floor((diff % DAY_IN_MS) / 3600000);
	const minutes = Math.floor((diff % 3600000) / 60000);
	if(days > 0) return `D-${days} ${hours}시간`;
	if(hours > 0) return `${hours}시간 ${minutes}분`;
	return `${minutes}분`;
};

/**
 * Utility function isSameDay.
 */
export const isSameDay = (a:Date, b:Date):boolean =>
	a.getFullYear() === b.getFullYear() &&
	a.getMonth() === b.getMonth() &&
	a.getDate() === b.getDate();
