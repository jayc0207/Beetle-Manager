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
  Printer,
  LayoutGrid,
  LayoutList,
  Bold,
  Type
} from 'lucide-react';

// ==========================================
// CONFIGURATION - 請填寫您的 Client ID (API Key 為選填)
// ==========================================
const CLIENT_ID = '334603460658-jqlon9pdv8nd6q08e9kh6epd2t7cseo9.apps.googleusercontent.com'; // <--- 【請注意】請將這裡替換為您的真實 Client ID
const API_KEY = ''; // <--- (選填) 由於您使用 OAuth 登入存取私人資料，此項留空通常也能運作
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
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const text = await response.text();
        const jsonText = text.substring(47, text.length - 2);
        const json = JSON.parse(jsonText);
        
        const items = json.table.rows.map(row => {
            try {
                const cell = row.c && row.c[1];
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
