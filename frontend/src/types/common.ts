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

export interface ApiResponse{
	success:boolean;
	message?:string;
}

export interface ListSearchParams{
	page?:number;
	size?:number;
	sortBy?:string;
	sortDir?:"asc" | "desc";
	keyword?:string;
}
