import React from 'react'

interface ImageUploadProps {
  onImageUpload: (file: File) => void
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onImageUpload(file)
    }
  }

  return (
    <input
      type="file"
      accept="image/*"
      onChange={handleFileChange}
    />
  )
}
