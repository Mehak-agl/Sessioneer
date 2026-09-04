import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import CoordinatorSidebar from '../../components/CooordinatorSidebar'
import MyUnitsView from './CoordinatorMyUnitsView'
import UnitDetailView from './CoordinatorUnitDetailView'

interface Unit {
  id: number;
  name: string;
  code: string;
  semester: string;
}

type View = 'units' | 'unit-detail'

// Standalone page for the sidebar's "My Units" link. Mirrors the units
// list + unit detail behaviour that lives inside CoordinatorDashboard,
// but as its own self-sufficient page (fetches its own data) so this
// route doesn't depend on props passed down from the dashboard.
export default function CoordinatorUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [view, setView] = useState<View>('units')
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)

  const loadUnits = async () => {
    const fetchedUnits = await api.getUnits().catch(() => [])
    setUnits(fetchedUnits)
  }

  useEffect(() => {
    loadUnits()
  }, [])

  const handleSelectUnit = (unitId: number) => {
    const unit = units.find(u => u.id === unitId)
    if (unit) {
      setSelectedUnit(unit)
      setView('unit-detail')
    }
  }

  const handleUnitDeleted = (unitId: number) => {
    setUnits(prev => prev.filter(u => u.id !== unitId))
  }

  return (
    <div className="dashboard-page">
      <CoordinatorSidebar />
      <main className="main-content">
        {view === 'units' && (
          <MyUnitsView
            units={units}
            onUnitCreated={loadUnits}
            onSelectUnit={handleSelectUnit}
            onUnitDeleted={handleUnitDeleted}
          />
        )}

        {view === 'unit-detail' && selectedUnit && (
          <UnitDetailView
            unit={selectedUnit}
            onBack={() => setView('units')}
          />
        )}
      </main>
    </div>
  )
}
