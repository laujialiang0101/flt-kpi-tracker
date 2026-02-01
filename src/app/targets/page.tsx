'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, FileSpreadsheet, Check, X, AlertCircle, RefreshCw, Users, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { downloadTargetTemplate, uploadTargets, downloadOutletTargetTemplate, uploadOutletTargets } from '@/lib/api'

type TabType = 'individual' | 'outlet'

export default function TargetsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('individual')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; errors?: string[]; warnings?: string[] } | null>(null)
  const [downloading, setDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (!authLoading && isAuthenticated && !user?.permissions?.can_upload_targets) {
      router.push('/')
    }
  }, [authLoading, isAuthenticated, user, router])

  // Reset file and result when switching tabs
  useEffect(() => {
    setFile(null)
    setResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [activeTab])

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      const blob = activeTab === 'individual'
        ? await downloadTargetTemplate()
        : await downloadOutletTargetTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = activeTab === 'individual' ? 'target_template.xlsx' : 'outlet_target_template.xlsx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
      setResult({ success: false, message: 'Failed to download template' })
    } finally {
      setDownloading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ]
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx')) {
        setResult({ success: false, message: 'Please upload an Excel file (.xlsx)' })
        return
      }
      setFile(selectedFile)
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !token) return

    setUploading(true)
    setResult(null)

    try {
      const response = activeTab === 'individual'
        ? await uploadTargets(file, token)
        : await uploadOutletTargets(file, token)

      if (response.success) {
        setResult({
          success: true,
          message: `Successfully uploaded ${response.rows_processed} ${activeTab === 'individual' ? 'staff' : 'outlet'} targets`,
          errors: response.errors,
          warnings: response.warnings
        })
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setResult({ success: false, message: response.detail || 'Upload failed' })
      }
    } catch (error: any) {
      const msg = error.message || 'Upload failed'
      if (msg.toLowerCase().includes('invalid session') || msg.includes('(401)')) {
        setResult({ success: false, message: 'Session expired. Please log out and log in again, then retry.' })
      } else {
        setResult({ success: false, message: msg })
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      setResult(null)
    } else {
      setResult({ success: false, message: 'Please upload an Excel file (.xlsx)' })
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!isAuthenticated || !user?.permissions?.can_upload_targets) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Target Management</h1>
        <p className="text-gray-500 mt-1">
          Upload monthly targets for staff members or outlets
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('individual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === 'individual'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Individual Targets
        </button>
        <button
          onClick={() => setActiveTab('outlet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === 'outlet'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Outlet Targets
        </button>
      </div>

      {/* Instructions Card */}
      <div className={`border rounded-xl p-6 ${activeTab === 'individual' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}`}>
        <h2 className={`font-semibold mb-3 ${activeTab === 'individual' ? 'text-blue-900' : 'text-purple-900'}`}>
          How to Upload {activeTab === 'individual' ? 'Individual' : 'Outlet'} Targets
        </h2>
        <ol className={`list-decimal list-inside space-y-2 text-sm ${activeTab === 'individual' ? 'text-blue-800' : 'text-purple-800'}`}>
          <li>Download the Excel template using the button below</li>
          {activeTab === 'individual' ? (
            <>
              <li>Fill in the staff IDs and target values for each KPI</li>
              <li>Use format <code className="bg-blue-100 px-1 rounded">YYYYMM</code> for year_month (e.g., 202501 for January 2025)</li>
            </>
          ) : (
            <>
              <li>The template is pre-filled with all active outlets</li>
              <li>Fill in the target values for each outlet and KPI</li>
              <li>Year_month is pre-filled with current month - modify if needed</li>
            </>
          )}
          <li>Upload the completed file</li>
        </ol>

        <div className="mt-4">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className={`inline-flex items-center px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-colors ${
              activeTab === 'individual'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {downloading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download {activeTab === 'individual' ? 'Staff' : 'Outlet'} Template
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Upload {activeTab === 'individual' ? 'Staff' : 'Outlet'} Targets
        </h2>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <FileSpreadsheet className="w-12 h-12 text-green-500 mb-3" />
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="mt-3 text-sm text-red-600 hover:text-red-700"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600">
                <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500 mt-1">Excel files only (.xlsx)</p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload {activeTab === 'individual' ? 'Staff' : 'Outlet'} Targets
              </>
            )}
          </button>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`mt-4 p-4 rounded-lg flex items-start ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {result.success ? (
              <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </p>
              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-semibold text-amber-800">Unrecognised Staff IDs ({result.warnings.length}):</p>
                  <p className="text-xs text-amber-600 mt-1">These targets were uploaded but won&apos;t match any staff. Please check for typos in the Excel and re-upload with corrected IDs.</p>
                  <ul className="list-disc list-inside text-sm text-amber-700 mt-2">
                    {result.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-700">Row errors:</p>
                  <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Excel Format Reference */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Excel Column Reference</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-medium text-gray-700">Column</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Description</th>
                <th className="px-3 py-2 text-left font-medium text-gray-700">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeTab === 'individual' ? (
                <>
                  <tr><td className="px-3 py-2 font-mono">staff_id</td><td className="px-3 py-2">Staff code</td><td className="px-3 py-2">184</td></tr>
                  <tr><td className="px-3 py-2 font-mono">year_month</td><td className="px-3 py-2">Target period (YYYYMM)</td><td className="px-3 py-2">202501</td></tr>
                </>
              ) : (
                <>
                  <tr><td className="px-3 py-2 font-mono">outlet_id</td><td className="px-3 py-2">Outlet code</td><td className="px-3 py-2">HQ</td></tr>
                  <tr><td className="px-3 py-2 font-mono">outlet_name</td><td className="px-3 py-2">Outlet name (for reference)</td><td className="px-3 py-2">HEAD QUARTERS</td></tr>
                  <tr><td className="px-3 py-2 font-mono">year_month</td><td className="px-3 py-2">Target period (YYYYMM)</td><td className="px-3 py-2">202501</td></tr>
                </>
              )}
              <tr><td className="px-3 py-2 font-mono">total_sales</td><td className="px-3 py-2">Total sales target (RM)</td><td className="px-3 py-2">50000</td></tr>
              {activeTab === 'outlet' && (
                <tr><td className="px-3 py-2 font-mono">gross_profit</td><td className="px-3 py-2">Gross Profit target (RM)</td><td className="px-3 py-2">10000</td></tr>
              )}
              <tr><td className="px-3 py-2 font-mono">house_brand</td><td className="px-3 py-2">House Brand sales (RM)</td><td className="px-3 py-2">5000</td></tr>
              <tr><td className="px-3 py-2 font-mono">focused_1</td><td className="px-3 py-2">Focused Item 1 (RM)</td><td className="px-3 py-2">3000</td></tr>
              <tr><td className="px-3 py-2 font-mono">focused_2</td><td className="px-3 py-2">Focused Item 2 (RM)</td><td className="px-3 py-2">2000</td></tr>
              <tr><td className="px-3 py-2 font-mono">focused_3</td><td className="px-3 py-2">Focused Item 3 (RM)</td><td className="px-3 py-2">1000</td></tr>
              <tr><td className="px-3 py-2 font-mono">pwp</td><td className="px-3 py-2">PWP sales (RM)</td><td className="px-3 py-2">500</td></tr>
              <tr><td className="px-3 py-2 font-mono">clearance</td><td className="px-3 py-2">Stock Clearance (RM)</td><td className="px-3 py-2">500</td></tr>
              <tr><td className="px-3 py-2 font-mono">transactions</td><td className="px-3 py-2">Transaction count</td><td className="px-3 py-2">500</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Info about progress bars */}
      <div className={`rounded-xl p-4 ${activeTab === 'individual' ? 'bg-blue-50' : 'bg-purple-50'}`}>
        <p className={`text-sm ${activeTab === 'individual' ? 'text-blue-700' : 'text-purple-700'}`}>
          {activeTab === 'individual' ? (
            <>After uploading, staff members will see progress bars on their Dashboard showing their achievement against these targets.</>
          ) : (
            <>After uploading, the Team page will show progress bars for outlet-level targets. When viewing multiple outlets, targets are summed up automatically.</>
          )}
        </p>
      </div>
    </div>
  )
}
