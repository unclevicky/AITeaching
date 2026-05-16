import https from 'https'
import { config } from '../config.js'

const logInfo = (...args) => console.log('[BaiduSpeech]', ...args)
const logWarn = (...args) => console.warn('[BaiduSpeech]', ...args)
const logError = (...args) => console.error('[BaiduSpeech]', ...args)

// Token 缓存
let cachedToken = null
let tokenExpireTime = 0

/**
 * 获取百度 API Access Token
 * Token 有效期 30 天，这里缓存并在过期前刷新
 */
async function getAccessToken() {
  const now = Date.now()

  // 如果 Token 还有效，直接返回（预留 1 小时缓冲）
  if (cachedToken && now < tokenExpireTime - 3600000) {
    return cachedToken
  }

  const { apiKey, secretKey, tokenUrl } = config.baiduSpeech

  if (!apiKey || !secretKey) {
    throw new Error('百度语音识别 API Key 或 Secret Key 未配置')
  }

  const url = new URL(tokenUrl)
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: apiKey,
    client_secret: secretKey
  })

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + '?' + params.toString(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, res => {
      let body = Buffer.alloc(0)
      res.on('data', chunk => { body = Buffer.concat([body, chunk]) })
      res.on('end', () => {
        try {
          const json = JSON.parse(body.toString('utf8'))

          if (json.access_token) {
            cachedToken = json.access_token
            // Token 有效期秒数转毫秒，默认 2592000 秒（30天）
            const expiresIn = (json.expires_in || 2592000) * 1000
            tokenExpireTime = now + expiresIn
            logInfo('Token 获取成功，有效期至:', new Date(tokenExpireTime).toISOString())
            resolve(cachedToken)
          } else {
            const error = `获取 Token 失败: ${json.error} - ${json.error_description}`
            logError(error)
            reject(new Error(error))
          }
        } catch (e) {
          reject(new Error('解析 Token 响应失败: ' + e.message))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

/**
 * 百度短语音识别
 * @param {Buffer} pcmBuffer - PCM 音频数据（16bit, 单声道）
 * @param {Object} options - 可选配置
 * @param {number} options.devPid - 语种 ID
 * @param {number} options.sampleRate - 采样率
 * @returns {Promise<{text: string, error: string|null}>}
 */
async function recognizeSpeech(pcmBuffer, options = {}) {
  try {
    const token = await getAccessToken()

    const devPid = options.devPid || config.baiduSpeech.devPid
    const sampleRate = options.sampleRate || config.baiduSpeech.sampleRate

    // 百度限制：音频 ≤ 60 秒（根据采样率动态计算最大字节数）
    const MAX_SIZE = sampleRate * 2 * 60 // sampleRate * 2bytes(16bit) * 60s
    if (pcmBuffer.length > MAX_SIZE) {
      logWarn(`音频过大 (${pcmBuffer.length} bytes)，截断至 ${MAX_SIZE} bytes`)
      pcmBuffer = pcmBuffer.slice(0, MAX_SIZE)
    }

    // 先截断，再编码，确保 speech 和 len 严格一致
    const speechBase64 = pcmBuffer.toString('base64')
    const speechLen = pcmBuffer.length

    const requestBody = {
      format: 'pcm',
      rate: sampleRate,
      channel: 1,
      token: token,
      speech: speechBase64,
      len: speechLen,
      dev_pid: devPid,
      cuid: 'medical_ai_platform_' + Date.now()
    }

    logInfo(`开始识别 (${speechLen} bytes, ${sampleRate}Hz, devPid=${devPid})...`)

    const url = new URL(config.baiduSpeech.asrUrl)

    return new Promise((resolve) => {
      const data = JSON.stringify(requestBody)
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, res => {
        let body = Buffer.alloc(0)
        res.on('data', chunk => { body = Buffer.concat([body, chunk]) })
        res.on('end', () => {
          const rawText = body.toString('utf8')

          // 非 200 或返回了 HTML（如 403/302 重定向页面）
          if (res.statusCode !== 200 || rawText.startsWith('<')) {
            const snippet = rawText.slice(0, 200)
            const errorMsg = `百度 API 响应异常 (HTTP ${res.statusCode}): ${snippet}`
            logError(errorMsg)
            resolve({ text: '', error: errorMsg })
            return
          }

          try {
            const json = JSON.parse(rawText)

            if (json.err_no === 0 && json.result && json.result.length > 0) {
              const text = json.result[0]
              logInfo('识别成功:', text)
              resolve({ text, error: null })
            } else {
              const errorMsg = `识别失败: err_no=${json.err_no}, err_msg=${json.err_msg || '未知错误'}`
              logWarn(errorMsg)
              resolve({ text: '', error: errorMsg })
            }
          } catch (e) {
            const errorMsg = `解析识别响应失败: ${e.message}, raw: ${rawText.slice(0, 200)}`
            logError(errorMsg)
            resolve({ text: '', error: errorMsg })
          }
        })
      })

      req.on('error', (err) => {
        const errorMsg = '请求失败: ' + err.message
        logError(errorMsg)
        resolve({ text: '', error: errorMsg })
      })

      // 超时设置：10 秒
      req.setTimeout(10000, () => {
        req.destroy()
        resolve({ text: '', error: '请求超时' })
      })

      req.write(data)
      req.end()
    })

  } catch (err) {
    logError('recognizeSpeech 异常:', err.message)
    return { text: '', error: err.message }
  }
}

/**
 * 检查百度语音识别是否已配置
 */
function isConfigured() {
  const { apiKey, secretKey } = config.baiduSpeech
  return !!(apiKey && secretKey && apiKey !== 'your_baidu_api_key_here')
}

export const baiduSpeech = {
  getAccessToken,
  recognizeSpeech,
  isConfigured
}
