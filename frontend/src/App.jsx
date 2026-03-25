import { useMemo, useState } from 'react';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const emptyChart = {
  age: '',
  weeks: '',
  symptoms: '',
  exams: '',
  notes: ''
};

function structuredLabel(value) {
  if (!value) return '—';
  return value;
}

export default function App() {
  const [question, setQuestion] = useState('Gestante de 31 semanas com PA 145/95, cefaleia persistente, edema e oligúria.');
  const [mode, setMode] = useState('hybrid');
  const [chartData, setChartData] = useState({
    age: '28',
    weeks: '31',
    symptoms: 'cefaleia persistente, edema, oligúria',
    exams: 'PA 145/95',
    notes: 'Paciente em acompanhamento; inserir evolução clínica e novos exames conforme forem saindo.'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  const modes = useMemo(() => [
    { value: 'local', label: 'Local' },
    { value: 'internet', label: 'Internet' },
    { value: 'hybrid', label: 'Híbrido' }
  ], []);

  function updateChart(key, value) {
    setChartData((current) => ({ ...current, [key]: value }));
  }

  async function ask() {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode, chartData })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao consultar a API.');
      setResult(data);
      setHistory((current) => [{
        timestamp: new Date().toLocaleString('pt-BR'),
        classification: data.structuredAnalysis?.classification,
        probableDiagnosis: data.structuredAnalysis?.probableDiagnosis,
        score: data.structuredAnalysis?.riskScore,
        question,
        chartData
      }, ...current].slice(0, 8));
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="hero">
        <div>
          <p className="eyebrow">IA médica com RAG local + web</p>
          <h1>MedScope AI</h1>
          <p className="subtitle">
            Pré-eclâmpsia e diabetes com apoio por regras clínicas, prontuário estruturado, interpretação de exames,
            score de risco e 3 modos de resposta. A base local continua protegida e só você sobe PDFs.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panelGrid">
          <div>
            <label>Pergunta clínica</label>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={7} />
          </div>

          <div>
            <label>Prontuário estruturado</label>
            <div className="formGrid">
              <input placeholder="Idade" value={chartData.age} onChange={(e) => updateChart('age', e.target.value)} />
              <input placeholder="Semanas de gestação" value={chartData.weeks} onChange={(e) => updateChart('weeks', e.target.value)} />
              <textarea placeholder="Sintomas (separe por vírgula)" rows={3} value={chartData.symptoms} onChange={(e) => updateChart('symptoms', e.target.value)} />
              <textarea placeholder="Exames / resultados" rows={3} value={chartData.exams} onChange={(e) => updateChart('exams', e.target.value)} />
              <textarea className="full" placeholder="Notas de evolução / observações" rows={4} value={chartData.notes} onChange={(e) => updateChart('notes', e.target.value)} />
            </div>
          </div>
        </div>

        <label>Modo</label>
        <div className="chips">
          {modes.map((item) => (
            <button
              key={item.value}
              className={mode === item.value ? 'chip active' : 'chip'}
              onClick={() => setMode(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="actionsRow">
          <button className="primary" onClick={ask} disabled={loading}>
            {loading ? 'Analisando...' : 'Perguntar à IA'}
          </button>
          <button className="secondary" onClick={() => { setChartData(emptyChart); setQuestion(''); }}>
            Limpar caso
          </button>
        </div>
      </div>

      <div className="overviewGrid">
        <section className="card statCard">
          <span className="statLabel">Classificação do caso</span>
          <strong>{structuredLabel(result?.structuredAnalysis?.classification)}</strong>
        </section>
        <section className="card statCard">
          <span className="statLabel">Tipo</span>
          <strong>{structuredLabel(result?.structuredAnalysis?.type)}</strong>
        </section>
        <section className="card statCard">
          <span className="statLabel">Score de risco</span>
          <strong>{result?.structuredAnalysis?.riskScore != null ? `${result.structuredAnalysis.riskScore}/10` : '—'}</strong>
        </section>
        <section className="card statCard">
          <span className="statLabel">Diagnóstico provável</span>
          <strong>{structuredLabel(result?.structuredAnalysis?.probableDiagnosis)}</strong>
        </section>
      </div>

      <div className="grid fourCols">
        <section className="card big">
          <h2>Resposta da IA</h2>
          <pre>{result?.error || result?.answer || 'A resposta aparecerá aqui.'}</pre>
        </section>

        <section className="card">
          <h2>Diagnóstico provável e conduta</h2>
          <div className="stackedList">
            <article>
              <h3>Diagnóstico provável</h3>
              <p>{structuredLabel(result?.structuredAnalysis?.probableDiagnosis)}</p>
            </article>
            <article>
              <h3>Interpretação de exames</h3>
              <ul>
                {(result?.structuredAnalysis?.examInterpretation || []).map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </article>
            <article>
              <h3>Recomendações</h3>
              <ul>
                {(result?.structuredAnalysis?.recommendations || []).map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </article>
            <article>
              <h3>Conduta provável</h3>
              <ul>
                {(result?.structuredAnalysis?.conduct || []).map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            </article>
          </div>
        </section>

        <section className="card">
          <h2>Fontes locais</h2>
          {(result?.localSources || []).map((item, index) => (
            <article key={index} className="sourceItem">
              <strong>{item.title}</strong>
              <span>{item.preview}</span>
            </article>
          ))}
        </section>

        <section className="card">
          <h2>Fontes internet</h2>
          {(result?.internetSources || []).map((item, index) => (
            <article key={index} className="sourceItem">
              <strong>{item.title}</strong>
              <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
              <span>{item.preview}</span>
            </article>
          ))}
        </section>
      </div>

      <div className="grid twoCols">
        <section className="card">
          <h2>Fundamentos do caso</h2>
          <ul>
            {(result?.structuredAnalysis?.rationale || []).map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </section>

        <section className="card">
          <h2>Dados que ajudam na evolução</h2>
          <ul>
            {(result?.structuredAnalysis?.suggestedNextData || []).map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        </section>
      </div>

      <section className="card historyCard">
        <h2>Evolução do prontuário nesta sessão</h2>
        {!history.length && <p className="muted">As análises feitas nesta sessão aparecerão aqui para comparação rápida.</p>}
        {history.map((entry, index) => (
          <article key={index} className="historyItem">
            <div className="historyMeta">
              <strong>{entry.classification || 'Sem classificação'}</strong>
              <span>{entry.timestamp}</span>
            </div>
            <p><strong>Diagnóstico provável:</strong> {entry.probableDiagnosis || '—'}</p>
            <p><strong>Score:</strong> {entry.score != null ? `${entry.score}/10` : '—'}</p>
            <p><strong>Pergunta:</strong> {entry.question}</p>
            <p><strong>Prontuário:</strong> idade {entry.chartData.age || '—'}, semanas {entry.chartData.weeks || '—'}, sintomas {entry.chartData.symptoms || '—'}.</p>
          </article>
        ))}
      </section>
    </div>
  );
}
