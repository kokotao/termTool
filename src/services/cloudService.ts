import { CloudUser, CloudAuthResponse, AppConfig, SSHConnection, ConnectionGroup, CloudSyncData } from '@shared/types';
// import { encryptData, decryptData } from '@/utils/crypto';
import { appConfig } from '@/config';

class CloudService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // 移除尾部斜杠以避免双斜杠
    const baseUrl = appConfig.apiBaseUrl.replace(/\/$/, '');
    const url = `${baseUrl}${endpoint}`;
    
    // 使用 Record<string, string> 以避免 TS 索引错误
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: '请求失败' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('Cloud API error:', error);
      throw error;
    }
  }

  async register(username: string, password: string, email: string, code: string): Promise<CloudAuthResponse> {
    return this.request<CloudAuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email, code }),
    });
  }

  async sendVerificationCode(email: string, type: 'REGISTER' | 'RESET_PASSWORD'): Promise<void> {
    await this.request<void>('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email, type }),
    });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    await this.request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  }

  async login(username: string, password: string): Promise<CloudAuthResponse> {
    const response = await this.request<CloudAuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.token = response.token;
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.token = null;
    }
  }

  async getUser(): Promise<CloudUser> {
    return this.request<CloudUser>('/auth/me'); 
  }

  async uploadConfig(config: AppConfig): Promise<void> {
    await this.request<void>('/config', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  }

  async downloadConfig(): Promise<AppConfig | null> {
    try {
      const response = await this.request<{ config: AppConfig }>('/config');
      return response.config;
    } catch (error) {
      console.error('Download config error:', error);
      return null;
    }
  }

  async uploadConnections(connections: SSHConnection[]): Promise<void> {
    await this.request<void>('/connections', {
      method: 'POST',
      body: JSON.stringify({ connections }),
    });
  }

  async downloadConnections(): Promise<SSHConnection[] | null> {
    try {
      const response = await this.request<{ connections: SSHConnection[] }>('/connections');
      return response.connections;
    } catch (error) {
      console.error('Download connections error:', error);
      return null;
    }
  }

  async uploadGroups(_groups: ConnectionGroup[]): Promise<void> {
    // 后端暂时没有 groups 接口，暂时跳过
    console.warn('Sync groups not supported by backend yet');
  }

  async downloadGroups(): Promise<ConnectionGroup[] | null> {
    // 后端暂时没有 groups 接口，暂时跳过
    console.warn('Sync groups not supported by backend yet');
    return [];
  }

  async uploadAll(data: CloudSyncData): Promise<void> {
    await this.request<void>('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ 
        config: data.config,
        connections: data.connections
      }),
    });
  }

  async downloadAll(): Promise<CloudSyncData | null> {
    try {
        const [config, connections] = await Promise.all([
            this.downloadConfig(),
            this.downloadConnections()
        ]);
        
        return {
            userId: '', // 暂时留空，或者需要从 getUser 获取
            lastModified: Date.now(),
            config: config || undefined,
            connections: connections || [],
            groups: []
        };
    } catch (error) {
      console.error('Download all data error:', error);
      return null;
    }
  }
  
  async getSyncStatus(): Promise<{ hasConfig: boolean, hasConnections: boolean, configLastModified: number | null, connectionsLastModified: number | null }> {
      return this.request<any>('/sync/status');
  }

  async checkConnection(): Promise<boolean> {
    try {
      const baseUrl = appConfig.apiBaseUrl.replace(/\/api$/, '');
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const cloudService = new CloudService();
