import React from 'react'

interface ImageProps {
  src: string
  alt: string
}

export const Image: React.FC<ImageProps> = ({ src, alt }) => {
  return (
    <img
      src={src}
      alt={alt}
      style={{ maxWidth: '300px', maxHeight: '300px' }}
    />
  )
}
