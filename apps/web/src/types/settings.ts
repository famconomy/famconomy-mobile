export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    shareActivity: boolean;
    allowTagging: boolean;
  };
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string;
  loginHistory: Array<{
    date: string;
    device: string;
    location: string;
    ip: string;
  }>;
  connectedDevices: Array<{
    id: string;
    name: string;
    type: string;
    lastActive: string;
  }>;
}