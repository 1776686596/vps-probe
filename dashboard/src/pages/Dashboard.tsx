import { Activity } from 'lucide-react'
import ServerCard from '../components/ServerCard'
import InstallGuide from '../components/InstallGuide'
import { useNodes } from '../hooks/useNodes'

export default function Dashboard() {
  const { data: nodes, isLoading, error } = useNodes()

  if (isLoading) return <div className="p-10 text-center text-zinc-500" role="status">Loading...</div>
  if (error) return <div className="p-10 text-center text-red-500" role="alert">Error loading nodes</div>

  return (
    <div className="min-h-screen bg-zinc-900 p-4 md:p-8">
      <header className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">VPS Probe</h1>
            <p className="text-sm text-zinc-400">Real-time server monitoring</p>
          </div>
        </div>
        {nodes && nodes.length > 0 && <InstallGuide compact />}
      </header>

      {nodes?.length === 0 ? (
        <div className="py-10">
          <InstallGuide />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {nodes?.map((node) => <ServerCard key={node.id} node={node} />)}
        </div>
      )}
    </div>
  )
}
