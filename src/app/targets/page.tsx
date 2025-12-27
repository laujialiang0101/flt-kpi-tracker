'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, FileSpreadsheet, Check, X, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { downloadTargetTemplate, uploadTargets } from '@/lib/api'

export default function TargetsPage() {
  const router = useRouter()
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(null)
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

  const handleDownloadTemplate = async () => {
    setDownloading(true)
    try {
      const blob = await downloadTargetTemplate()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'target_template.xlsx'
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
      const response = await uploadTargets(file, token)
      if (response.success) {
        setResult({
          success: true,
          message: `Successfully uploaded ${response.rows_processed} targets`,
          errors: response.errors
        })
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setResult({ success: false, message: response.detail || 'Upload failed' })
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Upload failed' })
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
          Upload monthly targets for staff members
        </p>
      </div>

      {/* Instructions Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="font-semibold text-blue-900 mb-3">How to Upload Targets</h2>
        <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
          <li>Download the Excel template using the button below</li>
          <li>Fill in the staff IDs and target values for each KPI</li>
          <li>Use format <code className="bg-blue-100 px-1 rounded">YYYYMM</code> for year_month (e.g., 202501 for January 2025)</li>
          <li>Upload the completed file</li>
        </ol>

        <div className="mt-4">
          <button
            onClick={handleDownloadTemplate}
            disabled={downloading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {downloading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download Template
          </button>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Upload Targets</h2>

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
                Upload Targets
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
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-yellow-700">Warnings:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-600 mt-1">
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
              <tr><td className="px-3 py-2 font-mono">staff_id</td><td className="px-3 py-2">Staff code</td><td className="px-3 py-2">184</td></tr>
              <tr><td className="px-3 py-2 font-mono">year_month</td><td className="px-3 py-2">Target period (YYYYMM)</td><td className="px-3 py-2">202501</td></tr>
              <tr><td className="px-3 py-2 font-mono">total_sales</td><td className="px-3 py-2">Total sales target (RM)</td><td className="px-3 py-2">50000</td></tr>
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
    </div>
  )
}
