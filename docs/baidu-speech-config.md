# 百度语音识别配置指南

## 概述

系统已集成百度语音识别 API 作为 Web Speech API 的备用方案。当浏览器无法访问 Google 的语音识别服务时（如国内网络环境），会自动切换到百度语音识别。

## 配置步骤

### 1. 注册百度智能云账号

访问 [百度智能云](https://console.bce.baidu.com/) 注册账号并完成实名认证。

### 2. 创建语音技术应用

1. 登录百度智能云控制台
2. 导航至 **产品服务** → **人工智能** → **语音技术**
3. 点击 **创建应用**
4. 填写应用名称（如：医疗AI平台）
5. 选择 **语音识别** 服务
6. 点击 **创建**

### 3. 获取 API Key 和 Secret Key

创建应用后，在应用详情页面可以找到：

- **API Key (App ID)**
- **Secret Key (Secret Key)**

### 4. 配置环境变量

编辑项目根目录的 `.env` 文件：

```env
# 百度语音识别配置
BAIDU_SPEECH_API_KEY=你的API Key
BAIDU_SPEECH_SECRET_KEY=你的Secret Key
# 语种设置: 1537=中文普通话, 15372=中英文混合, 1737=英语, 1637=粤语
BAIDU_SPEECH_DEV_PID=1537
# 采样率: 16000 或 8000
BAIDU_SPEECH_SAMPLE_RATE=16000
```

### 5. 重启服务

配置完成后，重启后端服务：

```bash
npm run server
```

或同时重启前后端：

```bash
npm start
```

## 使用说明

### 自动切换

系统会自动检测 Web Speech API 是否可用：

1. **Web Speech API 可用**：优先使用浏览器内置识别（更快）
2. **Web Speech API 不可用**：自动切换到百度语音识别
3. **两者都不可用**：显示文字输入框作为备选

### 语种支持

通过修改 `BAIDU_SPEECH_DEV_PID` 参数选择语种：

| devPid | 语言 |
|--------|------|
| 1537 | 中文普通话（默认） |
| 15372 | 中英文混合 |
| 1737 | 英语 |
| 1637 | 粤语 |
| 1837 | 四川话 |

### 音频限制

- 单次录音最长 **60 秒**
- 采样率：**16000Hz** 或 **8000Hz**
- 格式：**PCM**（16bit, 单声道）

## API 说明

### 后端接口

#### POST /api/speech/recognize

接收 PCM 音频数据，返回识别结果。

**请求体：**

```json
{
  "audio": "base64编码的PCM音频",
  "sampleRate": 16000,
  "devPid": 1537
}
```

**响应：**

```json
{
  "text": "识别结果文本",
  "error": null
}
```

#### GET /api/speech/status

检查百度语音识别服务配置状态。

**响应：**

```json
{
  "configured": true,
  "provider": "baidu"
}
```

## 费用说明

百度语音识别提供免费额度：

- **标准版**：每月 5 小时免费额度
- **短语音识别**：每月 5 小时免费额度

超出部分按小时计费，具体价格请参考 [百度语音技术定价](https://cloud.baidu.com/doc/SPEECH/s/9k382eh5b)。

## 故障排除

### 1. 识别失败

检查日志中的错误信息：

- `err_no=3301`：音频质量差，请重新录音
- `err_no=3302`：音频格式错误
- `err_no=3303`：认证失败，检查 API Key 和 Secret Key

### 2. 超时

- 检查网络连接是否正常
- 确认百度智能云控制台没有欠费

### 3. Token 过期

系统会自动缓存和刷新 Token（有效期 30 天），一般无需手动处理。

## 相关链接

- [百度智能云控制台](https://console.bce.baidu.com/)
- [语音技术文档](https://cloud.baidu.com/doc/SPEECH/index.html)
- [API 参考](https://cloud.baidu.com/doc/SPEECH/s/9k382evj5)
