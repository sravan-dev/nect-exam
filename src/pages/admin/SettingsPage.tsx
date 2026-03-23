import { useEffect, useRef, useState } from 'react'
import { Settings, Save, Loader2, ImageIcon, Type, RefreshCw, Upload, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/useToast'

const schema = z.object({
  app_title:    z.string().min(1, 'App title is required'),
  app_logo_url: z.string().url('Must be a valid URL').or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function SettingsPage() {
  const [saving,    setSaving]    = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { app_title: 'NECT Exam', app_logo_url: '' },
  })

  const logoUrl = watch('app_logo_url')

  useEffect(() => {
    supabase.from('app_settings').select('key, value').then(({ data }) => {
      if (!data) return
      const map: Record<string, string> = {}
      data.forEach((r) => { if (r.key && r.value) map[r.key] = r.value })
      reset({
        app_title:    map['app_title']    || 'NECT Exam',
        app_logo_url: map['app_logo_url'] || '',
      })
      setPreview(map['app_logo_url'] || '')
      setLoading(false)
    })
  }, [reset])

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max size is 2 MB.', variant: 'destructive' })
      return
    }

    setUploading(true)
    const ext      = file.name.split('.').pop()
    const filename = `logo-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload(filename, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setUploading(false)
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' })
      return
    }

    const { data: urlData } = supabase.storage.from('app-assets').getPublicUrl(filename)
    const publicUrl = urlData.publicUrl

    setValue('app_logo_url', publicUrl, { shouldValidate: true })
    setPreview(publicUrl)
    setUploading(false)
    toast({ title: 'Logo uploaded!', description: 'Click Save Settings to apply.' })

    // reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const clearLogo = () => {
    setValue('app_logo_url', '', { shouldValidate: true })
    setPreview('')
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const onSave = async (data: FormData) => {
    setSaving(true)
    const results = await Promise.all([
      supabase.from('app_settings').upsert({ key: 'app_title',    value: data.app_title }),
      supabase.from('app_settings').upsert({ key: 'app_logo_url', value: data.app_logo_url }),
    ])
    setSaving(false)
    const err = results.find((r) => r.error)?.error
    if (err) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); return }
    setPreview(data.app_logo_url)
    toast({ title: 'Settings saved!', description: 'Reload the page to see changes in the sidebar.' })
  }

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  )

  const displayUrl = logoUrl || preview

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage application appearance and configuration</p>
      </div>

      <form onSubmit={handleSubmit(onSave)} className="space-y-5">
        {/* App Branding */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-600" />
              App Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* App Title */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Type className="h-3.5 w-3.5 text-gray-500" />
                App Title
              </Label>
              <Input placeholder="e.g. NECT Exam" {...register('app_title')} />
              {errors.app_title && <p className="text-xs text-destructive">{errors.app_title.message}</p>}
              <p className="text-xs text-gray-400">Shown in the sidebar and browser tab.</p>
            </div>

            {/* Logo */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5 text-gray-500" />
                App Logo
              </Label>

              {/* Preview + upload area */}
              <div className="flex items-start gap-5">
                {/* Preview box */}
                <div className="relative shrink-0">
                  <div className="h-20 w-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                    {displayUrl ? (
                      <img
                        src={displayUrl}
                        alt="Logo preview"
                        className="h-full w-full object-contain p-1.5"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <ImageIcon className="h-7 w-7 text-gray-300" />
                    )}
                  </div>
                  {displayUrl && (
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition-colors"
                      title="Remove logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Upload controls */}
                <div className="flex-1 space-y-3">
                  {/* Upload button */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      {uploading
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading…</>
                        : <><Upload className="mr-2 h-4 w-4" />Upload Image</>
                      }
                    </Button>
                    <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, SVG, WebP · Max 2 MB</p>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">or paste a URL</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* URL input */}
                  <Input
                    placeholder="https://example.com/logo.png"
                    {...register('app_logo_url')}
                  />
                  {errors.app_logo_url && (
                    <p className="text-xs text-destructive">{errors.app_logo_url.message}</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Recommended: 64×64 px with transparent background. Leave blank to use the default graduation cap icon.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-500">Version</p><p className="font-medium text-gray-900">1.0.0</p></div>
              <div><p className="text-gray-500">Database</p><p className="font-medium text-gray-900">Supabase (PostgreSQL)</p></div>
              <div><p className="text-gray-500">Auth Provider</p><p className="font-medium text-gray-900">Supabase Auth</p></div>
              <div><p className="text-gray-500">Frontend</p><p className="font-medium text-gray-900">React + Vite</p></div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
