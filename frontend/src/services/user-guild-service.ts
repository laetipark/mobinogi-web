import axios from 'axios';
import { UserGuild, UserGuildPageResponse } from '../types/user-guild.ts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

class UserGuildService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/guild/members`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * 길드원 목록 조회 (페이징)
   */
  async getAllUserGuilds(
    page = 0, 
    size = 20, 
    sortBy = 'memberName', 
    sortDir = 'asc'
  ): Promise<UserGuildPageResponse> {
    const response = await this.api.get('/', {
      params: { page, size, sortBy, sortDir }
    });
    return response.data;
  }

  /**
   * 멤버명으로 검색
   */
  async searchByMemberName(memberName: string): Promise<UserGuild[]> {
    const response = await this.api.get('/search', {
      params: { memberName }
    });
    return response.data;
  }

  /**
   * 정확한 멤버명으로 조회
   */
  async getByMemberName(memberName: string): Promise<UserGuild | null> {
    try {
      const response = await this.api.get(`/member/${encodeURIComponent(memberName)}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * 직업별 조회
   */
  async getByJobClass(jobClass: string): Promise<UserGuild[]> {
    const response = await this.api.get(`/job/${encodeURIComponent(jobClass)}`);
    return response.data;
  }

  /**
   * 계열별 조회
   */
  async getByCategory(category: string): Promise<UserGuild[]> {
    const response = await this.api.get(`/category/${encodeURIComponent(category)}`);
    return response.data;
  }

  /**
   * 기여도 시작 랭킹
   */
  async getTopContributionStartRanking(limit = 10): Promise<UserGuild[]> {
    const response = await this.api.get('/ranking/contribution-start', {
      params: { limit }
    });
    return response.data;
  }

  /**
   * 기여도 마무리 랭킹
   */
  async getTopContributionFinishRanking(limit = 10): Promise<UserGuild[]> {
    const response = await this.api.get('/ranking/contribution-finish', {
      params: { limit }
    });
    return response.data;
  }

  /**
   * 변화량 랭킹
   */
  async getTopContributionChangedRanking(limit = 10): Promise<UserGuild[]> {
    const response = await this.api.get('/ranking/contribution-changed', {
      params: { limit }
    });
    return response.data;
  }

  /**
   * 기여도 범위 조회
   */
  async getByContributionRange(min: number, max: number): Promise<UserGuild[]> {
    const response = await this.api.get('/contribution-range', {
      params: { minContribution: min, maxContribution: max }
    });
    return response.data;
  }

  /**
   * 통계 정보 조회
   */
  async getStats(): Promise<any> {
    const response = await this.api.get('/stats');
    return response.data;
  }

  /**
   * 수동 동기화 트리거
   */
  async triggerSync(): Promise<{ status: string; message: string; duration?: string }> {
    const response = await this.api.post('/sync');
    return response.data;
  }

  /**
   * 증분 동기화 트리거
   */
  async triggerIncrementalSync(): Promise<{ status: string; message: string; duration?: string }> {
    const response = await this.api.post('/sync/incremental');
    return response.data;
  }

  /**
   * 수동 랭킹 수집
   */
  async collectRanking(memberName: string): Promise<{ status: string; message: string }> {
    const response = await this.api.post(`/collect-ranking/${encodeURIComponent(memberName)}`);
    return response.data;
  }
}

export const userGuildService = new UserGuildService();
export default userGuildService;
