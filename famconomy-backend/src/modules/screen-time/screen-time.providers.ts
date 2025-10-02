// Provider abstraction and mock adapters for Apple/Google

export type ScreenTimeProvider = {
  applyAllowanceDelta: (childId: string, minutes: number) => Promise<{ success: boolean; providerRef?: string; error?: string }>;
};

// Mock Apple provider
export const AppleScreenTimeProvider: ScreenTimeProvider = {
  async applyAllowanceDelta(childId, minutes) {
    // Simulate latency and random failure
    await new Promise(res => setTimeout(res, Number(process.env.SCREENTIME_MOCK_LATENCY_MS) || 400));
    if (Math.random() < (Number(process.env.SCREENTIME_MOCK_FAILRATE) || 0.1)) {
      return { success: false, error: 'Mock Apple provider failure' };
    }
    return { success: true, providerRef: `apple:${childId}:${Date.now()}` };
  }
};

// Mock Google provider
export const GoogleScreenTimeProvider: ScreenTimeProvider = {
  async applyAllowanceDelta(childId, minutes) {
    await new Promise(res => setTimeout(res, Number(process.env.SCREENTIME_MOCK_LATENCY_MS) || 400));
    if (Math.random() < (Number(process.env.SCREENTIME_MOCK_FAILRATE) || 0.1)) {
      return { success: false, error: 'Mock Google provider failure' };
    }
    return { success: true, providerRef: `google:${childId}:${Date.now()}` };
  }
};
