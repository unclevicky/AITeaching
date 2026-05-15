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
  port: parseInt(process.env.SERVER_PORT) || 3001
}
