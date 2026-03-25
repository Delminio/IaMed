import { normalizeText } from '../utils/text.js';

const symptomDictionary = [
  { key: 'cefaleia persistente', aliases: ['cefaleia persistente', 'dor de cabeca', 'dor de cabeça', 'cefaleia', 'headache'] },
  { key: 'edema', aliases: ['edema', 'inchaco', 'inchaço', 'pernas inchadas', 'edema em membros inferiores'] },
  { key: 'oliguria', aliases: ['oliguria', 'oligúria', 'diminuicao da urina', 'diminuição da urina', 'urina reduzida'] },
  { key: 'visao turva', aliases: ['visao turva', 'visão turva', 'alteracao visual', 'alteração visual', 'escotomas'] },
  { key: 'dor epigastrica', aliases: ['dor epigastrica', 'dor epigástrica', 'dor abdominal superior', 'epigastrio'] },
  { key: 'convulsoes', aliases: ['convulsao', 'convulsão', 'convulsoes', 'convulsões'] },
  { key: 'dispneia', aliases: ['dispneia', 'falta de ar', 'desconforto respiratorio', 'desconforto respiratório'] },
  { key: 'poliuria', aliases: ['poliuria', 'poliúria', 'urina demais', 'urinar muito'] },
  { key: 'polidipsia', aliases: ['polidipsia', 'muita sede', 'sede excessiva'] },
  { key: 'perda de peso', aliases: ['perda de peso', 'emagrecimento'] },
  { key: 'fadiga', aliases: ['fadiga', 'cansaco', 'cansaço'] },
  { key: 'vomitos', aliases: ['vomitos', 'vômitos', 'nauseas', 'náuseas'] }
];

function parseBloodPressure(text = '') {
  const match = text.match(/(\d{2,3})\s*\/?\s*(\d{2,3})/);
  if (!match) return null;
  const systolic = Number(match[1]);
  const diastolic = Number(match[2]);
  if (!systolic || !diastolic) return null;
  if (systolic < 70 || systolic > 260 || diastolic < 40 || diastolic > 180) return null;
  return { systolic, diastolic };
}

function parseGestationalWeeks(text = '') {
  const match = text.match(/(\d{1,2})\s*(semanas|semana|semanas de gestacao|semanas de gestação)/i);
  return match ? Number(match[1]) : null;
}

function extractSymptoms(text = '') {
  const normalized = normalizeText(text);
  return symptomDictionary
    .filter((item) => item.aliases.some((alias) => normalized.includes(normalizeText(alias))))
    .map((item) => item.key);
}

function parseNumericExam(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1].replace(',', '.'));
  }
  return null;
}

function parseExamData(text = '') {
  return {
    proteinuriaMg: parseNumericExam(text, [
      /protein[úu]ria[^\d]{0,15}(\d+[\.,]?\d*)\s*mg/i,
      /prote[ií]na[^\d]{0,15}(\d+[\.,]?\d*)\s*mg/i
    ]),
    fastingGlucose: parseNumericExam(text, [
      /glicemia(?:\s+de\s+jejum)?[^\d]{0,15}(\d+[\.,]?\d*)\s*mg\/d?l/i,
      /glucose[^\d]{0,15}(\d+[\.,]?\d*)\s*mg\/d?l/i
    ]),
    hba1c: parseNumericExam(text, [
      /hba1c[^\d]{0,15}(\d+[\.,]?\d*)\s*%/i,
      /hemoglobina glicada[^\d]{0,15}(\d+[\.,]?\d*)\s*%/i
    ])
  };
}

function inferRiskScore({ isPregnant, gestationalWeeks, pressure, symptoms, examData }) {
  let score = 0;
  if (isPregnant) score += 1;
  if ((gestationalWeeks || 0) >= 20) score += 1;
  if (pressure && (pressure.systolic >= 140 || pressure.diastolic >= 90)) score += 3;
  if (pressure && (pressure.systolic >= 160 || pressure.diastolic >= 110)) score += 2;
  if (symptoms.includes('cefaleia persistente')) score += 1;
  if (symptoms.includes('visao turva')) score += 1;
  if (symptoms.includes('dor epigastrica')) score += 1;
  if (symptoms.includes('oliguria')) score += 1;
  if (symptoms.includes('convulsoes')) score += 3;
  if ((examData.proteinuriaMg || 0) >= 300) score += 3;
  if ((examData.fastingGlucose || 0) >= 126) score += 3;
  if ((examData.hba1c || 0) >= 6.5) score += 2;
  return Math.min(score, 10);
}

function classifyColor(score) {
  if (score >= 7) return '🔴 Alto risco';
  if (score >= 4) return '🟡 Moderado';
  return '🟢 Baixo';
}

function buildPreeclampsiaAssessment(context) {
  const { pressure, gestationalWeeks, symptoms, examData } = context;
  const reasons = [];
  const recommendations = [];
  const conduct = [];
  let probableDiagnosis = 'suspeita de pré-eclâmpsia';
  let confidence = 'moderada';

  if (gestationalWeeks && gestationalWeeks >= 20) reasons.push(`gestação com ${gestationalWeeks} semanas`);
  if (pressure && (pressure.systolic >= 140 || pressure.diastolic >= 90)) {
    reasons.push(`pressão arterial elevada (${pressure.systolic}/${pressure.diastolic})`);
  }
  for (const symptom of ['cefaleia persistente', 'edema', 'oliguria', 'visao turva', 'dor epigastrica']) {
    if (symptoms.includes(symptom)) reasons.push(symptom);
  }

  if ((examData.proteinuriaMg || 0) >= 300) {
    probableDiagnosis = 'provável pré-eclâmpsia';
    confidence = 'alta';
    reasons.push(`proteinúria sugestiva (${examData.proteinuriaMg} mg)`);
  } else if (pressure && (pressure.systolic >= 140 || pressure.diastolic >= 90) && symptoms.length >= 2) {
    probableDiagnosis = 'provável pré-eclâmpsia';
    confidence = 'moderada-alta';
  }

  recommendations.push('Recomendado considerar confirmação/estratificação com proteinúria urinária e avaliação laboratorial materna.');
  recommendations.push('Recomendado considerar hemograma/plaquetas, creatinina/função renal e enzimas hepáticas conforme protocolo do serviço.');
  if ((examData.proteinuriaMg || 0) < 300) {
    recommendations.push('Recomendado considerar exame de sangue para apoio à comprovação do quadro, sempre junto da investigação urinária apropriada.');
  }

  conduct.push('Pode ser apropriado manter observação clínica e reavaliações seriadas da pressão arterial conforme protocolo institucional.');
  conduct.push('Pode ser apropriado discutir necessidade de internação e monitorização materno-fetal se persistirem sinais de alarme ou alterações laboratoriais.');
  if (pressure && (pressure.systolic >= 140 || pressure.diastolic >= 90)) {
    conduct.push('Pode ser apropriado avaliar controle pressórico com anti-hipertensivos próprios para gestação, de acordo com avaliação médica e protocolo local.');
  }
  if ((examData.proteinuriaMg || 0) >= 300 || symptoms.includes('convulsoes') || (pressure && (pressure.systolic >= 160 || pressure.diastolic >= 110))) {
    conduct.push('Se houver sinais de gravidade, pode ser apropriado discutir uso de sulfato de magnésio e definição do momento do parto conforme idade gestacional e condição materno-fetal.');
  }

  return {
    type: 'suspeita de pré-eclâmpsia',
    probableDiagnosis,
    confidence,
    rationale: reasons,
    recommendations,
    conduct,
    suggestedNextData: [
      'pressões arteriais seriadas',
      'resultado de proteinúria urinária',
      'plaquetas',
      'creatinina',
      'AST/ALT',
      'sinais fetais relevantes'
    ]
  };
}

function buildGestationalDiabetesAssessment(context) {
  const { isPregnant, examData, symptoms } = context;
  const reasons = [];
  const recommendations = [];
  const conduct = [];
  let probableDiagnosis = 'suspeita de diabetes gestacional';
  let confidence = 'moderada';

  if (isPregnant) reasons.push('gestação em curso');
  if ((examData.fastingGlucose || 0) >= 92) reasons.push(`glicemia alterada (${examData.fastingGlucose} mg/dL)`);
  if (symptoms.includes('polidipsia')) reasons.push('polidipsia');
  if (symptoms.includes('poliuria')) reasons.push('poliúria');

  if ((examData.fastingGlucose || 0) >= 126 || (examData.hba1c || 0) >= 6.5) {
    probableDiagnosis = 'provável diabetes manifesto/hiperglicemia significativa na gestação';
    confidence = 'alta';
  } else if ((examData.fastingGlucose || 0) >= 92) {
    probableDiagnosis = 'provável diabetes gestacional';
    confidence = 'moderada-alta';
  }

  recommendations.push('Recomendado considerar confirmação com os exames glicêmicos previstos no protocolo do serviço e revisão dos valores prévios.');
  recommendations.push('Recomendado considerar registro seriado de glicemias, alimentação e sintomas.');
  conduct.push('Pode ser apropriado acompanhar evolução com orientação médica, monitorização glicêmica e reavaliação obstétrica/endócrina conforme contexto.');

  return {
    type: 'diabetes gestacional',
    probableDiagnosis,
    confidence,
    rationale: reasons,
    recommendations,
    conduct,
    suggestedNextData: ['glicemia de jejum', 'TOTG se aplicável', 'HbA1c', 'sintomas', 'peso/ganho ponderal']
  };
}

function buildDiabetesAssessment(context) {
  const { examData, symptoms } = context;
  const reasons = [];
  const recommendations = [];
  const conduct = [];
  let probableDiagnosis = 'suspeita de diabetes';
  let confidence = 'moderada';

  if ((examData.fastingGlucose || 0) >= 126) reasons.push(`glicemia compatível com diabetes (${examData.fastingGlucose} mg/dL)`);
  if ((examData.hba1c || 0) >= 6.5) reasons.push(`HbA1c elevada (${examData.hba1c}%)`);
  if (symptoms.includes('polidipsia')) reasons.push('polidipsia');
  if (symptoms.includes('poliuria')) reasons.push('poliúria');
  if (symptoms.includes('perda de peso')) reasons.push('perda de peso');

  if ((examData.fastingGlucose || 0) >= 126 || (examData.hba1c || 0) >= 6.5) {
    probableDiagnosis = 'provável diabetes';
    confidence = 'alta';
  }

  recommendations.push('Recomendado considerar confirmação diagnóstica conforme protocolo do serviço e repetição/validação dos exames quando necessário.');
  recommendations.push('Recomendado considerar estratificação metabólica com glicemia, HbA1c e avaliação clínica completa.');
  conduct.push('Pode ser apropriado planejar seguimento clínico e medidas terapêuticas conforme avaliação médica e diretrizes adotadas pelo serviço.');

  return {
    type: 'suspeita de diabetes',
    probableDiagnosis,
    confidence,
    rationale: reasons,
    recommendations,
    conduct,
    suggestedNextData: ['glicemia de jejum', 'HbA1c', 'medicações atuais', 'sintomas', 'histórico prévio']
  };
}

export function analyzeClinicalContext({ question = '', chartData = {} }) {
  const mergedText = [
    question,
    chartData.age ? `idade ${chartData.age}` : '',
    chartData.weeks ? `${chartData.weeks} semanas` : '',
    chartData.symptoms || '',
    chartData.exams || '',
    chartData.notes || ''
  ].join(' ');

  const normalized = normalizeText(mergedText);
  const isPregnant = /(gestante|gravida|grávida|obstetr)/.test(normalized) || Number(chartData.weeks || 0) > 0;
  const gestationalWeeks = Number(chartData.weeks || 0) || parseGestationalWeeks(mergedText);
  const pressure = parseBloodPressure(`${question} ${chartData.notes || ''} ${chartData.exams || ''}`);
  const symptoms = Array.from(new Set([
    ...extractSymptoms(mergedText),
    ...String(chartData.symptoms || '').split(',').map((item) => normalizeText(item)).filter(Boolean)
  ])).map((item) => item.replace(/\s+/g, ' ').trim());
  const examData = parseExamData(`${chartData.exams || ''} ${question}`);

  const preeclampsiaSignals = isPregnant && (gestationalWeeks >= 20 || gestationalWeeks === null) && pressure && (pressure.systolic >= 140 || pressure.diastolic >= 90);
  const diabetesSignals = (examData.fastingGlucose || 0) >= 92 || (examData.hba1c || 0) >= 5.7 || symptoms.includes('polidipsia') || symptoms.includes('poliuria');

  let primaryAssessment;
  if (preeclampsiaSignals) primaryAssessment = buildPreeclampsiaAssessment({ isPregnant, gestationalWeeks, pressure, symptoms, examData });
  else if (isPregnant && diabetesSignals) primaryAssessment = buildGestationalDiabetesAssessment({ isPregnant, gestationalWeeks, pressure, symptoms, examData });
  else if (diabetesSignals) primaryAssessment = buildDiabetesAssessment({ isPregnant, gestationalWeeks, pressure, symptoms, examData });
  else {
    primaryAssessment = {
      type: 'fora do escopo',
      probableDiagnosis: 'fora do escopo principal (pré-eclâmpsia/diabetes)',
      confidence: 'baixa',
      rationale: ['o caso não reuniu elementos suficientes para regras principais do sistema'],
      recommendations: ['Recomendado complementar dados clínicos, sintomas e exames para uma triagem mais útil.'],
      conduct: ['Pode ser apropriado revisar o caso com dados adicionais ou encaminhar para avaliação clínica convencional.'],
      suggestedNextData: ['idade', 'semanas de gestação se houver', 'sintomas', 'exames laboratoriais relevantes']
    };
  }

  const riskScore = inferRiskScore({ isPregnant, gestationalWeeks, pressure, symptoms, examData });
  const examInterpretation = [];
  if (examData.proteinuriaMg != null) {
    examInterpretation.push(
      (examData.proteinuriaMg >= 300)
        ? `Proteinúria de ${examData.proteinuriaMg} mg: valor sugestivo de proteinúria significativa.`
        : `Proteinúria de ${examData.proteinuriaMg} mg: abaixo do ponto clássico de 300 mg, exigindo correlação clínica.`
    );
  }
  if (examData.fastingGlucose != null) {
    examInterpretation.push(
      (examData.fastingGlucose >= 126)
        ? `Glicemia de ${examData.fastingGlucose} mg/dL: compatível com hiperglicemia importante.`
        : (examData.fastingGlucose >= 92 && isPregnant)
          ? `Glicemia de ${examData.fastingGlucose} mg/dL: merece atenção no contexto gestacional.`
          : `Glicemia de ${examData.fastingGlucose} mg/dL: interpretar conforme contexto clínico e protocolo do serviço.`
    );
  }
  if (examData.hba1c != null) {
    examInterpretation.push(
      (examData.hba1c >= 6.5)
        ? `HbA1c de ${examData.hba1c}%: compatível com descontrole glicêmico relevante.`
        : `HbA1c de ${examData.hba1c}%: correlacionar com restante da avaliação clínica.`
    );
  }

  return {
    patientSummary: {
      age: chartData.age || null,
      gestationalWeeks: gestationalWeeks || null,
      bloodPressure: pressure ? `${pressure.systolic}/${pressure.diastolic}` : null,
      symptoms,
      exams: examData,
      notes: chartData.notes || ''
    },
    classification: classifyColor(riskScore),
    riskScore,
    type: primaryAssessment.type,
    probableDiagnosis: primaryAssessment.probableDiagnosis,
    confidence: primaryAssessment.confidence,
    rationale: primaryAssessment.rationale,
    recommendations: primaryAssessment.recommendations,
    conduct: primaryAssessment.conduct,
    suggestedNextData: primaryAssessment.suggestedNextData,
    examInterpretation
  };
}
