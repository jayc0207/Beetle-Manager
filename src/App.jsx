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
  FolderOpen
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
  
  // Share Modal State
  const [shareModalItem, setShareModalItem] = useState(null);
  
  // Shared View State (Visitor Mode)
  const [sharedItem, setSharedItem] = useState(null);
  
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
    expectedHatchDate: '',
    enableEmailNotify: false,
    id: ''
  });

  // --- Initialization & Google Integration Logic ---

  useEffect(() => {
    // 1. Check for Share URL Param
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      const decoded = decodeShareData(shareData);
      if (decoded) {
        setSharedItem(decoded);
        setView('shared');
        return; // Skip normal loading if viewing share
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
      expectedHatchDate: '',
      enableEmailNotify: false,
      id: Date.now().toString()
    });
    setEditingItem(null);
    setView('form');
  };

  const handleEditItem = (item) => {
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
        larvaRecords: [...(prev.larvaRecords || []), { date: new Date().toISOString().split('T')[0], stage: 'L1', weight: '' }]
    }));
  };
  const removeLarvaRecord = (index) => setFormData(prev => ({ ...prev, larvaRecords: prev.larvaRecords.filter((_, i) => i !== index) }));
  const updateLarvaRecord = (index, field, value) => setFormData(prev => ({ ...prev, larvaRecords: prev.larvaRecords.map((item, i) => i === index ? { ...item, [field]: value } : item) }));

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
    setShareModalItem(item);
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

  const renderShareModal = () => {
    if (!shareModalItem) return null;

    const shareData = encodeShareData(shareModalItem);
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareData}`;
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
          
          <p className="text-xs text-gray-500 mb-4 text-center">掃描此碼或複製連結，即可讓他人檢視此資料。</p>
          
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
      if (!sharedItem) return null;
      
      const item = sharedItem;
      const displayImage = item.image || (item.images && item.images.length > 0 ? item.images[0] : null);

      return (
          <div className="min-h-screen bg-[#FDFBF7] p-4 pb-20">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl mb-4 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>您正在檢視分享的資料 (唯讀模式)</span>
                  </div>
                  <button 
                    onClick={() => {
                        // Clear URL params and go home
                        window.history.replaceState({}, document.title, window.location.pathname);
                        setSharedItem(null);
                        setView('list');
                        window.location.reload(); // Hard reload to clear clean
                    }}
                    className="bg-white px-3 py-1 rounded-full shadow-sm text-yellow-800 font-bold border border-yellow-100 flex items-center gap-1"
                  >
                      <Home size={12} /> 返回首頁
                  </button>
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
             // 2. Else -> Favorite Photo (item.image)
             const isDead = item.type === 'adult' && item.deathDate;
             const showSpecimen = isDead && item.specimenImage;
             const displayImage = showSpecimen ? item.specimenImage : (item.image || (item.images && item.images[0]));

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
                    {item.gender !== 'unknown' && (
                        <span className={`flex items-center gap-1 ${item.gender === 'male' ? 'text-blue-500' : 'text-red-500'}`}>
                        {item.gender === 'male' ? '♂' : '♀'} 
                        {item.type === 'adult' ? `${item.size}mm` : `${item.weight}g`}
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
      <div className="px-4 pb-24">
          <div className="bg-white rounded-xl shadow-sm border border-[#F0EBE0] overflow-hidden">
              <div className="p-4 border-b border-[#F0EBE0] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[#4A3B32] font-medium">連結 Google 帳戶</span>
                    <span className="text-xs text-[#A09383]">
                        {isSignedIn ? `已登入: ${userProfile?.email || 'User'}` : '未連結'}
                    </span>
                  </div>
                  
                  {isSignedIn ? (
                      <Button variant="outline" onClick={handleSignOutClick} className="!px-3 !py-1 text-xs">
                          <LogOut size={14} /> 登出
                      </Button>
                  ) : (
                      <Button variant="primary" onClick={handleAuthClick} className="!px-3 !py-1 text-xs">
                          <Cloud size={14} /> 登入
                      </Button>
                  )}
              </div>
              
              <div className="p-4 border-b border-[#F0EBE0] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[#4A3B32] font-medium">資料庫狀態</span>
                    <span className="text-xs text-[#A09383]">
                        {spreadsheetId ? '已連接雲端試算表' : '僅使用本地儲存'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {spreadsheetId && isSignedIn && (
                        <Button variant="ghost" onClick={() => syncWithGoogleSheets()} className="!p-1" disabled={isLoading}>
                             <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                        </Button>
                    )}
                    {isLoading && <Loader className="animate-spin text-[#8B5E3C]" size={18} />}
                  </div>
              </div>

              {/* Data Management Section */}
              <div className="p-4 border-b border-[#F0EBE0] space-y-3">
                  <h4 className="text-xs font-bold text-[#8B5E3C] flex items-center gap-2">
                      <Database size={14} /> 資料管理
                  </h4>
                  
                  <div className="flex gap-2">
                      <button 
                        onClick={handleExportJson}
                        className="flex-1 bg-[#F5F1E8] text-[#5C4033] py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:bg-[#E8DCC8]"
                      >
                          <Download size={14} /> 匯出備份 (JSON)
                      </button>
                      <label className="flex-1 bg-[#F5F1E8] text-[#5C4033] py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:bg-[#E8DCC8] cursor-pointer">
                          <Upload size={14} /> 匯入還原
                          <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                      </label>
                  </div>
                  
                  <button 
                    onClick={handleClearAllData}
                    className="w-full border border-red-200 text-red-500 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1 hover:bg-red-50"
                  >
                      <Trash2 size={14} /> 清除所有資料 (慎用)
                  </button>
              </div>

              <div className="p-4 flex items-center justify-between">
                  <span className="text-[#4A3B32] font-medium">關於 App</span>
                  <span className="text-xs text-[#A09383]">v2.0.2 (Fix Missing Func)</span>
              </div>
          </div>
          
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg text-xs text-[#8B5E3C] border border-yellow-100">
            <h4 className="font-bold mb-2 flex items-center gap-1"><FolderOpen size={14}/> 圖片權限設定說明</h4>
            <p>1. 系統已自動在您的 Google Drive 建立 <b>{APP_FOLDER_NAME}</b> 資料夾。</p>
            <p className="mt-1">2. 為了讓分享連結能正常顯示圖片，請前往 Google Drive 找到該資料夾。</p>
            <p className="mt-1">3. 將資料夾權限設定為 <b>「知道連結的任何人」</b> &rarr; <b>「檢視者」</b>。</p>
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
            {renderShareModal()}
          </>
      )}
    </div>
  );
}
