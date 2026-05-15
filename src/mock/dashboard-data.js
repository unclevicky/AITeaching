export const mockDashboardData = {
  timeline: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
  patients: [12, 28, 45, 67, 52, 38, 55, 72, 63],
  aiDiagnosis: [8, 22, 38, 58, 44, 32, 48, 65, 56],
  accuracy: 96.8,
  stats: [
    { label: '今日接诊', value: '432', color: '#00d4ff' },
    { label: 'AI 辅助诊断', value: '372', color: '#00ccaa' },
    { label: '准确率', value: '96.8%', color: '#0066ff' },
    { label: '活跃设备', value: '28', color: '#ff6b9d' }
  ],
  bottomCards: [
    {
      title: '科室分布',
      items: [
        { label: '影像科', value: '35%', color: '#00d4ff' },
        { label: '心内科', value: '28%', color: '#00ccaa' },
        { label: '呼吸科', value: '22%', color: '#0066ff' },
        { label: '其他', value: '15%', color: '#ff6b9d' }
      ]
    },
    {
      title: 'AI 诊断类型',
      items: [
        { label: '肺结节检测', value: '42%', color: '#00d4ff' },
        { label: '骨折识别', value: '25%', color: '#00ccaa' },
        { label: '冠脉分析', value: '20%', color: '#0066ff' },
        { label: '其他', value: '13%', color: '#ff6b9d' }
      ]
    },
    {
      title: '系统状态',
      items: [
        { label: 'GPU 利用率', value: '78%', color: '#00ccaa' },
        { label: '内存使用', value: '62%', color: '#00d4ff' },
        { label: '响应延迟', value: '12ms', color: '#00ccaa' },
        { label: '在线用户', value: '156', color: '#00d4ff' }
      ]
    }
  ]
}
