import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  Crown,
  Users,
  Trash2,
  Plus,
  Send,
  Loader2,
  Paperclip,
  FileText,
  X,
  RefreshCw,
  History,
  ChevronDown,
  Terminal,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import OpinionCard from '../components/OpinionCard';
import api from '../api/axios';
import { Meeting, OpinionVersion } from '../types';
import { useAuthStore } from '../store/authStore';

interface FollowUpQuestion {
  id: string;
  question: string;
  created_at: string;
  chair_response?: string;
  version?: number;
}

interface MeetingFile {
  id: string;
  filename: string;
  file_type: string;
  uploaded_at: string;
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpQuestion[]>([]);
  const [meetingFiles, setMeetingFiles] = useState<MeetingFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<OpinionVersion | null>(null);
  const [restoringVersion, setRestoringVersion] = useState(false);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
  const [pollingIntervalMs, setPollingIntervalMs] = useState(2000);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMeeting = async (silent = false) => {
    try {
      const response = await api.get(`/api/meetings/${id}`);
      setMeeting(response.data);
      setFollowUps(response.data.follow_ups || []);
      setMeetingFiles(response.data.attached_files || []);
      if (!silent) {
        setSelectedVersion(null);
      }
      return response.data;
    } catch (error) {
      console.error('Failed to fetch meeting:', error);
      if (!silent) {
        toast.error('Failed to load meeting');
      }
      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Start polling for updates (used during regeneration)
  const startPolling = () => {
    if (pollingIntervalRef.current) return;
    
    pollingIntervalRef.current = setInterval(async () => {
      const data = await fetchMeeting(true);
      if (data && data.status === 'completed') {
        stopPolling();
        setRegenerating(false);
        toast.success(`Meeting regenerated! Now on version ${data.current_version}`);
      }
    }, pollingIntervalMs);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Fetch polling interval from settings (for admins)
  const fetchSettings = async () => {
    if (!user?.is_admin) return;
    
    try {
      const response = await api.get('/api/admin/settings');
      if (response.data.polling_interval) {
        const interval = parseInt(response.data.polling_interval);
        if (!isNaN(interval) && interval >= 500) {
          setPollingIntervalMs(interval);
        }
      }
    } catch (error) {
      // Silently fail - use default
    }
  };

  useEffect(() => {
    fetchMeeting();
    fetchSettings();
    
    // Cleanup polling on unmount
    return () => {
      stopPolling();
    };
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    
    try {
      await api.delete(`/api/meetings/${id}`);
      toast.success('Meeting deleted');
      window.location.href = '/meetings';
    } catch (error) {
      toast.error('Failed to delete meeting');
    }
  };

  const handleRegenerate = async () => {
    const historyCount = (meeting?.opinion_history?.length || 0) + 1;
    if (!confirm(`Regenerate this meeting with current agent settings?\n\nThis will:\n• Save current opinions as version ${meeting?.current_version || 1}\n• Generate new opinions from all agents\n• Reprocess all follow-up questions\n\nYou'll have ${historyCount} version(s) in history to choose from.`)) return;
    
    setRegenerating(true);
    setSelectedVersion(null);
    
    // Start polling immediately to show live updates
    startPolling();
    
    try {
      const response = await api.post(`/api/meetings/${id}/regenerate`);
      // Stop polling since we got the final response
      stopPolling();
      setMeeting(response.data);
      setFollowUps(response.data.follow_ups || []);
      toast.success(`Meeting regenerated! Now on version ${response.data.current_version}`);
    } catch (error: any) {
      stopPolling();
      toast.error(error.response?.data?.detail || 'Failed to regenerate meeting');
      // Refresh to get current state
      fetchMeeting(true);
    } finally {
      setRegenerating(false);
    }
  };

  const handleRestoreVersion = async (version: number) => {
    if (!confirm(`Restore version ${version}? Current opinions will be saved to history.`)) return;
    
    setRestoringVersion(true);
    try {
      const response = await api.post(`/api/meetings/${id}/restore/${version}`);
      setMeeting(response.data);
      setFollowUps(response.data.follow_ups || []);
      setSelectedVersion(null);
      setShowVersionHistory(false);
      toast.success(`Restored to version ${version}`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to restore version');
    } finally {
      setRestoringVersion(false);
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim()) return;

    setSubmittingFollowUp(true);
    try {
      const response = await api.post(`/api/meetings/${id}/follow-up`, {
        question: followUpQuestion.trim()
      });
      setFollowUps(prev => [...prev, response.data]);
      setFollowUpQuestion('');
      setShowFollowUp(false);
      toast.success('Follow-up question submitted');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to submit follow-up');
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingFile(true);
    try {
      const response = await api.post(`/api/meetings/${id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMeetingFiles(prev => [...prev, response.data]);
      toast.success('File attached to meeting');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await api.delete(`/api/meetings/${id}/files/${fileId}`);
      setMeetingFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('File removed');
    } catch (error) {
      toast.error('Failed to remove file');
    }
  };

  // Get display data - either selected historical version or current
  const displayOpinions = selectedVersion?.opinions || meeting?.opinions || [];
  const displayChairSummary = selectedVersion?.chair_summary || meeting?.chair_summary || '';
  const displayChairRecommendation = selectedVersion?.chair_recommendation || meeting?.chair_recommendation || '';
  const displayFollowUps = selectedVersion?.follow_ups || followUps;

  // Debug logs helpers
  const debugLogs = meeting?.debug_logs || [];
  const hasErrors = debugLogs.some(log => log.level === 'error');
  const hasWarnings = debugLogs.some(log => log.level === 'warning');
  
  const toggleLogExpanded = (index: number) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getLogBgColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30';
      default:
        return 'bg-obsidian-800/30 border-obsidian-700/50';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="h-8 w-48 rounded-lg loading-shimmer bg-obsidian-800/30" />
          <div className="h-64 rounded-2xl loading-shimmer bg-obsidian-800/30" />
          <div className="h-48 rounded-2xl loading-shimmer bg-obsidian-800/30" />
        </div>
      </Layout>
    );
  }

  if (!meeting) {
    return (
      <Layout>
        <Card className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-obsidian-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Meeting not found</h3>
          <Link to="/meetings">
            <Button variant="secondary">
              <ArrowLeft className="w-4 h-4" />
              Back to Meetings
            </Button>
          </Link>
        </Card>
      </Layout>
    );
  }

  const hasHistory = (meeting.opinion_history?.length || 0) > 0;

  return (
    <Layout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          to="/meetings"
          className="inline-flex items-center gap-2 text-obsidian-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Meetings
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  meeting.status === 'completed'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gold-500/20 text-gold-400'
                }`}
              >
                {meeting.status === 'completed' ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Completed
                  </span>
                ) : (
                  'In Progress'
                )}
              </span>
              <span className="text-sm text-obsidian-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(meeting.created_at), { addSuffix: true })}
              </span>
              {meeting.current_version && meeting.current_version > 1 && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-sapphire-500/20 text-sapphire-400">
                  Version {selectedVersion?.version || meeting.current_version}
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-white">
              Board Meeting Notes
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {hasHistory && user?.is_admin && (
              <div className="relative">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                >
                  <History className="w-4 h-4" />
                  History ({(meeting.opinion_history?.length || 0) + 1})
                  <ChevronDown className={`w-4 h-4 transition-transform ${showVersionHistory ? 'rotate-180' : ''}`} />
                </Button>
                
                {showVersionHistory && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-obsidian-800 border border-obsidian-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-obsidian-700">
                      <p className="text-sm font-medium text-white">Opinion History</p>
                      <p className="text-xs text-obsidian-400">Click to preview, use Restore to apply</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {/* Current version */}
                      <button
                        onClick={() => setSelectedVersion(null)}
                        className={`w-full p-3 text-left hover:bg-obsidian-700/50 transition-colors ${!selectedVersion ? 'bg-sapphire-500/10' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">
                            Version {meeting.current_version} (Current)
                          </span>
                          {!selectedVersion && (
                            <span className="text-xs px-2 py-0.5 rounded bg-sapphire-500/20 text-sapphire-400">
                              Viewing
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-obsidian-400 mt-1">
                          {meeting.completed_at && format(new Date(meeting.completed_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </button>
                      
                      {/* Historical versions */}
                      {[...(meeting.opinion_history || [])].reverse().map((version) => (
                        <div
                          key={version.version}
                          className={`p-3 hover:bg-obsidian-700/50 transition-colors border-t border-obsidian-700/50 ${selectedVersion?.version === version.version ? 'bg-sapphire-500/10' : ''}`}
                        >
                          <button
                            onClick={() => setSelectedVersion(version)}
                            className="w-full text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">
                                Version {version.version}
                              </span>
                              {selectedVersion?.version === version.version && (
                                <span className="text-xs px-2 py-0.5 rounded bg-sapphire-500/20 text-sapphire-400">
                                  Viewing
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-obsidian-400 mt-1">
                              {version.generated_at && format(new Date(version.generated_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </button>
                          {selectedVersion?.version === version.version && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="mt-2 w-full"
                              onClick={() => handleRestoreVersion(version.version)}
                              loading={restoringVersion}
                            >
                              Restore This Version
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {user?.is_admin && meeting.status === 'completed' && (
              <Button 
                variant="secondary" 
                onClick={handleRegenerate}
                loading={regenerating}
                disabled={regenerating}
              >
                {regenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </>
                )}
              </Button>
            )}
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Version Preview Notice */}
      {selectedVersion && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-amber-500/10 border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-amber-400 font-medium">
                    Viewing Historical Version {selectedVersion.version}
                  </p>
                  <p className="text-sm text-amber-400/70">
                    Generated {selectedVersion.generated_at && format(new Date(selectedVersion.generated_at), 'MMMM d, yyyy \'at\' h:mm a')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedVersion(null)}
                >
                  View Current
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRestoreVersion(selectedVersion.version)}
                  loading={restoringVersion}
                >
                  Restore This Version
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Question */}
      <Card className="mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-sapphire-500/20">
            <MessageSquare className="w-6 h-6 text-sapphire-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white mb-2">Question Presented</h2>
            <p className="text-obsidian-200 text-lg">{meeting.question}</p>
            {meeting.context && (
              <div className="mt-4 p-4 rounded-xl bg-obsidian-800/30">
                <p className="text-sm text-obsidian-400 mb-1">Additional Context:</p>
                <p className="text-obsidian-300">{meeting.context}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Attached Files */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-obsidian-700">
              <Paperclip className="w-4 h-4 text-obsidian-400" />
            </div>
            <h3 className="font-medium text-white">Attached Files ({meetingFiles.length})</h3>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              loading={uploadingFile}
            >
              <Plus className="w-4 h-4" />
              Add File
            </Button>
          </div>
        </div>
        
        {meetingFiles.length > 0 ? (
          <div className="space-y-2">
            {meetingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-xl bg-obsidian-800/30"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-obsidian-400" />
                  <span className="text-sm text-white">{file.filename}</span>
                  <span className="text-xs text-obsidian-500">{file.file_type}</span>
                </div>
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  className="p-1 hover:bg-obsidian-700 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-obsidian-400 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-obsidian-500">
            No files attached. Add relevant documents for context in follow-up discussions.
          </p>
        )}
      </Card>

      {/* Chair's Summary & Recommendation */}
      {meeting.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card gradient className="border-gold-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gold-500/20">
                <Crown className="w-6 h-6 text-gold-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-display font-bold text-gold-400 mb-4">
                  Chair of the Board's Summary
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-obsidian-400 uppercase tracking-wider mb-2">
                      Board Discussion Summary
                    </h3>
                    <div className="text-obsidian-200 leading-relaxed whitespace-pre-wrap">
                      {displayChairSummary}
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-gold-500/10 border border-gold-500/20">
                    <h3 className="text-sm font-medium text-gold-400 uppercase tracking-wider mb-2">
                      Official Recommendation
                    </h3>
                    <div className="text-white leading-relaxed font-medium whitespace-pre-wrap">
                      {displayChairRecommendation}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Follow-up Questions Section */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sapphire-500/20">
              <MessageSquare className="w-4 h-4 text-sapphire-400" />
            </div>
            <h3 className="font-medium text-white">Follow-up Questions ({displayFollowUps.length})</h3>
          </div>
          {meeting.status === 'completed' && !selectedVersion && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFollowUp(!showFollowUp)}
            >
              <Plus className="w-4 h-4" />
              Ask Follow-up
            </Button>
          )}
        </div>

        {showFollowUp && !selectedVersion && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleFollowUpSubmit}
            className="mb-4"
          >
            <div className="space-y-3">
              <textarea
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                placeholder="Ask a follow-up question based on the board's recommendations..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-obsidian-800/50 border border-obsidian-700 text-white placeholder-obsidian-500 focus:outline-none focus:ring-2 focus:ring-sapphire-400/50 focus:border-sapphire-400/50 resize-none"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={submittingFollowUp}>
                  {submittingFollowUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit Question
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFollowUp(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.form>
        )}

        {displayFollowUps.length > 0 ? (
          <div className="space-y-4">
            {displayFollowUps.map((followUp, index) => (
              <motion.div
                key={followUp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-obsidian-800/30 border border-obsidian-700/50"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-sapphire-500/20 flex items-center justify-center text-xs text-sapphire-400 font-medium">
                    Q
                  </div>
                  <div className="flex-1">
                    <p className="text-white">{followUp.question}</p>
                    <p className="text-xs text-obsidian-500 mt-1">
                      Asked {formatDistanceToNow(new Date(followUp.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {followUp.chair_response && (
                  <div className="flex items-start gap-3 mt-3 pt-3 border-t border-obsidian-700/50">
                    <div className="w-6 h-6 rounded-full bg-gold-500/20 flex items-center justify-center">
                      <Crown className="w-3 h-3 text-gold-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gold-400 font-medium mb-1">Chair's Response</p>
                      <p className="text-obsidian-200 whitespace-pre-wrap">{followUp.chair_response}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-obsidian-500">
            No follow-up questions yet. Ask questions to get more specific guidance from the Chair.
          </p>
        )}
      </Card>

      {/* Individual Opinions */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-sapphire-500/20">
            <Users className="w-5 h-5 text-sapphire-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            Board Member Opinions ({displayOpinions.length})
          </h2>
        </div>

        <div className="space-y-4">
          {displayOpinions.map((opinion, index) => (
            <OpinionCard key={opinion.agent_id + '-' + index} opinion={opinion} index={index} />
          ))}
        </div>
      </div>

      {/* Meeting Metadata */}
      <Card className="text-center">
        <p className="text-sm text-obsidian-400">
          Meeting created on {format(new Date(meeting.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
          {meeting.completed_at && (
            <> · Completed on {format(new Date(meeting.completed_at), 'MMMM d, yyyy \'at\' h:mm a')}</>
          )}
          {meeting.current_version && meeting.current_version > 1 && (
            <> · Version {meeting.current_version}</>
          )}
        </p>
      </Card>

      {/* Debug Logs Panel - Admin Only */}
      {user?.is_admin && debugLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <Card className={`${hasErrors ? 'border-red-500/30' : hasWarnings ? 'border-amber-500/30' : 'border-obsidian-700'}`}>
            <button
              onClick={() => setShowDebugLogs(!showDebugLogs)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${hasErrors ? 'bg-red-500/20' : hasWarnings ? 'bg-amber-500/20' : 'bg-obsidian-700'}`}>
                  <Terminal className={`w-5 h-5 ${hasErrors ? 'text-red-400' : hasWarnings ? 'text-amber-400' : 'text-obsidian-400'}`} />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    Debug Logs
                    <span className="text-xs px-2 py-0.5 rounded-full bg-obsidian-700 text-obsidian-300">
                      Admin Only
                    </span>
                  </h3>
                  <p className="text-sm text-obsidian-400">
                    {debugLogs.length} entries
                    {hasErrors && <span className="text-red-400 ml-2">• {debugLogs.filter(l => l.level === 'error').length} errors</span>}
                    {hasWarnings && <span className="text-amber-400 ml-2">• {debugLogs.filter(l => l.level === 'warning').length} warnings</span>}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-obsidian-400 transition-transform ${showDebugLogs ? 'rotate-180' : ''}`} />
            </button>

            {showDebugLogs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-2 max-h-[600px] overflow-y-auto"
              >
                {[...debugLogs].reverse().map((log, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border ${getLogBgColor(log.level)} overflow-hidden`}
                  >
                    <button
                      onClick={() => log.details && toggleLogExpanded(index)}
                      className={`w-full p-3 text-left ${log.details ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getLogIcon(log.level)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                              log.level === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {log.level.toUpperCase()}
                            </span>
                            <span className="text-xs text-obsidian-500 font-mono">
                              {log.agent_name}
                            </span>
                            <span className="text-xs text-obsidian-600">
                              {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                            </span>
                          </div>
                          <p className={`text-sm mt-1 ${log.level === 'error' ? 'text-red-200' : 'text-obsidian-200'}`}>
                            {log.message}
                          </p>
                        </div>
                        {log.details && (
                          <ChevronRight className={`w-4 h-4 text-obsidian-500 transition-transform flex-shrink-0 ${expandedLogIds.has(index) ? 'rotate-90' : ''}`} />
                        )}
                      </div>
                    </button>
                    
                    {log.details && expandedLogIds.has(index) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-3 pb-3"
                      >
                        <pre className="text-xs bg-obsidian-900/50 rounded-lg p-3 overflow-x-auto text-obsidian-300 font-mono whitespace-pre-wrap break-all">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </Card>
        </motion.div>
      )}
    </Layout>
  );
}
