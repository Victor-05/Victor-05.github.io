import DigitalTwin from '../components/twin/DigitalTwin.jsx'
import PageHeader from '../components/PageHeader.jsx'

export default function TwinPage() {
  return (
    <div className="pt-14">
      <PageHeader eyebrow="Digital Twin · simulare live" title="Celula UR20, simulată eveniment cu eveniment" text="Schimbați alimentarea, viteza robotului sau timpul de schimbare a paletului și vedeți unde apare blocajul. Un robot mai rapid nu crește automat producția fabricii." />
      <DigitalTwin bare />
    </div>
  )
}
