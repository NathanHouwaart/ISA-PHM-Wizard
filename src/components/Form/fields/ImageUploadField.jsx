import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { v4 as uuid4 } from 'uuid';
import FormFieldShell from '../FormFieldShell';
import TooltipButton from '../../Widgets/TooltipButton';
import { cn } from '../../../utils/utils';
import { deleteImageFile, getImageFile, saveImageFile } from '../../../utils/imageStore';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGES = 10;

const getImageKind = async (file) => {
  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isPng = bytes.length >= 8
    && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isPng) return { extension: 'png', mimeType: 'image/png' };
  if (isJpeg) return { extension: 'jpg', mimeType: 'image/jpeg' };
  return null;
};

const verifyBrowserDecode = async (file) => {
  if (typeof createImageBitmap !== 'function') return;
  const bitmap = await createImageBitmap(file);
  bitmap.close();
};

const ImageUploadField = ({ value = [], onChange }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState({});
  const images = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  useEffect(() => {
    let active = true;
    const objectUrls = [];
    Promise.all(images.map(async (image) => {
      const stored = await getImageFile(image.attachmentId);
      if (!stored?.file) return [image.attachmentId, null];
      const url = URL.createObjectURL(stored.file);
      objectUrls.push(url);
      return [image.attachmentId, url];
    })).then((entries) => {
      if (!active) return;
      setPreviews(Object.fromEntries(entries));
      if (entries.some(([, url]) => !url)) {
        setError('One or more images are not stored locally. Please attach them again.');
      }
    }).catch(() => {
      if (active) setError('The local image store is unavailable.');
    });
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const addFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;
    if (images.length + selected.length > MAX_IMAGES) {
      setError(`A test setup can contain at most ${MAX_IMAGES} images.`);
      return;
    }
    if (images.reduce((total, image) => total + (image.size || 0), 0)
      + selected.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_IMAGE_BYTES) {
      setError('Test setup images must be 50 MB or smaller in total.');
      return;
    }

    const additions = [];
    try {
      for (const file of selected) {
        if (file.size > MAX_IMAGE_BYTES) {
          throw new Error(`${file.name} is larger than 10 MB.`);
        }
        const kind = await getImageKind(file);
        if (!kind) throw new Error(`${file.name} is not a valid PNG or JPEG image.`);
        await verifyBrowserDecode(file);
        const attachmentId = uuid4();
        await saveImageFile({ id: attachmentId, file });
        additions.push({
          attachmentId,
          fileName: file.name,
          mimeType: kind.mimeType,
          size: file.size,
        });
      }
      onChange?.([...images, ...additions]);
      setError('');
    } catch (uploadError) {
      await Promise.all(additions.map((image) => deleteImageFile(image.attachmentId)));
      setError(uploadError?.message || 'The images could not be stored locally.');
    }
  };

  const removeImage = async (attachmentId) => {
    await deleteImageFile(attachmentId);
    onChange?.(images.filter((image) => image.attachmentId !== attachmentId));
    setError('');
  };

  return (
    <FormFieldShell
      label="Images"
      fieldType="file"
      explanation="Add up to 10 PNG or JPEG images of the test setup. Each image may be up to 10 MB."
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-5 text-sm text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50',
            isDragging && 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          )}
        >
          <Upload className="h-4 w-4 text-blue-600" />
          <span>Drop PNG or JPEG images here, or select files</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />

        {images.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {images.map((image) => (
              <div key={image.attachmentId} className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100">
                  {previews[image.attachmentId]
                    ? <img src={previews[image.attachmentId]} alt="" className="h-full w-full object-cover" />
                    : <ImageIcon className="h-5 w-5 text-gray-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{image.fileName}</p>
                  <p className="text-xs text-gray-500">{((image.size || 0) / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <TooltipButton
                  onClick={() => removeImage(image.attachmentId)}
                  tooltipText="Remove image"
                  className="rounded-md p-2 text-rose-600 hover:bg-rose-50"
                >
                  <X className="h-4 w-4" />
                </TooltipButton>
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </FormFieldShell>
  );
};

export default ImageUploadField;
