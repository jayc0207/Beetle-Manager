import React, { useState, useEffect, useRef } from 'react';
import { 
  Bug, 
  Leaf, 
  Calendar, 
  Settings, 
  Plus, 
  Search, 
  Camera, 
  Save, 
  X, 
  QrCode, 
  ChevronRight, 
  Trash2,
  Database,
  Bell,
  Cloud,
  LogOut,
  Loader,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  Star,
  Maximize2,
  Heart,
  Download,
  Upload,
  ArrowUpDown,
  FileJson,
  Share2,
  Copy,
  Home,
  FolderOpen,
  Link as LinkIcon,
  WifiOff,
  Printer
} from 'lucide-react';

// ==========================================
// CONFIGURATION - 請確認這裡填的是您的 Client ID
// ==========================================
const CLIENT_ID = '334603460658-jqlon9pdv8nd6q08e9kh6epd2t7cseo9.apps.googleusercontent.com'; // <--- 【請注意】請將這裡替換為您的真實 Client ID
const API_KEY = ''; 
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];
const SPREADSHEET_NAME = 'Beetle_Manager_DB';
const APP_FOLDER_NAME = 'Beetle-Manager'; // 指定上傳的資料夾名稱

// --- Helper: Convert Base64 to Blob for Upload ---
const base64ToBlob = (base64Data) => {
  const parts = base64Data.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
};

// --- Helper: UTF-8 Safe Base64 Encoding/Decoding for Sharing ---
const encodeShareData = (data) => {
  try {
    return window.btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  } catch (e) {
    console.error("Encoding failed", e);
    return "";
  }
};

const decodeShareData = (str) => {
  try {
    return JSON.parse(decodeURIComponent(escape(window.atob(str))));
  } catch (e) {
    console.error("Decoding failed", e);
    return null;
  }
};

// --- Helper: Fetch Public Sheet Data (GViz API) ---
const fetchPublicSheetData = async (sheetId, targetItemId) => {
    try {
        // 使用 Google Visualization API 讀取公開試算表 (不需要 OAuth)
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const text = await response.text();
        
        // GViz 回傳的 JSON 包在 /*O_o*/ google.visualization.Query.setResponse(...); 中，需擷取
        const jsonText = text.substring(47, text.length - 2);
        const json = JSON.parse(jsonText);
        
        // 解析資料列: 假設 Column B (index 1) 存放 JSON 字串
        // table.rows[i].c[1].v
        const items = json.table.rows.map(row => {
            try {
                const cell = row.c && row.c[1]; // Column B
                return cell ? JSON.parse(cell.v) : null;
            } catch(e) { return null; }
        }).filter(i => i !== null);
        
        return items.find(i => i.id === targetItemId);
    } catch (e) {
        console.error("Fetch sheet error", e);
        return null;
    }
};

// --- UI Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled, ...props }) => {
  const baseStyle = "px-4 py-2 rounded-full font-medium transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#8B5E3C] text-white hover:bg-[#6F4B30] shadow-md",
    secondary: "bg-[#E8E1D5] text-[#5C4033] hover:bg-[#D6CDBF]",
    outline: "border border-[#8B5E3C] text-[#8B5E3C] hover:bg-[#FDFBF7]",
    ghost: "text-[#8B5E3C] hover:bg-[#FDFBF7]",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    google: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const InputGroup = ({ label, children, icon }) => (
  <div className="mb-4">
    <label className="text-xs font-bold text-[#8B5E3C] mb-1 block flex items-center gap-1">
      {icon && <span className="w-4 h-4">{icon}</span>}
      {label}
    </label>
    {children}
  </div>
);

const TextInput = ({ value, onChange, placeholder, suffix, readOnly, className = '' }) => (
  <div className="relative mb-2">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full bg-transparent border-b border-[#D6CDBF] py-2 text-[#4A3B32] focus:outline-none focus:border-[#8B5E3C] placeholder-[#B0A695] ${readOnly ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
    />
    {suffix && <span className="absolute right-0 top-2 text-[#8B5E3C] text-sm">{suffix}</span>}
  </div>
);

const SelectButton = ({ options, value, onChange, readOnly }) => (
  <div className="flex gap-2 mt-1">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => !readOnly && onChange(opt.value)}
        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
          value === opt.value
            ? 'bg-[#E8DCC8] border-[#8B5E3C] text-[#5C4033]'
            : 'border-[#E5E7EB] text-gray-400 bg-white'
        } ${readOnly ? 'cursor-default opacity-80' : ''}`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

const StarRating = ({ rating, onChange, readOnly = false }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onChange(star)}
          disabled={readOnly}
          className={`focus:outline-none transition-transform ${!readOnly ? 'active:scale-110 hover:scale-110' : ''}`}
        >
          <Star 
            size={readOnly ? 14 : 24} 
            fill={star <= rating ? "#F4D06F" : "none"} 
            className={star <= rating ? "text-[#F4D06F]" : "text-[#D6CDBF]"}
          />
        </button>
      ))}
    </div>
  );
};

// --- Google API Helper Functions ---

const loadGoogleScript = (callback) => {
  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.onload = () => callback();
  script.onerror = () => console.error("Error loading GAPI script");
  document.body.appendChild(script);
};

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState('adult');
  const [view, setView] = useState('list'); // 'list', 'form', 'shared'
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('id'); // 'id', 'name', 'rating', 'date'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  
  const [editingItem, setEditingItem] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false); // 新增標籤視窗狀態
  const labelCanvasRef = useRef(null); // Canvas Ref
  
  // Share Modal State
  const [shareModalItem, setShareModalItem] = useState(null);
  
  // Shared View State (Visitor Mode)
  const [sharedItem, setSharedItem] = useState(null);
  const [isVisitorLoading, setIsVisitorLoading] = useState(false);
  const [visitorError, setVisitorError] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(''); 
  const [errorMsg, setErrorMsg] = useState('');
  
  // Image Viewer State
  const [viewImage, setViewImage] = useState(null);
  
  // Google Auth State
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [spreadsheetId, setSpreadsheetId] = useState(null);
  const [sheetName, setSheetName] = useState('Sheet1'); 
  const [driveFolderId, setDriveFolderId] = useState(null); // New: Store the Beetle-Manager folder ID

  // Form State
  const [formData, setFormData] = useState({
    type: 'adult',
    customId: '',
    rating: 0,
    name: '',
    scientificName: '',
    origin: '',
    bloodline: '',
    gender: 'unknown',
    size: '',
    weight: '',
    date: new Date().toISOString().split('T')[0],
    parentMale: '',
    parentFemale: '',
    generation: '',
    memo: '',
    acquisitionDate: '',
    startFeedingDate: '',
    deathDate: '',
    specimenImage: null,
    pupationImage: null,
    emergenceImage: null,
    images: [],
    image: null,
    status: 'active',
    larvaRecords: [],
    breedingRecords: [], 
    expectedHatchDate: '',
    enableEmailNotify: false,
    id: ''
  });

  // --- Initialization & Google Integration Logic ---

  useEffect(() => {
    // 1. Check for Share Params
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    const sharedSheetId = params.get('s');
    const sharedItemId = params.get('id');

    // Case A: Cloud Short Link
    if (sharedSheetId && sharedItemId) {
        setIsVisitorLoading(true);
        setVisitorError('');
        setView('shared'); // Switch immediately
        
        fetchPublicSheetData(sharedSheetId, sharedItemId)
            .then(item => {
                if (item) {
                    setSharedItem(item);
                } else {
                    setVisitorError('找不到資料。可能該資料已被刪除，或試算表未設為「公開檢視」。');
                }
            })
            .catch(err => {
                setVisitorError('讀取失敗。請確認網路連線。');
            })
            .finally(() => {
                setIsVisitorLoading(false);
            });
        return; // Skip normal loading
    }
    
    // Case B: Data in URL (Legacy/Offline)
    if (shareData) {
      const decoded = decodeShareData(shareData);
      if (decoded) {
        setSharedItem(decoded);
        setView('shared');
        return; 
      }
    }

    // 2. Load local data normally
    const savedData = localStorage.getItem('beetle_app_data');
    if (savedData) {
      setData(JSON.parse(savedData));
    }

    // 3. Init Google Scripts
    try {
      loadGoogleScript(() => {
        if (window.gapi) {
          window.gapi.load('client', initializeGapiClient);
        }
      });
      
      const script2 = document.createElement('script');
      script2.src = 'https://accounts.google.com/gsi/client';
      script2.onload = () => {
        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', 
            });
            setTokenClient(client);
            setGisInited(true);
        } catch (e) {
            console.warn("GIS Init failed:", e);
        }
      };
      document.body.appendChild(script2);

    } catch (e) {
      console.log("Google scripts failed to load", e);
    }
  }, []);

  // --- Effect for Drawing Label ---
  useEffect(() => {
    if (showLabelModal && labelCanvasRef.current && formData) {
      const canvas = labelCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      // Clear
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      
      // Styles
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.textBaseline = 'middle';

      const padding = 20;
      const contentW = width - padding * 2;
      
      // Common Header Section (Name & ID)
      const headerH = 80;
      
      // Name
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 36px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(formData.name || '未命名', padding, padding + 30);
      
      // Scientific Name
      if (formData.scientificName) {
        ctx.font = 'italic 18px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#555555';
        ctx.fillText(formData.scientificName, padding, padding + 60);
      }

      // ID (Top Right)
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formData.customId || '', width - padding, padding + 30);

      // Helper for info grid
      const drawInfoRow = (y, label1, val1, label2, val2) => {
        const colW = contentW / 2;
        const x1 = padding;
        const x2 = padding + colW;
        
        // Draw Labels (Small)
        ctx.font = '12px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'left';
        ctx.fillText(label1, x1, y);
        ctx.fillText(label2, x2, y);

        // Draw Values (Bold) - Offset to prevent overlap
        ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
        ctx.fillStyle = '#000000';
        ctx.fillText(val1 || '-', x1 + 100, y); 
        ctx.fillText(val2 || '-', x2 + 100, y);
        
        // Draw Bottom Line
        ctx.beginPath();
        ctx.strokeStyle = '#E0E0E0'; // Light line
        ctx.lineWidth = 1;
        ctx.moveTo(x1, y + 15);
        ctx.lineTo(width - padding, y + 15);
        ctx.stroke();
    };

      // --- 繪圖邏輯分支 ---
      if (formData.type === 'larva') {
          // === 幼蟲版面 ===
          const infoStartY = padding + headerH;
          const infoRowH = 35; 
          const infoRows = 4; // 包含種親，共 4 列
          const tableStartY = infoStartY + (infoRowH * infoRows) + 10;
          const tableH = height - tableStartY - padding;
          
          // Info Grid (Top Part)
          ctx.font = '16px "Noto Sans TC", sans-serif';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'left';

          const genderStr = formData.gender === 'male' ? '♂ 公' : formData.gender === 'female' ? '♀ 母' : '?';
          const weightStr = formData.weight ? `${formData.weight}g` : '-';
          
          // Parent logic with unit
          const pMale = formData.parentMale ? `${formData.parentMale}mm` : '-';
          const pFemale = formData.parentFemale ? `${formData.parentFemale}mm` : '-';

          // Row 1
          drawInfoRow(infoStartY + 10, '產地:', formData.origin, '血統:', formData.bloodline);
          // Row 2
          drawInfoRow(infoStartY + 10 + infoRowH, '性別:', genderStr, '初重:', weightStr);
          // Row 3
          drawInfoRow(infoStartY + 10 + infoRowH * 2, '累代:', formData.generation, '孵化:', formData.date);
          // Row 4 (New) - Parents
          drawInfoRow(infoStartY + 10 + infoRowH * 3, '種親♂:', pMale, '種親♀:', pFemale);

          // 2. Growth Record Table (Bottom Part) - 10 Records (2 columns x 5 data rows)
          const tableRows = 6; // 1 Header + 5 Data
          const rowH = tableH / tableRows;
          
          const colX = [
              padding, 
              padding + 110, 
              padding + 195, 
              padding + 280, 
              padding + 390, 
              padding + 475, 
              width - padding
          ];

          // Draw Table Border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(padding, tableStartY, contentW, tableH);

          // Draw Rows & Text
          for (let i = 0; i < tableRows; i++) {
              const y = tableStartY + (i * rowH);
              const textY = y + (rowH / 2);

              // Horizontal Line
              if (i > 0) {
                  ctx.beginPath();
                  ctx.lineWidth = 1;
                  ctx.moveTo(padding, y);
                  ctx.lineTo(width - padding, y);
                  ctx.stroke();
              }

              // Content
              ctx.textAlign = 'center';
              ctx.fillStyle = '#000000';
              
              if (i === 0) {
                  // Header
                  ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
                  // Left
                  ctx.fillText('日期', colX[0] + (colX[1]-colX[0])/2, textY);
                  ctx.fillText('幼蟲期', colX[1] + (colX[2]-colX[1])/2, textY);
                  ctx.fillText('重量(g)', colX[2] + (colX[3]-colX[2])/2, textY);
                  // Right
                  ctx.fillText('日期', colX[3] + (colX[4]-colX[3])/2, textY);
                  ctx.fillText('幼蟲期', colX[4] + (colX[5]-colX[4])/2, textY);
                  ctx.fillText('重量(g)', colX[5] + (colX[6]-colX[5])/2, textY);
              } else {
                  // Data
                  const leftIdx = i - 1;
                  const rightIdx = i - 1 + 5;
                  const recordLeft = formData.larvaRecords && formData.larvaRecords[leftIdx];
                  const recordRight = formData.larvaRecords && formData.larvaRecords[rightIdx];

                  ctx.font = '14px "Noto Sans TC", sans-serif';
                  
                  if (recordLeft) {
                      ctx.fillText(recordLeft.date || '', colX[0] + (colX[1]-colX[0])/2, textY);
                      ctx.fillText(recordLeft.stage || '', colX[1] + (colX[2]-colX[1])/2, textY);
                      ctx.fillText(recordLeft.weight ? `${recordLeft.weight}` : '', colX[2] + (colX[3]-colX[2])/2, textY);
                  }
                  
                  if (recordRight) {
                      ctx.fillText(recordRight.date || '', colX[3] + (colX[4]-colX[3])/2, textY);
                      ctx.fillText(recordRight.stage || '', colX[4] + (colX[5]-colX[4])/2, textY);
                      ctx.fillText(recordRight.weight ? `${recordRight.weight}` : '', colX[5] + (colX[6]-colX[5])/2, textY);
                  }
              }
          }
          
          // Draw Vertical Lines
          ctx.beginPath();
          ctx.lineWidth = 1;
          [colX[1], colX[2], colX[3], colX[4], colX[5]].forEach(x => {
              ctx.moveTo(x, tableStartY);
              ctx.lineTo(x, tableStartY + tableH);
          });
          ctx.stroke();

      } else if (formData.type === 'breeding') {
          // === 產卵組版面 ===
          const infoStartY = padding + headerH;
          const infoRowH = 35; 
          const infoRowsCount = 4;
          
          // Parent logic with unit
          const pMale = formData.parentMale ? `${formData.parentMale}mm` : '-';
          const pFemale = formData.parentFemale ? `${formData.parentFemale}mm` : '-';

          // Info Rows:
          drawInfoRow(infoStartY + 10, '產地:', formData.origin, '血統:', formData.bloodline);
          drawInfoRow(infoStartY + 10 + infoRowH, '累代:', formData.generation, '建立日期:', formData.date);
          drawInfoRow(infoStartY + 10 + infoRowH * 2, '種親♂:', pMale, '種親♀:', pFemale);
          drawInfoRow(infoStartY + 10 + infoRowH * 3, '預計孵化:', formData.expectedHatchDate, '', '');

          // Breeding Record Table - 10 Records (2 columns x 5 data rows)
          const tableStartY = infoStartY + (infoRowH * infoRowsCount) + 20;
          const tableH = height - tableStartY - padding;
          const tableRows = 6; // 1 Header + 5 Data
          const rowH = tableH / tableRows;

          const colX = [
              padding, 
              padding + 110, 
              padding + 195, 
              padding + 280, 
              padding + 390, 
              padding + 475, 
              width - padding
          ];

          // Draw Border
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(padding, tableStartY, contentW, tableH);

          // Draw Rows
           for (let i = 0; i < tableRows; i++) {
              const y = tableStartY + (i * rowH);
              const textY = y + (rowH / 2);

              if (i > 0) {
                  ctx.beginPath();
                  ctx.lineWidth = 1;
                  ctx.moveTo(padding, y);
                  ctx.lineTo(width - padding, y);
                  ctx.stroke();
              }
              
              ctx.textAlign = 'center';
              ctx.fillStyle = '#000000';

              if (i === 0) {
                  // Header
                  ctx.font = 'bold 14px "Noto Sans TC", sans-serif';
                  // Left
                  ctx.fillText('採收日', colX[0] + (colX[1]-colX[0])/2, textY);
                  ctx.fillText('卵', colX[1] + (colX[2]-colX[1])/2, textY);
                  ctx.fillText('蟲', colX[2] + (colX[3]-colX[2])/2, textY);
                  // Right
                  ctx.fillText('採收日', colX[3] + (colX[4]-colX[3])/2, textY);
                  ctx.fillText('卵', colX[4] + (colX[5]-colX[4])/2, textY);
                  ctx.fillText('蟲', colX[5] + (colX[6]-colX[5])/2, textY);
              } else {
                  // Data
                  const leftIdx = i - 1;
                  const rightIdx = i - 1 + 5;
                  const recordLeft = formData.breedingRecords && formData.breedingRecords[leftIdx];
                  const recordRight = formData.breedingRecords && formData.breedingRecords[rightIdx];

                  ctx.font = '14px "Noto Sans TC", sans-serif';
                  
                  if (recordLeft) {
                      ctx.fillText(recordLeft.date || '', colX[0] + (colX[1]-colX[0])/2, textY);
                      ctx.fillText(recordLeft.eggs || '', colX[1] + (colX[2]-colX[1])/2, textY);
                      ctx.fillText(recordLeft.larvae || '', colX[2] + (colX[3]-colX[2])/2, textY);
                  }
                  
                  if (recordRight) {
                      ctx.fillText(recordRight.date || '', colX[3] + (colX[4]-colX[3])/2, textY);
                      ctx.fillText(recordRight.eggs || '', colX[4] + (colX[5]-colX[4])/2, textY);
                      ctx.fillText(recordRight.larvae || '', colX[5] + (colX[6]-colX[5])/2, textY);
                  }
              }
           }
           
           // Vertical Lines
           ctx.beginPath();
           ctx.lineWidth = 1;
           [colX[1], colX[2], colX[3], colX[4], colX[5]].forEach(x => {
               ctx.moveTo(x, tableStartY);
               ctx.lineTo(x, tableStartY + tableH);
           });
           ctx.stroke();

      } else {
          // === 成蟲版面 ===
          const contentH = height - padding * 2;
          const gridY = padding + headerH;
          const gridH = contentH - headerH;
          const rowCount = 5;
          const rowH = gridH / rowCount;

          // Draw Main Border
          ctx.strokeRect(padding, gridY, contentW, gridH);

          // Draw Horizontal Lines
          for (let i = 1; i < rowCount; i++) {
              ctx.beginPath();
              ctx.moveTo(padding, gridY + i * rowH);
              ctx.lineTo(width - padding, gridY + i * rowH);
              ctx.stroke();
          }

          // Draw Vertical Line (Split in half)
          ctx.beginPath();
          ctx.moveTo(width / 2, gridY);
          ctx.lineTo(width / 2, gridY + gridH);
          ctx.stroke();

          // --- Fill Data ---
          const cellPadding = 10;
          ctx.font = '16px "Noto Sans TC", sans-serif';
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'left';

          const drawLabelValue = (label, value, col, row, isFullWidth = false) => {
              const x = padding + (col * (contentW / 2)) + cellPadding;
              const y = gridY + (row * rowH) + (rowH / 2);
              
              // Draw Label (Small, gray)
              ctx.font = '12px "Noto Sans TC", sans-serif';
              ctx.fillStyle = '#666666';
              ctx.fillText(label, x, y - 10);
              
              // Draw Value (Normal, Black)
              ctx.font = 'bold 18px "Noto Sans TC", sans-serif';
              ctx.fillStyle = '#000000';
              let displayVal = value || '-';
              
              ctx.fillText(displayVal, x, y + 10);
          };

          // Row 1: 產地 | 血統
          drawLabelValue('產地', formData.origin, 0, 0);
          drawLabelValue('血統', formData.bloodline, 1, 0);

          // Row 2: 性別 & 尺寸 | 累代
          const genderStr = formData.gender === 'male' ? '♂ 公' : formData.gender === 'female' ? '♀ 母' : '?';
          const sizeStr = formData.size ? `${formData.size}mm` : '';
          drawLabelValue('性別 / 尺寸', `${genderStr}  ${sizeStr}`, 0, 1);
          drawLabelValue('累代', formData.generation, 1, 1);

          // Row 3: 種親公 | 種親母
          const pMale = formData.parentMale ? `${formData.parentMale}mm` : '';
          const pFemale = formData.parentFemale ? `${formData.parentFemale}mm` : '';
          drawLabelValue('種親 ♂', pMale, 0, 2);
          drawLabelValue('種親 ♀', pFemale, 1, 2);

          // Row 4: 羽化日 | 開吃日
          drawLabelValue('羽化日', formData.date, 0, 3);
          drawLabelValue('開吃日', formData.startFeedingDate, 1, 3);

          // Row 5: 取得日 | 死亡日
          drawLabelValue('取得日', formData.acquisitionDate, 0, 4);
          drawLabelValue('死亡日', formData.deathDate, 1, 4);
      }

    }
  }, [showLabelModal, formData]);

  const initializeGapiClient = async () => {
    try {
        await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
        });
        setGapiInited(true);
    } catch (e) {
        console.warn("GAPI init failed:", e);
    }
  };

  const handleAuthClick = () => {
    // Check if CLIENT_ID is still the placeholder or empty
    if (CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID_HERE') || !CLIENT_ID) {
        alert("【設定未完成】\n\n您尚未設定 Google Client ID。\n請回到程式碼編輯區，將最上方的 CLIENT_ID 變數替換為您從 Google Cloud Console 申請的真實 ID。\n\n目前數值仍為範例，因此無法登入。");
        return;
    }

    setErrorMsg('');
    if (!tokenClient) {
        alert("Google 服務初始化失敗。請檢查網路或 Client ID 設定是否正確。");
        return;
    }

    tokenClient.callback = async (resp) => {
      if (resp.error) {
        throw (resp);
      }
      setIsSignedIn(true);
      setUserProfile({ email: "Google User" }); 
      await syncWithGoogleSheets();
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      tokenClient.requestAccessToken({prompt: ''});
    }
  };

  const handleSignOutClick = () => {
    const token = window.gapi.client.getToken();
    if (token !== null) {
      window.google.accounts.oauth2.revoke(token.access_token);
      window.gapi.client.setToken('');
      setIsSignedIn(false);
      setUserProfile(null);
      setData([]); 
      setSpreadsheetId(null);
      setDriveFolderId(null);
      setErrorMsg('');
    }
  };

  // --- Drive Folder Management ---
  const ensureAppFolder = async () => {
    try {
        // Search for existing folder
        const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${APP_FOLDER_NAME}' and trashed = false`;
        const response = await window.gapi.client.drive.files.list({
            q: q,
            fields: 'files(id, name)',
        });

        if (response.result.files && response.result.files.length > 0) {
            // Found existing folder
            console.log("Found existing App folder:", response.result.files[0].id);
            return response.result.files[0].id;
        } else {
            // Create new folder
            const createResponse = await window.gapi.client.drive.files.create({
                resource: {
                    name: APP_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });
            console.log("Created new App folder:", createResponse.result.id);
            return createResponse.result.id;
        }
    } catch (e) {
        console.error("Error ensuring app folder:", e);
        return null;
    }
  };

  // --- Upload Image to Drive ---
  const uploadImageToDrive = async (base64Data, filename, folderId) => {
    const blob = base64ToBlob(base64Data);
    const metadata = {
      name: filename,
      mimeType: blob.type,
      parents: folderId ? [folderId] : [] // Specify the parent folder
    };

    const accessToken = window.gapi.client.getToken().access_token;
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink,thumbnailLink', {
      method: 'POST',
      headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
      body: form,
    });

    const result = await response.json();
    if (result.error) throw result.error;
    
    // Construct a viewable thumbnail link. 
    return `https://drive.google.com/thumbnail?authuser=0&sz=w1024&id=${result.id}`;
  };

  // --- Google Sheets Sync Logic ---

  const syncWithGoogleSheets = async () => {
    setIsLoading(true);
    setStatusMsg('正在同步資料...');
    setErrorMsg('');
    try {
        if (!window.gapi || !window.gapi.client || !window.gapi.client.drive) {
            throw new Error("Google API Client not ready");
        }

        // 1. Ensure Folder Exists
        const folderId = await ensureAppFolder();
        setDriveFolderId(folderId);

        // 2. Handle Spreadsheet
        let foundId = null;
        let currentSheetName = 'Sheet1';

        const response = await window.gapi.client.drive.files.list({
            q: `name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
            fields: 'files(id, name)',
        });

        if (response.result.files && response.result.files.length > 0) {
            foundId = response.result.files[0].id;
        } else {
            const createResponse = await window.gapi.client.sheets.spreadsheets.create({
                properties: { title: SPREADSHEET_NAME },
                sheets: [{ properties: { title: 'Sheet1' } }]
            });
            foundId = createResponse.result.spreadsheetId;
            
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: foundId,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [['ID', 'JSON_DATA', 'Updated_At']] }
            });
        }
        setSpreadsheetId(foundId);

        const metaResponse = await window.gapi.client.sheets.spreadsheets.get({
            spreadsheetId: foundId,
            includeGridData: false
        });
        if (metaResponse.result.sheets && metaResponse.result.sheets.length > 0) {
            currentSheetName = metaResponse.result.sheets[0].properties.title;
            setSheetName(currentSheetName);
        }

        const dataResponse = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: foundId,
            range: `${currentSheetName}!A2:C`,
        });

        const rows = dataResponse.result.values;
        if (rows && rows.length > 0) {
            const parsedData = rows.map(row => {
                try { return JSON.parse(row[1]); } catch(e) { return null; }
            }).filter(item => item !== null);
            setData(parsedData);
            localStorage.setItem('beetle_app_data', JSON.stringify(parsedData));
        }

    } catch (e) {
        console.error("Sync Error:", e);
        handleApiError(e, "同步失敗");
    } finally {
        setIsLoading(false);
        setStatusMsg('');
    }
  };

  const processAndSaveData = async (newData) => {
      setIsLoading(true);
      
      // Deep clone to modify
      let processedData = JSON.parse(JSON.stringify(newData));
      const singleImageFields = ['specimenImage', 'pupationImage', 'emergenceImage'];

      // If signed in, check for Base64 images and upload them
      if (isSignedIn && spreadsheetId) {
          try {
              let uploadCount = 0;
              
              // Helper to check and upload
              const processItem = async (item) => {
                  let modified = false;

                  // 1. Process single fields
                  for (const field of singleImageFields) {
                      if (item[field] && item[field].startsWith('data:image')) {
                          setStatusMsg(`正在上傳照片...`);
                          try {
                              // Pass driveFolderId here
                              const driveLink = await uploadImageToDrive(
                                  item[field], 
                                  `beetle_${field}_${item.id}_${Date.now()}.jpg`, 
                                  driveFolderId
                              );
                              item[field] = driveLink;
                              modified = true;
                          } catch (err) {
                              console.error(`Failed to upload ${field}`, err);
                          }
                      }
                  }

                  // 2. Process images array
                  if (item.images && item.images.length > 0) {
                     const newImages = [];
                     for (let i = 0; i < item.images.length; i++) {
                         const img = item.images[i];
                         if (img.startsWith('data:image')) {
                             setStatusMsg(`正在上傳相簿 (${i+1}/${item.images.length})...`);
                             try {
                                 // Pass driveFolderId here
                                 const driveLink = await uploadImageToDrive(
                                     img, 
                                     `beetle_album_${item.id}_${i}_${Date.now()}.jpg`,
                                     driveFolderId
                                 );
                                 newImages.push(driveLink);
                                 modified = true;
                             } catch (err) {
                                 console.error(`Failed to upload album image ${i}`, err);
                                 newImages.push(img); 
                             }
                         } else {
                             newImages.push(img);
                         }
                     }
                     item.images = newImages;
                     
                     // 3. Smart Sync Logic for Cover Image (item.image)
                     if (item.image && item.image.startsWith('data:image')) {
                         if (!item.images.includes(item.image)) {
                             item.image = item.images[0];
                         }
                     }
                     
                     // If no cover set, default to first
                     if (!item.image && item.images.length > 0) {
                         item.image = item.images[0];
                     }
                  }

                  return item;
              };

              processedData = await Promise.all(processedData.map(processItem));
              
          } catch (e) {
              console.error("Image Upload Error:", e);
              alert("部分圖片上傳失敗，將嘗試僅儲存文字資料。");
          }
      }

      // Save to Local
      localStorage.setItem('beetle_app_data', JSON.stringify(processedData));
      setData(processedData);

      // Save to Cloud
      if (isSignedIn && spreadsheetId) {
          setStatusMsg('正在儲存至試算表...');
          try {
            const rows = processedData.map(item => [
                item.id,
                JSON.stringify(item),
                new Date().toISOString()
            ]);

            const range = `${sheetName}!A2:C`;

            await window.gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: spreadsheetId,
                range: range
            });

            if (rows.length > 0) {
                await window.gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: `${sheetName}!A2`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: rows }
                });
            }
          } catch (e) {
              console.error("Save Error:", e);
              handleApiError(e, "雲端儲存失敗");
          } finally {
              setIsLoading(false);
              setStatusMsg('');
          }
      } else {
          setIsLoading(false);
          setStatusMsg('');
      }
  };

  const handleApiError = (e, prefix) => {
      let msg = e.result?.error?.message || e.message || "未知錯誤";
      
      if (e.result?.error?.code === 403 || msg.includes("permission") || msg.includes("scope")) {
          msg = "權限不足。請登出後重新登入，並勾選所有權限。";
      } else if (msg.includes("limit")) {
          msg = "儲存格大小限制。請確認圖片是否已正確上傳至 Drive。";
      }

      const fullMsg = `${prefix}: ${msg}`;
      setErrorMsg(fullMsg);
      alert(fullMsg);
  };

  // --- Data Management Functions ---
  const handleExportJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `beetle_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          if (confirm(`確定要匯入 ${importedData.length} 筆資料嗎？這將會「覆蓋」目前的資料！`)) {
             processAndSaveData(importedData);
             alert("資料匯入成功！");
          }
        } else {
          alert("匯入失敗：檔案格式不正確 (必須是 JSON 陣列)");
        }
      } catch (err) {
        alert("匯入失敗：檔案無法讀取或格式錯誤");
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = ''; 
  };

  const handleClearAllData = () => {
      if (confirm("警告：此操作將刪除「所有」資料且無法復原！\n\n確定要清空嗎？")) {
          if (confirm("再次確認：您真的要清空所有資料嗎？")) {
              processAndSaveData([]);
              alert("已清空所有資料。");
          }
      }
  };


  // --- App Logic ---

  const generateId = () => {
    const now = new Date();
    // 格式: YYYYMMDD-HHmm (例如 20231027-0930)
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    return `${year}${month}${day}-${hour}${minute}`;
  };

  const handleAddItem = () => {
    // 移除強制登入檢查，允許離線新增
    // if (!isSignedIn) { ... }

    setFormData({
      type: activeTab === 'breeding' ? 'breeding' : activeTab === 'larva' ? 'larva' : 'adult',
      customId: generateId(),
      rating: 0,
      name: '',
      scientificName: '',
      origin: '',
      bloodline: '',
      gender: 'unknown',
      size: '',
      weight: '',
      date: new Date().toISOString().split('T')[0],
      parentMale: '',
      parentFemale: '',
      generation: '',
      memo: '',
      acquisitionDate: '',
      startFeedingDate: '',
      deathDate: '',
      specimenImage: null,
      pupationImage: null,
      emergenceImage: null,
      images: [],
      image: null,
      status: 'active',
      larvaRecords: [],
      breedingRecords: [], // Init empty
      expectedHatchDate: '',
      enableEmailNotify: false,
      id: Date.now().toString()
    });
    setEditingItem(null);
    setView('form');
  };

  const handleEditItem = (item) => {
    // 移除強制登入檢查，允許離線編輯
    // if (!isSignedIn) { ... }

    // Migration: if item has 'image' but no 'images', put it in array
    let initImages = item.images || [];
    if (initImages.length === 0 && item.image) {
        initImages = [item.image];
    }

    setFormData({ 
        ...item, 
        customId: item.customId || item.id.substring(0, 13), 
        rating: item.rating || 0,
        scientificName: item.scientificName || '',
        bloodline: item.bloodline || '',
        images: initImages,
        image: item.image || (initImages.length > 0 ? initImages[0] : null), // Ensure cover image is set
        larvaRecords: item.larvaRecords || [],
        breedingRecords: item.breedingRecords || [], // Migration
        expectedHatchDate: item.expectedHatchDate || '',
        enableEmailNotify: item.enableEmailNotify || false
    });
    setEditingItem(item);
    setView('form');
  };

  const handleSave = () => {
    if (!formData.name) {
      alert('請輸入種類名稱');
      return;
    }

    // Logic: If user didn't select a cover (formData.image is null), default to first image
    const dataToSave = { ...formData };
    if (dataToSave.images.length > 0) {
        // If current image is not in the list (e.g. deleted) or null, default to first
        if (!dataToSave.image || !dataToSave.images.includes(dataToSave.image)) {
             dataToSave.image = dataToSave.images[0];
        }
    } else {
        dataToSave.image = null;
    }

    let newData;
    if (editingItem) {
      newData = data.map(item => item.id === editingItem.id ? dataToSave : item);
    } else {
      newData = [...data, { ...dataToSave, id: Date.now().toString() }];
    }
    
    processAndSaveData(newData);
    setView('list');
  };

  const handleDelete = (id) => {
    if (confirm('確定要刪除這筆資料嗎？')) {
      const newData = data.filter(item => item.id !== id);
      processAndSaveData(newData);
      setView('list');
    }
  };

  const handleMultiImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Process all files
      files.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setFormData(prev => ({ 
                ...prev, 
                images: [...prev.images, reader.result] 
            }));
          };
          reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index) => {
      setFormData(prev => {
          const imgToRemove = prev.images[index];
          const newImages = prev.images.filter((_, i) => i !== index);
          
          // If deleted image was the cover, reset cover to first of remaining or null
          let newCover = prev.image;
          if (newCover === imgToRemove) {
              newCover = newImages.length > 0 ? newImages[0] : null;
          }

          return {
              ...prev,
              images: newImages,
              image: newCover
          };
      });
  };

  const setCoverImage = (img) => {
      setFormData(prev => ({ ...prev, image: img }));
  };

  const handleImageUpload = (e, fieldName = 'image') => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [fieldName]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addLarvaRecord = () => {
    setFormData(prev => ({
        ...prev,
        larvaRecords: [...(prev.larvaRecords || []), { date: new Date().toISOString().split('T')[0], stage: 'L1', weight: '', memo: '' }]
    }));
  };
  const removeLarvaRecord = (index) => setFormData(prev => ({ ...prev, larvaRecords: prev.larvaRecords.filter((_, i) => i !== index) }));
  const updateLarvaRecord = (index, field, value) => setFormData(prev => ({ ...prev, larvaRecords: prev.larvaRecords.map((item, i) => i === index ? { ...item, [field]: value } : item) }));

  // --- Breeding Record Helpers ---
  const addBreedingRecord = () => {
      setFormData(prev => ({
          ...prev,
          breedingRecords: [...(prev.breedingRecords || []), { date: new Date().toISOString().split('T')[0], eggs: '', larvae: '', memo: '' }]
      }));
  };
  const removeBreedingRecord = (index) => setFormData(prev => ({ ...prev, breedingRecords: prev.breedingRecords.filter((_, i) => i !== index) }));
  const updateBreedingRecord = (index, field, value) => setFormData(prev => ({ ...prev, breedingRecords: prev.breedingRecords.map((item, i) => i === index ? { ...item, [field]: value } : item) }));

  // --- Filter and Sort ---
  
  // 1. Filter by Tab
  let processedData = data.filter(item => {
    if (activeTab === 'adult') return item.type === 'adult';
    if (activeTab === 'larva') return item.type === 'larva';
    if (activeTab === 'breeding') return item.type === 'breeding';
    return true;
  });

  // 2. Filter by Search Query
  if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      processedData = processedData.filter(item => {
          return (
              (item.name && item.name.toLowerCase().includes(lowerQuery)) ||
              (item.customId && item.customId.toLowerCase().includes(lowerQuery)) ||
              (item.origin && item.origin.toLowerCase().includes(lowerQuery)) ||
              (item.scientificName && item.scientificName.toLowerCase().includes(lowerQuery)) ||
              (item.bloodline && item.bloodline.toLowerCase().includes(lowerQuery))
          );
      });
  }

  // 3. Sort
  processedData.sort((a, b) => {
      let valA, valB;
      
      switch (sortBy) {
          case 'name':
              valA = a.name || '';
              valB = b.name || '';
              break;
          case 'rating':
              valA = a.rating || 0;
              valB = b.rating || 0;
              break;
          case 'date': // using created/record date
              valA = a.date || '';
              valB = b.date || '';
              break;
          case 'id':
          default:
              valA = a.customId || a.id || '';
              valB = b.customId || b.id || '';
              break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
  });


  // --- Views ---

  const renderImageViewer = () => {
      if (!viewImage) return null;
      return (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4" onClick={() => setViewImage(null)}>
              <button 
                  onClick={() => setViewImage(null)}
                  className="absolute top-4 right-4 text-white p-2"
              >
                  <X size={32} />
              </button>
              <img 
                  src={viewImage} 
                  alt="Full view" 
                  className="max-w-full max-h-full object-contain" 
                  onClick={(e) => e.stopPropagation()} 
              />
          </div>
      );
  };

  // --- Share Logic ---

  const handleShareClick = (e, item) => {
    e.stopPropagation();
    
    let url = '';
    let isCloud = false;

    if (spreadsheetId) {
        // Cloud Mode (Short URL)
        // 格式: ?s={SpreadsheetID}&id={ItemID}
        url = `${window.location.origin}${window.location.pathname}?s=${spreadsheetId}&id=${item.id}`;
        isCloud = true;
    } else {
        // Local Mode (Legacy Base64)
        // 修正: 移除 Base64 大圖，避免網址過長
        const safeItem = { ...item };
        
        // 1. 清理相簿中的 Base64
        if (safeItem.images) {
            safeItem.images = safeItem.images.filter(img => !img.startsWith('data:image'));
        }
        
        // 2. 清理單張欄位的 Base64
        if (safeItem.image && safeItem.image.startsWith('data:image')) safeItem.image = null;
        if (safeItem.specimenImage && safeItem.specimenImage.startsWith('data:image')) safeItem.specimenImage = null;
        if (safeItem.pupationImage && safeItem.pupationImage.startsWith('data:image')) safeItem.pupationImage = null;
        if (safeItem.emergenceImage && safeItem.emergenceImage.startsWith('data:image')) safeItem.emergenceImage = null;

        const shareData = encodeShareData(safeItem);
        url = `${window.location.origin}${window.location.pathname}?share=${shareData}`;
    }
    
    setShareModalItem({ ...item, shareUrl: url, isCloud });
  };

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      alert("連結已複製到剪貼簿！");
    });
  };
  
  const renderQRCodeModal = () => {
    if (!showQR || !editingItem) return null;
    
    const qrData = JSON.stringify({
      id: editingItem.id,
      name: editingItem.name,
      sheetId: spreadsheetId || 'offline',
    });

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&color=4A3B32`;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-200">
          <h3 className="font-bold text-lg mb-2 text-[#4A3B32]">資料 QR Code</h3>
          <p className="text-xs text-gray-500 mb-6 text-center">掃描此碼以快速查詢此甲蟲的完整履歷。</p>
          
          <div className="bg-white p-2 rounded-xl shadow-inner border border-gray-100 mb-6">
             <img src={qrImageUrl} alt="QR Code" className="w-48 h-48" />
          </div>

          <div className="text-center mb-6">
             <p className="font-bold text-[#8B5E3C]">{editingItem.name}</p>
             <p className="text-sm text-gray-400">{editingItem.id}</p>
          </div>

          <Button variant="primary" onClick={() => setShowQR(false)} className="w-full">
            關閉
          </Button>
        </div>
      </div>
    );
  };

  // --- Render Label Modal ---
  const renderLabelModal = () => {
    if (!showLabelModal || !editingItem) return null;
    
    const handleDownloadLabel = () => {
        if (!labelCanvasRef.current) return;
        const link = document.createElement('a');
        link.download = `${editingItem.name}_label.png`;
        link.href = labelCanvasRef.current.toDataURL('image/png');
        link.click();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-lg flex flex-col items-center animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between w-full items-center mb-4">
            <h3 className="font-bold text-lg text-[#4A3B32] flex items-center gap-2">
                <Printer size={18} /> 列印標籤預覽
            </h3>
            <button onClick={() => setShowLabelModal(false)} className="text-gray-400">
                <X size={20} />
            </button>
          </div>
          
          <div className="bg-gray-100 p-2 rounded-lg mb-6 overflow-auto max-w-full">
             {/* Canvas is always rendered, but styled to fit container */}
             <canvas 
                ref={labelCanvasRef} 
                width={600} 
                height={450} // 增加高度
                className="w-full h-auto bg-white shadow-md"
             />
          </div>

          <div className="flex gap-4 w-full">
             <Button variant="outline" onClick={() => setShowLabelModal(false)} className="flex-1">
                取消
             </Button>
             <Button variant="primary" onClick={handleDownloadLabel} className="flex-1">
                <Download size={18} /> 下載圖檔
             </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderShareModal = () => {
    if (!shareModalItem) return null;

    const { shareUrl, isCloud } = shareModalItem;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&color=4A3B32`;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between w-full items-center mb-4">
            <h3 className="font-bold text-lg text-[#4A3B32] flex items-center gap-2">
                <Share2 size={18} /> 分享資料
            </h3>
            <button onClick={() => setShareModalItem(null)} className="text-gray-400">
                <X size={20} />
            </button>
          </div>
          
          {isCloud ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 mb-4">
                  <p className="font-bold mb-1 flex items-center gap-1"><Cloud size={14}/> 使用雲端短網址</p>
                  <p>連結已縮短！<br/>請確認 Google 試算表權限已設為「知道連結的任何人-檢視者」，否則訪客將無法讀取。</p>
              </div>
          ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 mb-4">
                   <p className="font-bold mb-1 flex items-center gap-1"><AlertTriangle size={14}/> 使用離線長網址</p>
                   <p>您未連線至雲端。網址將包含所有資料 (可能很長)。<br/>為確保連結有效，<b>未同步到 Drive 的大圖片已自動移除</b>。</p>
              </div>
          )}
          
          <div className="bg-white p-2 rounded-xl shadow-inner border border-gray-100 mb-4">
             <img src={qrImageUrl} alt="QR Code" className="w-48 h-48" />
          </div>

          <div className="w-full bg-[#F5F1E8] p-3 rounded-lg flex items-center gap-2 mb-4">
             <div className="flex-1 text-xs text-[#5C4033] truncate font-mono bg-transparent border-none focus:outline-none">
                 {shareUrl}
             </div>
             <button onClick={() => handleCopyLink(shareUrl)} className="text-[#8B5E3C] hover:text-[#5C4033]">
                 <Copy size={16} />
             </button>
          </div>

          <div className="text-center mb-2">
             <p className="font-bold text-[#8B5E3C]">{shareModalItem.name}</p>
             <p className="text-xs text-gray-400">{shareModalItem.customId}</p>
          </div>
        </div>
      </div>
    );
  };

  // --- Shared (Visitor) View ---
  const renderSharedView = () => {
      // Loading State
      if (isVisitorLoading) {
          return (
              <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
                  <Loader className="animate-spin text-[#8B5E3C] mb-4" size={48} />
                  <p className="text-[#5C4033] font-bold">正在讀取雲端資料...</p>
                  <p className="text-xs text-[#A09383] mt-2">請稍候</p>
              </div>
          );
      }

      // Error State
      if (visitorError) {
          return (
              <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 text-center">
                  <div className="bg-red-100 p-4 rounded-full mb-4 text-red-500">
                      <AlertTriangle size={48} />
                  </div>
                  <h3 className="text-xl font-bold text-[#4A3B32] mb-2">無法讀取資料</h3>
                  <p className="text-sm text-[#5C4033] mb-6 max-w-xs">{visitorError}</p>
                  <button 
                    onClick={() => {
                        window.location.reload();
                    }}
                    className="bg-[#8B5E3C] text-white px-6 py-2 rounded-full font-medium shadow-md flex items-center gap-2 mx-auto"
                  >
                      <RefreshCw size={16} /> 重新載入
                  </button>
              </div>
          );
      }

      if (!sharedItem) return null;
      
      const item = sharedItem;
      const displayImage = item.image || (item.images && item.images.length > 0 ? item.images[0] : null);

      return (
          <div className="min-h-screen bg-[#FDFBF7] p-4 pb-20">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-4 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon size={16} />
                    <span>訪客檢視模式</span>
                  </div>
                  {/* Visitor mode - no back button */}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-[#F0EBE0] overflow-hidden">
                  <div className="relative h-64 bg-[#F5F1E8]">
                      {displayImage ? (
                          <img src={displayImage} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#D6CDBF]">
                              <Bug size={64} />
                          </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                          <h1 className="text-2xl font-bold text-white">{item.name}</h1>
                          <p className="text-white/80 text-sm font-mono">{item.customId}</p>
                      </div>
                  </div>

                  <div className="p-5 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                           <div className="bg-[#FDFBF7] p-3 rounded-lg">
                               <label className="text-xs text-[#A09383] block mb-1">產地</label>
                               <div className="text-[#4A3B32] font-medium">{item.origin || '-'}</div>
                           </div>
                           <div className="bg-[#FDFBF7] p-3 rounded-lg">
                               <label className="text-xs text-[#A09383] block mb-1">學名</label>
                               <div className="text-[#4A3B32] font-medium italic">{item.scientificName || '-'}</div>
                           </div>
                      </div>

                      <div className="flex gap-4">
                          <div className="flex-1">
                              <label className="text-xs font-bold text-[#8B5E3C] mb-2 block">基本數據</label>
                              <ul className="space-y-2 text-sm text-[#4A3B32]">
                                  <li className="flex justify-between border-b border-[#F0EBE0] pb-1">
                                      <span>性別</span>
                                      <span>{item.gender === 'male' ? '♂ 公' : item.gender === 'female' ? '♀ 母' : '?'}</span>
                                  </li>
                                  <li className="flex justify-between border-b border-[#F0EBE0] pb-1">
                                      <span>{item.type === 'larva' ? '體重' : '體長'}</span>
                                      <span>{item.type === 'larva' ? (item.weight ? `${item.weight}g` : '-') : (item.size ? `${item.size}mm` : '-')}</span>
                                  </li>
                                  <li className="flex justify-between border-b border-[#F0EBE0] pb-1">
                                      <span>累代</span>
                                      <span>{item.generation || '-'}</span>
                                  </li>
                                  <li className="flex justify-between border-b border-[#F0EBE0] pb-1">
                                      <span>血統</span>
                                      <span>{item.bloodline || '-'}</span>
                                  </li>
                              </ul>
                          </div>
                      </div>

                      {item.type === 'adult' && (
                        <div>
                            <label className="text-xs font-bold text-[#8B5E3C] mb-2 block">生命歷程</label>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-[#FDFBF7] p-2 rounded">
                                    <div className="text-[10px] text-[#A09383]">羽化</div>
                                    <div className="text-xs font-bold text-[#4A3B32]">{item.date || '-'}</div>
                                </div>
                                <div className="bg-[#FDFBF7] p-2 rounded">
                                    <div className="text-[10px] text-[#A09383]">進食</div>
                                    <div className="text-xs font-bold text-[#4A3B32]">{item.startFeedingDate || '-'}</div>
                                </div>
                                <div className="bg-[#FDFBF7] p-2 rounded">
                                    <div className="text-[10px] text-[#A09383]">死亡</div>
                                    <div className="text-xs font-bold text-[#4A3B32]">{item.deathDate || '-'}</div>
                                </div>
                            </div>
                        </div>
                      )}

                      {item.memo && (
                          <div className="bg-[#F5F1E8] p-4 rounded-xl">
                              <label className="text-xs font-bold text-[#8B5E3C] mb-2 block flex items-center gap-1">
                                  <Database size={12}/> 飼育筆記
                              </label>
                              <p className="text-sm text-[#5C4033] whitespace-pre-wrap">{item.memo}</p>
                          </div>
                      )}

                      {/* Image Gallery */}
                      {item.images && item.images.length > 0 && (
                          <div>
                              <label className="text-xs font-bold text-[#8B5E3C] mb-2 block">照片記錄</label>
                              <div className="grid grid-cols-3 gap-2">
                                  {item.images.map((img, idx) => (
                                      <img 
                                        key={idx} 
                                        src={img} 
                                        alt={`Gallery ${idx}`}
                                        className="aspect-square object-cover rounded-lg border border-[#E8E1D5]"
                                      />
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
              <div className="text-center mt-8 text-[#D6CDBF] text-xs">
                  Beetle Manager App
              </div>
          </div>
      );
  };
  
  // --- Form View ---
  const renderForm = () => (
    <div className="px-5 pb-24 bg-[#FDFBF7] min-h-screen">
      <div className="flex justify-between items-center py-4 mb-4">
        <h2 className="text-xl font-bold text-[#4A3B32]">
          {editingItem ? '編輯資料' : `新增${activeTab === 'adult' ? '成蟲' : activeTab === 'larva' ? '幼蟲' : '產卵組'}`}
        </h2>
        <div className="flex gap-2">
          {editingItem && (
            <>
              {/* 改為所有類別都顯示列印標籤 (產卵組取消 QR Code) */}
              <Button variant="ghost" onClick={() => setShowLabelModal(true)} title="列印標籤">
                  <Printer size={20} />
              </Button>

              <Button variant="ghost" className="text-red-400" onClick={() => handleDelete(editingItem.id)}>
                <Trash2 size={20} />
              </Button>
            </>
          )}
          <Button variant="primary" onClick={handleSave} className="!px-6" disabled={isLoading}>
             {isLoading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />} 
             {isLoading ? '處理中' : '儲存'}
          </Button>
        </div>
      </div>
      
      {/* Offline Warning Banner */}
      {!isSignedIn && (
          <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-2 rounded-lg mb-4 text-xs flex items-center gap-2">
              <WifiOff size={14} />
              <span>離線模式：資料僅儲存於本機，不會同步至雲端。</span>
          </div>
      )}

      {/* Status Bar for Uploads */}
      {statusMsg && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg mb-4 text-xs flex items-center gap-2 animate-pulse">
              <UploadCloud size={16} />
              <span>{statusMsg}</span>
          </div>
      )}

      {/* Main Info Section */}
      <div className="space-y-6">
        <InputGroup label="基本資訊">
          <div className="mb-4 bg-[#F5F1E8] rounded-lg p-3">
             <label className="text-[10px] text-[#A09383] block mb-1">編號 (自動產生)</label>
             <div className="font-mono text-[#4A3B32] font-bold text-lg">{formData.customId}</div>
          </div>

          <div className="mb-4">
             <label className="text-xs font-bold text-[#8B5E3C] mb-2 block">喜好程度</label>
             <StarRating rating={formData.rating} onChange={(r) => setFormData({...formData, rating: r})} />
          </div>

          <TextInput 
            value={formData.name} 
            onChange={v => setFormData({...formData, name: v})} 
            placeholder="種類名稱 (如: 長戟大兜蟲)" 
          />
          <TextInput 
            value={formData.scientificName} 
            onChange={v => setFormData({...formData, scientificName: v})} 
            placeholder="學名 (如: Dynastes hercules)" 
            className="text-sm italic"
          />

          <TextInput 
            value={formData.origin} 
            onChange={v => setFormData({...formData, origin: v})} 
            placeholder="產地 (如: 瓜德羅普島)" 
          />
           <TextInput 
            value={formData.bloodline} 
            onChange={v => setFormData({...formData, bloodline: v})} 
            placeholder="血統 (如: C68, HiroKA)" 
          />
        </InputGroup>

        {formData.type !== 'breeding' && (
          <InputGroup label="性別">
            <SelectButton 
              options={[
                { label: '? 不明', value: 'unknown' },
                { label: '♂ 公', value: 'male' },
                { label: '♀ 母', value: 'female' },
              ]}
              value={formData.gender}
              onChange={v => setFormData({...formData, gender: v})}
            />
          </InputGroup>
        )}

        <div className="flex gap-4">
            {formData.type === 'adult' && (
              <div className="flex-1">
                 <InputGroup label="體長">
                    <TextInput 
                        value={formData.size} 
                        onChange={v => setFormData({...formData, size: v})} 
                        placeholder="0.0" 
                        suffix="mm"
                    />
                 </InputGroup>
              </div>
            )}
             {formData.type === 'larva' && (
              <div className="flex-1">
                 <InputGroup label="初始體重">
                    <TextInput 
                        value={formData.weight} 
                        onChange={v => setFormData({...formData, weight: v})} 
                        placeholder="0.0" 
                        suffix="g"
                    />
                 </InputGroup>
              </div>
            )}
        </div>

        <InputGroup label={formData.type === 'adult' ? "羽化日" : formData.type === 'larva' ? "孵化日" : "建立日期"}>
          <input
             type="date"
             value={formData.date}
             onChange={e => setFormData({...formData, date: e.target.value})}
             className="w-full bg-[#F5F1E8] border-none rounded-lg p-3 text-[#4A3B32] font-medium"
          />
        </InputGroup>

        <InputGroup label="照片記錄 (可多張)">
          <div className="grid grid-cols-3 gap-2 mb-2">
             {formData.images && formData.images.map((img, index) => (
                 <div key={index} className="aspect-square rounded-lg overflow-hidden relative group bg-white border border-[#E8E1D5]">
                     <img 
                        src={img} 
                        alt={`Record ${index}`} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                        onClick={() => setViewImage(img)}
                     />
                     
                     {/* Heart Button for Cover Image */}
                     <button 
                        onClick={(e) => { e.stopPropagation(); setCoverImage(img); }}
                        className={`absolute top-1 right-1 p-1 rounded-full shadow-sm transition-all ${formData.image === img ? 'bg-white text-red-500 opacity-100' : 'bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-white hover:text-red-500'}`}
                     >
                         <Heart size={14} fill={formData.image === img ? "currentColor" : "none"} />
                     </button>

                     <button 
                        onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                        className="absolute bottom-1 right-1 bg-white/80 p-1 rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                     >
                         <X size={14} />
                     </button>
                 </div>
             ))}
             <label className="aspect-square rounded-lg border-2 border-dashed border-[#D6CDBF] flex flex-col items-center justify-center cursor-pointer hover:bg-[#F5F1E8] transition-colors">
                 <Camera size={24} className="text-[#A09383] mb-1" />
                 <span className="text-[10px] text-[#A09383]">新增</span>
                 <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={handleMultiImageUpload} 
                 />
             </label>
          </div>
          <p className="text-[10px] text-[#A09383] text-center mt-1">點擊愛心可設為封面</p>
        </InputGroup>

        <InputGroup label="累代資訊">
          <div className="grid grid-cols-2 gap-4">
             <TextInput 
                value={formData.parentMale} 
                onChange={v => setFormData({...formData, parentMale: v})} 
                placeholder="種親 ♂" 
                suffix="mm"
            />
             <TextInput 
                value={formData.parentFemale} 
                onChange={v => setFormData({...formData, parentFemale: v})} 
                placeholder="種親 ♀" 
                suffix="mm"
            />
          </div>
          <div className="mt-4">
            <TextInput 
                value={formData.generation} 
                onChange={v => setFormData({...formData, generation: v})} 
                placeholder="累代 (如: CBF1)" 
            />
          </div>
        </InputGroup>

        <InputGroup label="備註">
          <textarea 
             className="w-full bg-[#F5F1E8] rounded-lg p-3 text-sm focus:outline-none min-h-[100px]"
             placeholder="記錄飼育細節..."
             value={formData.memo}
             onChange={e => setFormData({...formData, memo: e.target.value})}
          />
        </InputGroup>

        {formData.type === 'breeding' && (
          <div className="bg-white p-4 rounded-xl border border-[#F0EBE0] space-y-4 mb-4">
            <h3 className="font-bold text-[#8B5E3C] text-xs flex items-center gap-1">
              <Calendar size={14} /> 產卵管理
            </h3>
            
            <div className="space-y-4">
               
               {/* 新增：產卵紀錄列表 */}
               <div className="space-y-2 mb-4">
                    {/* Header */}
                    <div className="flex text-xs text-[#A09383] px-1 gap-1">
                        <div className="w-28">採收日期</div>
                        {/* 加寬欄位 w-12 -> w-24 */}
                        <div className="w-24 text-center">卵</div>
                        <div className="w-24 text-center">蟲</div>
                        {/* 增加間距 */}
                        <div className="w-4"></div>
                        <div className="flex-1">備考</div>
                        <div className="w-6"></div>
                    </div>

                    {/* Rows */}
                    {formData.breedingRecords && formData.breedingRecords.map((record, index) => (
                        <div key={index} className="flex items-center gap-1 border-b border-[#F0EBE0] pb-2 last:border-0">
                            <input
                                type="date"
                                value={record.date}
                                onChange={(e) => updateBreedingRecord(index, 'date', e.target.value)}
                                className="w-28 bg-transparent text-xs text-[#4A3B32] focus:outline-none min-w-0"
                            />
                            {/* 加寬欄位 w-12 -> w-24 */}
                            <input
                                type="number"
                                placeholder="0"
                                value={record.eggs}
                                onChange={(e) => updateBreedingRecord(index, 'eggs', e.target.value)}
                                className="w-24 bg-transparent text-xs text-[#4A3B32] focus:outline-none text-center min-w-0"
                            />
                            <input
                                type="number"
                                placeholder="0"
                                value={record.larvae}
                                onChange={(e) => updateBreedingRecord(index, 'larvae', e.target.value)}
                                className="w-24 bg-transparent text-xs text-[#4A3B32] focus:outline-none text-center min-w-0"
                            />
                            {/* 增加間距 */}
                            <div className="w-4"></div>
                            <input
                                type="text"
                                placeholder="..."
                                value={record.memo || ''}
                                onChange={(e) => updateBreedingRecord(index, 'memo', e.target.value)}
                                className="flex-1 bg-transparent text-xs text-[#4A3B32] focus:outline-none min-w-0 text-gray-500"
                            />
                            <button onClick={() => removeBreedingRecord(index)} className="w-6 text-red-400">
                                <X size={14} />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addBreedingRecord}
                        className="w-full py-2 border border-dashed border-[#D6CDBF] text-[#8B5E3C] text-xs rounded-lg mt-2 hover:bg-[#FDFBF7]"
                    >
                        + 新增採收記錄
                    </button>
                </div>

               <InputGroup label="預計孵化日">
                 <input
                    type="date"
                    value={formData.expectedHatchDate}
                    onChange={e => setFormData({...formData, expectedHatchDate: e.target.value})}
                    className="w-full bg-[#F5F1E8] border-none rounded-lg p-3 text-[#4A3B32] font-medium"
                 />
               </InputGroup>

               <div className="flex items-center justify-between bg-[#FDFBF7] p-3 rounded-lg border border-[#F0EBE0]">
                  <div className="flex items-center gap-2">
                     <div className={`p-2 rounded-full ${formData.enableEmailNotify ? 'bg-[#F4D06F] text-[#5C4033]' : 'bg-[#E8E1D5] text-[#A09383]'}`}>
                        <Bell size={18} />
                     </div>
                     <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#5C4033]">電子郵件通知</span>
                        <span className="text-[10px] text-[#A09383]">將在日期接近時發送提醒</span>
                     </div>
                  </div>
                  <button 
                     onClick={() => setFormData({...formData, enableEmailNotify: !formData.enableEmailNotify})}
                     className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${formData.enableEmailNotify ? 'bg-[#8B5E3C]' : 'bg-[#D6CDBF]'}`}
                  >
                     <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${formData.enableEmailNotify ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
               </div>
            </div>
          </div>
        )}

        {formData.type === 'larva' && (
          <div className="bg-white p-4 rounded-xl border border-[#F0EBE0] space-y-4 mb-4">
            <h3 className="font-bold text-[#8B5E3C] text-xs flex items-center gap-1">
              <Leaf size={14} /> 成長記錄
            </h3>
            
            <div className="space-y-2">
                {/* Header */}
                <div className="flex text-xs text-[#A09383] px-1 gap-1">
                    <div className="w-28">日期</div>
                    <div className="w-14 text-center">幼蟲期</div>
                    <div className="w-14 text-right">重量(g)</div>
                    <div className="w-6"></div> {/* Spacer */}
                    <div className="flex-1">備考</div>
                    <div className="w-6"></div>
                </div>

                {/* Rows */}
                {formData.larvaRecords && formData.larvaRecords.map((record, index) => (
                    <div key={index} className="flex items-center gap-1 border-b border-[#F0EBE0] pb-2 last:border-0">
                        <input 
                            type="date" 
                            value={record.date}
                            onChange={(e) => updateLarvaRecord(index, 'date', e.target.value)}
                            className="w-28 bg-transparent text-xs text-[#4A3B32] focus:outline-none min-w-0"
                        />
                        <select
                            value={record.stage}
                            onChange={(e) => updateLarvaRecord(index, 'stage', e.target.value)}
                            className="w-14 bg-transparent text-xs text-[#4A3B32] focus:outline-none text-center"
                        >
                            <option value="L1">L1</option>
                            <option value="L2">L2</option>
                            <option value="L3">L3</option>
                            <option value="化蛹">化蛹</option>
                            <option value="羽化">羽化</option>
                        </select>
                        <input 
                            type="number" 
                            placeholder="0.0"
                            value={record.weight}
                            onChange={(e) => updateLarvaRecord(index, 'weight', e.target.value)}
                            className="w-14 bg-transparent text-xs text-[#4A3B32] focus:outline-none text-right min-w-0"
                        />
                        <div className="w-6"></div> {/* Spacer */}
                        <input 
                            type="text" 
                            placeholder="..."
                            value={record.memo || ''}
                            onChange={(e) => updateLarvaRecord(index, 'memo', e.target.value)}
                            className="flex-1 bg-transparent text-xs text-[#4A3B32] focus:outline-none min-w-0 text-gray-500"
                        />
                        <button onClick={() => removeLarvaRecord(index)} className="w-6 text-red-400">
                            <X size={14} />
                        </button>
                    </div>
                ))}

                <button 
                    onClick={addLarvaRecord}
                    className="w-full py-2 border border-dashed border-[#D6CDBF] text-[#8B5E3C] text-xs rounded-lg mt-2 hover:bg-[#FDFBF7]"
                >
                    + 新增記錄
                </button>

                {/* Important Photos - Optimized for full content */}
                <div className="pt-4 border-t border-[#F0EBE0] mt-4">
                    <h4 className="font-bold text-[#8B5E3C] text-xs mb-3">重要階段記錄照</h4>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-[#5C4033] mb-1 block">化蛹照</label>
                            {/* Changed h-[100px] to h-64, object-cover to object-contain, added bg-black/5 */}
                            <div className="border-2 border-dashed border-[#D6CDBF] rounded-xl p-2 flex flex-col items-center justify-center bg-black/5 h-64 relative">
                                {formData.pupationImage ? (
                                    <>
                                        <img src={formData.pupationImage} alt="Pupation" 
                                            className="w-full h-full object-contain rounded-lg cursor-pointer" 
                                            onClick={() => setViewImage(formData.pupationImage)}
                                        />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setFormData({...formData, pupationImage: null}); }}
                                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md scale-75"
                                        >
                                            <X size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <label className="flex flex-col items-center cursor-pointer text-[#A09383] w-full h-full justify-center">
                                        <Camera size={20} className="mb-1" />
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'pupationImage')} />
                                    </label>
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-[#5C4033] mb-1 block">羽化照</label>
                             {/* Changed h-[100px] to h-64, object-cover to object-contain, added bg-black/5 */}
                             <div className="border-2 border-dashed border-[#D6CDBF] rounded-xl p-2 flex flex-col items-center justify-center bg-black/5 h-64 relative">
                                {formData.emergenceImage ? (
                                    <>
                                        <img src={formData.emergenceImage} alt="Emergence" 
                                            className="w-full h-full object-contain rounded-lg cursor-pointer"
                                            onClick={() => setViewImage(formData.emergenceImage)}
                                        />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setFormData({...formData, emergenceImage: null}); }}
                                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md scale-75"
                                        >
                                            <X size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <label className="flex flex-col items-center cursor-pointer text-[#A09383] w-full h-full justify-center">
                                        <Camera size={20} className="mb-1" />
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'emergenceImage')} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {formData.type === 'adult' && (
          <div className="bg-white p-4 rounded-xl border border-[#F0EBE0] space-y-4 mb-4">
            <h3 className="font-bold text-[#8B5E3C] text-xs flex items-center gap-1">
              <Calendar size={14} /> 生命歷程 (成蟲限定)
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-2">
                 <label className="text-sm text-[#5C4033]">取得日</label>
                 <input
                    type="date"
                    value={formData.acquisitionDate}
                    onChange={e => setFormData({...formData, acquisitionDate: e.target.value})}
                    className="bg-transparent text-right text-sm text-[#8B5E3C] focus:outline-none"
                 />
              </div>
              <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-2">
                 <label className="text-sm text-[#5C4033]">開吃日</label>
                 <input
                    type="date"
                    value={formData.startFeedingDate}
                    onChange={e => setFormData({...formData, startFeedingDate: e.target.value})}
                    className="bg-transparent text-right text-sm text-[#8B5E3C] focus:outline-none"
                 />
              </div>
              <div className="flex items-center justify-between border-b border-[#F0EBE0] pb-2">
                 <label className="text-sm text-[#5C4033]">死亡日</label>
                 <input
                    type="date"
                    value={formData.deathDate}
                    onChange={e => setFormData({...formData, deathDate: e.target.value})}
                    className="bg-transparent text-right text-sm text-[#8B5E3C] focus:outline-none"
                 />
              </div>
            </div>

            <InputGroup label="標本照">
                <div className="border-2 border-dashed border-[#D6CDBF] rounded-xl p-4 flex flex-col items-center justify-center bg-[#FDFBF7] min-h-[120px]">
                    {formData.specimenImage ? (
                    <div className="relative w-full h-32">
                        <img src={formData.specimenImage} alt="Specimen" 
                            className="w-full h-full object-contain rounded-lg opacity-80 cursor-pointer" 
                            onClick={() => setViewImage(formData.specimenImage)}
                        />
                        <button 
                        onClick={(e) => { e.stopPropagation(); setFormData({...formData, specimenImage: null}); }}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                        >
                        <X size={14} />
                        </button>
                    </div>
                    ) : (
                    <label className="flex flex-col items-center cursor-pointer text-[#A09383]">
                        <Camera size={24} className="mb-2" />
                        <span className="text-xs">上傳標本記錄</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'specimenImage')} />
                    </label>
                    )}
                </div>
            </InputGroup>
          </div>
        )}

        <div className="bg-[#E8E1D5] bg-opacity-30 p-4 rounded-lg flex items-center gap-2 text-xs text-[#8B5E3C]">
           <Database size={14} />
           <span>資料將自動保存於 {isSignedIn ? 'Google 試算表' : '本地儲存 (未連線)'}</span>
        </div>
      </div>

      {renderImageViewer()}
    </div>
  );

  const renderHeader = () => (
    <div className="bg-[#FDFBF7] p-4 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        {view !== 'list' && (
          <button onClick={() => setView('list')} className="text-[#5C4033]">
             <ChevronRight className="rotate-180" />
          </button>
        )}
        
        {/* Search Bar */}
        <div className="flex-1 bg-[#F0EBE0] rounded-full px-4 py-2 flex items-center gap-2">
          <Search size={18} className="text-[#A09383]" />
          <input 
            type="text" 
            placeholder="搜尋種類、產地..." 
            className="bg-transparent w-full text-sm focus:outline-none text-[#5C4033] placeholder-[#A09383]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sort Button (Cycle through options) */}
        {view === 'list' && activeTab !== 'settings' && (
            <button 
                onClick={() => {
                    const modes = ['id', 'name', 'rating', 'date'];
                    const nextMode = modes[(modes.indexOf(sortBy) + 1) % modes.length];
                    setSortBy(nextMode);
                }}
                className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-[#E8E1D5] text-[#8B5E3C] text-[10px] font-bold"
                title={`排序依據: ${sortBy}`}
            >
                {sortBy === 'id' && '編號'}
                {sortBy === 'name' && '名稱'}
                {sortBy === 'rating' && '星星'}
                {sortBy === 'date' && '日期'}
            </button>
        )}

        {/* Sort Order Toggle */}
        {view === 'list' && activeTab !== 'settings' && (
             <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="w-8 h-8 rounded-full bg-[#E8E1D5] text-[#8B5E3C] flex items-center justify-center"
             >
                 <ArrowUpDown size={14} className={sortOrder === 'asc' ? '' : 'rotate-180'} />
             </button>
        )}

        <div className="text-[#8B5E3C] font-bold">AZ</div>
      </div>
      {view === 'list' && (
        <div className="flex justify-between items-end mt-4 ml-1">
            <h1 className="text-2xl font-bold text-[#4A3B32]">
            {activeTab === 'adult' ? '成蟲' : activeTab === 'larva' ? '幼蟲' : activeTab === 'breeding' ? '產卵組' : '設定'}
            </h1>
            {isSignedIn ? (
                <span className="text-xs text-green-600 flex items-center gap-1 mb-1 font-medium bg-green-50 px-2 py-1 rounded-full">
                    <Cloud size={12}/> 已連線
                </span>
            ) : (
                <span className="text-xs text-gray-400 flex items-center gap-1 mb-1 font-medium bg-gray-100 px-2 py-1 rounded-full">
                    <Cloud size={12}/> 未連線
                </span>
            )}
        </div>
      )}
    </div>
  );

  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-[#FDFBF7] border-t border-[#E8E1D5] flex justify-around py-3 pb-6 z-20 shadow-[0_-5px_10px_rgba(0,0,0,0.02)]">
      {[
        { id: 'adult', label: '成蟲', icon: <Bug size={24} /> },
        { id: 'larva', label: '幼蟲', icon: <Leaf size={24} /> },
        { id: 'breeding', label: '產卵組', icon: <Calendar size={24} /> },
        { id: 'settings', label: '設定', icon: <Settings size={24} /> },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            setActiveTab(tab.id);
            setView('list');
          }}
          className={`flex flex-col items-center gap-1 ${
            activeTab === tab.id ? 'text-[#8B5E3C]' : 'text-[#C5BDB0]'
          }`}
        >
          {tab.icon}
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-[#A09383]">
      <div className="w-24 h-24 rounded-full bg-[#F5F1E8] flex items-center justify-center mb-4">
        {activeTab === 'adult' && <Bug size={40} className="text-[#D6CDBF]" />}
        {activeTab === 'larva' && <Leaf size={40} className="text-[#D6CDBF]" />}
        {activeTab === 'breeding' && <Calendar size={40} className="text-[#D6CDBF]" />}
      </div>
      <p>目前沒有{activeTab === 'adult' ? '成蟲' : activeTab === 'larva' ? '幼蟲' : '產卵組'}資料</p>
    </div>
  );

  const renderList = () => (
    <div className="px-4 pb-24">
      {/* Show Error Banner if exists */}
      {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-xs flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
          </div>
      )}

      {processedData.length === 0 ? renderEmptyState() : (
        <div className="grid gap-3">
          {processedData.map((item) => {
             // Logic for thumbnail display: 
             // 1. If dead and has specimen photo -> Specimen Photo (Grayscale)
             // 2. Larva logic: Emergence > Pupation > Cover
             // 3. Else -> Favorite Photo (item.image)
             const isDead = item.type === 'adult' && item.deathDate;
             const showSpecimen = isDead && item.specimenImage;
             
             let displayImage = item.image || (item.images && item.images[0]);

             if (showSpecimen) {
                 displayImage = item.specimenImage;
             } else if (item.type === 'larva') {
                 // Priority: Emergence > Pupation > Default Cover
                 if (item.emergenceImage) {
                     displayImage = item.emergenceImage;
                 } else if (item.pupationImage) {
                     displayImage = item.pupationImage;
                 }
             }
             
             // Calculate dynamic weight for larva (Show the latest record weight, or fallback to initial weight)
             const lastWeight = item.type === 'larva' && item.larvaRecords && item.larvaRecords.length > 0 
                ? item.larvaRecords[item.larvaRecords.length - 1].weight 
                : item.weight;

             // Calculate last record date for larva
             const lastRecordDate = item.type === 'larva' && item.larvaRecords && item.larvaRecords.length > 0
                ? item.larvaRecords[item.larvaRecords.length - 1].date
                : null;

             return (
                <div 
                key={item.id} 
                onClick={() => handleEditItem(item)}
                className="bg-white p-4 rounded-xl shadow-sm border border-[#F0EBE0] flex gap-4 active:scale-[0.98] transition-transform relative overflow-hidden group"
                >
                <div className={`w-16 h-16 bg-[#F5F1E8] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative ${showSpecimen ? 'grayscale opacity-80' : ''}`}>
                    {displayImage ? (
                    <img src={displayImage} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                    <Bug className="text-[#D6CDBF]" />
                    )}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[#A09383] font-mono mb-0.5">{item.customId}</span>
                        <h3 className="font-bold text-[#4A3B32]">{item.name || '未命名'}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-[#F5F1E8] text-[#8B5E3C]">
                            {item.generation || 'CB'}
                        </span>
                        {item.rating > 0 && <StarRating rating={item.rating} readOnly={true} />}
                    </div>
                    </div>
                    {item.scientificName && (
                        <p className="text-xs text-[#8B5E3C] italic -mt-0.5 mb-1">{item.scientificName}</p>
                    )}
                    <p className="text-xs text-[#A09383]">{item.origin || '未知產地'}</p>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                    {/* Modified Logic Here: Show if gender is known OR type is larva (regardless of gender) */}
                    {(item.gender !== 'unknown' || item.type === 'larva') && (
                        <span className={`flex items-center gap-1 ${
                            item.gender === 'male' ? 'text-blue-500' : 
                            item.gender === 'female' ? 'text-red-500' : 
                            'text-[#8B5E3C]' // Neutral color for unknown larva
                        }`}>
                        {item.gender === 'male' ? '♂' : item.gender === 'female' ? '♀' : '?'} 
                        {item.type === 'adult' ? `${item.size}mm` : `${lastWeight}g`}
                        </span>
                    )}
                    {item.type === 'larva' && item.larvaRecords && item.larvaRecords.length > 0 && (
                        <span className="text-xs text-[#8B5E3C] bg-[#E8DCC8] px-1 rounded ml-1">
                            {item.larvaRecords[item.larvaRecords.length - 1].stage}
                        </span>
                    )}
                    <span className="text-xs text-[#A09383] ml-auto">
                        {item.date}
                        {item.type === 'adult' && item.deathDate ? ` ~ ${item.deathDate}` : ''}
                        {item.type === 'larva' && lastRecordDate ? ` ~ ${lastRecordDate}` : ''}
                    </span>
                    </div>
                </div>

                {/* Share Button (Absolute Positioned) */}
                <button 
                  onClick={(e) => handleShareClick(e, item)}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#FDFBF7] text-[#8B5E3C] flex items-center justify-center shadow-sm border border-[#F0EBE0] opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="分享"
                >
                    <Share2 size={14} />
                </button>

                </div>
             );
          })}
        </div>
      )}
      
      {/* Floating Action Button */}
      <button 
        onClick={handleAddItem}
        className="fixed bottom-24 right-6 w-14 h-14 bg-[#F4D06F] rounded-full shadow-lg flex items-center justify-center text-[#5C4033] hover:bg-[#EAC050] transition-colors"
      >
        <Plus size={28} />
      </button>
    </div>
  );

  const renderSettings = () => (
    <div className="px-5 pb-24">
      <div className="mt-6 mb-6">
        <h2 className="text-2xl font-bold text-[#4A3B32] mb-2">設定</h2>
        <p className="text-sm text-[#A09383]">管理您的資料與帳號連結</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#F0EBE0] overflow-hidden mb-4">
        <div className="p-4 border-b border-[#F0EBE0] bg-[#FDFBF7]">
           <h3 className="font-bold text-[#8B5E3C] flex items-center gap-2">
              <Cloud size={18} /> 雲端同步 (Google Sheets)
           </h3>
        </div>
        
        <div className="p-4">
           {!isSignedIn ? (
               <div className="text-center py-4">
                   <p className="text-sm text-[#5C4033] mb-4">登入 Google 帳號以啟用雲端備份與多裝置同步功能。</p>
                   <Button variant="google" onClick={handleAuthClick} className="w-full justify-center">
                       <img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4" />
                       連結 Google 帳號
                   </Button>
               </div>
           ) : (
               <div>
                   <div className="flex items-center gap-3 mb-4 bg-green-50 p-3 rounded-lg border border-green-100">
                       <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                           {userProfile?.email?.[0]?.toUpperCase() || 'G'}
                       </div>
                       <div className="flex-1 overflow-hidden">
                           <p className="text-sm font-bold text-green-800 truncate">{userProfile?.email || '已登入 Google'}</p>
                           <p className="text-[10px] text-green-600">已連結至 {SPREADSHEET_NAME}</p>
                       </div>
                   </div>

                   <div className="flex flex-col gap-2">
                       <Button variant="primary" onClick={syncWithGoogleSheets} disabled={isLoading} className="w-full justify-center">
                           {isLoading ? <Loader className="animate-spin" size={16}/> : <RefreshCw size={16}/>}
                           立即手動同步
                       </Button>
                       <Button variant="outline" onClick={handleSignOutClick} className="w-full justify-center">
                           <LogOut size={16}/> 登出
                       </Button>
                   </div>
               </div>
           )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#F0EBE0] overflow-hidden mb-4">
        <div className="p-4 border-b border-[#F0EBE0] bg-[#FDFBF7]">
           <h3 className="font-bold text-[#8B5E3C] flex items-center gap-2">
              <Database size={18} /> 資料管理 (JSON)
           </h3>
        </div>
        <div className="p-4 flex flex-col gap-3">
            <Button variant="secondary" onClick={handleExportJson} className="w-full justify-center">
                <Download size={16}/> 匯出備份 (JSON)
            </Button>
            
            <label className="flex items-center justify-center px-4 py-2 rounded-full font-medium transition-colors duration-200 gap-2 border border-[#8B5E3C] text-[#8B5E3C] hover:bg-[#FDFBF7] cursor-pointer">
                <Upload size={16}/> 匯入備份 (JSON)
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            <div className="h-px bg-[#F0EBE0] my-2"></div>

            <Button variant="danger" onClick={handleClearAllData} className="w-full justify-center">
                <Trash2 size={16}/> 清空所有資料
            </Button>
        </div>
      </div>

      <div className="text-center text-[#D6CDBF] text-xs py-4">
          <p>Beetle Manager v2.1</p>
          <p>Designed for Beetle Lovers</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-[#4A3B32]">
      {view === 'shared' ? (
          renderSharedView()
      ) : (
          <>
            {renderHeader()}
            
            <main className="pt-2">
                {view === 'list' && activeTab !== 'settings' && renderList()}
                {view === 'list' && activeTab === 'settings' && renderSettings()}
                {view === 'form' && renderForm()}
            </main>

            {renderBottomNav()}
            {renderQRCodeModal()}
            {renderLabelModal()} {/* 新增標籤預覽視窗 */}
            {renderShareModal()}
          </>
      )}
    </div>
  );
}
