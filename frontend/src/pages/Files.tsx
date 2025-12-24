import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Upload, 
  File, 
  FileSpreadsheet, 
  Image, 
  FileType,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import api from '../api/axios';

interface CompanyFile {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  content: string;
  description: string;
  detected_category: string;
  extraction_status: 'success' | 'partial' | 'error';
  has_raw_data: boolean;
  created_at: string;
}

interface FilePreview {
  type: 'image' | 'text' | 'pdf';
  mime_type?: string;
  data_url?: string;
  content?: string;
  extracted_text?: string;
}

const FILE_TYPES = [
  { value: 'financial_statement', label: 'Financial Statement' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'report', label: 'Report' },
  { value: 'strategy', label: 'Strategy Document' },
  { value: 'product', label: 'Product Information' },
  { value: 'other', label: 'Other' },
];

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-6 h-6" />,
  word: <FileType className="w-6 h-6" />,
  spreadsheet: <FileSpreadsheet className="w-6 h-6" />,
  image: <Image className="w-6 h-6" />,
  text: <File className="w-6 h-6" />,
  presentation: <FileText className="w-6 h-6" />,
  default: <File className="w-6 h-6" />,
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function Files() {
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [viewingFile, setViewingFile] = useState<CompanyFile | null>(null);
  const [formData, setFormData] = useState({
    filename: '',
    file_type: 'report',
    content: '',
    description: '',
  });

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await api.get('/api/files');
      setFiles(response.data);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFormData(prev => ({ ...prev, filename: file.name }));
      setShowUpload(true);
      setUploadMode('file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFormData(prev => ({ ...prev, filename: file.name }));
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uploadMode === 'file' && !selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    
    if (uploadMode === 'text' && (!formData.filename.trim() || !formData.content.trim())) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    
    try {
      let response;
      
      if (uploadMode === 'file' && selectedFile) {
        // Upload actual file
        const formDataObj = new FormData();
        formDataObj.append('file', selectedFile);
        formDataObj.append('file_type', formData.file_type);
        if (formData.description) {
          formDataObj.append('description', formData.description);
        }
        
        response = await api.post('/api/files/upload', formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        // Upload text content
        const formDataObj = new FormData();
        formDataObj.append('filename', formData.filename);
        formDataObj.append('file_type', formData.file_type);
        formDataObj.append('content', formData.content);
        if (formData.description) {
          formDataObj.append('description', formData.description);
        }
        
        response = await api.post('/api/files', formDataObj, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      
      setFiles([response.data, ...files]);
      resetForm();
      toast.success('File uploaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ filename: '', file_type: 'report', content: '', description: '' });
    setSelectedFile(null);
    setShowUpload(false);
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await api.delete(`/api/files/${fileId}`);
      setFiles(files.filter((f) => f.id !== fileId));
      toast.success('File deleted');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);

  const handleViewFile = async (fileId: string, hasRawData: boolean, mimeType: string) => {
    try {
      // For images and PDFs with raw data, fetch preview endpoint
      if (hasRawData && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
        const previewResponse = await api.get(`/api/files/${fileId}/preview`);
        setFilePreview(previewResponse.data);
        // Also fetch full file info for display
        const fileResponse = await api.get(`/api/files/${fileId}`);
        setViewingFile(fileResponse.data);
      } else {
        const response = await api.get(`/api/files/${fileId}`);
        setViewingFile(response.data);
        setFilePreview({ type: 'text', content: response.data.content });
      }
    } catch (error) {
      toast.error('Failed to load file content');
    }
  };

  const closeFileView = () => {
    setViewingFile(null);
    setFilePreview(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
          Company Files
        </h1>
        <p className="text-obsidian-400 mt-2">
          Upload company documents to provide context for board deliberations
        </p>
      </motion.div>

      {/* Drag and Drop Zone */}
      <div
        className={`mb-8 border-2 border-dashed rounded-2xl p-8 transition-all ${
          dragActive
            ? 'border-gold-400 bg-gold-400/10'
            : 'border-obsidian-700 hover:border-obsidian-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-gold-400' : 'text-obsidian-500'}`} />
          <p className="text-lg font-medium text-white mb-2">
            {dragActive ? 'Drop your file here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-obsidian-400 mb-4">
            Supports PDF, Word, Excel, CSV, Images, and text files
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button onClick={() => { setShowUpload(true); setUploadMode('file'); }}>
              <Upload className="w-5 h-5" />
              Choose File
            </Button>
            <Button variant="secondary" onClick={() => { setShowUpload(true); setUploadMode('text'); }}>
              <Plus className="w-5 h-5" />
              Paste Text
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8"
        >
          <Card gradient>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-white">
                {uploadMode === 'file' ? 'Upload File' : 'Add Text Content'}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setUploadMode('file')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    uploadMode === 'file'
                      ? 'bg-gold-500/20 text-gold-400'
                      : 'text-obsidian-400 hover:text-white'
                  }`}
                >
                  File Upload
                </button>
                <button
                  onClick={() => setUploadMode('text')}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    uploadMode === 'text'
                      ? 'bg-gold-500/20 text-gold-400'
                      : 'text-obsidian-400 hover:text-white'
                  }`}
                >
                  Paste Text
                </button>
              </div>
            </div>
            
            <form onSubmit={handleFileUpload} className="space-y-6">
              {uploadMode === 'file' ? (
                <div>
                  <label className="block text-sm font-medium text-obsidian-200 mb-1.5">
                    Select File *
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json,.xml,.html,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp,.pptx,.ppt"
                    />
                    <label
                      htmlFor="file-input"
                      className="flex-1 px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white cursor-pointer hover:border-obsidian-600 transition-colors flex items-center gap-3"
                    >
                      <Upload className="w-5 h-5 text-obsidian-400" />
                      <span className={selectedFile ? 'text-white' : 'text-obsidian-500'}>
                        {selectedFile ? selectedFile.name : 'Click to select a file...'}
                      </span>
                    </label>
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="p-2 rounded-lg text-obsidian-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  {selectedFile && (
                    <p className="mt-2 text-sm text-obsidian-400">
                      Size: {formatFileSize(selectedFile.size)}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <Input
                    label="Document Name *"
                    value={formData.filename}
                    onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                    placeholder="Q4 2024 Financial Report"
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-obsidian-200 mb-1.5">
                      Document Content *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Paste the text content of your document here..."
                      rows={8}
                      className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white placeholder-obsidian-500 focus:outline-none focus:ring-2 focus:ring-gold-400/50 resize-none font-mono text-sm"
                      required
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-obsidian-200 mb-1.5">
                    Document Type
                  </label>
                  <select
                    value={formData.file_type}
                    onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                  >
                    {FILE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the document"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" loading={uploading} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Upload Document
                    </>
                  )}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Files List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl loading-shimmer bg-obsidian-800/30" />
          ))}
        </div>
      ) : files.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gold-500/20 text-gold-400">
                    {FILE_ICONS[file.detected_category] || FILE_ICONS.default}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white truncate">{file.filename}</h3>
                      {getStatusIcon(file.extraction_status)}
                    </div>
                    <p className="text-sm text-obsidian-400 capitalize">
                      {file.file_type.replace('_', ' ')} • {formatFileSize(file.file_size)}
                    </p>
                    {file.description && (
                      <p className="text-sm text-obsidian-500 mt-1 line-clamp-1">
                        {file.description}
                      </p>
                    )}
                    <p className="text-xs text-obsidian-500 mt-2">
                      {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleViewFile(file.id, file.has_raw_data, file.mime_type)}
                      className="p-2 rounded-lg text-obsidian-400 hover:text-gold-400 hover:bg-gold-500/10 transition-colors"
                      title="View content"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 rounded-lg text-obsidian-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-xl bg-obsidian-800/30 max-h-20 overflow-hidden">
                  <p className="text-xs text-obsidian-400 font-mono line-clamp-3">
                    {file.content}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16">
          <FileText className="w-16 h-16 text-obsidian-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No documents yet</h3>
          <p className="text-obsidian-400 mb-6 max-w-md mx-auto">
            Upload company documents to give your board members context for better advice
          </p>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="w-5 h-5" />
            Upload First Document
          </Button>
        </Card>
      )}

      {/* File Content Modal */}
      {viewingFile && filePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-obsidian-900 rounded-2xl border border-obsidian-700 w-full max-w-4xl max-h-[80vh] overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-obsidian-700">
              <div>
                <h3 className="font-medium text-white">{viewingFile.filename || 'File Preview'}</h3>
                {viewingFile.file_type && (
                  <p className="text-sm text-obsidian-400">
                    {viewingFile.file_type.replace('_', ' ')} • {formatFileSize(viewingFile.file_size || 0)}
                    {filePreview.type === 'image' && (
                      <span className="ml-2 text-emerald-400">• Image (passed directly to AI)</span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={closeFileView}
                className="p-2 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {filePreview.type === 'image' && filePreview.data_url ? (
                <div className="flex flex-col items-center">
                  <img 
                    src={filePreview.data_url} 
                    alt={viewingFile.filename || 'Preview'} 
                    className="max-w-full max-h-[50vh] rounded-lg object-contain"
                  />
                  <p className="mt-4 text-sm text-obsidian-400 text-center">
                    This image is passed directly to vision-capable AI models (GPT-4o, GPT-4o-mini)
                  </p>
                </div>
              ) : filePreview.type === 'pdf' && filePreview.data_url ? (
                <div className="flex flex-col">
                  <div className="bg-obsidian-800 rounded-lg p-4 mb-4">
                    <iframe 
                      src={filePreview.data_url}
                      className="w-full h-[40vh] rounded-lg"
                      title={viewingFile.filename || 'PDF Preview'}
                    />
                  </div>
                  <p className="text-sm text-emerald-400 text-center mb-4">
                    ✓ This PDF is passed directly to capable AI models (GPT-4o, GPT-4o-mini)
                  </p>
                  {filePreview.extracted_text && (
                    <div>
                      <h4 className="text-sm font-medium text-obsidian-300 mb-2">Extracted Text (fallback for other models):</h4>
                      <pre className="whitespace-pre-wrap font-mono text-xs text-obsidian-400 leading-relaxed bg-obsidian-800/50 p-3 rounded-lg max-h-40 overflow-y-auto">
                        {filePreview.extracted_text}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm text-obsidian-300 leading-relaxed">
                  {filePreview.content || viewingFile.content}
                </pre>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
