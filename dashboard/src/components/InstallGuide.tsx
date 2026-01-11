import { useState, useEffect } from 'react'
import { Copy, Check, Terminal, Plus, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/v1'

interface InstallInfo {
  command: string
  api_url: string
  secret: string
}

export default function InstallGuide({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [show, setShow] = useState(!compact)
  const [installInfo, setInstallInfo] = useState<InstallInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (show && !installInfo) {
      setLoading(true)
      setError(null)
      fetch(`${API_URL}/install`)
        .then(res => res.json())
        .then(data => {
          setInstallInfo(data)
          setLoading(false)
        })
        .catch(() => {
          setError('Failed to load install command')
          setLoading(false)
        })
    }
  }, [show, installInfo])

  const copyCommand = async () => {
    if (!installInfo) return
    await navigator.clipboard.writeText(installInfo.command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (compact && !show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition"
      >
        <Plus className="h-4 w-4" />
        Add Node
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2 text-green-400">
            <Terminal className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-200">Add New Node</h2>
        </div>
        {compact && (
          <button
            onClick={() => setShow(false)}
            className="text-zinc-500 hover:text-zinc-300 text-sm"
          >
            Close
          </button>
        )}
      </div>

      <p className="text-sm text-zinc-400 mb-4">
        Run this command on your VPS to start monitoring:
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : error ? (
        <div className="text-red-400 text-sm py-4">{error}</div>
      ) : installInfo ? (
        <>
          <div className="relative">
            <pre className="bg-zinc-950 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto font-mono whitespace-pre-wrap break-all">
              {installInfo.command}
            </pre>
            <button
              onClick={copyCommand}
              className="absolute top-2 right-2 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-4 text-xs text-zinc-500 space-y-1">
            <p>After installation, the agent will start reporting metrics every 10 seconds.</p>
            <p>Manage service: <code className="text-zinc-400">systemctl status vps-probe-agent</code></p>
          </div>
        </>
      ) : null}
    </div>
  )
}
