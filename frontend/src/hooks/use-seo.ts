import {useEffect} from "react";
import {useLocation} from "react-router-dom";
import {config} from "@/config/env";

type SeoType = "website" | "article";

export type SeoOptions = {
	title?:string;
	description?:string;
	keywords?:string;
	image?:string;
	type?:SeoType;
	noindex?:boolean;
	canonicalPath?:string;
	publishedTime?:string;
	modifiedTime?:string;
	author?:string;
};

const DEFAULT_SITE_URL = "https://laetipark.me";
const DEFAULT_IMAGE_PATH = "/thumbnail.png";
const DEFAULT_DESCRIPTION = "Sexynogi에서 마비노기 모바일 공지, 이벤트, 게시판, 아이템, 갤러리를 한 번에 확인하세요.";
const DEFAULT_KEYWORDS = "Sexynogi,sexynogi,마비노기 모바일,모비노기,게시판,이벤트,아이템,갤러리,숙제";

const resolveOrigin = ():string => {
	if(typeof window !== "undefined" && window.location?.origin){
		return window.location.origin;
	}
	const envSiteUrl = (import.meta.env.VITE_SITE_URL as string | undefined) || DEFAULT_SITE_URL;
	return envSiteUrl.replace(/\/+$/, "");
};

const toAbsoluteUrl = (value:string, origin:string):string => {
	if(/^https?:\/\//i.test(value)){
		return value;
	}
	if(!value){
		return origin;
	}
	return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
};

const setMetaByName = (name:string, content:string) => {
	if(typeof document === "undefined"){
		return;
	}
	let element = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
	if(!element){
		element = document.createElement("meta");
		element.setAttribute("name", name);
		document.head.appendChild(element);
	}
	element.setAttribute("content", content);
};

const setMetaByProperty = (property:string, content:string) => {
	if(typeof document === "undefined"){
		return;
	}
	let element = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
	if(!element){
		element = document.createElement("meta");
		element.setAttribute("property", property);
		document.head.appendChild(element);
	}
	element.setAttribute("content", content);
};

const removeMetaByProperty = (property:string) => {
	if(typeof document === "undefined"){
		return;
	}
	document.head.querySelector(`meta[property="${property}"]`)?.remove();
};

const setCanonicalLink = (href:string) => {
	if(typeof document === "undefined"){
		return;
	}
	let element = document.head.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
	if(!element){
		element = document.createElement("link");
		element.setAttribute("rel", "canonical");
		document.head.appendChild(element);
	}
	element.setAttribute("href", href);
};

const toSeoDateTime = (value?:string):string => {
	if(!value){
		return "";
	}
	const parsed = new Date(value);
	if(Number.isNaN(parsed.getTime())){
		return "";
	}
	return parsed.toISOString();
};

export const useSeo = (options:SeoOptions = {}) => {
	const location = useLocation();
	const {
		title,
		description = DEFAULT_DESCRIPTION,
		keywords = DEFAULT_KEYWORDS,
		image = DEFAULT_IMAGE_PATH,
		type = "website",
		noindex = false,
		canonicalPath,
		publishedTime,
		modifiedTime,
		author
	} = options;

	useEffect(() => {
		if(typeof document === "undefined"){
			return;
		}

		const siteName = (config.app.title || "sexynogi").trim();
		const pageTitle = title?.trim();
		const fullTitle = pageTitle && pageTitle !== siteName
			? `${pageTitle} | ${siteName}`
			: siteName;

		document.title = fullTitle;

		const origin = resolveOrigin();
		const canonicalUrl = toAbsoluteUrl(canonicalPath || location.pathname || "/", origin);
		const imageUrl = toAbsoluteUrl(image, origin);

		setCanonicalLink(canonicalUrl);
		setMetaByName("description", description);
		setMetaByName("keywords", keywords);
		setMetaByName("robots", noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");

		setMetaByProperty("og:type", type);
		setMetaByProperty("og:title", fullTitle);
		setMetaByProperty("og:description", description);
		setMetaByProperty("og:url", canonicalUrl);
		setMetaByProperty("og:image", imageUrl);
		setMetaByProperty("og:image:alt", "Sexynogi 썸네일");
		setMetaByProperty("og:site_name", siteName);
		setMetaByProperty("og:locale", "ko_KR");

		setMetaByName("twitter:card", "summary_large_image");
		setMetaByName("twitter:title", fullTitle);
		setMetaByName("twitter:description", description);
		setMetaByName("twitter:image", imageUrl);

		const normalizedPublishedTime = toSeoDateTime(publishedTime);
		const normalizedModifiedTime = toSeoDateTime(modifiedTime);

		if(type === "article" && normalizedPublishedTime){
			setMetaByProperty("article:published_time", normalizedPublishedTime);
		}else{
			removeMetaByProperty("article:published_time");
		}

		if(type === "article" && normalizedModifiedTime){
			setMetaByProperty("article:modified_time", normalizedModifiedTime);
		}else{
			removeMetaByProperty("article:modified_time");
		}

		if(type === "article" && author){
			setMetaByProperty("article:author", author);
		}else{
			removeMetaByProperty("article:author");
		}
	}, [
		location.pathname,
		title,
		description,
		keywords,
		image,
		type,
		noindex,
		canonicalPath,
		publishedTime,
		modifiedTime,
		author
	]);
};
