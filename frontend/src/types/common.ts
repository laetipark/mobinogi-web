export interface PageResponse<T>{
	content:T[];
	pageable:{
		sort:{
			sorted:boolean;
			unsorted:boolean;
		};
		pageNumber:number;
		pageSize:number;
	};
	totalElements:number;
	totalPages:number;
	last:boolean;
	first:boolean;
	numberOfElements:number;
}

export interface ApiResponse<T = unknown>{
	success:boolean;
	message?:string;
	data?:T;
}

export interface ListSearchParams{
	page?:number;
	size?:number;
	sortBy?:string;
	sortDir?:"asc" | "desc";
	keyword?:string;
}
