import { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Globe, Upload, Loader2, AlertTriangle, ShieldCheck, FileSpreadsheet, LayoutList, Siren, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { analyzeText, analyzeUrl, analyzeBatch, getModelInfo } from '../services';

const formatPercent = (value) => (
  Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : null
);

const getClassifierLabel = (info) => (
  [info?.vectorizer_type, info?.model_type].filter(Boolean).join(' + ') || info?.model_type || 'Python classifier'
);

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = ['txt', 'csv', 'md'];

const readFileAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
  reader.readAsText(file);
});

const extractRowsFromFile = async (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const text = await readFileAsText(file);

  if (extension === 'csv') {
    const workbook = XLSX.read(text, { type: 'string', raw: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
    });

    return rows
      .map((row) => row.map((cell) => String(cell).trim()).filter(Boolean).join(' '))
      .filter(Boolean);
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const Analysis = () => {
  const fileInputId = useId();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('text');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);

  // Form states
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [batchInput, setBatchInput] = useState('');

  useEffect(() => {
    let mounted = true;
    getModelInfo()
      .then((info) => {
        if (mounted) setModelInfo(info);
      })
      .catch(() => {
        if (mounted) setModelInfo(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError(null);
    setResult(null);
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return setError("Please enter text to analyze");
    
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeText(textInput);
      setResult({ type: 'text', data });
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return setError("Please enter a URL to analyze");
    
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeUrl(urlInput);
      setResult({ type: 'url', data });
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!fileInput) return setError("Please choose a file to analyze");
    
    setLoading(true);
    setError(null);
    try {
      const rows = await extractRowsFromFile(fileInput);
      if (!rows.length) {
        setError('No rows were found in this file');
        return;
      }

      const data = await analyzeBatch(rows);
      setResult({
        type: 'file',
        data: {
          filename: fileInput.name,
          segments: data.results.map((item, index) => ({
            ...item,
            segment_id: index + 1,
            row_number: index + 1,
          })),
          summary: {
            ...data.summary,
            total_rows: rows.length,
            total_segments: rows.length,
          },
          emergencyAlert: data.emergencyAlert,
        },
      });
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const validateAndSetFile = (file) => {
    setResult(null);

    if (!file) {
      setFileInput(null);
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      setFileInput(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setError('Please upload a .txt, .csv, or .md file');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileInput(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setError(null);
    setFileInput(file);
  };

  const handleFileChange = (event) => {
    validateAndSetFile(event.target.files?.[0]);
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsDraggingFile(false);
    validateAndSetFile(event.dataTransfer.files?.[0]);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (!batchInput.trim()) return setError("Please enter texts to analyze, one per line");
    
    const texts = batchInput.split('\n').filter(t => t.trim().length > 0);
    if (texts.length === 0) return setError("No valid text was found");
    
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeBatch(texts);
      setResult({ type: 'batch', data });
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-8">
      <div className="mb-8 text-center sm:mb-10">
        <h1 className="text-2xl font-bold mb-3 sm:text-3xl">Analysis Workspace</h1>
        <p className="mx-auto max-w-2xl text-sm text-textMuted sm:text-base">Choose an input method and the AI will detect crime-related signals.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Input Section */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 bg-surfaceLight p-1 rounded-xl shadow-inner border border-white/5 sm:flex">
            <TabButton active={activeTab === 'text'} onClick={() => handleTabChange('text')} icon={<FileText className="w-4 h-4" />} label="Text" />
            <TabButton active={activeTab === 'url'} onClick={() => handleTabChange('url')} icon={<Globe className="w-4 h-4" />} label="URL" />
            <TabButton active={activeTab === 'file'} onClick={() => handleTabChange('file')} icon={<Upload className="w-4 h-4" />} label="File" />
            <TabButton active={activeTab === 'batch'} onClick={() => handleTabChange('batch')} icon={<LayoutList className="w-4 h-4" />} label="Batch" />
          </div>

          <div className="glass-panel p-4 sm:p-6">
            {activeTab === 'text' && (
              <form onSubmit={handleTextSubmit} className="flex flex-col gap-4">
                <label className="text-sm font-medium text-white/80">Enter the text you want to analyze:</label>
                <textarea 
                  className="glass-input min-h-[200px] resize-y" 
                  placeholder="Paste an article, paragraph, or sentence here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <button type="submit" className="btn-primary mt-2" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze Text'}
                </button>
              </form>
            )}

            {activeTab === 'url' && (
              <form onSubmit={handleUrlSubmit} className="flex flex-col gap-4">
                <label className="text-sm font-medium text-white/80">Enter an article URL to read and analyze:</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-5 w-5 text-textMuted" />
                  </div>
                  <input 
                    type="url"
                    className="glass-input pl-10" 
                    placeholder="https://example.com/news-article"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                  />
                </div>
                <div className="text-xs text-textMuted flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> Note: some websites may block automatic reading
                </div>
                <button type="submit" className="btn-primary mt-4" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Read and Analyze URL'}
                </button>
              </form>
            )}

            {activeTab === 'file' && (
              <form onSubmit={handleFileSubmit} className="flex flex-col gap-4">
                <label className="text-sm font-medium text-white/80" htmlFor={fileInputId}>Upload a document to analyze its paragraphs:</label>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  type="file"
                  className="sr-only"
                  accept=".txt,.csv,.md,text/plain,text/csv,text/markdown"
                  onChange={handleFileChange}
                />
                <div
                  role="button"
                  tabIndex={0}
                  className={`rounded-xl border-2 border-dashed p-5 text-center transition-colors cursor-pointer group sm:p-8 ${
                    isDraggingFile
                      ? 'border-primary bg-primary/10'
                      : 'border-white/20 hover:bg-white/5'
                  }`}
                  onClick={openFilePicker}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openFilePicker();
                    }
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleFileDrop}
                >
                  <FileSpreadsheet className="w-12 h-12 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-medium text-white mb-1 break-words">
                    {fileInput ? fileInput.name : 'Click or drag a file to upload'}
                  </h3>
                  <p className="text-sm text-textMuted">
                    {fileInput ? `${(fileInput.size / 1024 / 1024).toFixed(2)} MB selected` : `Supports .txt, .csv, .md (up to ${MAX_FILE_SIZE_MB}MB)`}
                  </p>
                  <button
                    type="button"
                    className="mx-auto mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                    onClick={(event) => {
                      event.stopPropagation();
                      openFilePicker();
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    Choose File
                  </button>
                </div>
                {fileInput && (
                  <button
                    type="button"
                    className="self-start inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-textMuted transition-colors hover:bg-white/5 hover:text-white"
                    onClick={() => {
                      setFileInput(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                    Remove file
                  </button>
                )}
                <button type="submit" className="btn-primary mt-2" disabled={loading || !fileInput}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze Document'}
                </button>
              </form>
            )}

            {activeTab === 'batch' && (
              <form onSubmit={handleBatchSubmit} className="flex flex-col gap-4">
                <label className="text-sm font-medium text-white/80">Enter multiple texts, one per line:</label>
                <textarea 
                  className="glass-input min-h-[250px] resize-y leading-relaxed" 
                  placeholder="Text 1 here...&#10;Text 2 here...&#10;Text 3 here..."
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                />
                <button type="submit" className="btn-primary mt-2" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Analyze ${batchInput.split('\n').filter(t => t.trim()).length || 0} items`}
                </button>
              </form>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="bg-danger/10 border border-danger/20 text-danger rounded-lg p-4 flex gap-3 items-start overflow-hidden"
                >
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results Section */}
        <div className="flex flex-col h-full">
          <div className={`glass-panel h-full w-full flex flex-col ${!result ? 'items-center justify-center p-6 sm:p-8' : 'overflow-hidden'}`}>
            {!result ? (
              <div className="text-center opacity-50">
                <ShieldCheck className="w-16 h-16 mx-auto mb-4 text-textMuted" />
                <h3 className="text-xl font-medium text-white mb-2">Waiting for Input</h3>
                <p className="text-sm max-w-xs mx-auto">Submit input so the AI classification result appears here.</p>
              </div>
            ) : (
              <ResultDisplay result={result} modelInfo={modelInfo} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-medium transition-all sm:px-4 ${
      active 
        ? 'bg-surface shadow-md text-white' 
        : 'text-textMuted hover:text-white hover:bg-white/5'
    }`}
  >
    {icon} <span className="hidden sm:inline">{label}</span>
  </button>
);

const StatusBadge = ({ isCrime }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-xs sm:px-4 sm:text-sm ${
    isCrime 
      ? 'bg-danger/10 border-danger/30 text-danger' 
      : 'bg-success/10 border-success/30 text-success'
  }`}>
    {isCrime ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
    <span className="font-bold tracking-wide">{isCrime ? 'crime-related' : 'not crime-related'}</span>
  </div>
);

const EmergencyAlertBanner = ({ alert }) => {
  if (!alert?.detected) {
    return null;
  }

  const categories = alert.categories?.map((category) => category.label).join(', ') || 'Urgent risk';
  const matchedKeywords = alert.matchedKeywords?.join(', ');

  return (
    <div className="mb-4 rounded-xl border border-danger/40 bg-danger/15 p-4 text-danger shadow-lg shadow-danger/10">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-danger/15 p-2">
          <Siren className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black uppercase tracking-wider">Emergency Alert</div>
          <div className="mt-1 text-sm font-semibold text-danger">{categories}</div>
          {matchedKeywords && (
            <div className="mt-2 text-xs text-danger/80">
              Matched: {matchedKeywords}
            </div>
          )}
          {alert.snippet && (
            <div className="mt-3 line-clamp-3 rounded-lg bg-black/20 px-3 py-2 text-xs leading-relaxed text-white/85">
              {alert.snippet}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PredictionTrustDetails = ({ data, modelInfo }) => {
  const classifier = getClassifierLabel(modelInfo);
  const crimeProbability = formatPercent(data?.crime_probability);
  const threshold = formatPercent(data?.crime_threshold ?? modelInfo?.crime_probability_threshold);

  if (!crimeProbability && !threshold && !modelInfo?.model_type) {
    return null;
  }

  return (
    <div className="mt-4 grid w-full gap-2 text-xs text-textMuted sm:grid-cols-3">
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
        <div className="uppercase tracking-wider">Classifier</div>
        <div className="mt-1 font-semibold text-white">{classifier}</div>
      </div>
      {crimeProbability && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div className="uppercase tracking-wider">Crime probability</div>
          <div className="mt-1 font-semibold text-white">{crimeProbability}</div>
        </div>
      )}
      {threshold && (
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <div className="uppercase tracking-wider">Crime threshold</div>
          <div className="mt-1 font-semibold text-white">{threshold}</div>
        </div>
      )}
    </div>
  );
};

const ResultDisplay = ({ result, modelInfo }) => {
  const { type, data } = result;
  const fullText = type === 'url'
    ? data.scraped_content
    : data.inputText;

  const renderConfidenceBar = (confidence, isCrime) => (
    <div className="mt-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-textMuted">Confidence level</span>
        <span className="font-bold">{confidence}%</span>
      </div>
      <div className="h-2 w-full bg-surfaceLight rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${isCrime ? 'bg-danger' : 'bg-success'}`}
        />
      </div>
    </div>
  );

  if (type === 'text' || type === 'url') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
        <div className="p-4 border-b border-white/10 bg-surfaceLight/50 sm:p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            Analysis Result
            {type === 'url' && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded ml-auto">URL Reading</span>}
          </h2>
          <EmergencyAlertBanner alert={data.emergencyAlert} />
          
          <div className="flex flex-col items-center justify-center py-5 bg-surface rounded-xl border border-white/5 shadow-inner sm:py-6">
            <StatusBadge isCrime={data.is_crime} />
            <div className="w-full max-w-sm px-3 sm:px-6">
              {renderConfidenceBar(data.confidence, data.is_crime)}
            </div>
            <div className="w-full px-3 sm:px-6">
              <PredictionTrustDetails data={data} modelInfo={modelInfo} />
            </div>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto sm:p-6">
          {type === 'url' && data.scraped_title && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-textMuted mb-2 uppercase tracking-wider">Article Title</h3>
              <p className="font-medium text-lg leading-snug">{data.scraped_title}</p>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-semibold text-textMuted mb-2 uppercase tracking-wider">Full Analyzed Text</h3>
            <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap bg-surface p-3 rounded-lg text-sm leading-relaxed border border-white/5 text-white/90 sm:p-4">
              {fullText || data.processed_text || 'No text available'}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (type === 'file' || type === 'batch') {
    const isFile = type === 'file';
    const items = isFile ? data.segments : data.results;
    
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
        <div className="p-4 border-b border-white/10 bg-surfaceLight/50 sm:p-6">
          <h2 className="text-xl font-bold mb-4">
            {isFile ? 'Document Result' : 'Batch Result'}
          </h2>
          <EmergencyAlertBanner alert={data.emergencyAlert} />
          
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="bg-surface p-3 rounded-lg border border-white/5 text-center">
              <div className="text-2xl font-bold text-white">{data.summary.total || data.summary.total_rows || data.summary.total_segments}</div>
              <div className="text-xs text-textMuted mt-1 uppercase tracking-wider">{isFile ? 'Rows' : 'Total'}</div>
            </div>
            <div className="bg-danger/10 p-3 rounded-lg border border-danger/20 text-center">
              <div className="text-2xl font-bold text-danger">{data.summary.crime_count}</div>
              <div className="text-xs text-danger/70 mt-1 uppercase tracking-wider">Crime</div>
            </div>
            <div className="bg-success/10 p-3 rounded-lg border border-success/20 text-center">
              <div className="text-2xl font-bold text-success">{data.summary.not_crime_count}</div>
              <div className="text-xs text-success/70 mt-1 uppercase tracking-wider">Safe</div>
            </div>
          </div>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto sm:p-6">
          <h3 className="text-sm font-semibold text-textMuted mb-4 uppercase tracking-wider">
            {isFile ? 'File Rows' : 'Item Results'}
          </h3>
          
          <div className="flex flex-col gap-3">
            {items && items.length > 0 ? (
              items.map((item, idx) => (
                <div key={idx} className="bg-surface border border-white/5 rounded-lg p-4 relative overflow-hidden group">
                  {/* Left indicator stripe */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.is_crime ? 'bg-danger' : 'bg-success'}`} />
                  
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-2 pl-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {isFile && (
                        <span className="rounded bg-white/5 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-textMuted">
                          Row {item.row_number || item.segment_id || idx + 1}
                        </span>
                      )}
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.is_crime ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'
                      }`}>
                        {item.is_crime ? 'crime-related' : 'not crime-related'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-textMuted bg-white/5 px-1.5 py-0.5 rounded">
                      {item.confidence}%
                    </span>
                  </div>
                  {(item.crime_probability !== undefined || item.crime_threshold !== undefined) && (
                    <div className="mb-2 pl-2 text-xs text-textMuted">
                      Crime probability {formatPercent(item.crime_probability) || 'unavailable'}
                      {formatPercent(item.crime_threshold) ? ` / threshold ${formatPercent(item.crime_threshold)}` : ''}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm text-white/80 pl-2">{item.text}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-textMuted text-sm">
                No segment details are available for this analysis.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};

export default Analysis;
