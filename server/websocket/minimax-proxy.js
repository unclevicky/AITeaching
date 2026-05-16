import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_DIR = path.resolve(__dirname, '../../logs')
const LOG_FILE = path.join(LOG_DIR, 'backend.log')

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const MINIMAX_HOST = new URL(config.minimax.baseUrl).hostname

/**
 * Write a log line to both console and file
 * Uses rawConsole to avoid recursion when console.log is overridden
 */
const rawConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
}

function writeLog(level, ...args) {
  const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '')
  const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
  const line = `[${timestamp}] [${level}] ${message}`

  // Console (use rawConsole to avoid recursion)
  if (level === 'ERROR') {
    rawConsole.error(line)
  } else if (level === 'WARN') {
    rawConsole.warn(line)
  } else {
    rawConsole.log(line)
  }

  // File (append, with date-based rotation)
  try {
    const today = new Date().toISOString().slice(0, 10)
    const dailyFile = path.join(LOG_DIR, `backend-${today}.log`)
    fs.appendFileSync(dailyFile, line + '\n', 'utf8')
  } catch (e) {
    // Ignore file write errors
  }
}

const logInfo = (...args) => writeLog('INFO', ...args)
const logWarn = (...args) => writeLog('WARN', ...args)
const logError = (...args) => writeLog('ERROR', ...args)

// ── Intent mapping rules ──
const INTENT_RULES = [
  { pattern: /大屏|面板|数据/i, command: 'OPEN_DASHBOARD', target: '/dashboard' },
  { pattern: /诊断|CT|病例/i, command: 'OPEN_DIAGNOSIS', target: '/diagnosis' },
  { pattern: /考核|测试/i, command: 'OPEN_EXAM', target: '/exam' },
  { pattern: /PPT|幻灯片/i, command: 'OPEN_PPT', target: '/presentation' }
]

function detectIntent(text) {
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(text)) {
      return { command: rule.command, target: rule.target }
    }
  }
  return null
}

/**
 * HTTPS POST helper
 */
function httpsPost(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.minimax.apiKey}`,
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, res => {
      let body = Buffer.alloc(0)
      res.on('data', c => { body = Buffer.concat([body, c]) })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }))
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

/**
 * Call MiniMax T2A Pro API
 * Returns: { audioBuffer: Buffer|null, subtitle: string, error: string|null }
 */
async function t2a(text, voiceId = 'female-shaonv') {
  try {
    const res = await httpsPost(MINIMAX_HOST, config.minimax.t2aEndpoint, {
      model: config.minimax.model,
      text,
      voice_id: voiceId,
      voice_setting: { speed: 1.0, vol: 1.0, pitch: 0 },
      audio_setting: { sample_rate: 24000, format: 'mp3' }
    })

    const json = JSON.parse(res.body.toString('utf8'))

    if (json.base_resp?.status_code === 0) {
      // Success - audio_file might be a URL or base64
      if (json.audio_file && json.audio_file.length > 0) {
        if (json.audio_file.startsWith('http')) {
          // Download the audio file
          const audioRes = await fetch(json.audio_file)
          const arrayBuffer = await audioRes.arrayBuffer()
          return {
            audioBuffer: Buffer.from(arrayBuffer),
            subtitle: json.subtitle_file || '',
            error: null
          }
        } else {
          // Assume base64
          return {
            audioBuffer: Buffer.from(json.audio_file, 'base64'),
            subtitle: json.subtitle_file || '',
            error: null
          }
        }
      }
      return { audioBuffer: null, subtitle: '', error: 'No audio in response' }
    }

    // Error
    return {
      audioBuffer: null,
      subtitle: '',
      error: `MiniMax error ${json.base_resp?.status_code}: ${json.base_resp?.status_msg}`
    }
  } catch (err) {
    return { audioBuffer: null, subtitle: '', error: err.message }
  }
}

/**
 * Call MiniMax Chat Completions API
 * Returns: { text: string, error: string|null }
 */
async function chatCompletion(userText) {
  try {
    const res = await httpsPost(MINIMAX_HOST, config.minimax.chatEndpoint, {
      model: config.minimax.model,
      messages: [
        {
          role: 'system',
          content: '你是医疗智慧平台的AI助手，请用简洁、专业的中文回答。当用户提到"大屏""面板""数据"时，引导他们查看数字大屏页面；提到"诊断""CT""病例"时，引导查看智能诊断页面；提到"考核""测试"时，引导查看随堂测试页面；提到"PPT""幻灯片"时，引导查看PPT展示页面。'
        },
        { role: 'user', content: userText }
      ],
      max_tokens: 200
    })

    const json = JSON.parse(res.body.toString('utf8'))

    if (json.choices && json.choices.length > 0) {
      const text = json.choices[0].message?.content || json.choices[0].delta?.content || ''
      return { text, error: null }
    }

    return { text: '', error: `Chat error: ${JSON.stringify(json).slice(0, 100)}` }
  } catch (err) {
    return { text: '', error: err.message }
  }
}

// ── In-memory chat context per session ──
const sessionContexts = new Map()

/**
 * Proxy between frontend WebSocket and MiniMax HTTP APIs
 *
 * Flow (3-step HTTP chain):
 * 1. Frontend sends audio (base64 PCM) → BFF
 * 2. BFF → POST /v1/chat/completions (with audio input) → get text response
 * 3. BFF → POST /v1/t2a_pro (text → audio) → get audio buffer
 * 4. BFF → send text + audio back to frontend
 *
 * Fallback: If MiniMax APIs fail, use mock responses
 */
export function handleMiniMaxProxy(clientWs) {
  let sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  function notifyStatus(status, message) {
    logInfo(`[BFF] Status: ${status} - ${message}`)
    if (clientWs.readyState === 1) {
      clientWs.send(JSON.stringify({ type: 'status', status, message }))
    }
  }

  function sendCommand(command, target) {
    logInfo(`[BFF] Sending command: ${command} -> ${target}`)
    if (clientWs.readyState === 1) {
      clientWs.send(JSON.stringify({ type: 'command', command, target }))
    }
  }

  function sendToClient(msg) {
    if (clientWs.readyState === 1) {
      clientWs.send(JSON.stringify(msg))
    }
  }

  function sendBinaryToClient(buffer) {
    if (clientWs.readyState === 1) {
      clientWs.send(buffer)
    }
  }

  // ── Chat history ──
  function getContext() {
    if (!sessionContexts.has(sessionId)) {
      sessionContexts.set(sessionId, [
        {
          role: 'system',
          content: '你是医疗智慧平台的AI助手，请用简洁、专业的中文回答。用户可能会要求"打开大屏""开始诊断""打开PPT""开始测试"等操作，请给予简短确认回复。'
        }
      ])
    }
    return sessionContexts.get(sessionId)
  }

  function addMessage(role, content) {
    const ctx = getContext()
    ctx.push({ role, content })
    // Keep context manageable (last 20 messages)
    if (ctx.length > 20) {
      const system = ctx[0]
      const recent = ctx.slice(-19)
      sessionContexts.set(sessionId, [system, ...recent])
    }
  }

  // ── Process user input (text or audio) ──
  async function processUserInput(input) {
    const { type, text, audio } = input

    let userText = text || ''

    logInfo(`[BFF] ═══ processUserInput START ═══`)
    logInfo(`[BFF]   input.type=${type}, text="${text?.slice(0, 50)}", audio=${audio ? audio.length + 'chars' : 'none'}`)

    // ── MOCK MODE: 所有 MiniMax 调用已禁用，直接走 mock ──
    try {
      // audio 输入暂时也走 mock（前端 Web Speech API 会同时发 user.text）
      if (!userText) {
        logInfo(`[BFF]   ⚠️ audio-only input (no STT text), skipping — wait for user.text`)
        return  // ← 没有文本就不处理，等 STT 结果通过 user.text 发来
      }

      // ── Dedup: skip if same text within window ──
      const now = Date.now()
      if (userText === lastProcessedText && (now - lastProcessedTime) < DEDUP_WINDOW_MS) {
        logInfo(`[BFF]   ⏭ dedup skip: "${userText}" (within ${DEDUP_WINDOW_MS}ms)`)
        return
      }
      lastProcessedText = userText
      lastProcessedTime = now

      logInfo(`[BFF]   final userText="${userText}"`)

      // Send user text to frontend (echo back for display)
      sendToClient({ type: 'user.text', text: userText })
      logInfo(`[BFF]   → sent user.text to frontend`)

      // Step 1: Detect intent from user text (before generating reply)
      const intent = detectIntent(userText)
      if (intent) {
        logInfo(`[BFF]   🎯 Intent detected: ${intent.command} -> ${intent.target}`)
        sendCommand(intent.command, intent.target)
      } else {
        logInfo(`[BFF]   no intent detected`)
      }

      // Step 2: Check for pre-recorded audio clip
      const clipKey = detectAudioClip(userText)
      if (clipKey) {
        const clip = AUDIO_CLIPS[clipKey]
        logInfo(`[BFF]   🎵 Pre-recorded clip detected: ${clipKey}`)
        return processAudioClip(clip)
      }
      logInfo(`[BFF]   no pre-recorded clip matched`)

      // Step 3: Mock reply（不调用任何大模型）
      notifyStatus('thinking', '正在思考...')
      logInfo(`[BFF]   → sent status:thinking`)

      addMessage('user', userText)

      const mockReply = getMockReply(userText)
      logInfo(`[BFF]   mockReply="${mockReply.slice(0, 50)}..."`)
      return processReply(mockReply, intent)

    } catch (err) {
      logError('[BFF] ❌ processUserInput error:', err.message)
      const mockReply = getMockReply(userText || '你好')
      processReply(mockReply)
    } finally {
      logInfo(`[BFF] ═══ processUserInput END ═══`)
    }
  }

  // ── Chat with context (try multiple models) ──
  async function chatCompletionWithContext(userText) {
    // Models to try in order (user's key has insufficient balance on chat models,
    // but we try anyway for future use)
    const modelsToTry = [
      'abab6.5s-chat',
      'abab6.5-chat',
      'minimax-text-01'
    ]

    const ctx = getContext()
    const messages = [...ctx, { role: 'user', content: userText }]

    for (const model of modelsToTry) {
      try {
        const res = await httpsPost(MINIMAX_HOST, config.minimax.chatEndpoint, {
          model,
          messages,
          max_tokens: 200
        })

        const json = JSON.parse(res.body.toString('utf8'))

        if (json.choices && json.choices.length > 0) {
          const text = json.choices[0].message?.content || ''
          return { text, error: null }
        }

        // If insufficient balance, try next model
        if (json.base_resp?.status_code === 1008 || json.error?.message?.includes('balance')) {
          logInfo(`[BFF] Model ${model} insufficient balance, trying next...`)
          continue
        }

        // Other error, try next model
        logWarn(`[BFF] Model ${model} error:`, json.base_resp?.status_msg || json.error?.message)
      } catch (err) {
        logWarn(`[BFF] Model ${model} failed:`, err.message)
      }
    }

    return { text: '', error: 'All chat models failed or insufficient balance' }
  }

  // ── Process reply (MOCK MODE: 不调 T2A，前端用本地 TTS) ──
  // intent: pre-detected from user text in processUserInput (avoids double-detect from reply keywords)
  function processReply(replyText, intent) {
    if (!replyText) {
      replyText = '抱歉，我没有理解您的意思。'
    }

    addMessage('assistant', replyText)

    logInfo(`[BFF] ═══ processReply START ═══`)
    logInfo(`[BFF]   replyText="${replyText.slice(0, 50)}..."`)

    // Step 1: Send text to frontend (frontend uses local TTS)
    sendToClient({ type: 'response.text.done', text: replyText })
    logInfo(`[BFF]   → sent response.text.done`)

    // Step 3: 前端本地 TTS 播放，BFF 不生成音频
    const estimatedMs = Math.max(1000, replyText.length * 150)
    logInfo(`[BFF]   estimated TTS duration: ${estimatedMs}ms, will send response.done later`)
    setTimeout(() => {
      sendToClient({ type: 'response.done' })
      logInfo(`[BFF]   → sent response.done`)
    }, estimatedMs)

    logInfo(`[BFF] ═══ processReply END (async timer pending) ═══`)
  }

  // ── Pre-recorded audio clips ──
  const AUDIO_CLIPS = {
    'manjianghong': {
      text: '满江红，宋代岳飞所作。怒发冲冠，凭栏处、潇潇雨歇。抬望眼，仰天长啸，壮怀激烈。三十功名尘与土，八千里路云和月。莫等闲、白了少年头，空悲切。靖康耻，犹未雪。臣子恨，何时灭。驾长车，踏破贺兰山缺。壮志饥餐胡虏肉，笑谈渴饮匈奴血。待从头、收拾旧山河，朝天阙。',
      file: 'manjianghong.mp3'
    }
  }

  // ── Mock reply fallback ──
  // NOTE: Replies must NOT contain intent keywords (大屏/诊断/PPT/测试 etc.)
  // because detectIntent() runs on the reply text and would trigger false commands.
  function getMockReply(userText) {
    const lower = userText.toLowerCase()
    if (lower.includes('大屏') || lower.includes('数据') || lower.includes('面板')) {
      return '好的，已为您切换到数据看板。'
    }
    if (lower.includes('诊断') || lower.includes('ct') || lower.includes('病例')) {
      return '好的，已为您打开诊断工作台。'
    }
    if (lower.includes('ppt') || lower.includes('幻灯片')) {
      return '好的，已为您打开PPT演示。'
    }
    if (lower.includes('测试') || lower.includes('考核')) {
      return '好的，已为您启动考核模块。'
    }
    if (lower.includes('你好') || lower.includes('hello')) {
      return '您好！我是医疗智慧平台AI助手，请问有什么可以帮您的？'
    }
    return `我听到您说"${userText}"，请问需要我做什么？`
  }

  /**
   * Check if user is requesting a pre-recorded clip
   * Returns clip key or null
   */
  function detectAudioClip(userText) {
    const lower = userText.toLowerCase()
    if (lower.includes('满江红')) return 'manjianghong'
    return null
  }

  /**
   * Process a pre-recorded audio clip request
   * Sends the audio file path to frontend for playback
   */
  function processAudioClip(clip) {
    logInfo(`[BFF] ═══ processAudioClip START ═══`)
    logInfo(`[BFF]   clip=${clip.file}, text="${clip.text.slice(0, 30)}..."`)

    // Tell frontend to play the pre-recorded audio file.
    // NOTE: Do NOT send 'response.text.done' here — that would trigger TTS
    // and cause the clip text to be spoken twice (TTS + audio playback).
    // The text is included for subtitle display only.
    sendToClient({
      type: 'play.audio.clip',
      clip: clip.file,
      text: clip.text
    })
    logInfo(`[BFF]   → sent play.audio.clip`)

    // Estimate duration: ~468KB mp3 ≈ 29 seconds
    const estimatedDurationMs = 30000
    setTimeout(() => {
      sendToClient({ type: 'response.done' })
      logInfo(`[BFF]   → sent response.done (after ${estimatedDurationMs}ms)`)
    }, estimatedDurationMs)

    logInfo(`[BFF] ═══ processAudioClip END (async timer pending) ═══`)
  }

  // ── Dedup / throttle state ──
  let lastProcessedText = ''
  let lastProcessedTime = 0
  const DEDUP_WINDOW_MS = 2000 // ignore duplicate text within 2s

  // ── Handle messages from frontend ──
  clientWs.on('message', async (data) => {
    // Try JSON first
    try {
      const msg = JSON.parse(data.toString())

      logInfo('[BFF] 📤 Frontend message:', msg.type)

      if (msg.type === 'ping') {
        if (clientWs.readyState === 1) {
          clientWs.send(JSON.stringify({ type: 'pong' }))
        }
        return
      }

      if (msg.type === 'user.audio') {
        // Base64 PCM audio from frontend
        await processUserInput({ type: 'audio', audio: msg.audio })
        return
      }

      if (msg.type === 'user.text') {
        // Direct text input
        await processUserInput({ type: 'text', text: msg.text })
        return
      }

      // Unknown JSON message
      logInfo('[BFF] Unknown message type:', msg.type)

    } catch {
      // Binary data (raw PCM audio)
      logInfo('[BFF] 🎤 Binary audio from frontend, size:', data.length || data.byteLength)

      // Convert binary PCM to base64 and process
      const base64 = Buffer.from(data).toString('base64')
      await processUserInput({ type: 'audio', audio: base64 })
    }
  })

  // ── Initial status ──
  if (!config.minimax.apiKey || config.minimax.apiKey.length < 10) {
    logInfo('[BFF] ⚠️ No MiniMax API key, running in mock mode')
    notifyStatus('mock', 'Mock mode — no API key configured')
  } else {
    logInfo(`[BFF] ✅ MiniMax proxy ready, model: ${config.minimax.model}`)
    logInfo(`[BFF] 🌐 T2A endpoint: https://api.minimaxi.com/v1/t2a_pro`)
    logInfo(`[BFF] 🌐 Chat endpoint: https://api.minimaxi.com/v1/chat/completions`)
    notifyStatus('connected', 'Connected to MiniMax proxy (HTTP chain)')
  }

  // ── Cleanup ──
  clientWs.on('close', () => {
    logInfo('[BFF] Client disconnected, cleaning up session:', sessionId)
    sessionContexts.delete(sessionId)
  })
}
