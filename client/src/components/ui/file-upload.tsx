import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
    bucket: string;
    onUploadSuccess: (files: { name: string; url: string; type: string }[]) => void;
    maxFiles?: number;
    allowedTypes?: string[];
    initialFiles?: { name: string; url: string; type: string }[];
    useProxy?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    bucket,
    onUploadSuccess,
    maxFiles = 5,
    allowedTypes = ['image/*', 'application/pdf', '.doc', '.docx'],
    initialFiles = [],
    useProxy = false
}) => {
    const [files, setFiles] = useState<{ name: string; url: string; type: string }[]>(initialFiles);
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        if (files.length + selectedFiles.length > maxFiles) {
            toast({
                title: "Limit exceeded",
                description: `You can only upload up to ${maxFiles} files.`,
                variant: "destructive"
            });
            return;
        }

        setIsUploading(true);
        const newUploadedFiles: { name: string; url: string; type: string }[] = [...files];

        try {
            for (const file of selectedFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                let publicUrl = "";

                if (useProxy) {
                    // Use backend proxy to bypass RLS
                    const reader = new FileReader();
                    const base64Promise = new Promise<string>((resolve) => {
                        reader.onload = () => {
                            const base64 = (reader.result as string).split(',')[1];
                            resolve(base64);
                        };
                        reader.readAsDataURL(file);
                    });

                    const base64File = await base64Promise;

                    // Determine which endpoint to use
                    // Admin buckets use /api/admin/..., while user buckets use /api/tasks/...
                    const proxyUrl = bucket === 'proof-submissions'
                        ? "/api/tasks/storage/upload"
                        : "/api/admin/storage/upload";

                    const response = await fetch(proxyUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            file: base64File,
                            name: filePath,
                            bucket,
                            contentType: file.type
                        })
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.message || "Proxy upload failed");
                    }

                    const result = await response.json();
                    publicUrl = result.url;
                } else {
                    // Direct Supabase upload (default for users)
                    const { error: uploadError } = await supabase.storage
                        .from(bucket)
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl: url } } = supabase.storage
                        .from(bucket)
                        .getPublicUrl(filePath);

                    publicUrl = url;
                }

                newUploadedFiles.push({
                    name: file.name,
                    url: publicUrl,
                    type: file.type
                });
            }

            setFiles(newUploadedFiles);
            onUploadSuccess(newUploadedFiles);
            toast({
                title: "Upload successful",
                description: `${selectedFiles.length} file(s) uploaded successfully.`,
            });
        } catch (error: any) {
            console.error("Upload error:", error);
            toast({
                title: "Upload failed",
                description: error.message || "An error occurred while uploading.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        onUploadSuccess(newFiles);
    };

    return (
        <div className="space-y-4 w-full">
            <div className="flex items-center gap-4">
                <Input
                    type="file"
                    className="hidden"
                    id={`file-upload-${bucket}`}
                    onChange={handleFileChange}
                    multiple
                    accept={allowedTypes.join(',')}
                    disabled={isUploading || files.length >= maxFiles}
                />
                <label
                    htmlFor={`file-upload-${bucket}`}
                    className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isUploading || files.length >= maxFiles
                        ? 'bg-muted cursor-not-allowed opacity-50'
                        : 'hover:bg-accent border-primary/20 hover:border-primary/50'
                        }`}
                >
                    {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Upload className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">
                        {isUploading ? 'Uploading...' : 'Choose Files'}
                    </span>
                </label>
                <span className="text-xs text-muted-foreground">
                    {files.length}/{maxFiles} files uploaded
                </span>
            </div>

            {files.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {files.map((file, index) => (
                        <li
                            key={index}
                            className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border group"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="w-4 h-4 flex-shrink-0 text-primary" />
                                <span className="text-xs truncate max-w-[150px]">{file.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
