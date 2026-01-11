import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Key, Copy, Check, ArrowRight } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/v1'
const INSTALL_SCRIPT_URL = 'https://raw.githubusercontent.com/1776686596/vps-probe/main/install.sh'
const STORAGE_KEY = 'vps-probe-secret'

export default function Setup() {
  const navigate = useNavigate()
  const [secret, setSecret] = useState('')
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      setSecret(stored)
      setSaved(true)
    }
  }, [])

  const ingestUrl = API_URL.startsWith('http')
    ? `${API_URL}/ingest`
    : `${window.location.origin}${API_URL}/ingest`

  const command = `curl -fsSL ${INSTALL_SCRIPT_URL} | sudo bash -s -- \\
  --url ${ingestUrl} \\
  --secret ${secret || '<YOUR_SECRET>'}`

  const handleSave = () => {
    if (secret.trim()) {
      localStorage.setItem(STORAGE_KEY, secret.trim())
      setSaved(true)
    }
  }

  const handleCopy = async () => {
    if (!secret.trim()) return
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleContinue = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-400 mb-4">
            <Settings className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Welcome to VPS Probe</h1>
          <p className="text-zinc-400">Configure your monitoring in a few steps</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-6 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
              <Key className="h-4 w-4" />
              HMAC Secret
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value)
                  setSaved(false)
                }}
                placeholder="Enter your HMAC secret from Cloudflare Worker"
                className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                aria-label="HMAC Secret"
              />
              <button
                onClick={handleSave}
                disabled={!secret.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Find this in your Cloudflare Worker secrets or GitHub Actions output
            </p>
          </div>

          <div className="border-t border-zinc-700 pt-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Install Command</h3>
            <div className="relative">
              <pre className="bg-zinc-900 rounded-lg p-4 text-sm text-zinc-300 overflow-x-auto font-mono whitespace-pre-wrap break-all">
                {command}
              </pre>
              <button
                onClick={handleCopy}
                disabled={!secret.trim()}
                className="absolute top-2 right-2 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Copy to clipboard"
                aria-label="Copy command"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-700 pt-6">
            <button
              onClick={handleContinue}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 text-zinc-200 rounded-lg font-medium hover:bg-zinc-600 transition"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          After running the install command on your VPS, metrics will appear on the dashboard.
        </p>
      </div>
    </div>
  )
}
