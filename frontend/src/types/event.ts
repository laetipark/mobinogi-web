export interface GameEvent{
	eventId:string;
	thumbnail:string;
	title:string;
	content?:string | null;
	startDate:string;
	endDate:string;
	endingSoon:boolean;
	permanent:boolean;
	daysLeft:number;
}
