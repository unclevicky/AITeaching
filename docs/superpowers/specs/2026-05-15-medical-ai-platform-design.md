# 医疗智慧平台国赛 Web Demo (V1.0) — 设计文档

> 日期：2026-05-15
> 状态：已确认
> 版本：V1.0

---

## 1. 项目愿景

- **定位**：国家级比赛演示用 Web Demo，部署至云端通过浏览器访问
- **核心目标**：极致视觉真实感 + 顺滑交互动效 + AI 数字人的"中枢感"
- **工程原则**：重前端表现，轻后端逻辑。纯 B/S 架构（Vue3 SPA + 轻量 BFF），追求视觉冲击力和毫秒级响应

---

## 2. 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Vue 3 + Vite | SPA 应用构建 |
| 状态管理 | Pinia | 全局状态（数字人状态、语音交互状态） |
| 路由 | Vue Router | 4 页面路由 |
| 样式 | Tailwind CSS | 深色主题 + 玻璃拟态 + 快速开发 |
| 动画 | lottie-web | 数字人骨骼动画（透明背景，极致性能） |
| 图表 | ECharts | Dashboard 动态折线图/地图/仪表盘 |
| 音频 | Web Audio API | 麦克风采集 (getUserMedia) |
| BFF 后端 | Node.js + Express + ws | API Key 安全存放 + WebSocket 代理 |
| 音频流 | WebSocket 透传 | 前端 ↔ BFF ↔ MiniMax S2S |

---

## 3. 视觉设计规范

### 3.1 色彩体系
- **主色调**：深蓝 `#040d1a` → `#0c1929` → `#0a2040` 渐变背景
- **高亮色**：青色 `#00d4ff`（Cyan）
- **辅助色**：中蓝 `#0066ff`，深青 `#00ccaa`
- **文字色**：主文字 `#aaccdd`，次要文字 `#667788`，高亮 `#00d4ff`

### 3.2 玻璃拟态 (Glassmorphism)
- 导航栏：`background: rgba(10, 30, 60, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(0, 180, 255, 0.2);`
- 卡片：`background: rgba(0, 60, 120, 0.15); backdrop-filter: blur(8px);`

### 3.3 动效
- CSS `transition` 实现所有交互过渡（duration: 200-400ms）
- 微光边框动画（`box-shadow` 呼吸效果）
- 数字人三态动画由 Lottie 驱动
- 页面切换使用 `<Transition>` 淡入滑动

### 3.4 数字人 — 全息投影风格
- 半透明蓝色全息质感，边缘发光（`box-shadow` 多层光晕）
- 扫描线效果（CSS `linear-gradient` + 位移动画）
- Lottie 动画 + CSS 滤镜叠加实现

---

## 4. 应用架构

### 4.1 布局结构
```
┌─────────────────────────────────────────────────────┐
│ App                                                  │
│ ┌──────────┐ ┌────────────────────────────────────┐ │
│ │ SideNav  │ │ <router-view>                      │ │
│ │ (fixed)  │ │                                    │ │
│ │          │ │  页面内容区域                        │ │
│ │ 🏠 大屏   │ │                                    │ │
│ │ 🔬 诊断   │ │                                    │ │
│ │ 📊 PPT   │ │                                    │ │
│ │ 📝 测试   │ │                                    │ │
│ │          │ │                                    │ │
│ └──────────┘ └────────────────────────────────────┘ │
│                                     ┌─────────────┐ │
│                                     │ GlobalAvatar│ │
│                                     │ (fixed)     │ │
│                                     └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 4.2 组件树
```
App.vue
├── SideNav                    # 左侧玻璃拟态导航栏
│   ├── NavLogo                # Logo + 系统名称
│   └── NavMenu                # 菜单项列表 (4个)
├── <router-view>              # 页面内容
│   ├── DashboardView          # /dashboard 数字大屏
│   │   ├── CenterGauge        # 中央圆形仪表盘
│   │   └── DataCards          # 环绕数据卡片 (4-6个)
│   ├── DiagnosisView          # /diagnosis 智能诊断
│   │   ├── ImageUploader      # CT 影像拖拽上传舱
│   │   └── ResultStream       # 诊断结果流式输出区
│   ├── PresentationView       # /presentation PPT展示
│   │   └── ImageCarousel      # 高清图片轮播组件
│   └── ExamView               # /exam 随堂测试
│       ├── QRCodeDisplay      # 扫码参与二维码
│       └── LiveStats          # 实时统计大屏
├── GlobalAvatar               # 全局悬浮数字人
│   ├── LottiePlayer           # Lottie 动画播放器
│   ├── WaveformVisualizer     # 声波可视化 (LISTENING态)
│   └── MicButton              # 麦克风按钮 (交互兜底)
└── EnterSystemModal           # 首次进入弹窗 (自动播放策略)
```

---

## 5. 路由设计

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `DashboardView` | 默认重定向到大屏 |
| `/dashboard` | `DashboardView` | 数字大屏，ECharts 居中辐射式布局 |
| `/diagnosis` | `DiagnosisView` | 智能诊断，CT 上传 + 流式输出 |
| `/presentation` | `PresentationView` | PPT 展示，图片轮播 |
| `/exam` | `ExamView` | 随堂测试，二维码 + 实时统计 |

---

## 6. 核心组件设计

### 6.1 GlobalAvatar（全局悬浮数字人）

**挂载位置**：App.vue 中与 `<router-view>` 同级，使用 `position: fixed; bottom: 2rem; right: 2rem; z-index: 9999;`

**状态机**：
| 状态 | 视觉表现 | 触发条件 |
|------|----------|----------|
| `IDLE` | 微弱呼吸 + 眨眼（Lottie 循环动画） | 默认状态 |
| `LISTENING` | 身体微前倾 + UI 底部动态声波效果 | 麦克风激活时 |
| `SPEAKING` | 自然交流态摆动（Lottie 动画） | MiniMax 回传音频时 |

**交互兜底**：数字人旁放置浮动麦克风图标按钮，支持鼠标点击唤醒（解决浏览器全局快捷键必须聚焦的限制）。

**快捷键**：`空格键` — 切换麦克风激活/关闭。

### 6.2 useAudioRecorder（音频采集钩子）

- 调用 `navigator.mediaDevices.getUserMedia({ audio: true })` 获取麦克风权限
- 使用 Web Audio API 的 `AudioContext` + `ScriptProcessorNode` / `AudioWorklet` 进行音频流切片
- 切片通过 WebSocket 实时发送至 BFF
- 处理权限拒绝、设备不可用等错误状态

### 6.3 MiniMax S2S WebSocket 链路

```
前端 useAudioRecorder
  → WebSocket 发送音频流 (ArrayBuffer)
    → BFF (ws Server) 透传 → MiniMax speech-01 WebSocket API
    ← BFF 回传 ← MiniMax 返回音频流 + 文本流
  ← WebSocket 接收
前端 Web Audio API 播放音频
前端 Pinia Store 更新数字人状态 → SPEAKING
```

### 6.4 意图拦截 (Intent Mapping)

在 BFF 后端对 MiniMax 返回的文本进行关键词正则匹配：

| 关键词 | 触发指令 | 前端行为 |
|--------|----------|----------|
| `大屏` / `面板` / `数据` | `OPEN_DASHBOARD` | `router.push('/dashboard')` |
| `诊断` / `CT` / `病例` | `OPEN_DIAGNOSIS` | `router.push('/diagnosis')` |
| `考核` / `测试` | `OPEN_EXAM` | `router.push('/exam')` |
| `PPT` / `幻灯片` | `OPEN_PPT` | `router.push('/presentation')` |

前端 WebSocket 监听到指令后执行路由跳转 + 数字人状态切换至 SPEAKING。

### 6.5 音频自动播放策略

- 页面加载后显示 `EnterSystemModal` 弹窗（"进入系统"按钮）
- 用户点击后触发 `AudioContext.resume()`，解除浏览器自动播放限制
- 首次点击同时申请麦克风权限

---

## 7. 状态管理 (Pinia)

### 7.1 `useAvatarStore`
```typescript
{
  state: 'IDLE' | 'LISTENING' | 'SPEAKING',
  isMicActive: boolean,
  isConnected: boolean,    // WebSocket 连接状态
  currentCommand: string | null  // 当前意图指令
}
```

### 7.2 `useAudioStore`
```typescript
{
  isRecording: boolean,
  hasPermission: boolean,
  audioLevel: number,      // 音量级别 (0-1)，用于声波可视化
  error: string | null
}
```

---

## 8. BFF 后端设计

### 8.1 项目结构
```
server/
├── index.js              # Express + ws 入口
├── config.js             # 配置文件 (MiniMax URL, API Key, Model)
├── routes/
│   └── health.js         # 健康检查
└── websocket/
    └── minimax-proxy.js  # MiniMax WebSocket 代理 + 意图拦截
```

### 8.2 配置文件 (`config.js`)
```javascript
{
  minimax: {
    url: "wss://api.minimaxi.chat/v1/s2s",  // MiniMax S2S WebSocket URL
    model: "speech-01",
    apiKey: process.env.MINIMAX_API_KEY
  },
  port: 3001
}
```

### 8.3 API Key 安全
- API Key 存放在后端环境变量或配置文件中
- 前端不直接接触 MiniMax API Key
- 配置文件加入 `.gitignore`

---

## 9. Mock 数据策略

所有用户、影像、题库信息全部在前端写死 JSON 或后端内存中 Mock，不使用数据库：

- **Dashboard**：前端 Mock 统计数据（接诊量、准确率等）
- **Diagnosis**：前端 Mock CT 影像列表 + 诊断结果模板
- **Presentation**：前端 Mock 演示图片数组（使用 Unsplash 占位图）
- **Exam**：前端 Mock 题库 JSON + 实时统计数据

---

## 10. 快捷键设计

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `空格键` | 麦克风开关 | 兜底语音操作 |
| `1` | 跳转大屏 | 语音指令兜底 |
| `2` | 跳转诊断 | 语音指令兜底 |
| `3` | 跳转 PPT | 语音指令兜底 |
| `4` | 跳转测试 | 语音指令兜底 |
| `ESC` | 关闭弹窗/取消录音 | 通用取消操作 |

---

## 11. 开发阶段

### Phase 1: 工程初始化
- Vite + Vue3 项目搭建
- Tailwind CSS 深色主题配置
- Vue Router 4 个路由配置
- Pinia Store 初始化
- 左侧导航栏 + 页面骨架

### Phase 2: 数字人与 Lottie
- GlobalAvatar 组件编写
- Lottie 占位动画引入（3 组 JSON：IDLE / LISTENING / SPEAKING）
- 通过 Pinia Store 实现三态切换
- 点击按钮手动测试三态

### Phase 3: 录音与权限
- useAudioRecorder 钩子编写
- 浏览器麦克风权限申请
- 音频流切片采集 + 音量级别输出
- EnterSystemModal 自动播放策略处理

### Phase 4: WebSocket 链路
- BFF 后端搭建 (Express + ws)
- MiniMax S2S WebSocket 代理
- 前端 WebSocket 客户端
- 完整闭环：录音 → BFF → MiniMax → BFF → 前端播放
- 意图拦截 + 路由跳转

### Phase 5: 页面内容填充
- Dashboard：居中辐射式 ECharts 布局（仪表盘 + 环绕卡片）
- Diagnosis：CT 拖拽上传舱 + 流式输出区
- Presentation：高清图片轮播组件
- Exam：二维码 + 实时统计大屏

---

## 12. 项目目录结构

```
medical-ai-platform/
├── docs/
│   └── superpowers/specs/
│       └── 2026-05-15-medical-ai-platform-design.md
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── router/
│   │   └── index.js
│   ├── stores/
│   │   ├── avatar.js
│   │   └── audio.js
│   ├── components/
│   │   ├── layout/
│   │   │   └── SideNav.vue
│   │   ├── avatar/
│   │   │   ├── GlobalAvatar.vue
│   │   │   ├── LottiePlayer.vue
│   │   │   ├── WaveformVisualizer.vue
│   │   │   └── MicButton.vue
│   │   └── common/
│   │       └── EnterSystemModal.vue
│   ├── composables/
│   │   ├── useAudioRecorder.js
│   │   └── useWebSocket.js
│   ├── views/
│   │   ├── DashboardView.vue
│   │   ├── DiagnosisView.vue
│   │   ├── PresentationView.vue
│   │   └── ExamView.vue
│   ├── assets/
│   │   ├── lottie/
│   │   │   ├── avatar-idle.json
│   │   │   ├── avatar-listening.json
│   │   │   └── avatar-speaking.json
│   │   └── images/
│   ├── styles/
│   │   └── index.css
│   └── mock/
│       ├── dashboard-data.js
│       ├── diagnosis-data.js
│       ├── presentation-data.js
│       └── exam-data.js
├── server/
│   ├── index.js
│   ├── config.js
│   ├── routes/
│   │   └── health.js
│   └── websocket/
│       └── minimax-proxy.js
├── .env
├── .gitignore
├── package.json
├── vite.config.js
└── tailwind.config.js
```
