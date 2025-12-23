import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import api from '../api/axios';
import { CompanyFile } from '../types';

const FILE_TYPES = [
  { value: 'financial_statement', label: 'Financial Statement' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'report', label: 'Report' },
  { value: 'strategy', label: 'Strategy Document' },
  { value: 'product', label: 'Product Information' },
  { value: 'other', label: 'Other' },
];

export default function Files() {
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.filename.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      const response = await api.post('/api/files', formData);
      setFiles([response.data, ...files]);
      setFormData({ filename: '', file_type: 'report', content: '', description: '' });
      setShowUpload(false);
      toast.success('File uploaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
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

      {/* Upload Button */}
      <div className="mb-8">
        <Button onClick={() => setShowUpload(!showUpload)} size="lg">
          <Upload className="w-5 h-5" />
          Upload Document
        </Button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8"
        >
          <Card gradient>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Document Name *"
                  value={formData.filename}
                  onChange={(e) => setFormData({ ...formData, filename: e.target.value })}
                  placeholder="Q4 2024 Financial Report"
                  required
                />
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
              </div>

              <Input
                label="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the document"
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
                <p className="mt-1 text-xs text-obsidian-500">
                  Tip: Copy and paste text from PDFs, Word docs, or spreadsheets
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" loading={uploading}>
                  <Plus className="w-5 h-5" />
                  Add Document
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowUpload(false)}>
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
                  <div className="p-3 rounded-xl bg-gold-500/20">
                    <FileText className="w-6 h-6 text-gold-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{file.filename}</h3>
                    <p className="text-sm text-obsidian-400 capitalize">
                      {file.file_type.replace('_', ' ')}
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
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-2 rounded-lg text-obsidian-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
    </Layout>
  );
}

