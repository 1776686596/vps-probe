import { useState } from 'react'
import { Copy, Check, Terminal, Plus } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/v1'
const INSTALL_SCRIPT_URL = 'https://raw.githubusercontent.com/1776686596/vps-probe/main/install.sh'

export default function InstallGuide({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [show, setShow] = useState(!compact)
  const [secret, setSecret] = useState('')

  const ingestUrl = API_URL.startsWith('http')
    ? `${API_URL}/ingest`
    : `${window.location.origin}${API_URL}/ingest`

  const command = `curl -fsSL ${INSTALL_SCRIPT_URL} | sudo bash -s -- \\
  --url ${ingestUrl} \\
  --secret ${secret || '<YOUR_HMAC_SECRET>'}`

  const copyCommand = async () => {
    await navigator.clipboard.writeText(command)
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-6 max-w-2xl mx-auto">
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

      <div className="mb-4">
        <label className="block text-xs text-zinc-500 mb-1">HMAC Secret</label>
        <input
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Enter your HMAC secret"
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
        />
        <p className="text-xs text-zinc-600 mt-1">
          The secret configured in your Cloudflare Worker
        </p>
      </div>

      <div className="relative">
        <pre className="bg-zinc-900 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto font-mono">
          {command}
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
    </div>
  )
}
