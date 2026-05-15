export const mockDiagnosisData = {
  sampleImages: [
    { id: 1, name: 'CT-Chest-001.dcm', type: 'CT', bodyPart: '胸部' },
    { id: 2, name: 'CT-Abdomen-002.dcm', type: 'CT', bodyPart: '腹部' },
    { id: 3, name: 'MRI-Brain-003.dcm', type: 'MRI', bodyPart: '颅脑' }
  ],
  resultTemplates: {
    normal: {
      conclusion: '影像所见未见明显异常。',
      suggestions: ['定期复查', '如有不适请及时就诊']
    },
    nodule: {
      conclusion: '检测到肺部结节影。',
      suggestions: ['建议 3 个月后复查 HRCT', '结合肿瘤标志物综合评估', '必要时行 PET-CT 检查']
    },
    fracture: {
      conclusion: '检测到骨折线。',
      suggestions: ['建议骨科专科就诊', '必要时行手术治疗', '定期复查骨折愈合情况']
    }
  }
}
