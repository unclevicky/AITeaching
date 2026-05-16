import dotenv from 'dotenv'
dotenv.config()

export const config = {
  minimax: {
    // Base URL for MiniMax HTTP APIs (T2A + Chat)
    baseUrl: process.env.MINIMAX_URL || 'https://api.minimaxi.com',
    t2aEndpoint: '/v1/t2a_pro',
    chatEndpoint: '/v1/chat/completions',
    model: process.env.MINIMAX_MODEL || 'speech-01',
    apiKey: process.env.MINIMAX_API_KEY || ''
  },
  // ── 百度语音识别配置 ──
  baiduSpeech: {
    // API Key: 百度智能云控制台创建应用获取
    apiKey: process.env.BAIDU_SPEECH_API_KEY || '',
    // Secret Key: 百度智能云控制台创建应用获取
    secretKey: process.env.BAIDU_SPEECH_SECRET_KEY || '',
    // 获取 Token 的 URL
    tokenUrl: 'https://aip.baidubce.com/oauth/2.0/token',
    // 短语音识别 API (≤60秒)
    asrUrl: 'https://vop.baidu.com/server_api',
    // 语种: 1537=中文普通话, 15372=中英文混合, 1737=英语, 1637=粤语, 1837=四川话
    devPid: parseInt(process.env.BAIDU_SPEECH_DEV_PID) || 1537,
    // 采样率: 16000 或 8000（前端降采样后为 8000）
    sampleRate: parseInt(process.env.BAIDU_SPEECH_SAMPLE_RATE) || 8000
  },
  port: parseInt(process.env.SERVER_PORT) || 3001
}
