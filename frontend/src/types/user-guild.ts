export interface UserGuild {
  id: number;
  memberName: string;
  guildName: string | null;
  category: string | null;
  jobClass: string | null;
  contributionStart: number | null;
  contributionMiddle1: number | null;
  contributionMiddle2: number | null;
  contributionMiddle3: number | null;
  contributionFinish: number | null;
  contributionChanged: number | null;
  guildRole: number | null;
  subCharacter: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserGuildPageResponse {
  content: UserGuild[];
  pageable: {
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    pageNumber: number;
    pageSize: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalElements: number;
  totalPages: number;
  first: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  empty: boolean;
}

export type ViewMode = 'table' | 'jobBoard' | 'categoryBoard' | 'rankingTable';

export interface ViewModeConfig {
  id: ViewMode;
  title: string;
  description: string;
  icon: string;
}

export interface JobGroup {
  jobClass: string;
  members: UserGuild[];
  count: number;
}

export interface CategoryGroup {
  category: string;
  members: UserGuild[];
  count: number;
}
