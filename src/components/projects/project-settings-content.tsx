"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { type Session, type User } from "next-auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Key, Save, Eye, EyeOff, X, Plus, Edit, Trash2, Share2, Copy, ExternalLink, Trash } from "lucide-react"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { usePageHeader } from "@/contexts/header-context"
import { toast } from "sonner"
import { ProjectMembersManager } from "./project-members-manager"
import { type Project } from "@/types"

interface ProjectSettingsContentProps {
  projectId: string
}



export function ProjectSettingsContent({ projectId }: ProjectSettingsContentProps) {
  const { data: session } = useSession() as { data: Session | null }
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [credentialsList, setCredentialsList] = useState<Array<{
    id: string
    name: string
    content: string
  }>>([])
  const [newCredential, setNewCredential] = useState({
    name: '',
    content: ''
  })
  const [editingCredential, setEditingCredential] = useState<string | null>(null)
  const [savingCredentials, setSavingCredentials] = useState(false)
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({})

  // Share settings state
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [generatingShare, setGeneratingShare] = useState(false)
  const [removingShare, setRemovingShare] = useState(false)

  const router = useRouter()

  // Set page header content
  usePageHeader(
    project ? (
      <div className="flex items-center space-x-4">
        <Link href={`/dashboard/projects/${projectId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ustawienia projektu {project.name}</h1>
        </div>
      </div>
    ) : (
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ładowanie ustawień projektu...</h1>
      </div>
    ),
    [project, projectId] // Re-render when project or projectId changes
  )

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
      } else if (response.status === 404) {
        router.push("/dashboard/projects")
      }
    } catch (error) {
      console.error("Error fetching project:", error)
    }
  }, [projectId, router])

  useEffect(() => {
    fetchProject()
    setLoading(false)
  }, [projectId, fetchProject])

  // Share settings functions
  const loadShareSettings = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/share`)
      if (response.ok) {
        const data = await response.json()
        setShareToken(data.shareToken)
        setShareUrl(data.shareUrl)
      }
    } catch (error) {
      console.error('Error loading share settings:', error)
    }
  }, [projectId])

  useEffect(() => {
    if (project) {
      // Parse credentials from JSON if exists
      let parsedCredentials: Array<{id: string, name: string, content: string}> = []
      if (project.credentials) {
        try {
          const parsed = JSON.parse(project.credentials)
          // Handle both old format (single object) and new format (array)
          if (Array.isArray(parsed)) {
            parsedCredentials = parsed
          } else if (parsed.name && parsed.content) {
            // Convert old format to new format
            parsedCredentials = [{
              id: Date.now().toString(),
              name: parsed.name,
              content: parsed.content
            }]
          }
        } catch (error) {
          console.error('Error parsing credentials:', error)
        }
      }
      setCredentialsList(parsedCredentials)

      // Load share settings
      loadShareSettings()
    }
  }, [project, loadShareSettings])

  const generateShareLink = async () => {
    setGeneratingShare(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setShareToken(data.shareToken)
        setShareUrl(data.shareUrl)
        toast.success('Link udostępniania został wygenerowany')
      } else {
        toast.error('Nie udało się wygenerować linku udostępniania')
      }
    } catch (error) {
      console.error('Error generating share link:', error)
      toast.error('Wystąpił błąd podczas generowania linku')
    } finally {
      setGeneratingShare(false)
    }
  }

  const removeShareLink = async () => {
    setRemovingShare(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/share`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setShareToken(null)
        setShareUrl(null)
        toast.success('Link udostępniania został usunięty')
      } else {
        toast.error('Nie udało się usunąć linku udostępniania')
      }
    } catch (error) {
      console.error('Error removing share link:', error)
      toast.error('Wystąpił błąd podczas usuwania linku')
    } finally {
      setRemovingShare(false)
    }
  }

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      toast.success('Link został skopiowany do schowka')
    }
  }

  const handleAddCredential = () => {
    if (!newCredential.name.trim() || !newCredential.content.trim()) {
      return
    }

    const credential = {
      id: Date.now().toString(),
      name: newCredential.name,
      content: newCredential.content
    }

    setCredentialsList(prev => [...prev, credential])
    setNewCredential({ name: '', content: '' })
    saveCredentialsList([...credentialsList, credential])
  }

  const handleEditCredential = (id: string) => {
    setEditingCredential(id)
  }

  const handleSaveEdit = (id: string, name: string, content: string) => {
    const updatedList = credentialsList.map(cred =>
      cred.id === id ? { ...cred, name, content } : cred
    )
    setCredentialsList(updatedList)
    setEditingCredential(null)
    saveCredentialsList(updatedList)
  }

  const handleDeleteCredential = (id: string) => {
    const updatedList = credentialsList.filter(cred => cred.id !== id)
    setCredentialsList(updatedList)
    saveCredentialsList(updatedList)
  }

  const saveCredentialsList = async (list: typeof credentialsList) => {
    setSavingCredentials(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: JSON.stringify(list)
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        // Show success message or toast
      } else {
        console.error('Failed to update credentials')
      }
    } catch (error) {
      console.error('Error updating credentials:', error)
    } finally {
      setSavingCredentials(false)
    }
  }

  const handleNewCredentialChange = (field: 'name' | 'content', value: string) => {
    setNewCredential(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const toggleShowCredential = (id: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }



  if (loading) {
    return <div>Ładowanie...</div>
  }

  if (!project) {
    return <div>Projekt nie znaleziony</div>
  }

  return (
    <div className="space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}

      {/* Project Members */}
      {session?.user?.id && (
        <ProjectMembersManager
          projectId={projectId}
          createdById={project.createdById as string}
          currentUserId={(session.user as User).id}
        />
      )}

      {/* Project Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Udostępnianie projektu</span>
          </CardTitle>
          <CardDescription>
            Wygeneruj publiczny link do udostępnienia tablicy zadań osobom bez konta w systemie.
            Udostępniona tablica będzie dostępna tylko do odczytu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shareToken && shareUrl ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium">Link publiczny</Label>
                      <div className="mt-1 p-2 bg-background border rounded text-sm font-mono break-all">
                        {shareUrl}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyShareLink}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Kopiuj
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(shareUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Otwórz
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={generateShareLink}
                    disabled={generatingShare}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    {generatingShare ? 'Generowanie...' : 'Wygeneruj nowy link'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={removeShareLink}
                    disabled={removingShare}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    {removingShare ? 'Usuwanie...' : 'Usuń udostępnianie'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Projekt nie jest udostępniony</h3>
                <p className="text-muted-foreground mb-4">
                  Wygeneruj link publiczny, aby udostępnić tablicę zadań osobom bez konta.
                </p>
                <Button
                  onClick={generateShareLink}
                  disabled={generatingShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {generatingShare ? 'Generowanie...' : 'Wygeneruj link udostępniania'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Access Credentials Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <span>Dane dostępowe</span>
          </CardTitle>
          <CardDescription>
            Dodaj nazwę i szczegóły danych dostępowych do projektu (hasła, klucze API, linki, itp.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Existing credentials list */}
            {credentialsList.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Zapisane dane dostępowe</h4>
                {credentialsList.map((credential) => (
                  <CredentialItem
                    key={credential.id}
                    credential={credential}
                    isEditing={editingCredential === credential.id}
                    isVisible={showCredentials[credential.id] || false}
                    onEdit={() => handleEditCredential(credential.id)}
                    onSave={(name, content) => handleSaveEdit(credential.id, name, content)}
                    onDelete={() => handleDeleteCredential(credential.id)}
                    onToggleVisibility={() => toggleShowCredential(credential.id)}
                    onCancelEdit={() => setEditingCredential(null)}
                  />
                ))}
              </div>
            )}

            {/* Add new credential form */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="text-sm font-medium mb-4">Dodaj nowe dane dostępowe</h4>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newCredentialName">Nazwa dostępów</Label>
                  <Input
                    id="newCredentialName"
                    placeholder="np. Dane dostępowe do serwera produkcyjnego"
                    value={newCredential.name}
                    onChange={(e) => handleNewCredentialChange('name', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="newCredentialContent">Dane dostępowe</Label>
                  <RichTextEditor
                    content={newCredential.content}
                    onChange={(content) => handleNewCredentialChange('content', content)}
                    placeholder="Wprowadź dane dostępowe (hasła, klucze API, linki, itp.)"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleAddCredential}
                    disabled={!newCredential.name.trim() || !newCredential.content.trim() || savingCredentials}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {savingCredentials ? 'Dodawanie...' : 'Dodaj dane dostępowe'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Credential Item Component
interface CredentialItemProps {
  credential: {
    id: string
    name: string
    content: string
  }
  isEditing: boolean
  isVisible: boolean
  onEdit: () => void
  onSave: (name: string, content: string) => void
  onDelete: () => void
  onToggleVisibility: () => void
  onCancelEdit: () => void
}

function CredentialItem({
  credential,
  isEditing,
  isVisible,
  onEdit,
  onSave,
  onDelete,
  onToggleVisibility,
  onCancelEdit
}: CredentialItemProps) {
  const [editName, setEditName] = useState(credential.name)
  const [editContent, setEditContent] = useState(credential.content)

  const handleSave = () => {
    if (editName.trim() && editContent.trim()) {
      onSave(editName, editContent)
    }
  }

  const handleCancel = () => {
    setEditName(credential.name)
    setEditContent(credential.content)
    onCancelEdit()
  }

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 bg-background">
        <div className="space-y-4">
          <div>
            <Label>Nazwa dostępów</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nazwa dostępów"
            />
          </div>

          <div>
            <Label>Dane dostępowe</Label>
            <RichTextEditor
              content={editContent}
              onChange={setEditContent}
              placeholder="Wprowadź dane dostępowe"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Anuluj
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editName.trim() || !editContent.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              Zapisz
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 bg-background">
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-medium">{credential.name}</h5>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onToggleVisibility}>
            {isVisible ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Ukryj
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Pokaż
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edytuj
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Usuń
          </Button>
        </div>
      </div>

      {isVisible ? (
        <div
          className="prose prose-sm max-w-none text-foreground"
          dangerouslySetInnerHTML={{ __html: credential.content }}
        />
      ) : (
        <div className="text-sm text-muted-foreground italic">
          Dane dostępowe są ukryte. Kliknij &quot;Pokaż&quot; aby je wyświetlić.
        </div>
      )}
    </div>
  )
}
