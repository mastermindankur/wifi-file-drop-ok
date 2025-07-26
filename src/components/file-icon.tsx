"use client";

import type { FC } from 'react';
import { File, FileText, FileImage, FileVideo, FileAudio, FileArchive, FileQuestion } from 'lucide-react';

interface FileIconProps {
  mimeType?: string;
  className?: string;
}

export const FileIcon: FC<FileIconProps> = ({ mimeType, className }) => {
  if (!mimeType) return <File className={className} />;

  const type = mimeType.split('/')[0];

  switch (type) {
    case 'text':
      return <FileText className={className} />;
    case 'image':
      return <FileImage className={className} />;
    case 'video':
      return <FileVideo className={className} />;
    case 'audio':
      return <FileAudio className={className} />;
    case 'application':
      if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
        return <FileArchive className={className} />;
      }
      return <File className={className} />;
    default:
      return <FileQuestion className={className} />;
  }
};
