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
  RefreshCw
} from 'lucide-react';

// ==========================================
// CONFIGURATION - 請確認這裡填的是您的 Client ID
// ==========================================
const CLIENT_ID = '334603460658-jqlon9pdv8nd6q08e9kh6epd2t7cseo9.apps.googleusercontent.com'; // <--- 請確認這裡已填入
const API_KEY = ''; 
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];
const SPREADSHEET_NAME = 'Beetle_Manager_DB';

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

const TextInput = ({ value, onChange, placeholder, suffix }) => (
  <div className="relative">
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-[#D6CDBF] py-2 text-[#4A3B32] focus:outline-none focus:border-[#8B5E3C] placeholder-[#B0A695]"
    />
    {suffix && <span className="absolute right-0 top-2 text-[#8B5E3C] text-sm">{suffix}</span>}
  </div>
);

const SelectButton = ({ options, value, onChange }) => (
  <div className="flex gap-2 mt-1">
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
          value === opt.value
            ? 'bg-[#E8DCC8] border-[#8B5E3C] text-[#5C4033]'
            : 'border-[#E5E7EB] text-gray-400 bg-white'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

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
  const [view, setView] = useState('list');
  const [data, setData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Google Auth State
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [spreadsheetId, setSpreadsheetId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'adult',
    name: '',
    origin: '',
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
    image: null,
    status: 'active',
    larvaRecords: [],
    expectedHatchDate: '',
    enableEmailNotify: false,
    id: ''
  });

  // --- Google Integration Logic ---

  useEffect(() => {
    // Load local data first
    const savedData = localStorage.getItem('beetle_app_data');
    if (savedData) {
      setData(JSON.parse(savedData));
    }

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
    setErrorMsg('');
    if (!tokenClient) {
        alert("Google 服務初始化失敗。請檢查網路或 Client ID 設定。");
        return;
    }

    tokenClient.callback = async (resp) => {
      if (resp.error) {
        throw (resp);
      }
      setIsSignedIn(true);
      setUserProfile({ email: "Google User" }); // Simplified profile
      await syncWithGoogleSheets();
    };

    // Force prompt to ensure user sees the checkboxes for permissions
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
      setErrorMsg('');
    }
  };

  // --- Google Sheets Sync Logic ---

  const syncWithGoogleSheets = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
        if (!window.gapi || !window.gapi.client || !window.gapi.client.drive) {
            throw new Error("Google API Client not ready");
        }

        // 1. Find Spreadsheet
        let foundId = null;
        const response = await window.gapi.client.drive.files.list({
            q: `name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
            fields: 'files(id, name)',
        });

        if (response.result.files && response.result.files.length > 0) {
            foundId = response.result.files[0].id;
        } else {
            // 2. Create Spreadsheet
            const createResponse = await window.gapi.client.sheets.spreadsheets.create({
                properties: { title: SPREADSHEET_NAME },
            });
            foundId = createResponse.result.spreadsheetId;
            
            // Add Header
            await window.gapi.client.sheets.spreadsheets.values.update({
                spreadsheetId: foundId,
                range: 'Sheet1!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [['ID', 'JSON_DATA', 'Updated_At']] }
            });
        }
        setSpreadsheetId(foundId);

        // 3. Fetch Data
        const dataResponse = await window.gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: foundId,
            range: 'Sheet1!A2:C',
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
    }
  };

  const saveToCloud = async (newData) => {
      // Local save first
      localStorage.setItem('beetle_app_data', JSON.stringify(newData));
      setData(newData);

      // Cloud save
      if (isSignedIn && spreadsheetId) {
          setIsLoading(true);
          try {
            const rows = newData.map(item => [
                item.id,
                JSON.stringify(item),
                new Date().toISOString()
            ]);

            // Clear old data
            await window.gapi.client.sheets.spreadsheets.values.clear({
                spreadsheetId: spreadsheetId,
                range: 'Sheet1!A2:C'
            });

            // Write new data
            if (rows.length > 0) {
                await window.gapi.client.sheets.spreadsheets.values.update({
                    spreadsheetId: spreadsheetId,
                    range: 'Sheet1!A2',
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: rows }
                });
            }
          } catch (e) {
              console.error("Save Error:", e);
              handleApiError(e, "雲端儲存失敗");
          } finally {
              setIsLoading(false);
          }
      }
  };

  const handleApiError = (e, prefix) => {
      let msg = e.result?.error?.message || e.message || "未知錯誤";
      
      // Customize error messages for users
      if (e.result?.error?.code === 403 || msg.includes("permission") || msg.includes("scope")) {
          msg = "權限不足。請登出後重新登入，並勾選所有 Google Drive/Sheets 權限框框。";
      } else if (msg.includes("API key not valid")) {
          msg = "API 設定錯誤，請檢查 Client ID。";
      }

      const fullMsg = `${prefix}: ${msg}`;
      setErrorMsg(fullMsg);
      alert(fullMsg);
  };

  // --- Original App Logic ---

  const handleAddItem = () => {
    setFormData({
      type: activeTab === 'breeding' ? 'breeding' : activeTab === 'larva' ? 'larva' : 'adult',
      name: '',
      origin: '',
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
    setFormData({ 
        ...item, 
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

    let newData;
    if (editingItem) {
      newData = data.map(item => item.id === editingItem.id ? formData : item);
    } else {
      newData = [...data, { ...formData, id: Date.now().toString() }];
    }
    
    saveToCloud(newData);
    setView('list');
  };

  const handleDelete = (id) => {
    if (confirm('確定要刪除這筆資料嗎？')) {
      const newData = data.filter(item => item.id !== id);
      saveToCloud(newData);
      setView('list');
    }
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

  // --- Filter ---
  const filteredData = data.filter(item => {
    if (activeTab === 'adult') return item.type === 'adult';
    if (activeTab === 'larva') return item.type === 'larva';
    if (activeTab === 'breeding') return item.type === 'breeding';
    return true;
  });

  // --- Views ---

  const renderHeader = () => (
    <div className="bg-[#FDFBF7] p-4 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-3">
        {view !== 'list' && (
          <button onClick={() => setView('list')} className="text-[#5C4033]">
             <ChevronRight className="rotate-180" />
          </button>
        )}
        <div className="flex-1 bg-[#F0EBE0] rounded-full px-4 py-2 flex items-center gap-2">
          <Search size={18} className="text-[#A09383]" />
          <input 
            type="text" 
            placeholder="搜尋種類、產地..." 
            className="bg-transparent w-full text-sm focus:outline-none text-[#5C4033] placeholder-[#A09383]"
          />
        </div>
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

      {filteredData.length === 0 ? renderEmptyState() : (
        <div className="grid gap-3">
          {filteredData.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleEditItem(item)}
              className="bg-white p-4 rounded-xl shadow-sm border border-[#F0EBE0] flex gap-4 active:scale-[0.98] transition-transform relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-[#F5F1E8] rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Bug className="text-[#D6CDBF]" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-[#4A3B32]">{item.name || '未命名'}</h3>
                  <div className="flex gap-1">
                    {item.type === 'breeding' && item.enableEmailNotify && (
                         <div className="text-[#F4D06F] bg-[#FDFBF7] p-1 rounded-full border border-[#F0EBE0]">
                             <Bell size={12} fill="#F4D06F" />
                         </div>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-[#F5F1E8] text-[#8B5E3C]">
                        {item.generation || 'CB'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#A09383] mt-1">{item.origin || '未知產地'}</p>
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
                  </span>
                </div>
              </div>
            </div>
          ))}
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

  const renderForm = () => (
    <div className="px-5 pb-24 bg-[#FDFBF7] min-h-screen">
      <div className="flex justify-between items-center py-4 mb-4">
        <h2 className="text-xl font-bold text-[#4A3B32]">
          {editingItem ? '編輯資料' : `新增${activeTab === 'adult' ? '成蟲' : activeTab === 'larva' ? '幼蟲' : '產卵組'}`}
        </h2>
        <div className="flex gap-2">
          {editingItem && (
            <>
              <Button variant="ghost" onClick={() => setShowQR(true)}>
                <QrCode size={20} />
              </Button>
              <Button variant="ghost" className="text-red-400" onClick={() => handleDelete(editingItem.id)}>
                <Trash2 size={20} />
              </Button>
            </>
          )}
          <Button variant="primary" onClick={handleSave} className="!px-6">
             {isLoading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />} 
             {isLoading ? '同步中' : '儲存'}
          </Button>
        </div>
      </div>

      {/* Main Info Section */}
      <div className="space-y-6">
        <InputGroup label="基本資訊">
          <TextInput 
            value={formData.name} 
            onChange={v => setFormData({...formData, name: v})} 
            placeholder="種類名稱 (如: 長戟大兜蟲)" 
          />
          <TextInput 
            value={formData.origin} 
            onChange={v => setFormData({...formData, origin: v})} 
            placeholder="產地 (如: 瓜德羅普島)" 
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
                 <InputGroup label="目前體重">
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

        <InputGroup label="照片記錄 (上傳至雲端)">
          <div className="border-2 border-dashed border-[#D6CDBF] rounded-xl p-4 flex flex-col items-center justify-center bg-[#FDFBF7] min-h-[150px]">
            {formData.image ? (
              <div className="relative w-full h-48">
                <img src={formData.image} alt="Upload" className="w-full h-full object-contain rounded-lg" />
                <button 
                  onClick={() => setFormData({...formData, image: null})}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center cursor-pointer text-[#A09383]">
                <Camera size={32} className="mb-2" />
                <span className="text-sm">點擊上傳照片</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'image')} />
              </label>
            )}
          </div>
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
                <div className="flex text-xs text-[#A09383] px-1">
                    <div className="flex-1">日期</div>
                    <div className="flex-1 text-center">幼蟲期</div>
                    <div className="flex-1 text-right">重量 (g)</div>
                    <div className="w-6"></div>
                </div>

                {/* Rows */}
                {formData.larvaRecords && formData.larvaRecords.map((record, index) => (
                    <div key={index} className="flex items-center gap-2 border-b border-[#F0EBE0] pb-2 last:border-0">
                        <input 
                            type="date" 
                            value={record.date}
                            onChange={(e) => updateLarvaRecord(index, 'date', e.target.value)}
                            className="flex-1 bg-transparent text-xs text-[#4A3B32] focus:outline-none min-w-0"
                        />
                        <select
                            value={record.stage}
                            onChange={(e) => updateLarvaRecord(index, 'stage', e.target.value)}
                            className="flex-1 bg-transparent text-xs text-[#4A3B32] focus:outline-none text-center"
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
                            className="flex-1 bg-transparent text-xs text-[#4A3B32] focus:outline-none text-right min-w-0"
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

                {/* Important Photos */}
                <div className="pt-4 border-t border-[#F0EBE0] mt-4">
                    <h4 className="font-bold text-[#8B5E3C] text-xs mb-3">重要階段記錄照</h4>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-xs text-[#5C4033] mb-1 block">化蛹照</label>
                            <div className="border-2 border-dashed border-[#D6CDBF] rounded-xl p-2 flex flex-col items-center justify-center bg-[#FDFBF7] h-[100px] relative">
                                {formData.pupationImage ? (
                                    <>
                                        <img src={formData.pupationImage} alt="Pupation" className="w-full h-full object-cover rounded-lg" />
                                        <button 
                                            onClick={() => setFormData({...formData, pupationImage: null})}
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
                             <div className="border-2 border-dashed border-[#D6CDBF] rounded-xl p-2 flex flex-col items-center justify-center bg-[#FDFBF7] h-[100px] relative">
                                {formData.emergenceImage ? (
                                    <>
                                        <img src={formData.emergenceImage} alt="Emergence" className="w-full h-full object-cover rounded-lg" />
                                        <button 
                                            onClick={() => setFormData({...formData, emergenceImage: null})}
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
                        <img src={formData.specimenImage} alt="Specimen" className="w-full h-full object-contain rounded-lg opacity-80" />
                        <button 
                        onClick={() => setFormData({...formData, specimenImage: null})}
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
    </div>
  );

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
             <p className="font-bold text-[#8B5E3C] text-lg">{editingItem.name}</p>
             <p className="text-sm text-gray-400">{editingItem.id}</p>
          </div>

          <Button variant="primary" onClick={() => setShowQR(false)} className="w-full">
            關閉
          </Button>
        </div>
      </div>
    );
  };

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

              <div className="p-4 border-b border-[#F0EBE0] flex items-center justify-between">
                  <span className="text-[#4A3B32] font-medium">匯出資料 (JSON)</span>
                  <ChevronRight size={18} className="text-[#D6CDBF]" />
              </div>
              <div className="p-4 flex items-center justify-between">
                  <span className="text-[#4A3B32] font-medium">關於 App</span>
                  <span className="text-xs text-[#A09383]">v1.3.0 (Cloud+Debug)</span>
              </div>
          </div>
          
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg text-xs text-[#8B5E3C] border border-yellow-100">
            <h4 className="font-bold mb-2">部署說明</h4>
            <p>1. 請確保程式碼上方 <code>CLIENT_ID</code> 已填入。</p>
            <p className="mt-1">2. 請將此 App 部署至 Vercel，並將 Vercel 的網址加入 Google Cloud Console 的「已授權 JavaScript 來源」。</p>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-[#4A3B32]">
      {renderHeader()}
      
      <main className="pt-2">
        {view === 'list' && activeTab !== 'settings' && renderList()}
        {view === 'list' && activeTab === 'settings' && renderSettings()}
        {view === 'form' && renderForm()}
      </main>

      {renderBottomNav()}
      {renderQRCodeModal()}
    </div>
  );
}
