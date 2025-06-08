import { supabase } from '@/lib/supabase'

export async function uploadImage(
  file: File,
  bucket: string,
  path: string
): Promise<{ path: string; error: Error | null }> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = path ? `${path}/${fileName}` : fileName

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileData, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Get the public URL
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    if (!data.publicUrl) {
      throw new Error('Failed to get public URL')
    }

    console.log('Upload successful, public URL:', data.publicUrl)

    return {
      path: data.publicUrl,
      error: null,
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      path: '',
      error: error as Error,
    }
  }
}

export async function deleteImage(
  path: string,
  bucket: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])
    return { error }
  } catch (error) {
    return { error: error as Error }
  }
} 


