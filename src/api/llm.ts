import type { LLMResponse } from '@/types/index';

// Kimi API 配置
const KIMI_CONFIG = {
  BASE_URL: 'https://api.moonshot.cn/v1',
  API_KEY: 'sk-fpDPeY9KgolE4NmxpQb8xqHgjvOJ3Tn6BHqyBCwCKDuMMGYl',
  MODEL: 'moonshot-v1-8k',
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.7,
} as const;

/**
 * Kimi API 客户端
 * 用于生成 NPC 对话和游戏叙事文本
 */
export class KimiClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = KIMI_CONFIG.API_KEY;
    this.baseUrl = KIMI_CONFIG.BASE_URL;
    this.model = KIMI_CONFIG.MODEL;
  }

  /**
   * 生成对话内容
   * @param systemPrompt 系统提示词（角色设定）
   * @param userPrompt 用户提示词（对话上下文）
   * @returns 生成的对话文本
   */
  async generateDialog(
    systemPrompt: string,
    userPrompt: string
  ): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          max_tokens: KIMI_CONFIG.MAX_TOKENS,
          temperature: KIMI_CONFIG.TEMPERATURE,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Kimi API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || '';

      return {
        text: generatedText.trim(),
      };
    } catch (error) {
      console.error('[KimiClient] 生成对话失败:', error);
      return {
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 生成 NPC 对话
   * @param npcName NPC 名称
   * @param npcRole NPC 角色
   * @param playerContext 玩家上下文
   * @param conversationHistory 对话历史
   * @returns 生成的对话
   */
  async generateNPCDialog(
    npcName: string,
    npcRole: string,
    playerContext: {
      currentArea: string;
      timeOfDay: string;
      hasMetBefore: boolean;
    },
    conversationHistory: string[] = []
  ): Promise<LLMResponse> {
    const systemPrompt = `你是一位生活在宁静农场小镇的${npcRole}，名叫${npcName}。
你的性格温和友善，热爱乡村生活。
当前是${playerContext.timeOfDay}，你在${playerContext.currentArea}。
${playerContext.hasMetBefore ? '你和玩家是老朋友了。' : '这是你第一次遇见玩家。'}
请用简短、自然的对话回复（1-2句话），保持角色性格一致。`;

    const historyText = conversationHistory.length > 0
      ? `之前的对话:\n${conversationHistory.join('\n')}\n\n`
      : '';

    const userPrompt = `${historyText}玩家向你走来，你会说什么？请直接回复对话内容，不要添加任何说明。`;

    return this.generateDialog(systemPrompt, userPrompt);
  }

  /**
   * 生成日落叙事文本
   * @param viewpointName 观景点名称
   * @param gazeDuration 凝视时长（毫秒）
   * @returns 生成的叙事文本
   */
  async generateSunsetNarrative(
    viewpointName: string,
    gazeDuration: number
  ): Promise<LLMResponse> {
    const systemPrompt = `你是一位诗意的游戏叙事写手。
你擅长用简洁优美的文字描述日落时分的宁静时刻。
请用1-2句话描述玩家在${viewpointName}凝视日落的感受。
文字应该温暖、治愈，让人感受到片刻的宁静。`;

    const durationSeconds = Math.floor(gazeDuration / 1000);
    const userPrompt = `玩家已经在${viewpointName}凝视日落${durationSeconds}秒了。
请生成一段简短的叙事文字（50字以内），描述这个宁静的时刻。`;

    return this.generateDialog(systemPrompt, userPrompt);
  }

  /**
   * 生成游戏提示
   * @param context 游戏上下文
   * @returns 生成的提示
   */
  async generateGameHint(context: {
    currentArea: string;
    nearbyNPCs: string[];
    timeOfDay: string;
  }): Promise<LLMResponse> {
    const systemPrompt = `你是一位友好的游戏向导。
你会给玩家简短、有用的提示，帮助他们探索游戏世界。
提示应该简洁（1句话），鼓励探索。`;

    const userPrompt = `玩家目前在${context.currentArea}，附近${context.nearbyNPCs.length > 0 ? `有 ${context.nearbyNPCs.join('、')} ` : '没有人'}。
时间是${context.timeOfDay}。
给玩家一个探索提示。`;

    return this.generateDialog(systemPrompt, userPrompt);
  }

  /**
   * 测试 API 连接
   * @returns 是否连接成功
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 便捷函数
export async function generateDialog(
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  const client = new KimiClient();
  return client.generateDialog(systemPrompt, userPrompt);
}

export async function generateNPCDialog(
  npcName: string,
  npcRole: string,
  playerContext: {
    currentArea: string;
    timeOfDay: string;
    hasMetBefore: boolean;
  },
  conversationHistory: string[] = []
): Promise<LLMResponse> {
  const client = new KimiClient();
  return client.generateNPCDialog(npcName, npcRole, playerContext, conversationHistory);
}

export async function generateSunsetNarrative(
  viewpointName: string,
  gazeDuration: number
): Promise<LLMResponse> {
  const client = new KimiClient();
  return client.generateSunsetNarrative(viewpointName, gazeDuration);
}

// 导出单例
export const kimiClient = new KimiClient();
