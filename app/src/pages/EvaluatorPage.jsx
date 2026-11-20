import Evaluator from '../components/Evaluator.jsx'
import PageHeader from '../components/PageHeader.jsx'

export default function EvaluatorPage() {
  return (
    <div className="pt-14">
      <PageHeader eyebrow="Evaluator de compatibilitate" title="Seamănă linia dumneavoastră cu aplicația testată?" text="Introduceți formatul găleții și ritmul liniei. Comparăm cu aplicația de referință PURATOS și vă spunem ce trebuie validat tehnic." />
      <Evaluator bare />
    </div>
  )
}
