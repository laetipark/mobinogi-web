// SCSS 모듈 타입 정의
declare module "*.scss"{
	const content:{[className:string]:string};
	export default content;
}

declare module "*.module.scss"{
	const content:{[className:string]:string};
	export default content;
}
