import express from 'express'
import { baiduSpeech } from '../services/baidu-speech.js'

const router = express.Router()

/**
 * POST /api/speech/recognize
 * 接收 base64 编码的 PCM 音频，返回识别结果
 *
 * Body: { audio: string (base64 PCM), sampleRate?: number, devPid?: number }
 * Response: { text: string, error: string|null }
 */
router.post('/recognize', express.json({ limit: '5mb' }), async (req, res) => {
  try {
    const { audio, sampleRate, devPid } = req.body

    console.log('[SpeechRoute] 收到识别请求, audio长度:', audio ? audio.length : 0, 'sampleRate:', sampleRate, 'devPid:', devPid)

    if (!audio) {
      return res.status(400).json({ text: '', error: '缺少 audio 参数' })
    }

    // Base64 转 Buffer
    const pcmBuffer = Buffer.from(audio, 'base64')
    console.log('[SpeechRoute] PCM 字节数:', pcmBuffer.length)

    // 根据采样率动态计算最小字节数（至少 0.5 秒有效语音）
    const sr = sampleRate || 16000
    const minBytes = Math.floor(sr * 2 * 0.5) // sampleRate * 2bytes(16bit) * 0.5s
    if (pcmBuffer.length < minBytes) {
      console.log('[SpeechRoute] 音频过短, 拒绝, PCM 字节:', pcmBuffer.length, '最低要求:', minBytes, '采样率:', sr)
      return res.status(400).json({ text: '', error: `音频数据过短 (${pcmBuffer.length} bytes)，请至少录制 0.5 秒` })
    }

    // 调用百度语音识别
    console.log('[SpeechRoute] 调用百度识别...')
    const result = await baiduSpeech.recognizeSpeech(pcmBuffer, {
      sampleRate,
      devPid
    })
    console.log('[SpeechRoute] 百度识别结果:', result.text || result.error)

    res.json(result)

  } catch (err) {
    console.error('[SpeechRoute] Error:', err)
    res.status(500).json({ text: '', error: err.message })
  }
})

/**
 * GET /api/speech/status
 * 检查百度语音识别服务状态
 */
router.get('/status', (req, res) => {
  res.json({
    configured: baiduSpeech.isConfigured(),
    provider: 'baidu'
  })
})

export default router
