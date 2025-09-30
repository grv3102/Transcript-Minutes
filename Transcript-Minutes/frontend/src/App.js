import React, { useState, useRef } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Alert, AlertDescription } from './components/ui/alert';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { Upload, FileText, Download, Users, CheckCircle, Lightbulb, BarChart3, PieChart, TrendingUp, Copy, Loader2, FileDown } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [transcriptText, setTranscriptText] = useState('');
  const [minutes, setMinutes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('minutes');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.docx')) {
      toast.error('Please upload only .txt or .docx files');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload-transcript`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for file processing
      });
      
      if (response.data && response.data.id) {
        setMinutes(response.data);
        setActiveTab('minutes');
        setTranscriptText(''); // Clear any existing text
        toast.success('File processed successfully!');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Upload error:', err);
      let errorMessage = 'Failed to process uploaded file';
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'File processing timed out. Please try a shorter transcript.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProcessTranscript = async () => {
    if (!transcriptText.trim()) {
      toast.error('Please enter a transcript to process');
      return;
    }

    if (transcriptText.trim().length < 10) {
      toast.error('Transcript must be at least 10 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/process-transcript`, {
        transcript: transcriptText
      }, {
        timeout: 60000, // 60 second timeout for AI processing
      });
      
      if (response.data && response.data.id) {
        setMinutes(response.data);
        setActiveTab('minutes');
        toast.success('Transcript processed successfully!');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Processing error:', err);
      let errorMessage = 'Failed to process transcript';
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Processing timed out. Please try a shorter transcript.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!minutes) return;

    try {
      const response = await axios.post(`${API}/export-pdf`, minutes, {
        responseType: 'blob',
        timeout: 60000,
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-minutes-${new Date().toISOString().slice(0, 16).replace(/[:-]/g, '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export PDF');
    }
  };

  const handleExportDOC = async () => {
    if (!minutes) return;

    try {
      const response = await axios.post(`${API}/export-docx`, minutes, {
        responseType: 'blob',
        timeout: 60000,
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-minutes-${new Date().toISOString().slice(0, 16).replace(/[:-]/g, '')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Word document exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export Word document');
    }
  };

  const handleCopyMinutes = () => {
    if (!minutes) return;

    const minutesText = `MEETING MINUTES\n\n` +
      `SUMMARY:\n${minutes.summary}\n\n` +
      `PARTICIPANTS:\n${minutes.participants.join(', ')}\n\n` +
      `ACTION ITEMS:\n${minutes.action_items.map(item => `• ${item.owner}: ${item.task}${item.deadline ? ` (Due: ${item.deadline})` : ''}`).join('\n')}\n\n` +
      `DECISIONS:\n${minutes.decisions.map(decision => `• ${decision.decision}`).join('\n')}`;

    navigator.clipboard.writeText(minutesText).then(() => {
      toast.success('Minutes copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const handleReset = () => {
    setTranscriptText('');
    setMinutes(null);
    setError('');
    setActiveTab('minutes');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getInsightCharts = () => {
    if (!minutes) return null;

    const actionItemsCount = minutes.action_items.length;
    const decisionsCount = minutes.decisions.length;
    const participantsCount = minutes.participants.length;
    const topicsCount = minutes.topics.length;

    return {
      actionItemsCount,
      decisionsCount,
      participantsCount,
      topicsCount,
      topParticipants: minutes.participants.slice(0, 5),
      topTopics: minutes.topics.sort((a, b) => b.confidence - a.confidence).slice(0, 5)
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Meeting Minutes AI</h1>
                <p className="text-sm text-slate-600">Transform transcripts into structured minutes</p>
              </div>
            </div>
            {minutes && (
              <Button onClick={handleReset} variant="outline" data-testid="reset-btn">
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!minutes ? (
          // Input Section
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Process Your Meeting Transcript</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Upload a file or paste your meeting transcript to automatically generate structured minutes with AI-powered extraction of action items, decisions, and insights.
              </p>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50" data-testid="error-alert">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-8">
              {/* File Upload */}
              <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <div className="mx-auto bg-gradient-to-r from-blue-500 to-cyan-500 p-3 rounded-full w-fit mb-4">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">Upload File</CardTitle>
                  <CardDescription>
                    Upload a .txt or .docx file containing your meeting transcript
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      data-testid="file-input"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="space-y-2">
                        <div className="text-slate-500">
                          <FileText className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                          <p>Click to select a file</p>
                          <p className="text-sm">Supports .txt and .docx files</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  {loading && (
                    <div className="mt-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      <p className="text-sm text-slate-600 mt-2">Processing transcript...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Text Input */}
              <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-sm">
                <CardHeader className="text-center">
                  <div className="mx-auto bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-full w-fit mb-4">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">Paste Transcript</CardTitle>
                  <CardDescription>
                    Paste or type your meeting transcript directly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Paste your meeting transcript here...\n\nExample:\nJohn: We need to discuss the project timeline.\nMary: I agree. Let's set the deadline for next Friday.\nJohn: I'll handle the client communication.\nMary: Great, I'll prepare the presentation materials."
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                    rows={8}
                    className="resize-none bg-white/80"
                    data-testid="transcript-textarea"
                  />
                  <Button 
                    onClick={handleProcessTranscript} 
                    disabled={loading || !transcriptText.trim()}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    data-testid="process-transcript-btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Process Transcript</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Results Section
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Meeting Minutes Generated</h2>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {minutes.processing_method === 'ai' ? '🤖 AI Processed' : '📝 Regex Processed'}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    Processed at {new Date(minutes.processed_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleCopyMinutes} variant="outline" size="sm" data-testid="copy-btn">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button onClick={handleExportPDF} variant="outline" size="sm" data-testid="export-pdf-btn">
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button onClick={handleExportDOC} variant="outline" size="sm" data-testid="export-doc-btn">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export DOC
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/60">
                <TabsTrigger value="minutes" data-testid="minutes-tab">📋 Minutes</TabsTrigger>
                <TabsTrigger value="insights" data-testid="insights-tab">📊 Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="minutes" className="space-y-6">
                {/* Summary */}
                <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                      Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-slate-700" data-testid="summary-content">
                      {minutes.summary.replace(/\\n/g, '\n').split('\n').filter(line => line.trim()).map((line, index) => (
                        <div key={index} className="flex items-start space-x-2 mb-2">
                          <span className="text-indigo-600 mt-1">•</span>
                          <span className="flex-1">{line.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Participants */}
                  <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-blue-600" />
                        Participants ({minutes.participants.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {minutes.participants.length > 0 ? (
                        <div className="flex flex-wrap gap-2" data-testid="participants-list">
                          {minutes.participants.map((participant, index) => (
                            <Badge key={index} variant="secondary" className="bg-blue-100 text-blue-800">
                              {participant}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">No participants identified</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Topics */}
                  <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Lightbulb className="h-5 w-5 mr-2 text-amber-600" />
                        Topics ({minutes.topics.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {minutes.topics.length > 0 ? (
                        <div className="space-y-2" data-testid="topics-list">
                          {minutes.topics.map((topic, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                {topic.topic}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {Math.round(topic.confidence * 100)}% confidence
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">No topics identified</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Action Items */}
                <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                      Action Items ({minutes.action_items.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {minutes.action_items.length > 0 ? (
                      <div className="space-y-4" data-testid="action-items-list">
                        {minutes.action_items.map((item, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-green-50/50 rounded-lg border border-green-200/50">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <Badge className="bg-green-600">{item.owner}</Badge>
                                {item.deadline && (
                                  <span className="text-xs text-slate-600">Due: {item.deadline}</span>
                                )}
                              </div>
                              <p className="text-slate-700">{item.task}</p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant="secondary" className={`${
                                  item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                  item.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                  'bg-slate-100 text-slate-800'
                                }`}>
                                  {item.status}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {Math.round(item.confidence * 100)}% confidence
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 italic">No action items identified</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Decisions */}
                {minutes.decisions.length > 0 && (
                  <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Lightbulb className="h-5 w-5 mr-2 text-purple-600" />
                        Decisions ({minutes.decisions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4" data-testid="decisions-list">
                        {minutes.decisions.map((decision, index) => (
                          <div key={index} className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/50">
                            <p className="font-medium text-slate-800 mb-2">{decision.decision}</p>
                            <p className="text-sm text-slate-600">{decision.context}</p>
                            <div className="mt-2">
                              <span className="text-xs text-slate-500">
                                {Math.round(decision.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="insights" className="space-y-6">
                {(() => {
                  const insights = getInsightCharts();
                  return (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Stats Cards */}
                      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm font-medium">Action Items</p>
                              <p className="text-3xl font-bold" data-testid="action-items-count">{insights?.actionItemsCount || 0}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-blue-200" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-emerald-100 text-sm font-medium">Participants</p>
                              <p className="text-3xl font-bold" data-testid="participants-count">{insights?.participantsCount || 0}</p>
                            </div>
                            <Users className="h-8 w-8 text-emerald-200" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-100 text-sm font-medium">Decisions</p>
                              <p className="text-3xl font-bold" data-testid="decisions-count">{insights?.decisionsCount || 0}</p>
                            </div>
                            <Lightbulb className="h-8 w-8 text-purple-200" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-amber-100 text-sm font-medium">Topics</p>
                              <p className="text-3xl font-bold" data-testid="topics-count">{insights?.topicsCount || 0}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-amber-200" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Top Participants */}
                      {insights?.topParticipants && insights.topParticipants.length > 0 && (
                        <Card className="md:col-span-2 border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <Users className="h-5 w-5 mr-2 text-blue-600" />
                              Meeting Participants
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2" data-testid="top-participants">
                              {insights.topParticipants.map((participant, index) => (
                                <div key={index} className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span className="text-slate-700">{participant}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Top Topics */}
                      {insights?.topTopics && insights.topTopics.length > 0 && (
                        <Card className="md:col-span-2 border-0 shadow-lg bg-white/70 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center">
                              <BarChart3 className="h-5 w-5 mr-2 text-amber-600" />
                              Discussion Topics
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3" data-testid="top-topics">
                              {insights.topTopics.map((topic, index) => (
                                <div key={index} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-700 font-medium">{topic.topic}</span>
                                    <span className="text-sm text-slate-500">{Math.round(topic.confidence * 100)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" 
                                      style={{ width: `${topic.confidence * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
